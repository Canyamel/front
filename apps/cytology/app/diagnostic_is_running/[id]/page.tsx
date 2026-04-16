"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Result, Space, Typography } from "antd";

export default function DiagnosticIsRunningPage() {
  const params = useParams<{ id: string }>();
  const id = params.id?.trim() ?? "";

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <Card style={{ borderRadius: 12 }}>
        <Result
          status="info"
          title="Снимок анализируется"
          subTitle={`Исследование #${id || "—"} находится в обработке. Вы можете вернуться позже или открыть список пациентов.`}
        />
        <Space size={16}>
          <Link href="/patients">Перейти к пациентам</Link>
          {id ? <Link href={`/cytology/${encodeURIComponent(id)}`}>Обновить статус</Link> : null}
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          Экран приведен к UX старого Cytology: отдельное состояние ожидания результата.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
