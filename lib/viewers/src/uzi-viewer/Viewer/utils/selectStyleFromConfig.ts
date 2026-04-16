import { Annotation } from "@annotorious/react";
import { AnnotationBody } from "@annotorious/core/dist/model/Annotation";
import { AnnotationState } from "@annotorious/core/dist/model/AnnotationState";
import { DrawingStyle } from "@annotorious/core/dist/model/DrawingStyle";

import { annotationTypesStyles } from "../config";
import { UziTirads } from "../../types";

export const selectStyleFromConfig = (
  annotation: Annotation,
  state: AnnotationState | undefined
): DrawingStyle | undefined => {
  const tagging = annotation.bodies.find((b: AnnotationBody) => b?.purpose === "tagging")?.value;
  let result: DrawingStyle | undefined;
  const response: { tirads: UziTirads; toDelete?: boolean } | undefined = tagging
    ? JSON.parse(tagging)
    : undefined;

  if (response && response.tirads in annotationTypesStyles) {
    if (state?.selected && annotationTypesStyles[response.tirads]?.select) {
      result = annotationTypesStyles[response.tirads].select;
    } else if (state?.hovered && annotationTypesStyles[response.tirads]?.hover) {
      result = annotationTypesStyles[response.tirads].hover;
    } else {
      result = {
        ...annotationTypesStyles[response.tirads],
      };

      if (response.toDelete) {
        result.fillOpacity = 0.18;
        result.strokeOpacity = 0.28;
      } else {
        result.fillOpacity = 0.28;
        result.strokeOpacity = 0.45;
      }
    }
  }

  return result;
};
