export type UziDrawingTool = "rectangle" | "polygon";
export type UziTirads = "tirads_23" | "tirads_4" | "tirads_5";

export interface UziViewerPoint {
  x: number;
  y: number;
}

export interface UziViewerSegment {
  id: string;
  ai: boolean;
  node_id: string;
  contor: UziViewerPoint[];
  image_id: string;
  tirads_23: number;
  tirads_4: number;
  tirads_5: number;
  exist: boolean;
  toDelete?: boolean;
  edited?: boolean;
}

export interface UziViewerNode {
  id: string;
  specialist?: string;
  tirads: UziTirads;
}

export interface UziViewerImageRef {
  id: string;
}
