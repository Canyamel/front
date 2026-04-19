import React from "react";
import { Typography, Table } from "antd";

// UI-only diagnostics table; data passed via props

const { Title, Text } = Typography;

interface DiagnosticsSectionProps {
  sortedPatients: any[];
  formatDate: (iso: string) => string;
}

const DiagnosticsSection: React.FC<DiagnosticsSectionProps> = ({
  sortedPatients,
  formatDate,
}) => {
  const columns = [
    {
      title: "Пациент",
      dataIndex: "patient",
      key: "patient",
      render: (patient: any) => (
        <>
          <Text strong>
            {patient.last_name} {patient.first_name?.[0]}. {patient.fathers_name?.[0]}.
          </Text>
          <br />
          <Text type="secondary">{patient.personal_policy}</Text>
        </>
      ),
    },
    {
      title: "Дата",
      dataIndex: "acceptance_datetime",
      key: "date",
      render: (date: string) => formatDate(date),
    },
    {
      title: "Диагноз",
      dataIndex: "diagnosis",
      key: "diagnosis",
    },
    {
      title: "EU-TIRADS",
      key: "tirads",
      render: () => "—",
    },
    {
      title: "Статус",
      dataIndex: "has_nodules",
      key: "status",
      render: (has_nodules: string) =>
        has_nodules === "F" ? "Подтверждено" : "На рассмотрении",
    },
    {
      title: "Действия",
      key: "actions",
      render: () => (
        <div className="actions">
          {/* TODO: wire real actions */}
          <a>Открыть</a>
          {" | "}
          <a>Ред.</a>
          {" | "}
          <a>Экспорт</a>
        </div>
      ),
    },
  ];

  return (
    <div className="section diagnostics-section" style={{ marginTop: 24 }}>
      <Title level={3} className="section-title">
        Последние диагностики
      </Title>
      {sortedPatients.length > 0 ? (
        <Table
          dataSource={sortedPatients}
          columns={columns}
          rowKey="id"
          pagination={false}
          className="diagnostics-table"
        />
      ) : (
        <Text type="secondary">Пока нет диагностик</Text>
      )}
    </div>
  );
};

export default DiagnosticsSection;

