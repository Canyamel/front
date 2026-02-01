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
    useGetCytologySegmentQuery,
} from "@cytology/core/service/cytology";
import { Modes } from "@/app/cytology/[id]/core/types/basic";

import CytologyDiagnosisPanel from "./CytologyDiagnosisPanel/CytologyDiagnosisPanel";
import CytologyViewer from "./CytologyViewer/CytologyViewer";

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

    const { data: cytologyInfoData } = useGetCytologyInfoQuery(
        !!accessToken ? generalCytologyId : skipToken
    );

    const { data: segmentsData } = useGetCytologySegmentQuery(
        !!accessToken ? generalCytologyId : skipToken
    );

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
        if (mode === "view") {
            dispatch(setInitSegments(segmentsData || []));
            dispatch(setSegmentsStack(segmentsData || []));
        }
    }, [dispatch, mode, segmentsData]);

    return (
        <>
            <Row className="cytology-view" gutter={24}>
                <Col span={16} className="cytology-viewer-wrapper">
                    <CytologyViewer
                        isEditMode={mode === "edit"}
                        segments={(segmentStack ?? []).flatMap((item) =>
                            item.seg_type === currentSegment ? item.segments : []
                        )}
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
