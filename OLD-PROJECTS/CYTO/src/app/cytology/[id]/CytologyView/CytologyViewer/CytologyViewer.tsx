import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Annotorious } from "@annotorious/react";
import { Flex } from "antd";
import { DisconnectOutlined } from "@ant-design/icons";

import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import { addNewSegmentToStack, editPointSegment } from "@cytology/core/store";

import { Tools } from "@/app/cytology/[id]/core/types/basic";
import { ISegmentStack } from "@cytology/core/types/segments";
import { IPoint } from "./Viewer/interfaces/queries";

import EditPanel from "./EditPanel/EditPanel";

import "@annotorious/react/annotorious-react.css";
import "./CytologyViewer.css";

const Viewer = dynamic(() => import("./Viewer/Viewer"), { ssr: false });

interface CytologyViewerProps {
    imageUrl: string | undefined;
    isEditMode: boolean;
    segments: ISegmentStack[];
}

const CytologyViewer: React.FC<CytologyViewerProps> = ({ imageUrl, isEditMode, segments }) => {
    const dispatch = useAppDispatch();
    const currentSegment = useAppSelector((state) => state.segment.currentSegment);
    const segmentStack = useAppSelector((state) => state.segment.segmentStack);

    const [tool, setTool] = useState<Tools>("move");
    const currentSegmentRef = useRef(currentSegment);
    const segmentStackRef = useRef(segmentStack);

    useEffect(() => {
        currentSegmentRef.current = currentSegment;
    }, [currentSegment]);

    useEffect(() => {
        segmentStackRef.current = segmentStack;
    }, [segmentStack]);

    const handleAddSegment = useCallback(
        (contour: IPoint[]) => {
            if (currentSegmentRef.current) {
                dispatch(
                    addNewSegmentToStack({ seg_type: currentSegmentRef.current, points: contour })
                );
            }
        },
        [dispatch, currentSegmentRef]
    );

    const handleChangeSegment = useCallback(
        (segmentId: string, contour: IPoint[]) => {
            if (segmentStackRef) {
                const id = Number(segmentId);
                const currentSegments = segmentStackRef.current.find(
                    (item) => item.seg_type === currentSegmentRef.current
                );
                const editedSegment = (currentSegments ? currentSegments.segments : []).find(
                    (segment) => segment.id === id
                );

                if (editedSegment) {
                    dispatch(
                        editPointSegment({ id, segType: editedSegment.seg_type, points: contour })
                    );
                }
            }
        },
        [dispatch, segmentStackRef, currentSegmentRef]
    );

    return (
        <Annotorious>
            <>
                {isEditMode && <EditPanel tool={tool} setTool={setTool} />}
                <Flex justify="center" align="center" className="cytology-viewer">
                    {imageUrl === undefined ? (
                        <DisconnectOutlined style={{ fontSize: 50, color: "#8c8c8c" }} />
                    ) : (
                        <Viewer
                            viewerType="osd"
                            tool={tool}
                            imageUrl={imageUrl}
                            segments={segments}
                            drawingEnabled={isEditMode}
                            selected={!!currentSegment}
                            needPopup={true}
                            addSegment={handleAddSegment}
                            changeSegment={handleChangeSegment}
                        />
                    )}
                </Flex>
            </>
        </Annotorious>
    );
};

export default CytologyViewer;
