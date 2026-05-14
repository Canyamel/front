import React from "react";
import {
  OpenSeadragonAnnotationPopup,
  OpenSeadragonAnnotator,
  OpenSeadragonViewer,
} from "@annotorious/react";

import CommentPopup from "../CommentPopup/CommentPopup";
import { UziDrawingTool } from "../../../types";

interface OSDViewerProps {
  drawingEnable?: boolean;
  selected?: boolean;
  needPopup?: boolean;
  tool: UziDrawingTool;
  imageUrl: string;
  onDeleteSegment?: (segmentId: string) => void;
  onUndoDeleteSegment?: (segmentId: string) => void;
}

const OSDViewer: React.FC<OSDViewerProps> = ({
  drawingEnable = false,
  selected = false,
  needPopup = false,
  tool,
  imageUrl,
  onDeleteSegment,
  onUndoDeleteSegment,
}) => {
  return imageUrl !== "" ? (
    <OpenSeadragonAnnotator
      drawingEnabled={drawingEnable && selected}
      tool={drawingEnable && selected ? tool : null}
    >
      <OpenSeadragonViewer
        options={{
          tileSources: imageUrl,
          prefixUrl: "/openseadragon-images/",
          gestureSettingsMouse: {
            clickToZoom: false,
          },
        }}
        className="osd"
      />
      {needPopup && (
        <OpenSeadragonAnnotationPopup
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
    </OpenSeadragonAnnotator>
  ) : (
    <p style={{ width: "100%", height: "100%", margin: 0 }}>Изображение отсутствует</p>
  );
};

export default OSDViewer;
