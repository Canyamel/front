import { ISegment, ISegmentForNode } from "@/features/uzi-view/types/segments";
import { INode, INodeRaw } from "@/features/uzi-view/types/nodes";

export interface INodesSegments {
    nodes?: INode[];
    segments?: ISegment[];
}

export interface INodeSegmentRaw {
    node: INodeRaw;
    segments: ISegmentForNode[];
}
