import React, { useMemo } from "react";
import {
  OpenSeadragonAnnotationPopup,
  OpenSeadragonAnnotator,
  OpenSeadragonViewer,
  UserSelectAction,
} from "@annotorious/react";

import CommentPopup from "../CommentPopup/CommentPopup";
import { UziDrawingTool } from "../../../types";

interface OSDViewerProps {
  drawingEnable?: boolean;
  needPopup?: boolean;
  tool: UziDrawingTool;
  imageUrl: string;
  onDeleteSegment?: (segmentId: string) => void;
  onUndoDeleteSegment?: (segmentId: string) => void;
}

const OSDViewer: React.FC<OSDViewerProps> = ({
  drawingEnable = false,
  needPopup = false,
  tool,
  imageUrl,
  onDeleteSegment,
  onUndoDeleteSegment,
}) => {
  const viewerOptions = useMemo(
    () => ({
      tileSources: {
        type: "image" as const,
        url: imageUrl,
      },
      prefixUrl: "/openseadragon-images/",
      gestureSettingsMouse: {
        clickToZoom: false,
        dragToPan: !drawingEnable,
      },
    }),
    [imageUrl, drawingEnable]
  );

  return imageUrl !== "" ? (
    <OpenSeadragonAnnotator
      drawingEnabled={drawingEnable}
      tool={drawingEnable ? tool : undefined}
      userSelectAction={!drawingEnable ? UserSelectAction.SELECT : UserSelectAction.EDIT}
    >
      <OpenSeadragonViewer options={viewerOptions} className="osd" />
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
