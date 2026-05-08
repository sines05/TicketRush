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
        className="cursor-move"
      />

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
        >
          +
        </button>
        <button 
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.2) }))}
          className="w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center border border-slate-600 transition-colors"
        >
          -
        </button>
        <button 
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center border border-slate-600 transition-colors"
        >
          ⟲
        </button>
      </div>
    </div>
  );
};

export default CanvasSeatmap;
