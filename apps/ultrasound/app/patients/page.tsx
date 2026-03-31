"use client";

import React, { useState } from "react";
import { Card, Row, Col, Typography, Button, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

import { PatientsTable } from "./ui/PatientsTable";
import { FilterComponent } from "./ui/FilterComponent";
import { DoctorProfileCard } from "./ui/DoctorProfileCard";

const { Title } = Typography;

// UI-only mock data; replace with real data sources later
const mockPatients = [
  {
    id: 1,
    patientName: "Иванов Иван Иванович",
    patientPolicy: "1234567890123456",
    email: "ivanov@example.com",
    uziDate: new Date().toISOString(),
    hasNodules: true,
    isActive: true,
  },
  {
    id: 2,
    patientName: "Петрова Анна Сергеевна",
    patientPolicy: "6543210987654321",
    email: "petrova@example.com",
    uziDate: new Date().toISOString(),
    hasNodules: false,
    isActive: true,
  },
];

const mockDoctorInfo = {
  lastName: "Смирнов",
  firstName: "Алексей",
  fathersName: "Павлович",
  medOrg: "Клиника УЗИ №1",
  job: "Врач ультразвуковой диагностики",
  is_remote_worker: false,
};

const PatientsPage = () => {
  const router = useRouter();
  const [filterText, setFilterText] = useState("");

  const filteredData = mockPatients.filter(
    (item) =>
      item.patientName.toLowerCase().includes(filterText.toLowerCase()) ||
      item.patientPolicy.toLowerCase().includes(filterText.toLowerCase())
  );

  const mesAm = 0;

  return (
    <div className="patient-page-content" style={{ padding: 24 }}>
      <DoctorProfileCard userInfo={mockDoctorInfo} mesAm={mesAm} />

      <Card
        className="third-step"
        style={{
          marginTop: 24,
        }}
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                Мои пациенты
              </Title>
              <Tooltip title="Добавить пациента">
                <Button
                  type="primary"
                  icon={<PlusOutlined className="eighth-step" />}
                  className="add-button-circle"
                  onClick={() => router.push("/patients/new")}
                />
              </Tooltip>
            </div>
          </Col>
          <Col>
            <FilterComponent filterText={filterText} onFilter={setFilterText} />
          </Col>
        </Row>

        <div style={{ minHeight: 470 }}>
          <PatientsTable data={filteredData} loading={false} />
        </div>
      </Card>
    </div>
  );
};

export default PatientsPage;

