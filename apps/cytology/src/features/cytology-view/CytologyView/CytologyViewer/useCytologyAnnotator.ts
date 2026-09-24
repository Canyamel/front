import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createOSDAnnotator } from "@annotorious/openseadragon";
import type {
    Annotation,
    DrawingStyleExpression,
    ImageAnnotation,
    OpenSeadragonAnnotator,
    PolygonGeometry,
    RectangleGeometry,
} from "@annotorious/openseadragon";
import type { PlanePoint, ViewerAnnotationLayer, ViewerInstance, ViewerToolId } from "@medml/viewers";
import { isDrawingTool } from "@medml/viewers";

import { ISegmentStack } from "@cytology/core/types/segments";

import { generateAnnotation } from "./Viewer/utils/generateAnnotation";
import { IPoint } from "./Viewer/interfaces/queries";

import "@annotorious/openseadragon/annotorious-openseadragon.css";

/**
 * Слой аннотаций поверх инстанса OpenSeadragon из `@medml/viewers`.
 *
 * Раньше цитология поднимала собственный OpenSeadragon через
 * `<OpenSeadragonViewer>` из `@annotorious/react` — то есть держала второй
 * движок мимо общего пакета, со своей навигацией и своими настройками жестов.
 * Любая правка вьюера делалась дважды и расходилась с УЗИ.
 *
 * Теперь наружу отдаётся `layer` — реализация общего контракта
 * `ViewerAnnotationLayer`. Такой же адаптер есть в УЗИ, только над
 * Annotorious 2; общий вьюер в обоих случаях один и тот же и про версию
 * библиотеки разметки не знает.
 */

export interface UseCytologyAnnotatorOptions {
    segments: ISegmentStack[];
    style?: DrawingStyleExpression<ImageAnnotation>;
    /** Разрешено ли рисовать: в режиме просмотра и без выбранной группы — нет. */
    drawingEnabled: boolean;
    onAddSegment: (contour: IPoint[]) => void;
    onChangeSegment: (segmentId: string, contour: IPoint[]) => void;
}

export interface UseCytologyAnnotatorResult {
    /** `null`, пока вьюер не открыл изображение. */
    annotator: OpenSeadragonAnnotator | null;
    /** Слой разметки для `<AnnotatedStudyViewer annotationLayer={...} />`. */
    layer: ViewerAnnotationLayer;
}

type Geometry = Partial<RectangleGeometry> & Partial<PolygonGeometry>;

/** Контур из геометрии Annotorious: у прямоугольника углы считаем сами. */
function contourFromAnnotation(annotation: Annotation): IPoint[] | null {
    const selector = (annotation as { target?: { selector?: { geometry?: Geometry } } }).target
        ?.selector;
    const geometry = selector?.geometry;

    if (!geometry) {
        return null;
    }

    if (Array.isArray(geometry.points)) {
        return geometry.points.map((point) => ({
            x: Math.round(point[0]),
            y: Math.round(point[1]),
        }));
    }

    const { x, y, w, h } = geometry;
    if (x === undefined || y === undefined || w === undefined || h === undefined) {
        return null;
    }

    return [
        { x: Math.round(x), y: Math.round(y) },
        { x: Math.round(x + w), y: Math.round(y) },
        { x: Math.round(x + w), y: Math.round(y + h) },
        { x: Math.round(x), y: Math.round(y + h) },
    ];
}

