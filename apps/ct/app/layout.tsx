import type { Metadata } from "next";
import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";

export const metadata: Metadata = {
  title: "CT DICOM Viewer",
  description: "DICOM просмотрщик для КТ надпочечников",
};

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="ru">
    <body>
      <AntdRegistry>{children}</AntdRegistry>
    </body>
  </html>
);

export default RootLayout;
