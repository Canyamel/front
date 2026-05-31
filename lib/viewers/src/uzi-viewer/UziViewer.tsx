import React, { useEffect, useMemo, useState } from "react";
import { Annotorious } from "@annotorious/react";
import { Alert, Flex } from "antd";
import { DisconnectOutlined } from "@ant-design/icons";

import EditPanel from "./EditPanel/EditPanel";
import NavButton from "./NavButton/NavButton";
import Viewer from "./Viewer/Viewer";
import { IPoint } from "./Viewer/interfaces/queries";
import { UziDrawingTool, UziViewerImageRef, UziViewerNode, UziViewerSegment } from "./types";

import "@annotorious/react/annotorious-react.css";
import "./UziViewer.css";

export interface UziViewerProps {
  isEditMode: boolean;
  imageUrl: string;
  imageId: string;
  selectedNode: UziViewerNode | null;
  segments: UziViewerSegment[];
  index: number;
  uziIds?: UziViewerImageRef[];
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  onAddSegment: (contour: IPoint[]) => void;
  onChangeSegment: (segmentId: string, contour: IPoint[]) => void;
  onDeleteSegment?: (segmentId: string) => void;
  onUndoDeleteSegment?: (segmentId: string) => void;
  onToolPanelHeightChange?: (height: number) => void;
}

const UziViewer: React.FC<UziViewerProps> = ({
  isEditMode,
  imageUrl,
  imageId,
  selectedNode,
  segments,
  setIndex,
  index,
  uziIds,
  onAddSegment,
  onChangeSegment,
  onDeleteSegment,
  onUndoDeleteSegment,
  onToolPanelHeightChange,
}) => {
  const [tool, setTool] = useState<UziDrawingTool>("rectangle");
  const canDrawOnSelectedNode = isEditMode && !!selectedNode && selectedNode.specialist !== "ai";
  // OLD UZI behavior: use plain Annotorious image viewer.
  const viewerType = "img";
  const currentImageSegments = useMemo(
    () => segments.filter((segment) => segment.image_id === imageId),
    [segments, imageId]
  );

  useEffect(() => {
    setTool("rectangle");
  }, [isEditMode]);

  return (
    <Annotorious key={imageUrl || "empty"}>
      <>
        {isEditMode && (
          <EditPanel tool={tool} setTool={setTool} onHeightChange={onToolPanelHeightChange} />
        )}
        <Flex justify="center" align="center" className="uzi-viewer">
          {imageUrl === "" ? (
            <DisconnectOutlined style={{ fontSize: 50, color: "#8c8c8c" }} />
          ) : (
            <>
              <NavButton
                disabled={!!uziIds && index === 0}
                onClick={() => setIndex((prevState) => prevState - 1)}
                position="left"
              />
              <Viewer
                viewerType={viewerType}
                tool={tool}
                imageUrl={imageUrl}
                segments={currentImageSegments}
                drawingEnabled={canDrawOnSelectedNode}
                needPopup
                addSegment={onAddSegment}
                changeSegment={onChangeSegment}
                onDeleteSegment={onDeleteSegment}
                onUndoDeleteSegment={onUndoDeleteSegment}
              />
              {!!uziIds?.length && (
                <div className="uzi-series-counter">
                  Снимок {index + 1} из {uziIds.length}
                </div>
              )}
              {isEditMode && selectedNode && selectedNode.specialist === "ai" && (
                <Alert
                  className="uzi-edit-hint"
                  type="info"
                  showIcon
                  message="AI-образование"
                  description="Для AI-образований рисование и редактирование сегментов недоступно."
                />
              )}
              <NavButton
                disabled={!!uziIds && index === (uziIds.length - 1)}
                onClick={() => setIndex((prevState) => prevState + 1)}
                position="right"
              />
            </>
          )}
        </Flex>
      </>
    </Annotorious>
  );
};

export default UziViewer;
