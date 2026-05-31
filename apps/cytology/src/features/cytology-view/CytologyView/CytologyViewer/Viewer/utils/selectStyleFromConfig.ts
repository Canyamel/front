import { Annotation } from "@annotorious/react";
import { AnnotationBody } from "@annotorious/core/dist/model/Annotation";
import { AnnotationState } from "@annotorious/core/dist/model/AnnotationState";
import { DrawingStyle } from "@annotorious/core/dist/model/DrawingStyle";

import { annotationTypesStyles } from "../config";

export const selectStyleFromConfig = (
    annotation: Annotation,
    state: AnnotationState | undefined
): DrawingStyle | undefined => {
    const tagging = annotation.bodies.find((b: AnnotationBody) => b?.purpose === "tagging")?.value;
    let result: DrawingStyle | undefined = undefined;
    const response:
        | { ai?: boolean; toDelete?: boolean; toUpdate?: boolean; toAdd?: boolean }
        | undefined = tagging ? JSON.parse(tagging) : undefined;

    if (response) {
        if (response.toAdd) {
            result = annotationTypesStyles.add;
        } else if (response.toDelete) {
            result = annotationTypesStyles.delete;
        } else if (response.toUpdate) {
            result = annotationTypesStyles.update;
        } else {
            result = annotationTypesStyles.default;
        }
    }

    return result;
};
