import * as React from "react";
import { EditOutlined, MoreOutlined } from "@ant-design/icons";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Dropdown,
  Input,
  Layout,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import dayjs from "dayjs";

import {
  PatientCreateModal,
  stripPolicyDigits,
  type PatientCreateValuesCytology,
} from "@medml/patient_create";
import { PatientProfileView } from "@medml/patient_view";

import { useGetMedWorkerPatientsQuery } from "@/lib/patientsApi";
import {
  useGetPatientShotsByCardIdQuery,
  useUpdatePatientCardMutation,
  type CytologyStudyRow,
} from "@/lib/patientProfileApi";
import { useDoctorId } from "@/lib/useDoctorId";

const { Search } = Input;

function useStudyColumns(): ColumnsType<CytologyStudyRow> {
  return React.useMemo(
    () => [
      {
        title: "Дата забора",
        dataIndex: "cytologyDateLabel",
        key: "cytologyDateLabel",
        width: "16%",
        sorter: (a, b) => a.cytologyDateSort - b.cytologyDateSort,
      },
      {
        title: "Номер исследования",
        dataIndex: "numberLabel",
        key: "numberLabel",
        width: "22%",
      },
      {
        title: "Локализация",
        dataIndex: "materialTypeLabel",
        key: "materialTypeLabel",
        width: "24%",
      },
      {
        title: "Категория",
        dataIndex: "bethesdaLabel",
        key: "bethesdaLabel",
        width: "16%",
      },
      {
        title: "",
        key: "action",
        width: "10%",
        align: "center",
        render: (_value, row) => {
          const items: MenuProps["items"] = [
            {
              key: "result",
              label: (
                <Link to={`/cytology/${encodeURIComponent(row.id)}`} style={{ fontWeight: 500 }}>
                  Результат
                </Link>
              ),
            },
          ];
          return (
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button type="text" icon={<MoreOutlined />} aria-label="Действия" />
            </Dropdown>
          );
        },
      },
    ],
    []
  );
}

export default function PatientProfileRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cardId = params.get("id")?.trim() ?? "";
  const { doctorId, status } = useDoctorId();

  const [search, setSearch] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [studyPage, setStudyPage] = React.useState(1);
  const [studyPageSize, setStudyPageSize] = React.useState(10);

  const { data, isFetching, isLoading } = useGetPatientShotsByCardIdQuery(cardId, {
    skip: !cardId,
  });

  const { data: listData } = useGetMedWorkerPatientsQuery(
    { doctorId },
    { skip: !doctorId || status !== "authenticated" }
  );

  const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientCardMutation();

  const cardFromList = React.useMemo(
    () => listData?.cards.find((c) => c.cardId === cardId),
    [listData?.cards, cardId]
  );

  const patient = React.useMemo(() => {
    if (!data?.patient) return null;
    const diagnosis =
      cardFromList?.diagnosis?.trim() ||
      (data.patient.diagnosis !== "Не обнаружено" ? data.patient.diagnosis : "") ||
      "Не обнаружено";
    return { ...data.patient, diagnosis };
  }, [data?.patient, cardFromList?.diagnosis]);

  const editInitialValues = React.useMemo(() => {
    if (!data?.editDefaults) return undefined;
    const diagnosis =
      cardFromList?.diagnosis ?? data.editDefaults.diagnosis ?? data.patient?.diagnosis ?? "";
    return {
      ...data.editDefaults,
      diagnosis: diagnosis === "Не обнаружено" ? "" : diagnosis,
    };
  }, [data?.editDefaults, cardFromList?.diagnosis, data?.patient?.diagnosis]);

  const studyColumns = useStudyColumns();

  const filteredStudies = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.studies ?? [];
    return (data?.studies ?? []).filter(
      (row) =>
        row.numberLabel.toLowerCase().includes(q) ||
        row.materialTypeLabel.toLowerCase().includes(q) ||
        row.bethesdaLabel.toLowerCase().includes(q) ||
        row.cytologyDateLabel.toLowerCase().includes(q)
    );
  }, [data?.studies, search]);

  React.useEffect(() => {
    setStudyPage(1);
  }, [search, cardId]);

  const handleEditFinish = async (values: PatientCreateValuesCytology) => {
    if (!cardId) return;
    try {
      await updatePatient({
        cardId,
        payload: {
          patient: {
            first_name: values.firstName.trim(),
            last_name: values.lastName.trim(),
            fathers_name: values.fathersName.trim(),
            personal_policy: stripPolicyDigits(values.personalPolicy),
            email: values.email.trim(),
            ...(values.active ? { is_active: true } : {}),
            birth_date: dayjs(values.birthDate).format("YYYY-MM-DD"),
          },
          card: {
            diagnosis: values.diagnosis?.trim() ?? "",
          },
        },
      }).unwrap();
      message.success("Карта пациента обновлена");
      setEditOpen(false);
    } catch {
      message.error("Не удалось сохранить изменения");
    }
  };

  const loading = isLoading || isFetching;

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Content style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
        {!cardId ? (
          <Typography.Text type="danger">Не указан идентификатор карты пациента (?id=)</Typography.Text>
        ) : (
          <>
            <PatientProfileView
              patient={patient}
              loading={loading}
              onBack={() => navigate("/patients")}
              backLabel="Пациенты"
              actions={
                <Space wrap>
                  <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)} disabled={!patient}>
                    Редактировать
                  </Button>
                  <Button
                    type="primary"
                    onClick={() =>
                      navigate(`/upload_photo?patientId=${encodeURIComponent(cardId)}`)
                    }
                  >
                    Добавить снимок
                  </Button>
                </Space>
              }
            >
              <Card
                title="Цитологические исследования"
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
                extra={
                  <Search
                    allowClear
                    placeholder="Поиск диагностики"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 280 }}
                  />
                }
              >
                <Table<CytologyStudyRow>
                  rowKey="id"
                  size="middle"
                  columns={studyColumns}
                  dataSource={filteredStudies}
                  loading={loading}
                  locale={{ emptyText: "Нет исследований" }}
                  pagination={{
                    current: studyPage,
                    pageSize: studyPageSize,
                    total: filteredStudies.length,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50],
                    onChange: (page, size) => {
                      setStudyPage(page);
                      if (size) setStudyPageSize(size);
                    },
                  }}
                />
              </Card>
            </PatientProfileView>

            <PatientCreateModal
              open={editOpen}
              title="Редактирование карты"
              okText="Сохранить"
              variant="cytology"
              initialValues={editInitialValues}
              confirmLoading={isUpdating}
              onCancel={() => setEditOpen(false)}
              onFinish={(vals) => void handleEditFinish(vals as PatientCreateValuesCytology)}
            />
          </>
        )}
      </Layout.Content>
    </Layout>
  );
}
