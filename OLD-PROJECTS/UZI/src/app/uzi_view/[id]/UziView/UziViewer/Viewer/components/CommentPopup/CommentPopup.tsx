import React, { useCallback, useEffect, useState } from "react";
import { PopupProps } from "@annotorious/react";
import { Button, Card, Flex, Input } from "antd";

import { CommentPopupHeader } from "./CommentPopupHeader/CommentPopupHeader";
import { CommentPopupComment } from "./CommentPopupComment/CommentPopupComment";

import { Tirads } from "@/app/uzi_view/[id]/types/types";

import { useAppDispatch, useAppSelector } from "@/app/uzi_view/[id]/store/hook";
import { deleteSegment, undoDeleteSegment } from "@/app/uzi_view/[id]/store/uziSlice";

interface CommentPopupProps extends PopupProps {
    needInput?: boolean;
    isEditingMode?: boolean;
}

const CommentPopup: React.FC<CommentPopupProps> = ({
    annotation,
    onCreateBody,
    onUpdateBody,
    needInput = false,
    isEditingMode = false,
}) => {
    const dispatch = useAppDispatch();
    // const [comment, setComment] = useState('');
    const node = useAppSelector((state) => state.uzi.selectedNode);

    const tagging = annotation.bodies.find((body) => body.purpose === "tagging");
    const response: { tirads: Tirads; ai: boolean; toDelete?: boolean } | undefined = tagging?.value
        ? JSON.parse(tagging.value)
        : undefined;
    const segmentId: string | undefined = tagging?.annotation || undefined;

    // useEffect(() => {
    //     const commentBody = annotation.bodies.find(body => body.purpose === 'commenting');
    //     setComment(commentBody && commentBody.value ? commentBody.value : '');
    // }, [annotation.bodies]);

    // const onSave = useCallback(() => {
    //     const updated = {
    //         purpose: 'commenting',
    //         value: comment
    //     };

    //     const commentBody = annotation.bodies.find(body => body.purpose === 'commenting');

    //     if (commentBody) {
    //         onUpdateBody(commentBody, updated);
    //     } else {
    //         onCreateBody(updated);
    //     }
    // }, [annotation.bodies, comment, onCreateBody, onUpdateBody]);

    const onDelete = useCallback(() => {
        if (segmentId) {
            dispatch(deleteSegment({ nodeId: node?.id ?? "", segmentId }));
        }
    }, [segmentId]);

    const onUndoDelete = useCallback(() => {
        if (segmentId) {
            dispatch(undoDeleteSegment({ nodeId: node?.id ?? "", segmentId }));
        }
    }, [segmentId]);

    return (
        <>
            {response && (
                <Card
                    size="small"
                    // title={
                    //     needInput && (
                    //         <CommentPopupHeader
                    //             ai={response.ai}
                    //             tirads={response.tirads}
                    //             handleDeleteSegment={onDelete}
                    //             isEditingMode={isEditingMode}
                    //         />
                    //     )
                    // }
                    style={{ width: 350, maxHeight: 400 }}
                >
                    {!needInput && (
                        <CommentPopupHeader
                            ai={response.ai}
                            tirads={response.tirads}
                            handleDeleteSegment={onDelete}
                            handleUndoDeleteSegment={onUndoDelete}
                            isEditingMode={isEditingMode}
                            deleted={response.toDelete}
                        />
                    )}
                    {/* {
                        needInput &&
                        <Flex vertical gap={10}>
                            <Flex vertical style={{maxHeight: 250, overflow: 'auto'}} gap={10}>
                                <CommentPopupComment
                                    author="Цыгулева К.В."
                                    dateStamp="22.11.2024"
                                >
                                    Комментарий 1ааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааа
                                </CommentPopupComment>
                                <CommentPopupComment
                                    author="Цыгулева К.В."
                                    dateStamp="23.11.2024"
                                >
                                    Комментарий 2
                                </CommentPopupComment>
                                <CommentPopupComment
                                    isSelf
                                    author="Кузов М.Ю."
                                    dateStamp="12.01.2025"
                                >
                                    Комментарий 3
                                </CommentPopupComment>
                            </Flex>
                            <Flex vertical align="end" gap={5}>
                                <Input placeholder="Комменатрий" />
                                <Button style={{ width: "fit-content" }}>Отмена</Button>
                            </Flex>
                        </Flex>
                    } */}
                </Card>
            )}
        </>
    );
};

export default CommentPopup;
