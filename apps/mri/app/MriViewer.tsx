"use client";

import { CtVolumeViewer } from "@medml/ct-mri-viewer";
import { defaultViewerConfig } from "./viewerConfig";

export default function MriViewer() {
  return (
    <CtVolumeViewer
      pacsBasePath={defaultViewerConfig.pacsBasePath}
      series={defaultViewerConfig.series}
      initialSeriesId={defaultViewerConfig.initialSeriesId}
      modality={defaultViewerConfig.modality}
      enableCrosshairs
    />
  );
}
