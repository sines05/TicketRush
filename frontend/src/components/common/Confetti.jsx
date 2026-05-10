import React, { useEffect, useRef } from 'react';

export default function Confetti({ duration = 3000 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const numberOfPieces = 200;
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

    class Piece {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.rotation = Math.random() * 360;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.diameter = Math.random() * 10 + 5;
        this.speed = Math.random() * 3 + 2;
      }

      update() {
        this.y += this.speed;
        this.rotation += this.speed;
        if (this.y > canvas.height) {
          this.y = -20;
          this.x = Math.random() * canvas.width;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.diameter / 2, -this.diameter / 2, this.diameter, this.diameter);
        ctx.restore();
      }
    }

    for (let i = 0; i < numberOfPieces; i++) {
      pieces.push(new Piece());
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(piece => {
        piece.update();
        piece.draw();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const timeout = setTimeout(() => {
      cancelAnimationFrame(animationId);
    }, duration);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timeout);
    };
  }, [duration]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
    />
  );
}
