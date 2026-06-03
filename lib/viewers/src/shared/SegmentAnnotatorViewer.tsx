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

type AnnotatorBindingsProps = {
  imageUrl: string;
  annotationList: Annotation[];
  styleSelector?: SegmentAnnotatorViewerProps["styleSelector"];
  drawModeEnabled: boolean;
  onCreateContour?: (contour: SegmentContourPoint[]) => void;
  onUpdateContour?: (annotationId: string, contour: SegmentContourPoint[]) => void;
};

/**
 * Должен быть потомком ImageAnnotator / OpenSeadragonAnnotator — иначе useAnnotator() пустой
 * и сегменты не отображаются (регрессия после выноса в @medml/viewers).
 */
function useAnnotatorBindings({
  annotationList,
  styleSelector,
  drawModeEnabled,
  onCreateContour,
  onUpdateContour,
  imageUrl,
}: AnnotatorBindingsProps) {
  const annotator = useAnnotator();

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
}

function ImageAnnotatorBindings(props: AnnotatorBindingsProps) {
  useAnnotatorBindings(props);
  return (
    <img
      src={props.imageUrl}
      alt=""
      draggable={false}
      className="uzi-viewer-image"
    />
  );
}

function OsdAnnotatorBindings(props: AnnotatorBindingsProps) {
  useAnnotatorBindings(props);
  return null;
}

export default function SegmentAnnotatorViewer({
  viewerType,
  tool,
  imageUrl,
  drawingEnabled = false,
  selected = false,
  className,
  annotations = [],
  styleSelector,
  needPopup = false,
  popupRenderer,
  onCreateContour,
  onUpdateContour,
}: SegmentAnnotatorViewerProps) {
  const classes = `viewer-wrapper ${className ?? ""}`.trim();
  const drawModeEnabled = drawingEnabled && selected && tool !== "move";
  const drawTool = drawModeEnabled ? tool : null;
  const imageTool = drawModeEnabled ? tool : undefined;
  const annotationList = useMemo(() => annotations, [annotations]);

  const bindingProps: AnnotatorBindingsProps = {
    imageUrl,
    annotationList,
    styleSelector,
    drawModeEnabled,
    onCreateContour,
    onUpdateContour,
  };

  return (
    <div className={classes}>
      {viewerType === "osd" ? (
        imageUrl !== "" ? (
          <OpenSeadragonAnnotator
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
                gestureSettingsMouse: {
                  clickToZoom: false,
                  dragToPan: !drawModeEnabled,
                },
              }}
              className="osd"
            />
            <OsdAnnotatorBindings {...bindingProps} />
            {needPopup && popupRenderer ? (
              <OpenSeadragonAnnotationPopup popup={popupRenderer} />
            ) : null}
          </OpenSeadragonAnnotator>
        ) : (
          <p style={{ width: "100%", height: "100%", margin: 0 }}>Изображение отсутствует</p>
        )
      ) : imageUrl !== "" ? (
        <>
          <ImageAnnotator
            drawingEnabled={drawModeEnabled}
            tool={imageTool ?? tool}
            userSelectAction={!drawModeEnabled ? UserSelectAction.SELECT : UserSelectAction.EDIT}
          >
            <ImageAnnotatorBindings {...bindingProps} />
          </ImageAnnotator>
          {needPopup && popupRenderer ? <ImageAnnotationPopup popup={popupRenderer} /> : null}
        </>
      ) : (
        <p style={{ width: "100%", height: "100%", margin: 0 }}>Изображение отсутствует</p>
      )}
    </div>
  );
}
