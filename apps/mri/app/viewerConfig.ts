import type { CtViewerConfig } from "@medml/ct-mri-viewer";

/**
 * Конфиг просмотрщика: снимки берутся из public/dicoms.
 * Структура папок: public/dicoms/<seriesId>/I0, I1, I2, ...
 * По умолчанию одна серия S1 с индексами срезов от 0; sliceCount подставьте по числу файлов.
 */
export const defaultViewerConfig: CtViewerConfig = {
  pacsBasePath: "/dicoms",
  series: [
    { id: "S1", sliceStart: 0, sliceCount: 14 },
  ],
};
