import React, { useCallback, useEffect, useRef } from "react";
import { PopupProps } from "@annotorious/react";
import { Card, Flex, Typography } from "antd";

import { ISegmentDetails } from "@cytology/core/types/segments";
import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import { markAsDeleted, markAsUnDeleted } from "@cytology/core/store";

import { CommentPopupHeader } from "./CommentPopupHeader/CommentPopupHeader";

import "./CommentPopup.css";

const { Title, Text } = Typography;

const SEGMENT_DETAIL_FIELDS = [
    { key: "area", label: "Area" },
    { key: "min_d", label: "Min D" },
    { key: "max_d", label: "Max D" },
    { key: "aspect_ratio", label: "Aspect ratio" },
    { key: "circularity", label: "Circularity" },
    { key: "nuclear_cytoplasmic_ratio", label: "Nuclear cytoplasmic ratio" },
] as const;

function hasSegmentDetailValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== "";
}

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
    // const [comment, setComment] = useState('');
    const dispatch = useAppDispatch();
    const currentSegment = useAppSelector((state) => state.segment.currentSegment);
    const currentSegmentRef = useRef(currentSegment);

    useEffect(() => {
        currentSegmentRef.current = currentSegment;
    }, [currentSegment]);

    const tagging = annotation.bodies.find((body) => body.purpose === "tagging");
    const response:
        | {
              ai: boolean;
              toDelete: boolean;
              toUpdate: boolean;
              toAdd: boolean;
              details?: ISegmentDetails;
          }
        | undefined = tagging?.value ? JSON.parse(tagging.value) : undefined;
    const segmentId: string | undefined = tagging?.annotation || undefined;

    const onDelete = useCallback(() => {
        if (segmentId && currentSegmentRef.current) {
            dispatch(
                markAsDeleted({
                    id: segmentId,
                    segType: currentSegmentRef.current,
                    isNew: response?.toAdd,
                })
            );
        }
    }, [currentSegmentRef]);
    const onUndoDelete = useCallback(() => {
        if (segmentId && currentSegmentRef.current) {
            dispatch(markAsUnDeleted({ id: segmentId, segType: currentSegmentRef.current }));
        }
    }, [currentSegmentRef]);

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

    const filledDetailFields = response?.details
        ? SEGMENT_DETAIL_FIELDS.filter((field) =>
              hasSegmentDetailValue(response.details?.[field.key])
          )
        : [];

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
                            probs={response.details?.probs}
                            handleDeleteSegment={onDelete}
                            handleUndoDeleteSegment={onUndoDelete}
                            isEditingMode={isEditingMode}
                            deleted={response.toDelete}
                        />
                    )}
                    {filledDetailFields.length > 0 ? (
                        <Flex vertical gap={8}>
                            {filledDetailFields.map((field) => (
                                <Flex vertical key={field.key}>
                                    <Title level={5} className="mb-0">
                                        {field.label}
                                    </Title>
                                    <Text>{response.details?.[field.key]}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    ) : null}
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
