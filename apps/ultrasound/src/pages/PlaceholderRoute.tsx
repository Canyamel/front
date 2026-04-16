import { Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function PlaceholderRoute({ title }: { title: string }) {
  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto" }}>
      <Title level={3}>{title}</Title>
      <Paragraph type="secondary">Раздел в разработке.</Paragraph>
    </div>
  );
}
