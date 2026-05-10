import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Seat {
  id: string;
  status: 'AVAILABLE' | 'LOCKED' | 'SOLD';
}

interface Zone {
  zone_id: string;
  zone_name: string;
  price: number;
  seats: Seat[][];
  level?: string; // 'upper', 'lower', etc.
  offset_x?: number;
  offset_y?: number;
}

interface CanvasSeatmapProps {
  eventId: string;
  zones: Zone[];
  onSeatSelect: (seatId: string) => void;
  selectedSeatIds: string[];
  currentLevel?: string;
}

const SEAT_SIZE = 20;
const SEAT_MARGIN = 5;
const ZONE_GAP = 100;
const ZONE_LABEL_HEIGHT = 60;
const SEAT_COLORS = {
  AVAILABLE: '#10B981', // Green-500
  LOCKED: '#F59E0B',    // Amber-500
  SOLD: '#EF4444',      // Red-500
  SELECTED: '#3B82F6',  // Blue-500
};

export const CanvasSeatmap: React.FC<CanvasSeatmapProps> = ({
  eventId,
  zones,
  onSeatSelect,
  selectedSeatIds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Viewport state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Handle WebSocket updates
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (eventId) {
        socket.send(JSON.stringify({ action: 'subscribe', channel: `event:${eventId}` }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const type = message.type;
        const targetIds = message.seat_ids || (message.seat_id ? [message.seat_id] : []);
        
        if (targetIds.length === 0) return;

        const now = Date.now();
        setRecentlyUpdatedSeats(prev => {
          const next = { ...prev };
          targetIds.forEach(id => { next[id] = now; });
          return next;
        });

        setSeatStatusOverrides(prev => {
          const next = { ...prev };
          targetIds.forEach(id => {
            next[id] = (type === 'SEAT_LOCKED' || type === 'SEATS_LOCKED') ? 'LOCKED' : 
                      (type === 'SEAT_SOLD' || type === 'SEATS_SOLD') ? 'SOLD' : 'AVAILABLE';
          });
          return next;
        });
      } catch (err) {
        console.error('WS Error:', err);
      }
    };

    return () => socket.close();
  }, [eventId]);

  const [seatStatusOverrides, setSeatStatusOverrides] = useState<Record<string, 'AVAILABLE' | 'LOCKED' | 'SOLD'>>({});
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  // Auto-select first level if not set
  useEffect(() => {
    const levels = Array.from(new Set(zones.map(z => z.level).filter(Boolean)));
    if (levels.length > 0 && !selectedLevel) {
      setSelectedLevel(levels[0] as string);
    }
  }, [zones, selectedLevel]);

  const levels = Array.from(new Set(zones.map(z => z.level).filter(Boolean))) as string[];
  const visibleZones = React.useMemo(() => 
    selectedLevel ? zones.filter(z => z.level === selectedLevel) : zones
  , [zones, selectedLevel]);

  const [pulseScale, setPulseScale] = useState(1);
  const [recentlyUpdatedSeats, setRecentlyUpdatedSeats] = useState<Record<string, number>>({});

  // Pulse animation for recently updated seats
  useEffect(() => {
    let startTime = Date.now();
    const animatePulse = () => {
      const elapsed = Date.now() - startTime;
      const scale = 1 + Math.sin(elapsed / 200) * 0.1;
      setPulseScale(scale);
      requestRef.current = requestAnimationFrame(animatePulse);
    };
    const animId = requestAnimationFrame(animatePulse);
    return () => cancelAnimationFrame(animId);
  }, []);

  const zoneOffsets = React.useMemo(() => {
    let currentY = 0;
    return visibleZones.map(zone => {
      const offset = currentY;
      const zoneHeight = zone.seats.length * (SEAT_SIZE + SEAT_MARGIN) + ZONE_LABEL_HEIGHT;
      currentY += zoneHeight + ZONE_GAP;
      return offset;
    });
  }, [visibleZones]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Calculate total height to center if needed, or just layout
    visibleZones.forEach((zone, zoneIdx) => {
      const zoneX = zone.offset_x || 0;
      const zoneY = (zone.offset_y || 0) + zoneOffsets[zoneIdx] + ZONE_LABEL_HEIGHT; 

      // Draw Zone Label with shadow for premium look
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.fillStyle = '#94A3B8'; // slate-400
      ctx.font = '500 14px Inter, sans-serif';
      ctx.fillText(`ZONE: ${zone.zone_name.toUpperCase()}`, zoneX, zoneY - 30);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(`$${zone.price}`, zoneX, zoneY - 8);
      ctx.shadowBlur = 0;

      zone.seats.forEach((row, rowIdx) => {
        row.forEach((seat, colIdx) => {
          const x = zoneX + colIdx * (SEAT_SIZE + SEAT_MARGIN);
          const y = zoneY + rowIdx * (SEAT_SIZE + SEAT_MARGIN);

          // Get status from override or props
          const status = seatStatusOverrides[seat.id] || seat.status;

          // Determine color
          let color = SEAT_COLORS[status];
          if (selectedSeatIds.includes(seat.id)) {
            color = SEAT_COLORS.SELECTED;
          }

          // Optimization: Only draw if within viewport (Frustum Culling)
          // World to screen
          const screenX = x * transform.scale + transform.x;
          const screenY = y * transform.scale + transform.y;
          const screenW = SEAT_SIZE * transform.scale;
          const screenH = SEAT_SIZE * transform.scale;

          if (
            screenX + screenW < 0 || screenX > width ||
            screenY + screenH < 0 || screenY > height
          ) {
            return;
          }

          // Pulse effect for recently updated seats
          const updatedTime = recentlyUpdatedSeats[seat.id];
          const isRecentlyUpdated = updatedTime && (Date.now() - updatedTime < 3000);
          
          if (isRecentlyUpdated) {
            ctx.save();
            ctx.translate(x + SEAT_SIZE / 2, y + SEAT_SIZE / 2);
            ctx.scale(pulseScale, pulseScale);
            ctx.translate(-(x + SEAT_SIZE / 2), -(y + SEAT_SIZE / 2));
          }

          // Draw Seat
          ctx.fillStyle = color;
          const radius = 5;
          
          // Draw shadow for available seats to make them pop
          if (status === 'AVAILABLE') {
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(16, 185, 129, 0.2)';
          }

          ctx.beginPath();
          ctx.roundRect(x, y, SEAT_SIZE, SEAT_SIZE, radius);
          ctx.fill();
          ctx.shadowBlur = 0;

          if (isRecentlyUpdated) {
            ctx.restore();
          }

          // If locked or sold, add a small icon/pattern?
          if (status === 'SOLD') {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 5);
            ctx.lineTo(x + SEAT_SIZE - 5, y + SEAT_SIZE - 5);
            ctx.moveTo(x + SEAT_SIZE - 5, y + 5);
            ctx.lineTo(x + 5, y + SEAT_SIZE - 5);
            ctx.stroke();
          }

          // Highlight border if selected
          if (selectedSeatIds.includes(seat.id)) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // Add a "selected" pulse effect if we wanted to be fancy
          }
        });
      });
    });

    ctx.restore();
  }, [visibleZones, zoneOffsets, transform, selectedSeatIds, seatStatusOverrides]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) {
      // It was a click, handle selection
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Inverse transform to find world coordinates
      const worldX = (mouseX - transform.x) / transform.scale;
      const worldY = (mouseY - transform.y) / transform.scale;

      // Find seat at worldX, worldY
      visibleZones.forEach((zone, zoneIdx) => {
        const zoneX = zone.offset_x || 0;
        const zoneY = (zone.offset_y || 0) + zoneOffsets[zoneIdx] + ZONE_LABEL_HEIGHT;

        zone.seats.forEach((row, rowIdx) => {
          row.forEach((seat, colIdx) => {
            const x = zoneX + colIdx * (SEAT_SIZE + SEAT_MARGIN);
            const y = zoneY + rowIdx * (SEAT_SIZE + SEAT_MARGIN);

            if (
              worldX >= x && worldX <= x + SEAT_SIZE &&
              worldY >= y && worldY <= y + SEAT_SIZE
            ) {
              if (seat.status === 'AVAILABLE') {
                onSeatSelect(seat.id);
              }
            }
          });
        });
      });
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    const newScale = Math.min(Math.max(transform.scale + delta, 0.2), 5);
    
    // Zoom towards mouse position
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - transform.x) / transform.scale;
      const worldY = (mouseY - transform.y) / transform.scale;

      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      setTransform({ x: newX, y: newY, scale: newScale });
    }
  };

  // Touch handlers for mobile support
  const [lastTouchPos, setLastTouchPos] = useState({ x: 0, y: 0 });
  const [lastTouchDist, setLastTouchDist] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouchPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - lastTouchPos.x;
      const dy = e.touches[0].clientY - lastTouchPos.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastTouchPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDist > 0) {
        const delta = (dist - lastTouchDist) * 0.01;
        const newScale = Math.min(Math.max(transform.scale + delta, 0.2), 5);
        
        // Zoom towards center of touches
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = centerX - rect.left;
          const mouseY = centerY - rect.top;
          const worldX = (mouseX - transform.x) / transform.scale;
          const worldY = (mouseY - transform.y) / transform.scale;
          const newX = mouseX - worldX * newScale;
          const newY = mouseY - worldY * newScale;
          setTransform({ x: newX, y: newY, scale: newScale });
        }
      }
      setLastTouchDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDist(0);
  };

  // Keyboard Navigation
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedSeatId) {
        // Find first available seat if none focused
        const firstSeat = visibleZones[0]?.seats[0]?.[0];
        if (firstSeat) setFocusedSeatId(firstSeat.id);
        return;
      }

      // Logic to find adjacent seat could be complex, 
      // but let's implement a simple version or at least Enter to select
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSeatSelect(focusedSeatId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedSeatId, visibleZones, onSeatSelect]);

  return (
    <div className="relative w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Level Selector */}
      {levels.length > 0 && (
        <div className="absolute top-4 left-4 flex bg-slate-800/90 backdrop-blur-md p-1 rounded-lg border border-slate-600 shadow-lg">
          {levels.map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedLevel === level 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="cursor-move outline-none"
        tabIndex={0}
        role="img"
        aria-label="Sơ đồ ghế ngồi tương tác. Sử dụng chuột để kéo và cuộn để phóng to. Nhấp vào ghế trống để chọn."
      />
      <div className="sr-only">
        Sơ đồ ghế ngồi tương tác. Hiện tại đang hiển thị tầng {selectedLevel?.toUpperCase()}.
        Sử dụng các nút điều khiển để phóng to, thu nhỏ hoặc đặt lại chế độ xem.
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 bg-slate-800/80 backdrop-blur-md p-3 rounded-lg border border-slate-600 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.AVAILABLE }} />
          <span className="text-xs text-white">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.LOCKED }} />
          <span className="text-xs text-white">Locked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.SOLD }} />
          <span className="text-xs text-white">Sold</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.SELECTED }} />
          <span className="text-xs text-white">Selected</span>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button 
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 5) }))}
          className="w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center border border-slate-600 transition-colors"
          aria-label="Phóng to"
        >
          +
        </button>
        <button 
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.2) }))}
          className="w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center border border-slate-600 transition-colors"
          aria-label="Thu nhỏ"
        >
          -
        </button>
        <button 
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center border border-slate-600 transition-colors"
          aria-label="Đặt lại chế độ xem"
        >
          ⟲
        </button>
      </div>
    </div>
  );
};

export default CanvasSeatmap;
