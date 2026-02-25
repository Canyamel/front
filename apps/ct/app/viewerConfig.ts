import type { CtViewerConfig } from "@medml/ct-mri-viewer";

/**
 * Конфиг по умолчанию для CT-просмотрщика.
 */
export const defaultViewerConfig: CtViewerConfig = {
  pacsBasePath: "/pacs/ID1/P1/E1",
  series: [
    { id: "S1", sliceStart: 1, sliceCount: 993 },
    { id: "S2", sliceStart: 994, sliceCount: 993 },
    { id: "S3", sliceStart: 1987, sliceCount: 993 },
    { id: "S4", sliceStart: 2980, sliceCount: 993 },
  ],
  // initialSeriesId не задан — окна пустые, перетаскивайте серии из панели
};
