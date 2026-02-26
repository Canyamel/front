"use client";

import { CtVolumeViewer } from "@medml/ct-mri-viewer";
import { defaultViewerConfig } from "./viewerConfig";

export default function MriViewer() {
  const { pacsBasePath, series, initialSeriesId } = defaultViewerConfig;

  return (
    <CtVolumeViewer
      pacsBasePath={pacsBasePath}
      series={series}
      initialSeriesId={initialSeriesId}
      modality="MR"
    />
  );
}
