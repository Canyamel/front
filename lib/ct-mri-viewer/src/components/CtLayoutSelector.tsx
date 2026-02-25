"use client";

import { useState } from "react";
import { Popover, Tooltip, Button } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";

export type CtLayoutId = "1x1" | "2x1" | "1x2" | "2x2" | "3x1" | "1x3";

type GridCell = {
  layout?: CtLayoutId;
  row: number;
  col: number;
  label?: string;
};

const GRID: GridCell[] = [
  { layout: "1x1", row: 0, col: 0, label: "1 окно" },
  { layout: "2x1", row: 0, col: 1, label: "2 окна (слева–справа)" },
  { layout: "3x1", row: 0, col: 2, label: "3 окна (слева–справа)" },
  { layout: "1x2", row: 1, col: 0, label: "2 окна (сверху–снизу)" },
  { layout: "2x2", row: 1, col: 1, label: "4 окна" },
  { layout: undefined, row: 1, col: 2 },
  { layout: "1x3", row: 2, col: 0, label: "3 окна (сверху–снизу)" },
  { layout: undefined, row: 2, col: 1 },
  { layout: undefined, row: 2, col: 2 },
];

const CELL_SIZE = 28;
const GAP = 4;

type CtLayoutSelectorProps = {
  layout: CtLayoutId;
  onLayoutChange: (layout: CtLayoutId) => void;
};

export function CtLayoutSelector({ layout, onLayoutChange }: CtLayoutSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoverLayout, setHoverLayout] = useState<CtLayoutId | null>(null);

  const activeLayout = hoverLayout ?? layout;

  const content = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${CELL_SIZE}px ${CELL_SIZE}px ${CELL_SIZE}px`,
        gridTemplateRows: `${CELL_SIZE}px ${CELL_SIZE}px ${CELL_SIZE}px`,
        gap: GAP,
        padding: 4,
      }}
    >
      {GRID.map(({ layout: id, row, col, label }) => {
        const isDisabled = !id;
        const isActive =
          activeLayout === "1x1"
            ? row === 0 && col === 0
            : activeLayout === "2x1"
              ? row === 0 && col <= 1
              : activeLayout === "3x1"
                ? row === 0
                : activeLayout === "1x2"
                  ? col === 0 && row <= 1
                  : activeLayout === "1x3"
                    ? col === 0
                    : activeLayout === "2x2"
                      ? row <= 1 && col <= 1
                      : false;
        return (
          <Tooltip key={`${row}-${col}`} title={label} placement="top">
            <Button
              type={isActive ? "primary" : "default"}
              size="small"
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                width: CELL_SIZE,
                height: CELL_SIZE,
                padding: 0,
                borderRadius: 4,
                backgroundColor: isDisabled ? "rgba(0,0,0,0.04)" : undefined,
              }}
              disabled={isDisabled}
              onMouseEnter={id ? () => setHoverLayout(id) : undefined}
              onMouseLeave={id ? () => setHoverLayout(null) : undefined}
              onClick={
                id
                  ? () => {
                      onLayoutChange(id);
                      setOpen(false);
                    }
                  : undefined
              }
              aria-label={label ?? "Недоступно"}
            />
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
      overlayInnerStyle={{ padding: 0 }}
    >
      <Button
        type={open ? "primary" : "default"}
        shape="circle"
        icon={<AppstoreOutlined />}
        aria-label="Выбор раскладки окон"
      />
    </Popover>
  );
}
