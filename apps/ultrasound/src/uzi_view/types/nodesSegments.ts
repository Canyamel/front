import { ISegment, ISegmentForNode } from "@/uzi_view/types/segments";
import { INode, INodeRaw } from "@/uzi_view/types/nodes";

export interface INodesSegments {
    nodes?: INode[];
    segments?: ISegment[];
}

export interface INodeSegmentRaw {
    node: INodeRaw;
    segments: ISegmentForNode[];
}
