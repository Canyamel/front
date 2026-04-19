import React from "react";
import { Button, Typography, Card } from "antd";
import { UploadOutlined, UserAddOutlined, LineChartOutlined } from "@ant-design/icons";

// Pure UI copy; callbacks are stubs to be wired later

const { Title } = Typography;

const QuickActionsSection: React.FC = () => {
  return (
    <Card
      className="quick-actions-card"
      title={
        <Title level={3} className="section-title">
          Быстрые действия
        </Title>
      }
    >
      <div className="actions-list">
        <Button
          className="action-button gradient"
          icon={<UploadOutlined />}
          // TODO: wire to upload page
          onClick={() => {}}
        >
          Добавить снимок
        </Button>
        <Button
          className="action-button white"
          icon={<UserAddOutlined />}
          // TODO: wire to patient creation page
          onClick={() => {}}
        >
          Новый пациент
        </Button>
        <Button
          className="action-button white"
          icon={<LineChartOutlined />}
          // TODO: wire to statistics page
          onClick={() => {}}
        >
          Статистика
        </Button>
      </div>
      <div className="tip-block">
        <div className="tip-title">Совет дня</div>
        <div className="tip-text">
          Регулярно проверяйте качество сегментации перед подтверждением диагноза.
        </div>
      </div>
    </Card>
  );
};

export default QuickActionsSection;

