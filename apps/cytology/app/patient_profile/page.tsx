"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { PatientProfileView } from "@medml/patient_view";

import { useGetPatientShotsByCardIdQuery, type CytologyStudyRow } from "@/lib/patientProfileApi";

const studyColumns: ColumnsType<CytologyStudyRow> = [
  { title: "Дата забора", dataIndex: "cytologyDateLabel", key: "cytologyDateLabel", width: "16%" },
  { title: "Номер исследования", dataIndex: "numberLabel", key: "numberLabel", width: "22%" },
  { title: "Локализация", dataIndex: "materialTypeLabel", key: "materialTypeLabel", width: "24%" },
  { title: "Категория", dataIndex: "bethesdaLabel", key: "bethesdaLabel", width: "16%" },
  {
    title: "Результат",
    key: "result",
    width: "22%",
    render: (_value, row) => (
      <Space size={8}>
        <Link href={`/cytology/${encodeURIComponent(row.id)}`}>Открыть</Link>
        <Tag>История</Tag>
      </Space>
    ),
  },
];

export default function PatientProfileRoutePage() {
  const router = useRouter();
  const params = useSearchParams();
  const cardId = params.get("id")?.trim() ?? "";

  const { data, isFetching } = useGetPatientShotsByCardIdQuery(cardId, { skip: !cardId });

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      {!cardId ? (
        <Typography.Text type="danger">Не указан идентификатор карты пациента (?id=)</Typography.Text>
      ) : (
        <PatientProfileView
          patient={data?.patient ?? null}
          loading={isFetching}
          onBack={() => router.push("/patients")}
          backLabel="Пациенты"
          actions={
            <Button type="primary" onClick={() => router.push(`/upload_photo?patientId=${cardId}`)}>
              Добавить снимок
            </Button>
          }
        >
          <Card
            title="Цитологические исследования"
            extra={
              <Space size={8}>
                <Link href="/export">Экспорт</Link>
                <Link href="/dialogs">Диалоги</Link>
                <Link href="/history">История</Link>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Table<CytologyStudyRow>
              rowKey="id"
              columns={studyColumns}
              dataSource={data?.studies ?? []}
              loading={isFetching}
              locale={{ emptyText: "Нет исследований" }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          </Card>
        </PatientProfileView>
      )}
    </div>
  );
}
