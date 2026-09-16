import React, { useEffect, useRef } from "react";
import { Button, Flex, InputNumber, Segmented, Space, Tooltip, Typography } from "antd";
import { BRUSH_TOOL, CALIBRATE_TOOL, RULER_TOOL, type BrushMode } from "@medml/viewers";

import { useAppDispatch, useAppSelector } from "@cytology/core/hooks";
import { setToolPanelHeight } from "@cytology/core/store";
import { Tools } from "@cytology/core/types/basic";

import PolygonIcon from "./assets/PolygonIcon";
import RectangleIcon from "./assets/RectangleIcon";
import MoveIcon from "./assets/MoveIcon";

import "./EditPanel.css";

const { Text } = Typography;

interface EditPanelProps {
    tool: Tools;
    setTool: (value: Tools) => void;

    /**
     * Разрешено ли создавать/редактировать сегменты (rectangle/polygon/brush).
     * Пока сценарий сохранения не переделан (см. `cytologyFeatures.ts`), эти
     * инструменты скрыты — а линейка, калибровка и переключатель видимости
     * ничего не сохраняют и доступны всегда.
     */
    segmentToolsEnabled: boolean;

    /** Сколько пикселей в миллиметре; выводится из эталонного отрезка. */
    pxPerMm: number | null;
    /** Сбросить масштаб, чтобы задать заново. */
    onResetScale: () => void;

    brushMode: BrushMode;
    onBrushModeChange: (mode: BrushMode) => void;
    brushRadius: number;
    onBrushRadiusChange: (radius: number) => void;

    /** Есть незакоммиченный набросок кистью. */
    hasSketch: boolean;
    onConfirmSketch: () => void;
    onClearSketch: () => void;

    /** Сколько измерительных линий на снимке. */
    measurementCount: number;
    onClearMeasurements: () => void;
}

const TOOLS: Array<{ value: Tools; label: React.ReactNode; hint: string; needsSegmentTools?: boolean }> = [
    {
        value: "move",
        label: (
            <Flex align="center" justify="center" gap={10}>
                <MoveIcon fillColor="currentColor" />
                Перемещение
            </Flex>
        ),
        hint: "Перемещение и масштаб снимка",
    },
    {
        value: "rectangle",
        label: (
            <Flex align="center" justify="center" gap={10}>
                <RectangleIcon fillColor="currentColor" />
                Прямоугольник
            </Flex>
        ),
        hint: "Обвести сегмент прямоугольником",
        needsSegmentTools: true,
    },
    {
        value: "polygon",
        label: (
            <Flex align="center" justify="center" gap={10}>
                <PolygonIcon fillColor="currentColor" />
                Полигон
            </Flex>
        ),
        hint: "Обвести сегмент по точкам",
        needsSegmentTools: true,
    },
    {
        value: BRUSH_TOOL,
        label: "Кисть",
        hint: "Закрасить область, затем «Подтвердить»",
        needsSegmentTools: true,
    },
    {
        value: RULER_TOOL,
        label: "Линейка",
        hint: "Зажмите и протяните по снимку — размер покажется сразу",
    },
    {
        value: CALIBRATE_TOOL,
        label: "Задать масштаб",
        hint: "Протяните отрезок по шкале снимка и укажите его длину в мм",
    },
];

/**
 * Панель инструментов над снимком — по образцу `ViewerToolPanel` из УЗИ:
 * инструменты и масштаб в одной строке, вторичные строки (кисть, счётчик
 * измерений) — под ней, а не колонкой сверху вниз.
 */
