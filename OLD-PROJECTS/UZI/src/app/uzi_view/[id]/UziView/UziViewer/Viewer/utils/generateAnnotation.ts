import { ShapeType } from "@annotorious/openseadragon";

import { ISegmentRedux } from "@/app/uzi_view/[id]/types/segments";

import { getMaxType } from "./getMaxType";
import { minMaxPoint } from "./minMaxPoint";

export const generateAnnotation = (segment: ISegmentRedux) => {
    return {
        id: segment.id,
        bodies: [
            {
                id: "",
                annotation: segment.id,
                purpose: "tagging",
                value: JSON.stringify({
                    tirads: getMaxType(segment),
                    ai: segment.ai,
                    toDelete: segment.toDelete,
                }),
            },
        ],
        target: {
            annotation: segment.id,
            selector: {
                type: ShapeType.POLYGON,
                geometry: {
                    bounds: minMaxPoint(segment.contor),
                    points: segment.contor.map((value) => [value.x, value.y]),
                },
            },
        },
    };
};
