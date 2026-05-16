const axios = require('axios');
const WebSocket = require('ws');

// Cấu hình URL (điều chỉnh nếu chạy trong Docker hoặc môi trường khác)
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_URL = `${BASE_URL}/api/v1`;
const WS_URL = `${BASE_URL.replace('http', 'ws')}/ws`;

// Danh sách tài khoản giả lập (lấy từ dữ liệu seeder)
const users = [
    { email: 'customer@ticketrush.com', password: 'password' },
    { email: 'linhchi@gmail.com', password: 'password' },
    { email: 'minhduc@gmail.com', password: 'password' }
];

async function simulate() {
    console.log('🚀 Bắt đầu giả lập đặt vé đa luồng với Virtual Queue...');

    // 1. Đăng nhập tất cả các tài khoản để lấy Cookie/Token
    const sessions = await Promise.all(users.map(async (u) => {
        try {
            const res = await axios.post(`${API_URL}/auth/login`, u);
            // Lấy cookie từ header set-cookie
            const cookie = res.headers['set-cookie'][0].split(';')[0];
            return { ...u, cookie, userId: res.data.data.id };
        } catch (err) {
            console.error(`❌ Đăng nhập thất bại cho ${u.email}:`, err.response?.data || err.message);
            process.exit(1);
        }
    }));

    console.log('✅ Tất cả tài khoản đã đăng nhập thành công.');

    // 2. Lấy thông tin sự kiện và tìm ghế trống
    let eventId, seatIds;
    try {
        // Tìm sự kiện có is_queue_mode = true để test queue, nếu không có thì lấy đại 1 cái
        const eventsRes = await axios.get(`${API_URL}/events?limit=10`);
        let event = eventsRes.data.data.find(e => e.is_queue_mode) || eventsRes.data.data[0];
        eventId = event.id;
        
        const seatMapRes = await axios.get(`${API_URL}/events/${eventId}/seat-map`);
        // Tìm ghế đầu tiên có trạng thái 'available'
        let foundSeat = null;
        for (const zone of seatMapRes.data.data.zones) {
            foundSeat = zone.seats.find(s => s.status.toLowerCase() === 'available');
            if (foundSeat) break;
        }

        if (!foundSeat) {
            console.error('❌ Không tìm thấy ghế trống để thử nghiệm.');
            process.exit(1);
        }
        seatIds = [foundSeat.id];
        console.log(`🎯 Sự kiện: ${event.title} (${eventId}) - Queue Mode: ${event.is_queue_mode}`);
        console.log(`💺 Ghế mục tiêu: ${foundSeat.row_label}${foundSeat.seat_number} (${foundSeat.id})`);
    } catch (err) {
        console.error('❌ Lỗi khi lấy thông tin sự kiện/ghế:', err.message);
        process.exit(1);
    }

    // 3. Join Queue cho tất cả user
    console.log('🚶 Đang tham gia hàng chờ...');

    // Test Idempotency for the first user (concurrently)
    const firstUser = sessions[0];
    console.log(`🧪 Testing JoinQueue idempotency (concurrently) for ${firstUser.email}...`);
    try {
        const joinPromises = [1, 2, 3].map(() => 
            axios.post(`${API_URL}/queue/join`, { event_id: eventId }, {
                headers: { Cookie: firstUser.cookie }
            })
        );
        const responses = await Promise.all(joinPromises);
        const joinResults = responses.map(res => res.data.data.join_index);
        joinResults.forEach((idx, i) => console.log(`   Attempt ${i+1}: JoinIndex = ${idx}`));
        
        const allSame = joinResults.every(val => val === joinResults[0]);
        if (allSame) {
            console.log(`✅ Idempotency test PASSED: All JoinIndexes are ${joinResults[0]}`);
        } else {
            console.error(`❌ Idempotency test FAILED: JoinIndexes are ${joinResults.join(', ')}`);
        }
    } catch (err) {
        console.error(`❌ Idempotency test FAILED with error:`, err.response?.data || err.message);
    }

    await Promise.all(sessions.map(async (s, idx) => {
        // Skip first user as already joined
        if (idx === 0) {
            s.queueToken = firstUser.queueToken; // This might be undefined if not set in loop
            // Re-fetch to get token if needed
            const res = await axios.post(`${API_URL}/queue/join`, { event_id: eventId }, {
                headers: { Cookie: s.cookie }
            });
            s.queueToken = res.data.data.queue_token;
            s.joinIndex = res.data.data.join_index;
            s.queueStatus = res.data.data.status;
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/queue/join`, { event_id: eventId }, {
                headers: { Cookie: s.cookie }
            });
            s.queueToken = res.data.data.queue_token;
            s.joinIndex = res.data.data.join_index;
            s.queueStatus = res.data.data.status;
            console.log(`[${s.email}] JoinIndex: ${s.joinIndex}, Status: ${s.queueStatus}`);
        } catch (err) {
            console.error(`❌ [${s.email}] Join Queue thất bại:`, err.response?.data || err.message);
        }
    }));

    // 4. Thiết lập kết nối WebSocket cho mỗi user
    const wsConnections = sessions.map(s => {
        const ws = new WebSocket(WS_URL, {
            headers: { Cookie: s.cookie }
        });

        ws.on('open', () => {
            // Subscribe vào channel của sự kiện và channel cá nhân
            ws.send(JSON.stringify({ action: 'subscribe', channel: `event:${eventId}` }));
            ws.send(JSON.stringify({ action: 'subscribe', channel: `user:${s.userId}` }));
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'QUEUE_UPDATE') {
                    const remaining = s.joinIndex - msg.current_index;
                    console.log(`[WS ${s.email}] 📢 QUEUE_UPDATE: Server Index: ${msg.current_index} -> Vị trí còn lại: ${remaining > 0 ? remaining : 0}`);
                } else if (msg.type === 'QUEUE_PASSED') {
                    console.log(`[WS ${s.email}] 🎉 QUEUE_PASSED! Bạn đã có thể đặt vé.`);
                    s.queueStatus = 'allowed';
                    s.queueToken = msg.queue_token;
                } else if (msg.type === 'SEAT_LOCKED') {
                    console.log(`[WS ${s.email}] 🔔 SEAT_LOCKED: Ghế ${msg.seat_ids.join(', ')} đã bị khóa bởi ${msg.user_id === s.userId ? 'BẠN' : 'người khác'}`);
                } else if (msg.type === 'SEAT_RELEASED') {
                    console.log(`[WS ${s.email}] 🔔 SEAT_RELEASED: Ghế ${msg.seat_ids.join(', ')} đã được giải phóng`);
                }
            } catch (e) {
                // console.log(`[WS ${s.email}] Nhận message thô:`, data.toString());
            }
        });

        ws.on('error', (err) => {
            console.error(`[WS ${s.email}] Lỗi:`, err.message);
        });

        return ws;
    });

    // Đợi một chút để nhận update queue hoặc để server process
    console.log('⏳ Đang đợi lượt (hoặc giả lập lock ngay nếu đã allowed)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Thực hiện gửi request Lock Seats đồng thời
    console.log('⚔️ Đang gửi các yêu cầu giữ ghế đồng thời cho cùng 1 ghế...');
    const results = await Promise.allSettled(sessions.map(s => {
        return axios.post(`${API_URL}/orders/lock-seats`, {
            event_id: eventId,
            seat_ids: seatIds
        }, {
            headers: { 
                Cookie: s.cookie,
                'X-Queue-Token': s.queueToken
            }
        });
    }));

    // 6. In kết quả xử lý tranh chấp
    results.forEach((res, i) => {
        const email = sessions[i].email;
        if (res.status === 'fulfilled') {
            console.log(`✅ [${email}] THÀNH CÔNG: Đã giữ được ghế. Order ID: ${res.value.data.data.id}`);
        } else {
            const errorData = res.reason.response?.data;
            const statusCode = res.reason.response?.status;
            console.log(`❌ [${email}] THẤT BẠI: ${errorData?.message || res.reason.message} (Status: ${statusCode}, Code: ${errorData?.error_code})`);
        }
    });

    // Đợi thêm vài giây để quan sát các sự kiện WebSocket đổ về
    console.log('⏳ Đang đợi thêm các sự kiện WebSocket cuối cùng...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    wsConnections.forEach(ws => ws.close());
    console.log('🏁 Kết thúc giả lập.');
}

simulate();
