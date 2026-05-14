import React, { useEffect, useMemo, useState } from "react";

export type FloorGroupId = string;

export type FloorGroupModel = {
  id: FloorGroupId;
  name: string;
  isCollapsed: boolean;
};

export type FloorGroupRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MenuState = null | { x: number; y: number; zoneId: string };

type Props = {
  group: FloorGroupModel;
  bounds: FloorGroupRect;
  allGroups: FloorGroupModel[];
  onToggleCollapse: (groupId: FloorGroupId) => void;
  onAssignZoneToGroup: (zoneId: string, groupId: FloorGroupId | null) => void;
  children?: React.ReactNode;
};

export function FloorGroup({
  group,
  bounds,
  allGroups,
  onToggleCollapse,
  onAssignZoneToGroup,
  children,
}: Props) {
  const [menu, setMenu] = useState<MenuState>(null);

  const groupList = useMemo(() => {
    return [...(allGroups || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroups]);

  useEffect(() => {
    if (!menu) return;
    const onDown = () => setMenu(null);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu]);

  return (
    <div
      className="absolute rounded-lg border bg-background/40"
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      onContextMenu={(e) => {
        const el = (e.target as HTMLElement | null)?.closest?.("[data-zone-id]") as
          | HTMLElement
          | null;
        const zoneId = el?.dataset?.zoneId;
        if (!zoneId) return;
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, zoneId });
      }}
    >
      <div className="flex items-center justify-between border-b bg-card/60 px-2 py-1">
        <div className="truncate text-xs font-semibold">{group.name}</div>
        <button
          type="button"
          onClick={() => onToggleCollapse(group.id)}
          className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          {group.isCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      <div className="relative h-[calc(100%-34px)]">
        {!group.isCollapsed ? children : null}
      </div>

      {menu ? (
        <div
          className="fixed z-50 w-56 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs font-semibold">Assign to floor</div>
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              onAssignZoneToGroup(menu.zoneId, null);
              setMenu(null);
            }}
          >
            Unassigned
          </button>
          <div className="h-px bg-border" />
          {groupList.map((g) => (
            <button
              key={g.id}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onAssignZoneToGroup(menu.zoneId, g.id);
                setMenu(null);
              }}
            >
              {g.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
