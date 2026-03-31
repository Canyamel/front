export type SeriesConfig = {
  id: string;
  /**
   * Индекс первого среза.
   * По умолчанию URL формируется как `${pacsBasePath}/${id}/I{sliceIndex}`.
   */
  sliceStart: number;
  /** Количество срезов в серии */
  sliceCount: number;
  /**
   * Необязательный префикс имени файла среза.
   * Например: "I", "IMG_", "CT_".
   * Если не задан, используется "I".
   */
  slicePrefix?: string;
  /**
   * Необязательный постфикс (суффикс) имени файла среза.
   * Например: ".dcm".
   * Если не задан, суффикс отсутствует.
   */
  slicePostfix?: string;
};

export type CtViewerConfig = {
  /** Базовый путь к данным, например "/pacs/ID1/P1/E1" */
  pacsBasePath: string;
  /** Список серий с индексами и количеством срезов */
  series: SeriesConfig[];
  /** ID серии для предзагрузки (если не задан — окна пустые, данные перетаскиваются) */
  initialSeriesId?: string;
  /** Модальность для подбора окна яркости: CT (40/400) или MR (мягче по умолчанию). По умолчанию CT */
  modality?: "CT" | "MR";
  /** Окно [center, width] как запасной VOI, если в DICOM нет WC/WW (иначе при загрузке берутся теги кадра) */
  defaultWindow?: [number, number];
  /** Включать ли инструмент и переключатель «Линии уровня» (Crosshairs). По умолчанию true */
  enableCrosshairs?: boolean;
};

