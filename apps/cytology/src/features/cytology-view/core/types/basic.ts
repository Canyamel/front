import { BRUSH_TOOL, CALIBRATE_TOOL, RULER_TOOL } from "@medml/viewers";

export type Tools = "rectangle" | "polygon" | "move" | typeof BRUSH_TOOL | typeof RULER_TOOL | typeof CALIBRATE_TOOL;
export type Modes = "view" | "edit";
export type Modals = "addNode" | "editNode";

export interface IPaginated<T> {
    count: number;
    next: string;
    previous: string;
    results: T[];
}
