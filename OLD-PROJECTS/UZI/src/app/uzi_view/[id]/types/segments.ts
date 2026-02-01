import { ITirads } from "@/app/uzi_view/[id]/types/tirads";
import { IPoint } from "../UziView/UziViewer/Viewer/interfaces/queries";

export interface ISegmentForNode extends ITirads {
    contor: IPoint[];
    image_id: string;
}

export interface ISegmentRaw extends ISegmentForNode {
    node_id: string;
}

export interface ISegment extends ISegmentRaw {
    id: string;
    ai: boolean;
}

export interface ISegmentRedux extends ISegment {
    exist: boolean;
    toDelete?: boolean;
    edited?: boolean;
}
