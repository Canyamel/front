import React, { useCallback } from "react";
import { PopupProps } from "@annotorious/react";
import { Card } from "antd";

import { CommentPopupHeader } from "./CommentPopupHeader/CommentPopupHeader";
import { UziTirads } from "../../../types";

interface CommentPopupProps extends PopupProps {
  isEditingMode?: boolean;
  onDeleteSegment?: (segmentId: string) => void;
  onUndoDeleteSegment?: (segmentId: string) => void;
}

const CommentPopup: React.FC<CommentPopupProps> = ({
  annotation,
  isEditingMode = false,
  onDeleteSegment,
  onUndoDeleteSegment,
}) => {
  const tagging = annotation.bodies.find((body) => body.purpose === "tagging");
  const response: { tirads: UziTirads; ai: boolean; toDelete?: boolean } | undefined = tagging?.value
    ? JSON.parse(tagging.value)
    : undefined;
  const segmentId: string | undefined = tagging?.annotation || undefined;

  const handleDelete = useCallback(() => {
    if (segmentId) {
      onDeleteSegment?.(segmentId);
    }
  }, [segmentId, onDeleteSegment]);

  const handleUndoDelete = useCallback(() => {
    if (segmentId) {
      onUndoDeleteSegment?.(segmentId);
    }
  }, [segmentId, onUndoDeleteSegment]);

  if (!response) {
    return null;
  }

  return (
    <Card size="small" style={{ width: 350, maxHeight: 400 }}>
      <CommentPopupHeader
        ai={response.ai}
        tirads={response.tirads}
        handleDeleteSegment={handleDelete}
        handleUndoDeleteSegment={handleUndoDelete}
        isEditingMode={isEditingMode}
        deleted={response.toDelete}
      />
    </Card>
  );
};

export default CommentPopup;
