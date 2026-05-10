package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"ticketrush/internal/config"
	"ticketrush/internal/models"
	"ticketrush/internal/repository"
	"ticketrush/internal/utils"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	cfg := config.LoadConfig()
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("🗑️ Cleaning database...")
	if err := db.Exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;").Error; err != nil {
		log.Fatalf("Failed to clean database: %v", err)
	}

	fmt.Println("🔄 Running migrations...")
	repository.RunMigrations(cfg)

	fmt.Println("🌱 Seeding fresh data...")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)

	// ============================================================
	// 1. USERS
	// ============================================================
	fmt.Println("👤 Creating users...")

	admin := models.User{
		Email:        "admin@ticketrush.com",
		PasswordHash: string(hashedPassword),
		FullName:     "Nguyễn Quản Trị",
		Role:         models.RoleAdmin,
		Gender:       models.GenderMale,
		DateOfBirth:  time.Date(1990, 5, 15, 0, 0, 0, 0, time.UTC),
	}
	db.Create(&admin)

	customers := []models.User{
		{
			Email:        "customer@ticketrush.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Trần Văn Khách",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(2000, 3, 20, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "linhchi@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Nguyễn Linh Chi",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2001, 7, 12, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "minhduc@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Phạm Minh Đức",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1998, 11, 5, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "thuytrang@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Lê Thùy Trang",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2003, 1, 28, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "hoangnam@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Vũ Hoàng Nam",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1995, 9, 10, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "ngocanhh@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Đặng Ngọc Anh",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(2002, 4, 3, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "quanghai@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Nguyễn Quang Hải",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1997, 6, 18, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "thanhhuyen@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Bùi Thanh Huyền",
			Role:         models.RoleCustomer,
			Gender:       models.GenderFemale,
			DateOfBirth:  time.Date(1999, 12, 25, 0, 0, 0, 0, time.UTC),
		},
		{
			Email:        "ducmanh@gmail.com",
			PasswordHash: string(hashedPassword),
			FullName:     "Trịnh Đức Mạnh",
			Role:         models.RoleCustomer,
			Gender:       models.GenderMale,
			DateOfBirth:  time.Date(1993, 8, 7, 0, 0, 0, 0, time.UTC),
		},
	}
	for i := range customers {
		db.Create(&customers[i])
	}
	fmt.Printf("   ✅ Created 1 admin + %d customers\n", len(customers))

	// ============================================================
	// 2. EVENTS
	// ============================================================
	fmt.Println("🎤 Creating events...")

	type eventSeed struct {
		event models.Event
		zones []models.EventZone
	}

	titles := []string{
		"Mỹ Tâm Live Concert: Tri Ân",
		"Sơn Tùng M-TP: Sky Tour 2026",
		"Đen Vâu: Show của Đen",
		"Hoàng Thùy Linh: Vietnamese Concert",
		"V-League 2026: Hà Nội FC vs HAGL",
		"VBA 2026: Saigon Heat vs Thang Long Warriors",
		"Workshop: Tương lai của AI trong Nghệ thuật",
		"Kịch: Ngày Xửa Ngày Xưa",
		"Triển lãm Nghệ thuật Đương đại",
		"Lễ hội Ẩm thực Đường phố",
		"Hà Anh Tuấn: Sketch A Rose",
		"Rap Việt All-Star Concert",
		"Ravolution Music Festival",
		"Phú Quốc Sunset: Acoustic Night",
	}

	descriptions := []string{
		"Một đêm nhạc hoành tráng với sự góp mặt của nhiều nghệ sĩ nổi tiếng. Đừng bỏ lỡ cơ hội trải nghiệm không gian âm nhạc đỉnh cao.",
		"Sự kiện thể thao kịch tính nhất trong năm, quy tụ những đội bóng hàng đầu. Hãy đến và cổ vũ cho đội bóng yêu thích của bạn!",
		"Khám phá những góc nhìn mới về nghệ thuật và công nghệ thông qua buổi workshop chuyên sâu này.",
		"Trải nghiệm văn hóa và ẩm thực đặc sắc trong không gian lễ hội sôi động. Phù hợp cho cả gia đình và bạn bè.",
		"Đêm diễn đặc biệt đánh dấu chặng đường nghệ thuật đầy cảm xúc. Những bản hit quen thuộc sẽ được làm mới hoàn toàn.",
	}

	banners := []string{
		"https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80",
		"https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=1200&q=80",
	}

	categories := []string{"music_festival", "sports", "arts_stage", "education_workshop", "experience_entertainment", "other"}
	locations := []string{"Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Đà Lạt", "Nha Trang"}

	var eventSeeds []eventSeed

	for i := 0; i < 60; i++ {
		var es eventSeed
		if i == 0 {
			es = eventSeed{
				event: models.Event{
					Title:       "Jack - J97 Concert: Đom Đóm In The Stars",
					Description: "Đêm nhạc hoành tráng của Jack - J97 cùng Đom Đóm Fanclub. Một hành trình âm nhạc đầy cảm xúc với những bản hit triệu view: Hoa Hải Đường, Bạc Phận, Là 1 Thằng Con Trai,... Hãy cùng thắp sáng hàng ngàn đom đóm trong đêm Hà Nội!",
					BannerURL:   "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
					Location:    "Hà Nội",
					Address:     "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
					StartTime:   time.Now().UTC().AddDate(0, 0, 14),
					EndTime:     time.Now().UTC().AddDate(0, 0, 14).Add(4 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					IsHero:      true,
					Category:    "music_festival",
					IsQueueMode: false,
				},
				zones: []models.EventZone{
					{Name: "VVIP - Sân khấu gần", Price: 3500000, TotalRows: 3, SeatsPerRow: 12},
					{Name: "VIP", Price: 2000000, TotalRows: 5, SeatsPerRow: 15},
					{Name: "Standard A", Price: 1200000, TotalRows: 8, SeatsPerRow: 20},
					{Name: "Standard B", Price: 800000, TotalRows: 10, SeatsPerRow: 25},
				},
			}
		} else if i == 1 {
			es = eventSeed{
				event: models.Event{
					Title:       "Sơn Tùng M-TP: Sky Tour 2026",
					Description: "Sky Tour trở lại! Sơn Tùng M-TP mang đến đêm diễn lịch sử tại SVĐ Mỹ Đình với dàn sản xuất đẳng cấp quốc tế. Trải nghiệm những bản hit Chạy Ngay Đi, Hãy Trao Cho Anh, Muộn Rồi Mà Sao Còn,... cùng hiệu ứng ánh sáng mãn nhãn.",
					BannerURL:   "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
					Location:    "Hà Nội",
					Address:     "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
					StartTime:   time.Now().UTC().AddDate(0, 1, 0),
					EndTime:     time.Now().UTC().AddDate(0, 1, 0).Add(5 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					IsHero:      true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "Diamond - Hàng đầu", Price: 5000000, TotalRows: 2, SeatsPerRow: 10},
					{Name: "VVIP", Price: 3500000, TotalRows: 4, SeatsPerRow: 15},
					{Name: "VIP", Price: 2200000, TotalRows: 6, SeatsPerRow: 20},
					{Name: "General A", Price: 1500000, TotalRows: 10, SeatsPerRow: 25},
					{Name: "General B", Price: 900000, TotalRows: 12, SeatsPerRow: 30},
				},
			}
		} else if i == 2 {
			es = eventSeed{
				event: models.Event{
					Title:       "Rap Việt All-Star Concert 2026",
					Description: "Tất cả các ngôi sao Rap Việt hội tụ trong một đêm duy nhất! Với sự góp mặt của Karik, Binz, Rhymastic, Wowy, Double2T, MCK, tlinh và nhiều rapper đình đám khác. Bữa tiệc Hip-Hop lớn nhất Việt Nam!",
					BannerURL:   "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
					Location:    "Hồ Chí Minh",
					Address:     "Sân vận động Quân khu 7, TP.HCM",
					StartTime:   time.Now().UTC().AddDate(0, 0, 21),
					EndTime:     time.Now().UTC().AddDate(0, 0, 21).Add(5 * time.Hour),
					IsPublished: true,
					IsFeatured:  true,
					Category:    "music_festival",
				},
				zones: []models.EventZone{
					{Name: "VIP Standing", Price: 2500000, TotalRows: 3, SeatsPerRow: 15},
					{Name: "Premium Seated", Price: 1800000, TotalRows: 6, SeatsPerRow: 18},
					{Name: "Standard", Price: 1000000, TotalRows: 10, SeatsPerRow: 22},
				},
			}
		} else {
			title := titles[rand.Intn(len(titles))]
			title = fmt.Sprintf("%s #%d", title, i+1)
			startTime := time.Now().UTC().AddDate(0, 0, rand.Intn(90)-30)

			es = eventSeed{
				event: models.Event{
					Title:       title,
					Description: descriptions[rand.Intn(len(descriptions))],
					BannerURL:   banners[rand.Intn(len(banners))],
					Location:    locations[rand.Intn(len(locations))],
					Address:     fmt.Sprintf("Địa điểm tổ chức tại %s", locations[rand.Intn(len(locations))]),
					StartTime:   startTime,
					EndTime:     startTime.Add(time.Duration(2+rand.Intn(4)) * time.Hour),
					IsPublished: rand.Intn(100) < 90,
					IsFeatured:  rand.Intn(100) < 20,
					IsHero:      rand.Intn(100) < 10,
					IsQueueMode: rand.Intn(100) < 10,
					Category:    categories[rand.Intn(len(categories))],
				},
				zones: []models.EventZone{
					{
						Name:        "Standard",
						Price:       float64((500 + rand.Intn(501)) * 1000),
						TotalRows:   5 + rand.Intn(6),
						SeatsPerRow: 10 + rand.Intn(6),
					},
					{
						Name:        "VIP",
						Price:       float64((1500 + rand.Intn(1501)) * 1000),
						TotalRows:   3 + rand.Intn(3),
						SeatsPerRow: 8 + rand.Intn(5),
					},
				},
			}
		}
		eventSeeds = append(eventSeeds, es)
	}

	for i, es := range eventSeeds {
		es.event.Slug = utils.GenerateSlug(es.event.Title)
		db.Create(&es.event)
		eventSeeds[i].event = es.event

		for j, z := range es.zones {
			z.EventID = es.event.ID
			db.Create(&z)
			eventSeeds[i].zones[j] = z

			// Bulk generate seats
			var seats []models.Seat
			for r := 0; r < z.TotalRows; r++ {
				rowLabel := string(rune('A' + r))
				for s := 1; s <= z.SeatsPerRow; s++ {
					seats = append(seats, models.Seat{
						ZoneID:     z.ID,
						RowLabel:   rowLabel,
						SeatNumber: s,
						Status:     models.SeatAvailable,
					})
				}
			}
			db.Create(&seats)
		}

		status := "📢 Published"
		if !es.event.IsPublished {
			status = "📝 Draft"
		}
		totalSeats := 0
		for _, z := range es.zones {
			totalSeats += z.TotalRows * z.SeatsPerRow
		}
		fmt.Printf("   ✅ [%s] %s (%d ghế, %d khu vực)\n", status, es.event.Title, totalSeats, len(es.zones))
	}

	// ============================================================
	// 3. SAMPLE ORDERS & TICKETS (for Event 1 - Jack)
	// ============================================================
	fmt.Println("🎫 Creating sample orders & tickets...")

	jackEvent := eventSeeds[0].event
	jackVVIP := eventSeeds[0].zones[0]
	jackVIP := eventSeeds[0].zones[1]

	// Fetch actual seats from DB for Jack VVIP zone
	var vvipSeats []models.Seat
	db.Where("zone_id = ?", jackVVIP.ID).Order("row_label ASC, seat_number ASC").Find(&vvipSeats)

	var vipSeats []models.Seat
	db.Where("zone_id = ?", jackVIP.ID).Order("row_label ASC, seat_number ASC").Find(&vipSeats)

	// Order 1: customer[0] bought 2 VVIP seats (completed)
	if len(vvipSeats) >= 2 {
		order1 := models.Order{
			UserID:      customers[0].ID,
			EventID:     jackEvent.ID,
			TotalAmount: jackVVIP.Price * 2,
			Status:      models.OrderCompleted,
			ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
			OrderItems: []models.OrderItem{
				{SeatID: vvipSeats[0].ID, Price: jackVVIP.Price},
				{SeatID: vvipSeats[1].ID, Price: jackVVIP.Price},
			},
		}
		db.Create(&order1)

		// Mark seats as SOLD
		db.Model(&models.Seat{}).Where("id IN ?", []interface{}{vvipSeats[0].ID, vvipSeats[1].ID}).
			Update("status", models.SeatSold)

		// Create tickets
		for _, item := range order1.OrderItems {
			ticket := models.Ticket{
				OrderID:     order1.ID,
				SeatID:      item.SeatID,
				UserID:      customers[0].ID,
				QRCodeToken: fmt.Sprintf("TKR-JACK-%s", item.SeatID.String()[:8]),
			}
			db.Create(&ticket)
		}
		fmt.Printf("   ✅ %s mua 2 vé VVIP Jack (COMPLETED)\n", customers[0].FullName)
	}

	// Order 2: customer[1] bought 3 VIP seats (completed)
	if len(vipSeats) >= 3 {
		order2 := models.Order{
			UserID:      customers[1].ID,
			EventID:     jackEvent.ID,
			TotalAmount: jackVIP.Price * 3,
			Status:      models.OrderCompleted,
			ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
			OrderItems: []models.OrderItem{
				{SeatID: vipSeats[0].ID, Price: jackVIP.Price},
				{SeatID: vipSeats[1].ID, Price: jackVIP.Price},
				{SeatID: vipSeats[2].ID, Price: jackVIP.Price},
			},
		}
		db.Create(&order2)

		db.Model(&models.Seat{}).Where("id IN ?", []interface{}{vipSeats[0].ID, vipSeats[1].ID, vipSeats[2].ID}).
			Update("status", models.SeatSold)

		for _, item := range order2.OrderItems {
			ticket := models.Ticket{
				OrderID:     order2.ID,
				SeatID:      item.SeatID,
				UserID:      customers[1].ID,
				QRCodeToken: fmt.Sprintf("TKR-JACK-%s", item.SeatID.String()[:8]),
			}
			db.Create(&ticket)
		}
		fmt.Printf("   ✅ %s mua 3 vé VIP Jack (COMPLETED)\n", customers[1].FullName)
	}

	// Order 3: customer[2] locked 2 VVIP seats (pending - simulating "đang thanh toán")
	if len(vvipSeats) >= 5 {
		order3 := models.Order{
			UserID:      customers[2].ID,
			EventID:     jackEvent.ID,
			TotalAmount: jackVVIP.Price * 2,
			Status:      models.OrderPending,
			ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
			OrderItems: []models.OrderItem{
				{SeatID: vvipSeats[3].ID, Price: jackVVIP.Price},
				{SeatID: vvipSeats[4].ID, Price: jackVVIP.Price},
			},
		}
		db.Create(&order3)

		now := time.Now().UTC()
		db.Model(&models.Seat{}).Where("id IN ?", []interface{}{vvipSeats[3].ID, vvipSeats[4].ID}).
			Updates(map[string]interface{}{
				"status":            models.SeatLocked,
				"locked_by_user_id": customers[2].ID,
				"locked_at":         &now,
			})
		fmt.Printf("   ⏳ %s đang giữ 2 vé VVIP Jack (PENDING - 10 phút)\n", customers[2].FullName)
	}

	// ============================================================
	// 4. SAMPLE ORDERS FOR Sơn Tùng (Event 2)
	// ============================================================
	sonTungEvent := eventSeeds[1].event
	sonTungDiamond := eventSeeds[1].zones[0]

	var diamondSeats []models.Seat
	db.Where("zone_id = ?", sonTungDiamond.ID).Order("row_label ASC, seat_number ASC").Find(&diamondSeats)

	if len(diamondSeats) >= 4 {
		// customer[3] and customer[4] each bought 2 Diamond seats
		for idx, cust := range []models.User{customers[3], customers[4]} {
			offset := idx * 2
			order := models.Order{
				UserID:      cust.ID,
				EventID:     sonTungEvent.ID,
				TotalAmount: sonTungDiamond.Price * 2,
				Status:      models.OrderCompleted,
				ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
				OrderItems: []models.OrderItem{
					{SeatID: diamondSeats[offset].ID, Price: sonTungDiamond.Price},
					{SeatID: diamondSeats[offset+1].ID, Price: sonTungDiamond.Price},
				},
			}
			db.Create(&order)

			db.Model(&models.Seat{}).Where("id IN ?", []interface{}{diamondSeats[offset].ID, diamondSeats[offset+1].ID}).
				Update("status", models.SeatSold)

			for _, item := range order.OrderItems {
				ticket := models.Ticket{
					OrderID:     order.ID,
					SeatID:      item.SeatID,
					UserID:      cust.ID,
					QRCodeToken: fmt.Sprintf("TKR-MTP-%s", item.SeatID.String()[:8]),
				}
				db.Create(&ticket)
			}
			fmt.Printf("   ✅ %s mua 2 vé Diamond Sơn Tùng (COMPLETED)\n", cust.FullName)
		}
	}

	// ============================================================
	// 5. SAMPLE ORDERS FOR Rap Việt (Event 3)
	// ============================================================
	rapEvent := eventSeeds[2].event
	rapVIPStanding := eventSeeds[2].zones[0]

	var rapVIPSeats []models.Seat
	db.Where("zone_id = ?", rapVIPStanding.ID).Order("row_label ASC, seat_number ASC").Find(&rapVIPSeats)

	if len(rapVIPSeats) >= 6 {
		// customer[5], [6], [7] each bought 2 VIP Standing seats
		for idx, cust := range []models.User{customers[5], customers[6], customers[7]} {
			offset := idx * 2
			order := models.Order{
				UserID:      cust.ID,
				EventID:     rapEvent.ID,
				TotalAmount: rapVIPStanding.Price * 2,
				Status:      models.OrderCompleted,
				ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
				OrderItems: []models.OrderItem{
					{SeatID: rapVIPSeats[offset].ID, Price: rapVIPStanding.Price},
					{SeatID: rapVIPSeats[offset+1].ID, Price: rapVIPStanding.Price},
				},
			}
			db.Create(&order)

			db.Model(&models.Seat{}).Where("id IN ?", []interface{}{rapVIPSeats[offset].ID, rapVIPSeats[offset+1].ID}).
				Update("status", models.SeatSold)

			for _, item := range order.OrderItems {
				ticket := models.Ticket{
					OrderID:     order.ID,
					SeatID:      item.SeatID,
					UserID:      cust.ID,
					QRCodeToken: fmt.Sprintf("TKR-RAP-%s", item.SeatID.String()[:8]),
				}
				db.Create(&ticket)
			}
			fmt.Printf("   ✅ %s mua 2 vé VIP Standing Rap Việt (COMPLETED)\n", cust.FullName)
		}
	}

	// ============================================================
	// SUMMARY
	// ============================================================
	fmt.Println("\n" + "═══════════════════════════════════════════════")
	fmt.Println("🎉 SEEDING COMPLETED SUCCESSFULLY!")
	fmt.Println("═══════════════════════════════════════════════")
	fmt.Println()
	fmt.Println("📊 Summary:")
	fmt.Printf("   • Users:  1 admin + %d customers\n", len(customers))
	publishedCount := 0
	draftCount := 0
	for _, es := range eventSeeds {
		if es.event.IsPublished {
			publishedCount++
		} else {
			draftCount++
		}
	}
	fmt.Printf("   • Events: %d (%d published, %d draft)\n", len(eventSeeds), publishedCount, draftCount)

	totalSeats := 0
	for _, es := range eventSeeds {
		for _, z := range es.zones {
			totalSeats += z.TotalRows * z.SeatsPerRow
		}
	}
	fmt.Printf("   • Seats:  %d total\n", totalSeats)

	var orderCount, ticketCount int64
	db.Model(&models.Order{}).Count(&orderCount)
	db.Model(&models.Ticket{}).Count(&ticketCount)
	fmt.Printf("   • Orders: %d\n", orderCount)
	fmt.Printf("   • Tickets: %d\n", ticketCount)

	fmt.Println()
	fmt.Println("🔑 Login credentials (all passwords: 'password'):")
	fmt.Println("   Admin:    admin@ticketrush.com")
	fmt.Println("   Customer: customer@ticketrush.com")
	fmt.Println("             linhchi@gmail.com")
	fmt.Println("             minhduc@gmail.com")
	fmt.Println()
}
