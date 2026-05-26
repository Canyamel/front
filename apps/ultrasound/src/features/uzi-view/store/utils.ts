import { IDiagnosisInfo } from "../types/diagnosis";
import { INode } from "../types/nodes";
import { tiradsType } from "../types/tiradsType";
import { getMaxType, TiradsKeys } from "../UziView/UziViewer/Viewer/utils/getMaxType";

export const transformNode = (node: INode, index: number): IDiagnosisInfo => {
    const maxType: TiradsKeys = getMaxType(node);

    return {
        id: node.id,
        title: `Образование ${index + 1}`,
        specialist: node.ai ? "ai" : "med",
        result: `${tiradsType[maxType]}${
            node.ai ? ` - ${(node[maxType] * 100).toFixed(0)}%` : ""
        } `,
        tirads: maxType,
        tiradsValue: node[maxType],
        serial: index + 1,
    };
};

export const transformNodes = (response: INode[]): IDiagnosisInfo[] => response.map(transformNode);
