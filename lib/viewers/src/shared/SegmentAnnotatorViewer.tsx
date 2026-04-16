import React, { useEffect, useMemo } from "react";
import {
  Annotation,
  ImageAnnotationPopup,
  ImageAnnotator,
  OpenSeadragonAnnotationPopup,
  OpenSeadragonAnnotator,
  OpenSeadragonViewer,
  PolygonGeometry,
  PopupProps,
  RectangleGeometry,
  UserSelectAction,
  useAnnotator,
} from "@annotorious/react";
import { AnnotationState } from "@annotorious/core/dist/model/AnnotationState";
import { DrawingStyle } from "@annotorious/core/dist/model/DrawingStyle";

export interface SegmentContourPoint {
  x: number;
  y: number;
}

export interface SegmentAnnotatorViewerProps {
  viewerType: "osd" | "img";
  tool: "rectangle" | "polygon" | "move";
  imageUrl: string;
  drawingEnabled?: boolean;
  selected?: boolean;
  zoomScale?: number;
  className?: string;
  annotations?: Annotation[];
  styleSelector?: (annotation: Annotation, state: AnnotationState | undefined) => DrawingStyle | undefined;
  needPopup?: boolean;
  popupRenderer?: (props: PopupProps) => React.ReactNode;
  onCreateContour?: (contour: SegmentContourPoint[]) => void;
  onUpdateContour?: (annotationId: string, contour: SegmentContourPoint[]) => void;
}

function extractContour(annotation: Annotation): SegmentContourPoint[] | null {
  const selector = annotation.target.selector as {
    type: string;
    geometry: RectangleGeometry | PolygonGeometry;
  };

  if (selector.type === "RECTANGLE") {
    const geometry = selector.geometry as RectangleGeometry;
    return [
      { x: Math.round(geometry.x), y: Math.round(geometry.y) },
      { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y) },
      { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y + geometry.h) },
      { x: Math.round(geometry.x), y: Math.round(geometry.y + geometry.h) },
    ];
  }

  if (selector.type === "POLYGON") {
    const geometry = selector.geometry as PolygonGeometry;
    return geometry.points.map((point) => ({ x: Math.round(point[0]), y: Math.round(point[1]) }));
  }

  return null;
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

  if (fromBody?.annotation) {
    return fromBody.annotation;
  }

  return annotation.id;
}

export default function SegmentAnnotatorViewer({
  viewerType,
  tool,
  imageUrl,
  drawingEnabled = false,
  selected = false,
  zoomScale = 1,
  className,
  annotations = [],
  styleSelector,
  needPopup = false,
  popupRenderer,
  onCreateContour,
  onUpdateContour,
}: SegmentAnnotatorViewerProps) {
  const annotator = useAnnotator();
  const classes = `viewer-wrapper ${className ?? ""}`.trim();
  const drawModeEnabled = drawingEnabled && selected && tool !== "move";
  const drawTool = drawModeEnabled ? tool : null;
  const imageTool = drawModeEnabled ? tool : undefined;
  const annotationList = useMemo(() => annotations, [annotations]);

  useEffect(() => {
    if (!annotator) {
      return;
    }

    annotator.clearAnnotations();
    if (styleSelector) {
      annotator.setStyle(styleSelector);
    }
    if (annotationList.length > 0) {
      annotator.setAnnotations(annotationList, true);
    }
  }, [annotator, styleSelector, imageUrl, annotationList]);

  useEffect(() => {
    if (!annotator) {
      return;
    }

    const handleCreate = (annotation: Annotation) => {
      if (!drawModeEnabled) {
        return;
      }
      const contour = extractContour(annotation);
      if (contour?.length) {
        onCreateContour?.(contour);
      }
    };

    const handleUpdate = (annotation: Annotation) => {
      if (!drawModeEnabled) {
        return;
      }
      const contour = extractContour(annotation);
      if (contour?.length) {
        onUpdateContour?.(resolveSegmentId(annotation), contour);
      }
    };

    annotator.on("createAnnotation", handleCreate as (annotation: unknown) => void);
    annotator.on(
      "updateAnnotation",
      handleUpdate as (annotation: unknown, previous: unknown) => void
    );

    return () => {
      const withOff = annotator as unknown as {
        off?: (event: string, handler: (...args: unknown[]) => void) => void;
      };
      withOff.off?.("createAnnotation", handleCreate as (...args: unknown[]) => void);
      withOff.off?.("updateAnnotation", handleUpdate as (...args: unknown[]) => void);
    };
  }, [annotator, drawModeEnabled, onCreateContour, onUpdateContour]);

  return (
    <div className={classes}>
      {viewerType === "osd" ? (
        imageUrl !== "" ? (
          <OpenSeadragonAnnotator
            key={`osd-${drawModeEnabled ? "edit" : "select"}-${tool}-${selected ? "1" : "0"}`}
            drawingEnabled={drawModeEnabled}
            tool={drawTool}
            userSelectAction={!drawModeEnabled ? UserSelectAction.SELECT : UserSelectAction.EDIT}
          >
            <OpenSeadragonViewer
              options={{
                tileSources: {
                  type: "image",
                  url: imageUrl,
                },
                prefixUrl: "/openseadragon-images/",
                gestureSettingsMouse: { clickToZoom: false },
              }}
              className="osd"
            />
            {needPopup && popupRenderer ? (
              <OpenSeadragonAnnotationPopup popup={popupRenderer} />
            ) : null}
          </OpenSeadragonAnnotator>
        ) : (
          <p style={{ width: "100%", height: "100%", margin: 0 }}>Изображение отсутствует</p>
        )
      ) : (
        <>
          <ImageAnnotator
            key={`img-${drawModeEnabled ? "edit" : "select"}-${tool}-${selected ? "1" : "0"}`}
            drawingEnabled={drawModeEnabled}
            tool={imageTool}
            userSelectAction={!drawModeEnabled ? UserSelectAction.SELECT : UserSelectAction.EDIT}
          >
            <div className="uzi-image-zoom-layer" style={{ transform: `scale(${zoomScale})` }}>
              <img src={imageUrl} alt="" />
            </div>
          </ImageAnnotator>
          {needPopup && popupRenderer ? <ImageAnnotationPopup popup={popupRenderer} /> : null}
        </>
      )}
    </div>
  );
}
