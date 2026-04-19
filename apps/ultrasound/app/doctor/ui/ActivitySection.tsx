import React from "react";
import { Typography, List, Card } from "antd";

// Simplified UI copy; notifications come via props

const { Title, Text } = Typography;

interface ActivitySectionProps {
  notifications: {
    results?: Array<{ id?: number | string; title?: string; message?: string }>;
  } | null;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ notifications }) => {
  const items = notifications?.results ?? [];

  return (
    <Card
      className="activity-card"
      title={
        <Title level={3} className="section-title">
          Последняя активность
        </Title>
      }
    >
      {items.length > 0 ? (
        <List
          dataSource={items}
          renderItem={(n) => (
            <List.Item className="activity-item">
              <div>
                <Text strong>{n.title || "Активность"}</Text>
                <br />
                <Text type="secondary">{n.message}</Text>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <Text type="secondary">Нет недавней активности</Text>
      )}
    </Card>
  );
};

export default ActivitySection;

