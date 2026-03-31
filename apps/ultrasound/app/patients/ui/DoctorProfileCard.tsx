import React from "react";
import { Card, Row, Col, Typography, Tag, Badge, Button, Space } from "antd";
import { EditOutlined, MailOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface DoctorInfo {
  lastName: string;
  firstName: string;
  fathersName: string;
  medOrg: string;
  job: string;
  is_remote_worker: boolean;
}

interface DoctorProfileCardProps {
  userInfo: DoctorInfo;
  mesAm: number;
}

const { Title, Text } = Typography;

export const DoctorProfileCard: React.FC<DoctorProfileCardProps> = ({
  userInfo,
  mesAm,
}) => {
  const router = useRouter();

  return (
    <Card style={{ marginBottom: 24 }}>
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} md={16}>
          <div className="doctor-header" style={{ display: "flex", gap: 8 }}>
            <Title level={3} style={{ margin: 0 }}>
              {`${userInfo.lastName} ${userInfo.firstName} ${userInfo.fathersName}`}
            </Title>
            <Button
              type="text"
              icon={<EditOutlined className="second-step" />}
              className="edit-profile-button"
              onClick={() => router.push("/profile")}
            />
          </div>
          <Space wrap size={[8, 8]}>
            <Tag className="med-org-tag">{userInfo.medOrg}</Tag>
            <Tag className="job-tag">{userInfo.job}</Tag>
            {userInfo.is_remote_worker && (
              <Tag className="remote-work-tag">Удаленная работа</Tag>
            )}
          </Space>
        </Col>
        <Col xs={24} md={8} style={{ textAlign: "right" }}>
          <Badge count={mesAm} overflowCount={99} className="messages-badge">
            <Button
              type="default"
              icon={<MailOutlined />}
              className="messages-button"
              onClick={() => router.push("/inbox")}
            >
              <Text>Сообщения</Text>
            </Button>
          </Badge>
        </Col>
      </Row>
    </Card>
  );
};

