"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Result, Space, Typography } from "antd";

export default function DiagnosisIsCompletePage() {
  const params = useParams<{ id: string }>();
  const id = params.id?.trim() ?? "";

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <Card style={{ borderRadius: 12 }}>
        <Result
          status="success"
          title="Диагностика завершена"
          subTitle={`Результат исследования #${id || "—"} готов к просмотру.`}
        />
        <Space size={16}>
          {id ? <Link href={`/cytology/${encodeURIComponent(id)}`}>Открыть результат</Link> : null}
          <Link href="/patients">К списку пациентов</Link>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          Экран повторяет сценарий old Cytology для завершенной диагностики.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
