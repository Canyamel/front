import React from "react";
import { ImageAnnotationPopup, ImageAnnotator, UserSelectAction } from "@annotorious/react";

import CommentPopup from "../CommentPopup/CommentPopup";
import { UziDrawingTool } from "../../../types";

interface ImageViewerProps {
  drawingEnable?: boolean;
  tool: UziDrawingTool;
  needPopup?: boolean;
  imageUrl: string;
  onDeleteSegment?: (segmentId: string) => void;
  onUndoDeleteSegment?: (segmentId: string) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  drawingEnable = false,
  tool,
  needPopup = true,
  imageUrl,
  onDeleteSegment,
  onUndoDeleteSegment,
}) => {
  return (
    <>
      <ImageAnnotator
        drawingEnabled={drawingEnable}
        tool={tool}
        userSelectAction={!drawingEnable ? UserSelectAction.SELECT : UserSelectAction.EDIT}
      >
        <img src={imageUrl} alt="" draggable={false} className="uzi-viewer-image" />
      </ImageAnnotator>

      {needPopup && (
        <ImageAnnotationPopup
          popup={(props) => (
            <CommentPopup
              {...props}
              isEditingMode={drawingEnable}
              onDeleteSegment={onDeleteSegment}
              onUndoDeleteSegment={onUndoDeleteSegment}
            />
          )}
        />
      )}
    </>
  );
};

export default ImageViewer;
