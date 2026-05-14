import React from "react";

export const ZONE_DND_MIME = "application/x-ticketrush-add-zone";

export type ShapeType =
  | "theatre"
  | "banquet"
  | "standing_block"
  | "chevron"
  // legacy (temporary; will be removed once renderers/payloads are migrated)
  | "curved_rows"
  | "round_table"
  | "fan"
  | "standing";

export type AddZoneAction = {
  type: "ADD_ZONE";
  payload: {
    shapeType: ShapeType;
    zoneDefaults: {
      name: string;
      price: number;
      color: string;
      width: number;
      height: number;
      seatMode: "seated" | "standing";
      shapeParams: Record<string, unknown>;
    };
  };
};

type PaletteItem = {
  id: string;
  label: string;
  shapeType: ShapeType;
  Icon: React.FC;
  defaults: AddZoneAction["payload"]["zoneDefaults"];
};

const IconBase = ({ children }: { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 40 40"
    className="h-10 w-10 text-muted-foreground"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const TheatreIcon = () => (
  <IconBase>
    {Array.from({ length: 4 }).flatMap((_, r) =>
      Array.from({ length: 4 }).map((__, c) => (
        <circle key={`${r}-${c}`} cx={11 + c * 6} cy={12 + r * 6} r="1.4" />
      ))
    )}
  </IconBase>
);

const BanquetIcon = () => (
  <IconBase>
    <circle cx="14" cy="20" r="5" />
    <circle cx="26" cy="20" r="5" />
    <circle cx="20" cy="12" r="2" />
    <circle cx="20" cy="28" r="2" />
  </IconBase>
);

const StandingBlockIcon = () => (
  <IconBase>
    <rect x="8" y="10" width="24" height="20" rx="3" />
    {/* crowd lines */}
    <path d="M12 25c1-2 3-2 4 0s3 2 4 0 3-2 4 0 3 2 4 0" />
    <path d="M12 21c1-2 3-2 4 0s3 2 4 0 3-2 4 0 3 2 4 0" opacity="0.8" />
    <path d="M12 17c1-2 3-2 4 0s3 2 4 0 3-2 4 0 3 2 4 0" opacity="0.6" />
  </IconBase>
);

const ChevronIcon = () => (
  <IconBase>
    <path d="M10 14l10 14 10-14" />
    <path d="M13 14l7 10 7-10" opacity="0.7" />
  </IconBase>
);

const ITEMS: PaletteItem[] = [
  {
    id: "theatre",
    label: "Theatre / Auditorium",
    shapeType: "theatre",
    Icon: TheatreIcon,
    defaults: {
      name: "Theatre Zone",
      price: 150000,
      color: "#60a5fa",
      width: 320,
      height: 240,
      seatMode: "seated",
      shapeParams: { rows: 10, seatsPerRow: 14 },
    },
  },
  {
    id: "banquet",
    label: "Banquet",
    shapeType: "banquet",
    Icon: BanquetIcon,
    defaults: {
      name: "Banquet Zone",
      price: 250000,
      color: "#60a5fa",
      width: 380,
      height: 260,
      seatMode: "seated",
      shapeParams: { tableCount: 4, seatsPerTable: 8, tableRadius: 34 },
    },
  },
  {
    id: "standing_block",
    label: "Standing Block",
    shapeType: "standing_block",
    Icon: StandingBlockIcon,
    defaults: {
      name: "Standing",
      price: 90000,
      color: "#60a5fa",
      width: 240,
      height: 160,
      seatMode: "standing",
      shapeParams: { capacity: 300 },
    },
  },
  {
    id: "chevron",
    label: "Chevron (V-shape)",
    shapeType: "chevron",
    Icon: ChevronIcon,
    defaults: {
      name: "Chevron Zone",
      price: 140000,
      color: "#60a5fa",
      width: 380,
      height: 260,
      seatMode: "seated",
      shapeParams: { rows: 8, seatsPerRow: 7, angle: 30 },
    },
  },
];

export function readAddZoneActionFromDrop(e: React.DragEvent): AddZoneAction | null {
  const raw = e.dataTransfer.getData(ZONE_DND_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AddZoneAction;
  } catch {
    return null;
  }
}

export function ShapePalette() {
  return (
    <aside className="w-72 shrink-0 border-r bg-background p-3">
      <div className="mb-3 text-sm font-semibold">Shapes</div>
      <div className="space-y-2">
        {ITEMS.map((item) => {
          const action: AddZoneAction = {
            type: "ADD_ZONE",
            payload: { shapeType: item.shapeType, zoneDefaults: item.defaults },
          };

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData(ZONE_DND_MIME, JSON.stringify(action));
                e.dataTransfer.setData("text/plain", item.id);
              }}
              className="flex cursor-grab select-none items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent"
              title="Drag onto canvas"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-background">
                <item.Icon />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.label}</div>
                <div className="truncate text-xs text-muted-foreground">Drop to add zone</div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
