"use client";

import type { CtViewerConfig, SeriesConfig } from "./types";
import type { CtLayoutId } from "./layout";
import { CtViewer } from "./ct-viewer/CtViewer";

export type CtSegmentPoint = {
  /** Координаты в пикселях внутри среза */
  x: number;
  y: number;

  /** Индекс среза (если сегмент 3D — можно дублировать точки на разных срезах) */
  sliceIndex?: number;

  /** Мировые координаты (опционально, на будущее) */
  worldX?: number;
  worldY?: number;
  worldZ?: number;
};

export type CtSegmentConfig = {
  /** ID сегмента (ключ для UI и логики) */
  id: string;

  /** К какой серии относится сегмент */
  seriesId: string;

  /** Подпись в UI */
  label?: string;

  /** Цвет сегмента (hex), если не задан — дефолтный */
  color?: string;

  /** Видимость по умолчанию */
  visibleByDefault?: boolean;

  /** Набор координат сегмента (точки/вершины контура и т.п.) */
  points: CtSegmentPoint[];
};

export type CtVolumeViewerProps = {
  /** Базовый путь к PACS */
  pacsBasePath: string;

  /** Список серий для панели слева */
  series: SeriesConfig[];

  /** ID серии для предзагрузки (если не задан — окна пустые) */
  initialSeriesId?: string;

  /** Модальность для окна яркости: CT или MR (мягче стартовое окно). По умолчанию CT */
  modality?: "CT" | "MR";

  /** Запасное окно [center, width], когда в данных нет WC/WW */
  defaultWindow?: [number, number];

  /** Включать ли инструмент и переключатель «Линии уровня» (Crosshairs) */
  enableCrosshairs?: boolean;

  /** Стартовая раскладка окон */
  initialLayout?: CtLayoutId;

  /** Включать ли синхронизацию видов по умолчанию */
  enableSyncScrollByDefault?: boolean;

  /** Показывать ли левую панель с сериями */
  showStudySidebar?: boolean;

  /** Список сегментов для отображения */
  segments?: CtSegmentConfig[];

  /** Коллбек при ошибках загрузки/инициализации */
  onError?(message: string): void;

  /** Изменение выбранного вьюпорта */
  onViewportSelectionChange?(viewportId: string | null): void;
};

export function CtVolumeViewer(props: CtVolumeViewerProps) {
  const { pacsBasePath, series, initialSeriesId, modality, defaultWindow, enableCrosshairs } = props;

  const config: CtViewerConfig = {
    pacsBasePath,
    series,
    initialSeriesId,
    modality,
    defaultWindow,
    enableCrosshairs,
  };

  // Пока что всё поведение реализовано внутри CtViewer,
  // CtVolumeViewer является thin-wrapper над ним.
  return <CtViewer config={config} />;
}
