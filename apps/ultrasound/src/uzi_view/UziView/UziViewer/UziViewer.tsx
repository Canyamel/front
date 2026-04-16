import React, { useCallback, useEffect, useRef, useState } from "react";
import { UziViewer as SharedUziViewer } from "@medml/viewers";
import { ISegmentRedux } from "@/uzi_view/types/segments";
import { IPoint } from "@/uzi_view/UziView/UziViewer/Viewer/interfaces/queries";
import { IUziPage } from "../../types/uzi";

import { DOWNLOAD_UZI } from "../../types/consts";

import { useAppDispatch, useAppSelector } from "@/uzi_view/store/hook";

import { downloadUziImage } from "@/uzi_view/service/download";

import { addLoading, deleteLoading } from "../../store/utilsSlice";
import {
  addSegmentToNode,
  changeSegment,
  deleteSegment,
  undoDeleteSegment,
} from "../../store/uziSlice";
import { setToolPanelHeight } from "../../store/refSlice";

interface UziViewerProps {
  isEditMode: boolean;
  uziId: string;
  segments: ISegmentRedux[];
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  index: number;
  uziIds: IUziPage[] | undefined;
}

const UziViewer: React.FC<UziViewerProps> = ({
  isEditMode,
  uziId,
  segments,
  setIndex,
  index,
  uziIds,
}) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const { selectedNode, imageId } = useAppSelector((state) => state.uzi);

  const selectedNodeRef = useRef(selectedNode);
  const imageIdRef = useRef(imageId);

  const handleAddSegment = useCallback(
    (contour: IPoint[]) => {
      if (selectedNodeRef.current && selectedNodeRef.current.specialist !== "ai") {
        dispatch(
          addSegmentToNode({
            uziId: selectedNodeRef.current.id,
            segment: {
              id: crypto.randomUUID(),
              ai: false,
              node_id: selectedNodeRef.current.id,
              contor: contour,
              image_id: imageIdRef.current,
              tirads_23: selectedNodeRef.current.tirads === "tirads_23" ? 1 : 0,
              tirads_4: selectedNodeRef.current.tirads === "tirads_4" ? 1 : 0,
              tirads_5: selectedNodeRef.current.tirads === "tirads_5" ? 1 : 0,
              exist: false,
            },
          })
        );
      }
    },
    [dispatch]
  );

  const handleChangeSegment = useCallback(
    (segmentId: string, contour: IPoint[]) => {
      if (selectedNodeRef.current && selectedNodeRef.current.specialist !== "ai") {
        dispatch(
          changeSegment({
            nodeId: selectedNodeRef.current.id,
            segmentId,
            contour,
          })
        );
      }
    },
    [dispatch]
  );

  const handleDeleteSegment = useCallback(
    (segmentId: string) => {
      if (selectedNodeRef.current?.id) {
        dispatch(deleteSegment({ nodeId: selectedNodeRef.current.id, segmentId }));
      }
    },
    [dispatch]
  );

  const handleUndoDeleteSegment = useCallback(
    (segmentId: string) => {
      if (selectedNodeRef.current?.id) {
        dispatch(undoDeleteSegment({ nodeId: selectedNodeRef.current.id, segmentId }));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    imageIdRef.current = imageId;
  }, [imageId]);

  useEffect(() => {
    if (isLoading) {
      dispatch(addLoading(DOWNLOAD_UZI));
    } else {
      dispatch(deleteLoading(DOWNLOAD_UZI));
    }
  }, [dispatch, isLoading]);

  useEffect(() => {
    if (uziIds) {
      const downloadHandler = async () => {
        setIsLoading(true);
        return await downloadUziImage(uziId, uziIds[index].id, accessToken);
      };

      downloadHandler()
        .then((response) => {
          const nextImageUrl = typeof response === "string" ? response : response?.imageUrl ?? null;
          if (nextImageUrl) {
            const lastImageUrl = imageUrl;
            setImageUrl(nextImageUrl);
            if (lastImageUrl !== "") {
              window.URL.revokeObjectURL(lastImageUrl);
            }
          }
        })
        .catch((error) => {
          console.error(error);
        });

      setIsLoading(false);
    }
  }, [uziIds, index]);

  return (
    <SharedUziViewer
      isEditMode={isEditMode}
      imageUrl={imageUrl}
      imageId={imageId}
      selectedNode={selectedNode}
      segments={segments}
      index={index}
      setIndex={setIndex}
      uziIds={uziIds}
      onAddSegment={handleAddSegment}
      onChangeSegment={handleChangeSegment}
      onDeleteSegment={handleDeleteSegment}
      onUndoDeleteSegment={handleUndoDeleteSegment}
      onToolPanelHeightChange={(height) => dispatch(setToolPanelHeight(height))}
    />
  );
};

export default UziViewer;
