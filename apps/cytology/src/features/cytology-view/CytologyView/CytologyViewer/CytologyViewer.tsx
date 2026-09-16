import React, { useCallback, useEffect, useRef } from "react";
import { Flex } from "antd";

import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import { addNewSegmentToStack, editPointSegment } from "@cytology/core/store";

import { ISegmentStack } from "@cytology/core/types/segments";
import { IPoint } from "./Viewer/interfaces/queries";

import CytologyOsdViewer from "./CytologyOsdViewer";

import "./CytologyViewer.css";

interface CytologyViewerProps {
    imageUrl: string | undefined;
    isEditMode: boolean;
    segments: ISegmentStack[];
    segmentTypeColors?: Record<string, string>;
    /** Высота области снимка; приходит из режима фокуса на странице. */
    height?: number | string;
}

const CytologyViewer: React.FC<CytologyViewerProps> = ({
    imageUrl,
    isEditMode,
    segments,
    segmentTypeColors = {},
    height = 600,
}) => {
    const dispatch = useAppDispatch();
    const currentSegment = useAppSelector((state) => state.segment.currentSegment);
    const segmentStack = useAppSelector((state) => state.segment.segmentStack);

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
        [dispatch]
    );

    const handleChangeSegment = useCallback(
        (segmentId: string, contour: IPoint[]) => {
            const editedSegment = segmentStackRef.current
                .flatMap((item) => item.segments)
                .find((segment) => String(segment.id) === String(segmentId));

            if (editedSegment) {
                dispatch(
                    editPointSegment({
                        id: editedSegment.id,
                        segType: editedSegment.seg_type,
                        points: contour,
                    })
                );
            }
        },
        [dispatch]
    );

    return (
        <div className="cytology-viewer-root">
            <Flex justify="center" align="stretch" className="cytology-viewer" style={{ height }}>
                <CytologyOsdViewer
                    imageUrl={imageUrl}
                    isEditMode={isEditMode}
                    segments={segments}
                    segmentTypeColors={segmentTypeColors}
                    selected={!!currentSegment}
                    needPopup
                    height={height}
                    addSegment={handleAddSegment}
                    changeSegment={handleChangeSegment}
                />
            </Flex>
        </div>
    );
};

export default CytologyViewer;
