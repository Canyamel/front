import React, { useCallback, useEffect, useRef } from "react";
import { PopupProps } from "@annotorious/react";
import { Card, Flex, Typography } from "antd";

import { ISegmentDetails } from "@cytology/core/types/segments";
import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import { markAsDeleted, markAsUnDeleted } from "@cytology/core/store";

import { CommentPopupHeader } from "./CommentPopupHeader/CommentPopupHeader";

import "./CommentPopup.css";

const { Title, Text } = Typography;

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
                    {response.details && (
                        <Flex vertical>
                            <Flex vertical>
                                <Title level={5} className="mb-0">
                                    Area
                                </Title>
                                <Text>{response.details.area}</Text>
                            </Flex>
                            <Flex vertical>
                                <Title level={5} className="mb-0">
                                    Min D
                                </Title>
                                <Text>{response.details.min_d}</Text>
                            </Flex>
                            <Flex vertical>
                                <Title level={5} className="mb-0">
                                    Max D
                                </Title>
                                <Text>{response.details.max_d}</Text>
                            </Flex>
                            <Flex vertical>
                                <Title level={5} className="mb-0">
                                    Aspect ratio
                                </Title>
                                <Text>{response.details.aspect_ratio}</Text>
                            </Flex>
                            <Flex vertical>
                                <Title level={5} className="mb-0">
                                    Circularity
                                </Title>
                                <Text>{response.details.circularity}</Text>
                            </Flex>
                            <Flex vertical>
                                <Title level={5} className="mb-0">
                                    Nuclear cytoplasmic ratio
                                </Title>
                                <Text>{response.details.nuclear_cytoplasmic_ratio}</Text>
                            </Flex>
                        </Flex>
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
