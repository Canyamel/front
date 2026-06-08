import React, { useEffect, useMemo, useState } from "react";
import { Tag, Typography } from "antd";
import { skipToken } from "@reduxjs/toolkit/query";

import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import {
    setCytologyId,
    setCytologyInfo,
    setEditedCytologyInfo,
    setCurrentSegment,
    setInitSegments,
    setSegmentsStack,
} from "@cytology/core/store";
import {
    useGetCytologyInfoQuery,
    useGetCytologyTypesQuery,
    useLazyGetCytologySegmentsByTypeQuery,
} from "@cytology/core/service/cytology";
import { Modes } from "@cytology/core/types/basic";

import CytologyInfo from "./CytologyDiagnosisPanel/CytologyDiagnosis/CytologyInfo/CytologyInfo";
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
    generalCytologyId: string;
}

const CytologyView: React.FC<CytologyViewProps> = ({ generalCytologyId }) => {
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const currentSegment = useAppSelector((state) => state.segment.currentSegment);
    const segmentStack: ISegmentStack[] = useAppSelector((state) => state.segment.segmentStack);

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
        setMode("view");
        dispatch(setCurrentSegment(null));
        dispatch(setEditedCytologyInfo(null));
        dispatch(setInitSegments([]));
        dispatch(setSegmentsStack([]));
        setViewSegments([]);
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

    const segmentTypeColors = useMemo(() => {
        if (!segmentTypesData?.length) {
            return {};
        }
        return Object.fromEntries(
            (segmentTypesData as ISegmentType[]).map((type) => [type.code, type.color])
        );
    }, [segmentTypesData]);

    const studyTitle = useMemo(() => {
        const info = cytologyInfoData?.info;
        if (!info) {
            return null;
        }
        return `${info.diagnostic_marking}-${info.diagnostic_number}`;
    }, [cytologyInfoData?.info]);

    const studyDate = useMemo(() => {
        const date = cytologyInfoData?.info?.diagnos_date;
        if (!date) {
            return null;
        }
        const parsed = new Date(date);
        return Number.isNaN(parsed.getTime())
            ? date
            : parsed.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
              });
    }, [cytologyInfoData?.info?.diagnos_date]);

    return (
        <div className="cytology-view-page">
            <section className="cytology-view-surface cytology-summary-card">
                <div className="cytology-summary-card__header">
                    <div>
                        <Typography.Title level={3} className="cytology-summary-card__title">
                            {studyTitle ? `Исследование ${studyTitle}` : "Просмотр исследования"}
                        </Typography.Title>
                        {studyDate ? (
                            <Typography.Text type="secondary" className="cytology-summary-card__meta">
                                от {studyDate}
                            </Typography.Text>
                        ) : null}
                    </div>
                    {mode === "edit" ? <Tag color="processing">Режим редактирования</Tag> : null}
                </div>
                <CytologyInfo layout="banner" />
            </section>

            <div className="cytology-view-workspace">
                <div className="cytology-view-main">
                    <div className="cytology-view-surface cytology-viewer-surface">
                        <CytologyViewer
                            isEditMode={mode === "edit"}
                            segments={
                                mode === "edit"
                                    ? (segmentStack ?? []).flatMap((item) =>
                                          item.seg_type === currentSegment ? item.segments : []
                                      )
                                    : viewSegments
                            }
                            segmentTypeColors={segmentTypeColors}
                            imageUrl={cytologyInfoData?.original_image.image}
                        />
                    </div>
                </div>

                <aside className="cytology-view-sidebar cytology-diagnosis">
                    <div className="cytology-view-surface cytology-sidebar-surface">
                        <div className="cytology-sidebar-body">
                            <CytologyDiagnosisPanel
                                mode={mode}
                                segments={segmentStack}
                                changeMode={setMode}
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CytologyView;
