import React, { useEffect, useMemo } from "react";
import {
  Annotation,
  PopupProps,
} from "@annotorious/react";

import SegmentAnnotatorViewer from "../../shared/SegmentAnnotatorViewer";
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
  selected?: boolean;
  zoomScale?: number;
  className?: string;
  segments?: UziViewerSegment[];
  addSegment: (contour: IPoint[]) => void;
  changeSegment: (segmentId: string, contour: IPoint[]) => void;
  onDeleteSegment?: (segmentId: string) => void;
  onUndoDeleteSegment?: (segmentId: string) => void;
}

const Viewer: React.FC<ViewerProps> = ({
  tool,
  needPopup = false,
  viewerType,
  imageUrl,
  drawingEnabled = false,
  selected = false,
  zoomScale = 1,
  className,
  segments = [],
  addSegment,
  changeSegment,
  onDeleteSegment,
  onUndoDeleteSegment,
}) => {
  const classes = className;
  const mappedAnnotations = useMemo(
    () => segments.flatMap(generateAnnotation) as Annotation[],
    [segments]
  );

  useEffect(() => {
    if (segments.length > 0) {
      const selectedStyles = selectStyleFromConfig(generateAnnotation(segments[0]) as Annotation, undefined);
      if (selectedStyles) {
        document.body.style.setProperty("--stroke-color", String(selectedStyles?.stroke ?? ""));
      }
    } else {
      document.body.style.setProperty("--stroke-color", "");
    }
  }, [segments]);

  return (
    <SegmentAnnotatorViewer
      className={classes}
      viewerType={viewerType}
      tool={tool}
      imageUrl={imageUrl}
      drawingEnabled={drawingEnabled}
      selected={selected}
      zoomScale={zoomScale}
      annotations={mappedAnnotations}
      styleSelector={selectStyleFromConfig}
      needPopup={needPopup}
      popupRenderer={(props: PopupProps) => (
        <CommentPopup
          {...props}
          isEditingMode={drawingEnabled}
          onDeleteSegment={onDeleteSegment}
          onUndoDeleteSegment={onUndoDeleteSegment}
        />
      )}
      onCreateContour={(contour) => addSegment(contour as IPoint[])}
      onUpdateContour={(segmentId, contour) => changeSegment(segmentId, contour as IPoint[])}
    />
  );
};

export default Viewer;
