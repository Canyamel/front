import * as React from "react";
import { CheckCircleOutlined } from "@ant-design/icons";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Layout, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { PatientProfileView } from "@medml/patient_view";

import {
  useGetMedPatientByIdQuery,
  useGetMedPatientCardQuery,
  useGetPatientUziStudiesQuery,
  uziStudyStatusTagColor,
  type PatientUziStudyRow,
} from "@/lib/patientProfileApi";
import { useGetUziDevicesQuery } from "@/lib/uziApi";
import { useDoctorId } from "@/lib/useDoctorId";

function useUziTableColumns(deviceMap: Map<string, string>): ColumnsType<PatientUziStudyRow> {
  return React.useMemo(
    () => [
      {
        title: "Дата",
        dataIndex: "createdAtLabel",
        key: "createdAtLabel",
        width: "14%",
        ellipsis: { showTitle: true },
      },
      {
        title: "Статус",
        key: "status",
        width: "16%",
        render: (_: unknown, row: PatientUziStudyRow) => (
          <Tag color={uziStudyStatusTagColor(row.statusRaw)} style={{ margin: 0 }}>
            {row.statusLabel}
          </Tag>
        ),
      },
      {
        title: "Проекция",
        dataIndex: "projectionLabel",
        key: "projectionLabel",
        width: "16%",
        ellipsis: { showTitle: true },
      },
      {
        title: "Проверен",
        key: "checkedLabel",
        width: "16%",
        align: "center" as const,
        render: (_: unknown, row: PatientUziStudyRow) => {
          const t = row.checkedLabel;
          if (t === "—" || !t) {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                —
              </Typography.Text>
            );
          }
          if (t === "Да") {
            return (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
                Да
              </Tag>
            );
          }
          return (
            <Tag color="default" style={{ margin: 0 }}>
              Нет
            </Tag>
          );
        },
      },
      {
        title: "Аппарат",
        key: "device",
        width: "28%",
        ellipsis: { showTitle: true },
        render: (_: unknown, row: PatientUziStudyRow) => {
          if (!row.deviceIdRaw) {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                —
              </Typography.Text>
            );
          }
          const name = deviceMap.get(row.deviceIdRaw);
          const text = name ?? `№ ${row.deviceIdRaw}`;
          return <Typography.Text ellipsis={{ tooltip: text }}>{text}</Typography.Text>;
        },
      },
      {
        title: "",
        key: "open",
        width: "16%",
        align: "center" as const,
        render: (_: unknown, row: PatientUziStudyRow) => {
          if (!row.key) {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                —
              </Typography.Text>
            );
          }
          return (
            <Link
              to={`/uzi_view/${encodeURIComponent(row.key)}`}
              style={{ color: "var(--ant-color-link, #1677ff)" }}
            >
              Открыть
            </Link>
          );
        },
      },
    ],
    [deviceMap]
  );
}

export default function PatientProfileRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("id")?.trim() ?? "";
  const { doctorId, status } = useDoctorId();

  const [uziPage, setUziPage] = React.useState(1);
  const [uziPageSize, setUziPageSize] = React.useState(10);

  const { data: devices = [] } = useGetUziDevicesQuery(undefined, {
    skip: status !== "authenticated",
  });

  const deviceMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const d of devices) {
      m.set(String(d.id), d.name);
    }
    return m;
  }, [devices]);

  const uziColumns = useUziTableColumns(deviceMap);

  React.useEffect(() => {
    setUziPage(1);
  }, [patientId]);

  const { data: patientApi, isLoading: patientLoading } = useGetMedPatientByIdQuery(patientId, {
    skip: !patientId || status !== "authenticated",
  });

  const { data: cardApi } = useGetMedPatientCardQuery(
    { doctorId, patientId },
    { skip: !doctorId || !patientId || status !== "authenticated" }
  );

  const { data: uziRows = [], isFetching: uziLoading } = useGetPatientUziStudiesQuery(patientId, {
    skip: !patientId || status !== "authenticated",
  });

  const patient = React.useMemo(() => {
    if (!patientApi) return null;
    return {
      ...patientApi,
      diagnosis: cardApi?.diagnosis ?? patientApi.diagnosis ?? "",
    };
  }, [patientApi, cardApi]);

  const loading = (status === "authenticated" && !doctorId) || patientLoading;

  const missingId = !patientId;

  const uziPagination = React.useMemo(
    () => ({
      current: uziPage,
      pageSize: uziPageSize,
      total: uziRows.length,
      showSizeChanger: true,
      pageSizeOptions: [10, 20, 50],
      showTotal: (total: number, range: [number, number]) =>
        total <= 0 ? "0 снимков" : `${range[0]}–${range[1]} из ${total} снимков`,
      onChange: (page: number, size?: number) => {
        const nextSize = size ?? uziPageSize;
        if (nextSize !== uziPageSize) {
          setUziPageSize(nextSize);
          setUziPage(1);
        } else {
          setUziPage(page);
        }
      },
    }),
    [uziPage, uziPageSize, uziRows.length]
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Content style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
        {missingId ? (
          <Typography.Text type="danger">Не указан идентификатор пациента (?id=)</Typography.Text>
        ) : (
          <PatientProfileView
            patient={patient}
            loading={loading}
            onBack={() => navigate("/patients")}
            backLabel="Пациенты"
          >
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card
                styles={{
                  body: { padding: "16px 24px 24px" },
                }}
                title="Снимки"
                extra={
                  <Button
                    type="primary"
                    disabled={!patientId}
                    onClick={() =>
                      navigate(`/upload_photo?patientId=${encodeURIComponent(patientId)}`)
                    }
                  >
                    Добавить
                  </Button>
                }
                style={{
                  borderRadius: 12,
                  width: "100%",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <Table<PatientUziStudyRow>
                  rowKey="key"
                  size="middle"
                  tableLayout="fixed"
                  style={{ width: "100%" }}
                  columns={uziColumns}
                  dataSource={uziRows}
                  loading={uziLoading}
                  pagination={uziPagination}
                  locale={{ emptyText: "Нет снимков" }}
                />
              </Card>
            </Space>
          </PatientProfileView>
        )}
      </Layout.Content>
    </Layout>
  );
}
