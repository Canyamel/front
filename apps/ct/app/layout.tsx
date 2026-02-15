import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "CT DICOM Viewer",
  description: "DICOM просмотрщик для КТ надпочечников",
};

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="ru">
    <body>{children}</body>
  </html>
);

export default RootLayout;
