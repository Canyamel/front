import type { Metadata } from "next";
import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";

export const metadata: Metadata = {
  title: "MRI DICOM Viewer",
  description: "DICOM просмотрщик для МРТ",
};

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="ru">
    <body>
      <AntdRegistry>{children}</AntdRegistry>
    </body>
  </html>
);

export default RootLayout;
