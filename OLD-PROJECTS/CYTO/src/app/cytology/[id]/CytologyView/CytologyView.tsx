import React, { useEffect, useState } from "react";
import { Col, Row } from "antd";
import { skipToken } from "@reduxjs/toolkit/query";

import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import {
    setCytologyId,
    setCytologyInfo,
    setEditedCytologyInfo,
    setInitSegments,
    setSegmentsStack,
} from "@cytology/core/store";
import {
    useGetCytologyInfoQuery,
    useGetCytologyTypesQuery,
    useLazyGetCytologySegmentsByTypeQuery,
} from "@cytology/core/service/cytology";
import { Modes } from "@/app/cytology/[id]/core/types/basic";

import CytologyDiagnosisPanel from "./CytologyDiagnosisPanel/CytologyDiagnosisPanel";
import CytologyViewer from "./CytologyViewer/CytologyViewer";
import {
    IGroupedSegments,
    ISegmentStack,
    ISegmentType,
    SegmentType,
} from "@cytology/core/types/segments";

import "./CytologyView.css";

interface CytologyViewProps {
    generalCytologyId: number;
}

const CytologyView: React.FC<CytologyViewProps> = ({ generalCytologyId }) => {
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const currentSegment = useAppSelector((state) => state.segment.currentSegment);
    const segmentStack = useAppSelector((state) => state.segment.segmentStack);

    const [mode, setMode] = useState<Modes>("view");
    const [viewSegments, setViewSegments] = useState<ISegmentStack[]>([]);

    const { data: cytologyInfoData } = useGetCytologyInfoQuery(
        !!accessToken ? generalCytologyId : skipToken
    );

    const { data: segmentTypesData } = useGetCytologyTypesQuery(
        !!accessToken ? generalCytologyId : skipToken
    );

    const [getSegmentsByType] = useLazyGetCytologySegmentsByTypeQuery();

    useEffect(() => {
        dispatch(setCytologyId(generalCytologyId));
    }, [dispatch, generalCytologyId]);

    useEffect(() => {
        if (cytologyInfoData && mode === "view") {
            dispatch(setCytologyInfo(cytologyInfoData.info));
            dispatch(setEditedCytologyInfo(null));
        }
    }, [cytologyInfoData, dispatch, mode]);

    useEffect(() => {
        if (mode !== "view") {
            return;
        }

        if (!accessToken || !segmentTypesData) {
            dispatch(setInitSegments([]));
            dispatch(setSegmentsStack([]));
            return;
        }

        const loadAllSegments = async () => {
            const grouped: IGroupedSegments[] = [];

            for (const type of segmentTypesData as ISegmentType[]) {
                const segType = type.code as SegmentType;

                try {
                    const segments = await getSegmentsByType({
                        id: generalCytologyId,
                        segType,
                    }).unwrap();

                    if (!segments.length) continue;

                    grouped.push({
                        seg_type: segType,
                        segments,
                    });
                } catch {
                    // ignore failed type load
                }
            }

            dispatch(setInitSegments(grouped));
            dispatch(setSegmentsStack(grouped));
        };

        loadAllSegments();
    }, [dispatch, mode, accessToken, segmentTypesData, generalCytologyId, getSegmentsByType]);

    useEffect(() => {
        if (mode !== "view") {
            return;
        }

        if (!accessToken || !currentSegment) {
            setViewSegments([]);
            return;
        }

        getSegmentsByType({ id: generalCytologyId, segType: currentSegment as SegmentType })
            .unwrap()
            .then((segments) => {
                setViewSegments(segments);
            })
            .catch(() => {
                setViewSegments([]);
            });
    }, [mode, accessToken, currentSegment, generalCytologyId, getSegmentsByType]);

    return (
        <>
            <Row className="cytology-view" gutter={24}>
                <Col span={16} className="cytology-viewer-wrapper">
                    <CytologyViewer
                        isEditMode={mode === "edit"}
                        segments={
                            mode === "edit"
                                ? (segmentStack ?? []).flatMap((item) =>
                                      item.seg_type === currentSegment ? item.segments : []
                                  )
                                : viewSegments
                        }
                        imageUrl={cytologyInfoData?.original_image.image}
                    />
                </Col>
                <Col span={8} className="cytology-diagnosis">
                    <CytologyDiagnosisPanel
                        mode={mode}
                        segments={segmentStack}
                        changeMode={setMode}
                    />
                </Col>
            </Row>
        </>
    );
};

export default CytologyView;
