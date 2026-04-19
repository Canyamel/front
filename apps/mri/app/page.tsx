"use client";

import dynamic from "next/dynamic";

const MriViewer = dynamic(() => import("./MriViewer"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 600 }}>Загрузка просмотрщика…</div>,
});

export default function Page() {
  return (
    <div style={{ padding: 16 }}>
      <h1>MRI DICOM Viewer</h1>
      <p style={{ color: "#888", marginBottom: 16 }}>
        Снимки загружаются из папки <strong>public/dicoms</strong>. Положите DICOM в <code>public/dicoms/S1/</code> с именами I0, I1, I2, … (или настройте series в <code>viewerConfig.ts</code>).
      </p>
      <MriViewer />
    </div>
  );
}