export function useCytologyAnnotator({
    segments,
    style,
    drawingEnabled,
    onAddSegment,
    onChangeSegment,
}: UseCytologyAnnotatorOptions): UseCytologyAnnotatorResult {
    const [annotator, setAnnotator] = useState<OpenSeadragonAnnotator | null>(null);
    const annotatorRef = useRef<OpenSeadragonAnnotator | null>(null);

    // Обработчики держим в ref: пересоздавать аннотатор из-за нового колбэка
    // нельзя — вместе с ним со снимка пропадёт вся разметка.
    const handlersRef = useRef({ onAddSegment, onChangeSegment });
    // Инструмент, выбранный до открытия снимка, применяем сразу после attach.
    // `enabled` — разрешение по режиму от вьюера, `drawing` — итог с учётом
    // доменного условия; храним оба, чтобы переприменять запрос вьюера.
    const toolRef = useRef<{ tool: ViewerToolId; enabled: boolean; drawing: boolean }>({
        tool: "pan",
        enabled: false,
        drawing: false,
    });
    // Право рисовать — доменное условие, и решает его слой, а не вьюер: без
    // выбранной группы сегментов контур некуда сохранять.
    const canDrawRef = useRef(drawingEnabled);

    useEffect(() => {
        handlersRef.current = { onAddSegment, onChangeSegment };
    }, [onAddSegment, onChangeSegment]);

    useEffect(() => {
        canDrawRef.current = drawingEnabled;
    }, [drawingEnabled]);

    // Создание и уничтожение висят на колбэках вьюера, а не на эффекте: жизнь
    // аннотатора совпадает с жизнью инстанса OSD, а про неё общий вьюер
    // сообщает сам — через контракт слоя разметки.
    const attach = useCallback((viewer: ViewerInstance) => {
        const instance = createOSDAnnotator(viewer);

        instance.on("createAnnotation", (annotation: ImageAnnotation) => {
            const contour = contourFromAnnotation(annotation);
            if (contour) {
                handlersRef.current.onAddSegment(contour);
            }
        });

        instance.on("updateAnnotation", (annotation: ImageAnnotation) => {
            const contour = contourFromAnnotation(annotation);
            if (contour) {
                handlersRef.current.onChangeSegment(annotation.id, contour);
            }
        });

        annotatorRef.current = instance;
        setAnnotator(instance);

        applyTool(instance, toolRef.current.tool, toolRef.current.drawing);
    }, []);

    const detach = useCallback(() => {
        const instance = annotatorRef.current;
        annotatorRef.current = null;
        setAnnotator(null);

        if (!instance) {
            return;
        }

        try {
            instance.destroy();
        } catch (error) {
            console.warn("useCytologyAnnotator: не удалось уничтожить аннотатор", error);
        }
    }, []);

    /**
     * Инструменты вьюера (навигация, кисть, линейка) до Annotorious не доходят:
     * на них рисование выключается, иначе плагин забирает перетаскивание себе.
     *
     * `enabled` от вьюера — это разрешение по режиму (просмотр/редактирование);
     * доменное условие добавляем здесь. Иначе вьюер включал бы рисование без
     * выбранной группы, и обведённый контур молча терялся бы в `onAddSegment`.
     */
    const setTool = useCallback((tool: ViewerToolId, enabled: boolean) => {
        const drawing = enabled && isDrawingTool(tool) && canDrawRef.current;
        toolRef.current = { tool, enabled, drawing };
        applyTool(annotatorRef.current, tool, drawing);
    }, []);

    /**
     * Контур из кисти-заполнения приходит готовым полигоном в координатах
     * снимка — сохраняем его тем же путём, что и нарисованный вручную.
     *
     * Без выбранной группы отказываемся: `onAddSegment` такой контур всё равно
     * отбросит, а вьюер по `true` отчитался бы об успехе и стёр набросок.
     */
    const addPolygon = useCallback((points: PlanePoint[]) => {
        if (points.length < 3 || !canDrawRef.current) {
            return false;
        }

        handlersRef.current.onAddSegment(
            points.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }))
        );
        return true;
    }, []);

    // Стиль — отдельным эффектом: он меняется при переключении режима и
    // выбранной группы сегментов, а разметка при этом остаётся прежней.
    useEffect(() => {
        annotator?.setStyle(style);
    }, [annotator, style]);

    useEffect(() => {
        if (!annotator) {
            return;
        }

        annotator.clearAnnotations();

        if (segments.length > 0) {
            annotator.setAnnotations(
                segments.flatMap((segment) => generateAnnotation(segment)) as ImageAnnotation[],
                true
            );
        }
    }, [annotator, segments]);

    // Право рисовать может пропасть и без смены инструмента — например, когда
    // врач снял выбор группы сегментов.
    useEffect(() => {
        const { tool, enabled } = toolRef.current;
        setTool(tool, enabled);
    }, [drawingEnabled, setTool]);

    const layer = useMemo<ViewerAnnotationLayer>(
        () => ({ attach, detach, setTool, addPolygon }),
        [attach, detach, setTool, addPolygon]
    );

    return { annotator, layer };
}

/** Annotorious 3 знает инструменты `rectangle` и `polygon` под теми же именами. */
function applyTool(
    annotator: OpenSeadragonAnnotator | null,
    tool: ViewerToolId,
    drawing: boolean
): void {
    if (!annotator) {
        return;
    }

    try {
        if (drawing) {
            annotator.setDrawingTool(tool as never);
        }
        annotator.setDrawingEnabled(drawing);
    } catch (error) {
        console.error(`Не удалось включить инструмент «${tool}»:`, error);
    }
}
