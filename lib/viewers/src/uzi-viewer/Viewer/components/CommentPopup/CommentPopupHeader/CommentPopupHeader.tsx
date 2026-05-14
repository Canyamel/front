import React from "react";
import { Button, Flex, Tag, Typography } from "antd";
import { DeleteOutlined, UndoOutlined } from "@ant-design/icons";

import { UziTirads } from "../../../../types";
import { classification } from "./props";

const { Text } = Typography;

interface CommentPopupHeaderProps {
  ai: boolean;
  tirads: UziTirads;
  handleDeleteSegment: () => void;
  handleUndoDeleteSegment: () => void;
  isEditingMode: boolean;
  deleted?: boolean;
}

export const CommentPopupHeader: React.FC<CommentPopupHeaderProps> = ({
  ai,
  tirads,
  handleDeleteSegment,
  handleUndoDeleteSegment,
  isEditingMode,
  deleted = false,
}) => {
  const result = classification[tirads];

  return (
    <Flex align="center" justify="space-between">
      <Flex align="center" gap={10}>
        <Text strong>{ai ? "ИИ" : "Мед специалист"}:</Text>
        <Tag color={result.color}>{result.text}</Tag>
      </Flex>
      {isEditingMode && !deleted && (
        <Button onClick={handleDeleteSegment}>
          <DeleteOutlined />
        </Button>
      )}
      {isEditingMode && deleted && (
        <Button onClick={handleUndoDeleteSegment}>
          <UndoOutlined />
        </Button>
      )}
    </Flex>
  );
};
