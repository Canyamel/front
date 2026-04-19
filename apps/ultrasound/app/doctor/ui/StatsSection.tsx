import React from "react";
import { Row, Col, Card, Typography } from "antd";

// UI copy of StatsSection (data comes via props)

const { Title } = Typography;

interface StatsSectionProps {
  diagnosticsToday: number;
  onReview: number;
  withExperts: number;
  modelAccuracy: number;
}

const StatsSection: React.FC<StatsSectionProps> = ({
  diagnosticsToday,
  onReview,
  withExperts,
  modelAccuracy,
}) => {
  return (
    <Row gutter={[16, 16]} className="stats-row">
      <Col xs={24} sm={12} md={6}>
        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-text">
              <div className="stat-label">Диагностик сегодня</div>
              <Title level={2} className="stat-value">
                {diagnosticsToday}
              </Title>
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-text">
              <div className="stat-label">На рассмотрении</div>
              <Title level={2} className="stat-value">
                {onReview}
              </Title>
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-text">
              <div className="stat-label">У экспертов</div>
              <Title level={2} className="stat-value">
                {withExperts}
              </Title>
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card className="stat-card">
          <div className="stat-content">
            <div className="stat-text">
              <div className="stat-label">Точность модели</div>
              <Title level={2} className="stat-value">
                {modelAccuracy}%
              </Title>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default StatsSection;

