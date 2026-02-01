import { ITirads } from "@/app/uzi_view/[id]/types/tirads";
import { ISegmentRedux } from "./segments";

export interface INodeRaw extends ITirads {
    description: string;
}

export interface INodeBase extends INodeRaw {
    id: string;
    uzi_id: string;
    ai: boolean;
}

export interface INode extends INodeBase {
    validation: string;
}

export interface INodeRedux extends INodeBase {
    segments: ISegmentRedux[];
    serial: number;
    exist: boolean;
    edited?: boolean;
    toDelete?: boolean;
}
