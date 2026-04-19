"use client";

import dynamic from "next/dynamic";

const PetCtViewer = dynamic(() => import("./PetCtViewer"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 600 }}>Загрузка viewer…</div>,
});

export default function Page() {
  return (
    <div style={{ padding: 16 }}>
      <h1>CT MPR Viewer</h1>
      <p style={{ color: "#888", marginBottom: 16 }}>
        3 проекции, Crosshairs, Rectangle ROI, Length, Ellipse ROI. Локальные DICOM: pacs/ID1/P1/E1/S2.
        <br />
        <em>frameOfReferenceUID в тулбаре — скопировать для бэкенда (см. SEGMENT_FORMAT.md).</em>
      </p>
      <PetCtViewer />
    </div>
  );
}
