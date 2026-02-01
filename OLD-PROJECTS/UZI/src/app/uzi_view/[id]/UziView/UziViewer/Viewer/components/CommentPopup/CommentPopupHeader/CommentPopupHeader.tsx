import React from "react";
import { Button, Flex, Tag, Typography } from "antd";
import { DeleteOutlined, UndoOutlined } from "@ant-design/icons";

import { Tirads } from "@/app/uzi_view/[id]/types/types";

import { classification } from "./props";

const { Text } = Typography;

interface CommentPopupHeaderProps {
    ai: boolean;
    tirads: Tirads;
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

    const schema = {
        label: ai ? "ИИ" : "Мед специалист",
        value: result.text,
        tagColor: result.color,
    };

    return (
        <Flex align="center" justify="space-between">
            <Flex align="center" gap={10} key={schema.label}>
                <Text strong>{schema.label}:</Text>
                <Tag color={schema.tagColor}>{schema.value}</Tag>
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
