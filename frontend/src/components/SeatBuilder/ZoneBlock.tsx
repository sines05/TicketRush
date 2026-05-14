import React from "react";
import type { ShapeType } from "./ShapePalette";

type ZoneBlockModel = {
  id: string;
  name: string;
  color: string;
  price: number;
  width: number;
  height: number;
  canvasX?: number;
  canvasY?: number;
  seatMode: "seated" | "standing";
  rotationAngle?: number;
  capacity?: number;
  shapeType: ShapeType;
  shapeParams: Record<string, unknown>;
};

type Props = {
  zone: ZoneBlockModel;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
};

function alpha(hex: string, opacity: string) {
  return `${hex}${opacity}`;
}

type ShapePreviewProps = {
  color: string;
  shapeType: ShapeType;
  seatMode?: "seated" | "standing";
  className?: string;
};

export function ZoneShapePreview({ color, shapeType, seatMode = "seated", className }: ShapePreviewProps) {
  const fill = alpha(color, "22");
  const stroke = color;

  if (shapeType === "banquet") {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={className}>
        <circle cx="32" cy="50" r="18" fill={fill} stroke={stroke} strokeWidth="4" />
        <circle cx="68" cy="50" r="18" fill={fill} stroke={stroke} strokeWidth="4" />
      </svg>
    );
  }

  if (shapeType === "chevron") {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={className}>
        <path d="M18 24 L50 78 L82 24" fill="none" stroke={stroke} strokeWidth="12" strokeLinejoin="round" />
        <path d="M30 24 L50 58 L70 24" fill="none" stroke={alpha(color, "88")} strokeWidth="8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (shapeType === "standing_block" || seatMode === "standing") {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={className}>
        <rect x="10" y="16" width="80" height="68" rx="10" fill={fill} stroke={stroke} strokeWidth="4" />
        <path d="M18 66c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        <path d="M18 50c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0" fill="none" stroke={alpha(color, "88")} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={className}>
      <rect x="10" y="18" width="80" height="64" rx="10" fill={fill} stroke={stroke} strokeWidth="4" />
      <path d="M18 34h64" stroke={alpha(color, "88")} strokeWidth="4" strokeLinecap="round" />
      <path d="M18 48h64" stroke={alpha(color, "88")} strokeWidth="4" strokeLinecap="round" />
      <path d="M18 62h64" stroke={alpha(color, "88")} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function ZoneBlock({ zone, className, style, onClick, onPointerDown }: Props) {
  return (
    <div
      data-zone-id={zone.id}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={"absolute select-none " + (className ? className : "")}
      style={{ width: zone.width, height: zone.height, ...style }}
      title={zone.name}
    >
      <div className="h-full w-full flex items-center justify-center">
        <ZoneShapePreview
          color={zone.color}
          shapeType={zone.shapeType}
          seatMode={zone.seatMode}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