const EditPanel: React.FC<EditPanelProps> = ({
    tool,
    setTool,
    segmentToolsEnabled,
    pxPerMm,
    onResetScale,
    brushMode,
    onBrushModeChange,
    brushRadius,
    onBrushRadiusChange,
    hasSketch,
    onConfirmSketch,
    onClearSketch,
    measurementCount,
    onClearMeasurements,
}) => {
    const currentSegment = useAppSelector((state) => state.segment.currentSegment);
    const dispatch = useAppDispatch();
    const toolPanelRef = useRef<HTMLDivElement>(null);

    const rulerDisabled = pxPerMm == null;
    const visibleTools = TOOLS.filter((item) => !item.needsSegmentTools || segmentToolsEnabled);

    // Высота панели меняется вместе с составом видимых строк (кисть,
    // счётчик измерений, подсказка) — без пересчёта на эти изменения слой
    // перекрывал бы снимок или оставлял под панелью пустое место.
    useEffect(() => {
        if (toolPanelRef.current) {
            dispatch(setToolPanelHeight(toolPanelRef.current.getBoundingClientRect().height + 20));
        }

        return () => {
            dispatch(setToolPanelHeight(0));
        };
    }, [dispatch, tool, hasSketch, measurementCount, segmentToolsEnabled, currentSegment]);

    return (
        <div className="cytology-tool-panel" ref={toolPanelRef}>
            <div className="cytology-tool-panel__row">
                <Space size={8} wrap>
                    {visibleTools.map((item) => {
                        const disabled = item.value === RULER_TOOL && rulerDisabled;
                        const button = (
                            <Button
                                key={item.value}
                                type={tool === item.value ? "primary" : "default"}
                                disabled={disabled}
                                onClick={() => setTool(item.value)}
                            >
                                {item.label}
                            </Button>
                        );
                        return (
                            <Tooltip
                                key={item.value}
                                title={disabled ? "Сначала задайте масштаб по отрезку" : item.hint}
                            >
                                {button}
                            </Tooltip>
                        );
                    })}
                </Space>

                <Space size={8} align="center">
                    <Text type="secondary" style={{ whiteSpace: "nowrap" }}>
                        Масштаб
                    </Text>
                    {pxPerMm == null ? (
                        <Button type="primary" ghost onClick={() => setTool(CALIBRATE_TOOL)}>
                            Задать по отрезку
                        </Button>
                    ) : (
                        <>
                            <Text strong style={{ whiteSpace: "nowrap" }}>
                                {pxPerMm.toFixed(2)} px / мм
                            </Text>
                            <Button size="small" onClick={onResetScale}>
                                Задать заново
                            </Button>
                        </>
                    )}
                </Space>
            </div>

            {segmentToolsEnabled && !currentSegment && (
                <div className="cytology-tool-panel__row cytology-tool-panel__row--secondary">
                    <Text type="secondary">Выберите группу сегментов справа, чтобы рисовать</Text>
                </div>
            )}

            {tool === BRUSH_TOOL && (
                <div className="cytology-tool-panel__row cytology-tool-panel__row--secondary">
                    <Space size={8} align="center" wrap>
                        <Segmented
                            value={brushMode}
                            onChange={(value) => onBrushModeChange(value as BrushMode)}
                            options={[
                                { value: "draw", label: "Добавить" },
                                { value: "erase", label: "Ластик" },
                            ]}
                        />
                        <Text type="secondary">Размер</Text>
                        <InputNumber
                            value={brushRadius}
                            onChange={(value) => onBrushRadiusChange(Number(value) || 1)}
                            min={1}
                            max={80}
                            style={{ width: 80 }}
                        />
                    </Space>

                    <Space size={8} wrap>
                        <Button onClick={onClearSketch} disabled={!hasSketch}>
                            Очистить набросок
                        </Button>
                        <Button type="primary" onClick={onConfirmSketch} disabled={!hasSketch}>
                            Подтвердить
                        </Button>
                    </Space>
                </div>
            )}

            {measurementCount > 0 && (
                <div className="cytology-tool-panel__row cytology-tool-panel__row--secondary">
                    <Text type="secondary">Измерений: {measurementCount}</Text>
                    <Button size="small" onClick={onClearMeasurements}>
                        Убрать измерения
                    </Button>
                </div>
            )}
        </div>
    );
};

export default EditPanel;
