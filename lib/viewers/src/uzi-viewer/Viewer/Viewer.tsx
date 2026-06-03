import React, { useEffect } from "react";
import {
  Annotation,
  AnnotoriousImageAnnotator,
  PolygonGeometry,
  RectangleGeometry,
  useAnnotator,
} from "@annotorious/react";

import ImageViewer from "./components/ImageViewer/ImageViewer";
import OSDViewer from "./components/OSDViewer/OSDViewer";
import CommentPopup from "./components/CommentPopup/CommentPopup";
import { selectStyleFromConfig } from "./utils/selectStyleFromConfig";
import { generateAnnotation } from "./utils/generateAnnotation";
import { UziDrawingTool, UziViewerSegment } from "../types";
import { IPoint } from "./interfaces/queries";

import "./viewer.scss";
import "@annotorious/react/annotorious-react.css";

interface ViewerProps {
  viewerType: "osd" | "img";
  tool: UziDrawingTool;
  needPopup?: boolean;
  imageUrl: string;
  drawingEnabled?: boolean;
  className?: string;
  segments?: UziViewerSegment[];
  addSegment: (contour: IPoint[]) => void;
  changeSegment: (segmentId: string, contour: IPoint[]) => void;
  onDeleteSegment?: (segmentId: string) => void;
  onUndoDeleteSegment?: (segmentId: string) => void;
}

function resolveSegmentId(annotation: Annotation): string {
  const fromTarget = (annotation.target as { annotation?: unknown } | undefined)?.annotation;
  if (typeof fromTarget === "string" && fromTarget.length > 0) {
    return fromTarget;
  }

  const fromBody = annotation.bodies.find((body) => {
    const candidate = body as { annotation?: unknown };
    return typeof candidate.annotation === "string" && candidate.annotation.length > 0;
  }) as { annotation?: string } | undefined;

  return fromBody?.annotation ?? annotation.id;
}

const Viewer: React.FC<ViewerProps> = ({
  tool,
  needPopup = false,
  viewerType,
  imageUrl,
  drawingEnabled = false,
  className,
  segments = [],
  addSegment,
  changeSegment,
  onDeleteSegment,
  onUndoDeleteSegment,
}) => {
  const classes = `viewer-wrapper ${className ?? ""}`.trim();
  const annotator = useAnnotator<AnnotoriousImageAnnotator>();

  useEffect(() => {
    if (!annotator) {
      return;
    }

    annotator.clearAnnotations();
    annotator.setStyle(selectStyleFromConfig);

    if (segments.length > 0) {
      annotator.setAnnotations(segments.flatMap(generateAnnotation), true);
    }
  }, [annotator, imageUrl, segments]);

  useEffect(() => {
    if (!annotator) {
      return;
    }

    const handleSelectionChanged = (annotations: Annotation[]) => {
      if (annotations.length > 0) {
        const selectedStyles = selectStyleFromConfig(annotations[0], undefined);
        if (selectedStyles) {
          document.body.style.setProperty("--stroke-color", String(selectedStyles.stroke));
        } else {
          document.body.style.setProperty("--stroke-color", "");
        }
      } else {
        document.body.style.setProperty("--stroke-color", "");
      }
    };

    const handleCreate = (annotation: Annotation) => {
      if (!drawingEnabled) {
        return;
      }

      const selector = annotation.target.selector as {
        type: string;
        geometry: RectangleGeometry | PolygonGeometry;
      };
      let geometry: RectangleGeometry | PolygonGeometry | null = null;
      const contour: IPoint[] = [];

      if (selector.type === "RECTANGLE") {
        geometry = selector.geometry as RectangleGeometry;
        contour.push(
          { x: Math.round(geometry.x), y: Math.round(geometry.y) },
          { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y) },
          { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y + geometry.h) },
          { x: Math.round(geometry.x), y: Math.round(geometry.y + geometry.h) }
        );
      } else if (selector.type === "POLYGON") {
        geometry = selector.geometry as PolygonGeometry;
        contour.push(
          ...geometry.points.map((point) => ({ x: Math.round(point[0]), y: Math.round(point[1]) }))
        );
      }

      if (geometry && contour.length > 0) {
        addSegment(contour);
      }
    };

    const handleUpdate = (annotation: Annotation) => {
      if (!drawingEnabled) {
        return;
      }

      const selector = annotation.target.selector as {
        type: string;
        geometry: RectangleGeometry | PolygonGeometry;
      };
      let geometry: RectangleGeometry | PolygonGeometry | null = null;
      const contour: IPoint[] = [];

      if (selector.type === "RECTANGLE") {
        geometry = selector.geometry as RectangleGeometry;
        contour.push(
          { x: Math.round(geometry.x), y: Math.round(geometry.y) },
          { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y) },
          { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y + geometry.h) },
          { x: Math.round(geometry.x), y: Math.round(geometry.y + geometry.h) }
        );
      } else if (selector.type === "POLYGON") {
        geometry = selector.geometry as PolygonGeometry;
        contour.push(
          ...geometry.points.map((point) => ({ x: Math.round(point[0]), y: Math.round(point[1]) }))
        );
      }

      if (geometry && contour.length > 0) {
        changeSegment(resolveSegmentId(annotation), contour);
      }
    };

    annotator.on("selectionChanged", handleSelectionChanged as (annotations: unknown) => void);
    annotator.on("createAnnotation", handleCreate as (annotation: unknown) => void);
    annotator.on("updateAnnotation", handleUpdate as (annotation: unknown, previous: unknown) => void);

    return () => {
      const withOff = annotator as unknown as {
        off?: (event: string, handler: (...args: unknown[]) => void) => void;
      };
      withOff.off?.("selectionChanged", handleSelectionChanged as (...args: unknown[]) => void);
      withOff.off?.("createAnnotation", handleCreate as (...args: unknown[]) => void);
      withOff.off?.("updateAnnotation", handleUpdate as (...args: unknown[]) => void);
    };
  }, [annotator, drawingEnabled, addSegment, changeSegment]);

  return (
    <div className={classes}>
      {viewerType === "osd" ? (
        <OSDViewer
          tool={tool}
          needPopup={needPopup}
          imageUrl={imageUrl}
          drawingEnable={drawingEnabled}
          onDeleteSegment={onDeleteSegment}
          onUndoDeleteSegment={onUndoDeleteSegment}
        />
      ) : (
        <ImageViewer
          tool={tool}
          needPopup={needPopup}
          imageUrl={imageUrl}
          drawingEnable={drawingEnabled}
          onDeleteSegment={onDeleteSegment}
          onUndoDeleteSegment={onUndoDeleteSegment}
        />
      )}
    </div>
  );
};

export default Viewer;
