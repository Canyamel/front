export type SeriesConfig = {
  id: string;
  /** Индекс первого среза (в URL: .../I{sliceStart}) */
  sliceStart: number;
  /** Количество срезов в серии */
  sliceCount: number;
};

export type CtViewerConfig = {
  /** Базовый путь к данным, например "/pacs/ID1/P1/E1" */
  pacsBasePath: string;
  /** Список серий с индексами и количеством срезов */
  series: SeriesConfig[];
  /** ID серии для предзагрузки (если не задан — окна пустые, данные перетаскиваются) */
  initialSeriesId?: string;
};

