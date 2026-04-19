import { Typography } from "antd";

const { Title, Text } = Typography;

interface FAQHeaderProps {
  title: string;
  subtitle?: string;
  showDivider?: boolean;
}

const FAQHeader = ({ title, subtitle }: FAQHeaderProps) => {
  return (
    <div style={{ textAlign: "center", marginBottom: "48px" }}>
      <Title
        level={2}
        style={{
          fontWeight: 600,
          color: "transparent",
          background: "linear-gradient(135deg, #2292cb 0%, #2d3748 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
          letterSpacing: "-0.02em",
          marginBottom: subtitle ? "16px" : "0",
        }}
      >
        {title}
      </Title>

      {subtitle && (
        <Text
          style={{
            color: "#64748b",
            maxWidth: "600px",
            margin: "0 auto",
            lineHeight: 1.6,
            display: "block",
          }}
        >
          {subtitle}
        </Text>
      )}
    </div>
  );
};

export default FAQHeader;

