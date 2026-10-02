import React, { useCallback, useEffect, useMemo, useRef } from "react";
import type { ViewerLegendItem } from "@medml/viewers";

import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import { addNewSegmentToStack, editPointSegment } from "@cytology/core/store";

import { ISegmentStack, segmentsTranslated, SegmentType } from "@cytology/core/types/segments";
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

/** Цвет для типа сегмента, если бэкенд его не прислал. */
const FALLBACK_SEGMENT_COLOR = "#00d995";

/**
 * Снимок цитологии на странице исследования.
 *
 * Здесь остаётся только доменная обвязка: сохранение контуров в стек
 * сегментов и подписи легенды. Инструменты (включая линейку, масштаб и кисть),
 * состояния загрузки и переключатель видимости разметки пришли из общего
 * `<AnnotatedStudyViewer />` — собственной панели инструментов
 * (`EditPanel`) у цитологии больше нет.
 */
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
        (id: string, contour: IPoint[]) => {
            if (currentSegmentRef.current) {
                dispatch(
                    addNewSegmentToStack({ id, seg_type: currentSegmentRef.current, points: contour })
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

    /**
     * Легенда поверх снимка: какие типы сегментов сейчас показаны, каким
     * цветом и сколько их. Раньше легенда была только в УЗИ, хотя цвет
     * контура сам по себе ни о чём врачу не говорит.
     */
    const legendItems = useMemo<ViewerLegendItem[]>(() => {
        const countByType = new Map<SegmentType, number>();

        segments.forEach((segment) => {
            countByType.set(segment.seg_type, (countByType.get(segment.seg_type) ?? 0) + 1);
        });

        return Array.from(countByType.entries()).map(([segType, count]) => ({
            id: segType,
            color: segmentTypeColors[segType] ?? FALLBACK_SEGMENT_COLOR,
            title: segmentsTranslated[segType] ?? segType,
            badge: String(count),
        }));
    }, [segments, segmentTypeColors]);

    return (
        <div className="cytology-viewer-root">
            <CytologyOsdViewer
                imageUrl={imageUrl ?? ""}
                segments={segments}
                segmentTypeColors={segmentTypeColors}
                legendItems={legendItems}
                drawingEnabled={isEditMode}
                selected={!!currentSegment}
                needPopup
                height={height}
                addSegment={handleAddSegment}
                changeSegment={handleChangeSegment}
            />
        </div>
    );
};

export default CytologyViewer;
