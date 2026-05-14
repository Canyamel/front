import type { CSSProperties } from "react";
import { Card, Layout, Typography } from "antd";

import { UziStudyFaq } from "@/components/UziStudyFaq";

const cardStyle: CSSProperties = {
  borderRadius: 12,
  width: "100%",
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

export default function FaqRoute() {
  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Content style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Справка (FAQ)
        </Typography.Title>
        <Card styles={{ body: { padding: "16px 24px 24px" } }} style={cardStyle}>
          <UziStudyFaq />
        </Card>
      </Layout.Content>
    </Layout>
  );
}
