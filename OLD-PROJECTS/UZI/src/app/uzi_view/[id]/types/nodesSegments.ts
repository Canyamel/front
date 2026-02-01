import { ISegment, ISegmentForNode } from "@/app/uzi_view/[id]/types/segments";
import { INode, INodeRaw } from "@/app/uzi_view/[id]/types/nodes";

export interface INodesSegments {
    nodes?: INode[];
    segments?: ISegment[];
}

export interface INodeSegmentRaw {
    node: INodeRaw;
    segments: ISegmentForNode[];
}
