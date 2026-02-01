import { Annotation } from "@annotorious/react";
import { AnnotationBody } from "@annotorious/core/dist/model/Annotation";
import { AnnotationState } from "@annotorious/core/dist/model/AnnotationState";
import { DrawingStyle } from "@annotorious/core/dist/model/DrawingStyle";

import { annotationTypesStyles } from "../config";
import { Tirads } from "@/app/uzi_view/[id]/types/types";

export const selectStyleFromConfig = (
    annotation: Annotation,
    state: AnnotationState | undefined
): DrawingStyle | undefined => {
    const tagging = annotation.bodies.find((b: AnnotationBody) => b?.purpose === "tagging")?.value;
    let result: DrawingStyle | undefined = undefined;
    const response: { tirads: Tirads; toDelete?: boolean } | undefined = tagging
        ? JSON.parse(tagging)
        : undefined;

    if (response && response.tirads in annotationTypesStyles) {
        if (state?.selected && annotationTypesStyles[response.tirads]?.select) {
            result = annotationTypesStyles[response.tirads].select;
        } else if (state?.hovered && annotationTypesStyles[response.tirads]?.hover) {
            result = annotationTypesStyles[response.tirads].hover;
        } else {
            result = annotationTypesStyles[response.tirads];

            if (response.toDelete) {
                result.fillOpacity = 0.3;
                result.strokeOpacity = 0.3;
            } else {
                result.fillOpacity = 0.7;
                result.strokeOpacity = 0.7;
            }
        }
    }

    return result;
};
