import { Card } from "antd";
import React from "react";

interface FAQContainerProps {
  children: React.ReactNode;
}

const FAQContainer = ({ children }: FAQContainerProps) => {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
      <Card
        style={{
          backgroundColor: "#f8fafc",
          padding: "40px 20px",
          borderRadius: "16px",
          minHeight: "600px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
          border: "1px solid #e2e8f0",
          margin: "20px 0",
        }}
        styles={{ body: { padding: 0 } }}
      >
        {children}
      </Card>
    </div>
  );
};

export default FAQContainer;

