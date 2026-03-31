import React from "react";
import { Table, Typography, Avatar, Button, theme } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface PatientRow {
  id: number | string;
  patientName: string;
  patientPolicy: string;
  email: string;
  uziDate: string;
  hasNodules: boolean;
  isActive: boolean;
}

interface PatientsTableProps {
  data: PatientRow[];
  loading: boolean;
}

const { Text: AntText } = Typography;

export const PatientsTable: React.FC<PatientsTableProps> = ({ data, loading }) => {
  const router = useRouter();
  const { token } = theme.useToken();

  const primaryBlue = "#4FB3EAFF";
  const lightBlue = "rgba(79, 179, 234, 0.1)";

  const columns = [
    {
      title: "Пациент",
      dataIndex: "patientName",
      key: "patientName",
      width: 230,
      sorter: (a: PatientRow, b: PatientRow) =>
        a.patientName.localeCompare(b.patientName),
      render: (text: string) => (
        <div className="patient-name-cell">
          <Avatar icon={<UserOutlined />} size="small" />
          <AntText strong className="patient-name-text">
            {text}
          </AntText>
        </div>
      ),
    },
    {
      title: "Полис пациента",
      dataIndex: "patientPolicy",
      key: "patientPolicy",
      width: 210,
      sorter: (a: PatientRow, b: PatientRow) =>
        a.patientPolicy.localeCompare(b.patientPolicy),
    },
    {
      title: "Эл. почта",
      dataIndex: "email",
      key: "email",
      width: 230,
      sorter: (a: PatientRow, b: PatientRow) => a.email.localeCompare(b.email),
    },
    {
      title: "Дата приема",
      dataIndex: "uziDate",
      key: "uziDate",
      width: 130,
      sorter: (a: PatientRow, b: PatientRow) =>
        new Date(a.uziDate).getTime() - new Date(b.uziDate).getTime(),
    },
    {
      title: "Диагноз",
      key: "hasNodules",
      width: 160,
      render: (_: unknown, record: PatientRow) => (
        <span>{record.hasNodules ? "Обнаружено" : "Не обнаружено"}</span>
      ),
    },
    {
      title: "Статус",
      key: "isActive",
      width: 160,
      render: (_: unknown, record: PatientRow) => (
        <span>{record.isActive ? "Активен" : "Не активен"}</span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 190,
      render: (_: unknown, record: PatientRow) => (
        <Button
          type="default"
          className="seventh-step action-button-hover"
          size="middle"
          style={{
            width: "100%",
            maxWidth: 150,
            color: primaryBlue,
            borderColor: primaryBlue,
            borderRadius: token.borderRadiusSM,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = lightBlue;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "";
          }}
          onClick={() => router.push(`/patients/${record.id}`)}
        >
          Карта пациента
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      className="patients-table"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} из ${total} пациентов`,
        locale: {
          items_per_page: "строк",
          jump_to: "Перейти",
          page: "",
          prev_page: "Назад",
          next_page: "Вперед",
          prev_5: "Предыдущие 5",
          next_5: "Следующие 5",
        },
      }}
      style={{ borderRadius: 8, overflow: "hidden" }}
      onRow={() => ({
        onMouseEnter: (e) =>
          (e.currentTarget.style.backgroundColor = token.colorBgLayout),
        onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = ""),
      })}
    />
  );
};

