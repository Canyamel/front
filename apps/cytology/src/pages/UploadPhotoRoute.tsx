import * as React from "react";
import { InboxOutlined } from "@ant-design/icons";
import { Card, Space, Typography, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ConfigurableSplitUpload, type UploadSchemaField } from "@medml/ui";

import { markings, localizations } from "@/lib/cytologyConstants";
import {
  formatCreateCytologyError,
  mapUploadValuesToCreateCytologyBody,
  useCreateCytologyMutation,
} from "@/lib/cytologyApi";
import { useGetMedWorkerPatientsQuery } from "@/lib/patientsApi";
import { useDoctorId } from "@/lib/useDoctorId";

const { Dragger } = Upload;

export default function UploadPhotoRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPatientCardId = searchParams.get("patientId")?.trim() ?? "";
  const { doctorId, status } = useDoctorId();
  const [file, setFile] = React.useState<File | null>(null);
  const [createCytology, { isLoading }] = useCreateCytologyMutation();

  const { data, isFetching } = useGetMedWorkerPatientsQuery(
    { doctorId },
    { skip: !doctorId || status !== "authenticated" }
  );

  const fields = React.useMemo<UploadSchemaField[]>(() => {
    const patientOptions =
      data?.cards.map((card) => ({
        value: card.cardId,
        label: `${card.fullName}${card.policyNumber ? ` — ${card.policyNumber}` : ""}`,
      })) ?? [];

    return [
      {
        name: "marking",
        label: "Доп. маркировка",
        type: "select",
        required: true,
        options: Object.entries(markings).map(([value, label]) => ({ value, label })),
      },
      { name: "number", label: "Номер исследования", type: "input", required: true },
      {
        name: "localization",
        label: "Локализация",
        type: "select",
        required: true,
        options: Object.entries(localizations).map(([value, label]) => ({ value, label })),
      },
      { name: "calcitonin", label: "Кальцитонин", type: "input", required: true },
      { name: "thyroglobulin", label: "Тиреоглобулин в смыве", type: "input", required: true },
      { name: "calcInSense", label: "Кальцитонин в смыве", type: "input", required: true },
      {
        name: "patientCard",
        label: "Карта пациента",
        type: "select",
        required: true,
        options: patientOptions,
        disabled: isFetching && patientOptions.length === 0,
      },
    ];
  }, [data?.cards, isFetching]);

  const uploadProps: UploadProps = React.useMemo(
    () => ({
      name: "file",
      multiple: false,
      accept: ".svs",
      maxCount: 1,
      beforeUpload: (next) => {
        setFile(next as File);
        return false;
      },
      onRemove: () => setFile(null),
      fileList: file
        ? ([{ uid: "cyto-file", name: file.name, status: "done", originFileObj: file }] as UploadFile[])
        : [],
    }),
    [file]
  );

  const onSubmit = async ({ values }: { values: Record<string, unknown> }) => {
    if (!file) {
      message.error("Выберите файл формата .svs");
      return;
    }
    try {
      const result = await createCytology(mapUploadValuesToCreateCytologyBody(file, values)).unwrap();

      message.success("Снимок отправлен на диагностику");
      const nextId = result.id ?? result.image_id;
      if (!nextId) {
        throw new Error("No cytology id in response");
      }
      navigate(`/diagnostic_is_running/${encodeURIComponent(String(nextId))}`);
    } catch (error) {
      message.error(formatCreateCytologyError(error));
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <Card style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Загрузка снимка цитологии
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Загрузите файл .svs и заполните параметры для запуска диагностики.
          </Typography.Paragraph>

          <ConfigurableSplitUpload
            key={presetPatientCardId || "cyto-upload"}
            fields={fields}
            initialValues={presetPatientCardId ? { patientCard: presetPatientCardId } : undefined}
            file={file}
            requireFile
            onSubmit={onSubmit}
            submitText="Начать диагностику"
            uploadSlot={
              <Dragger {...uploadProps} disabled={isLoading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Нажмите или перетащите файл в эту область</p>
                <p className="ant-upload-hint">Поддерживается формат .svs</p>
              </Dragger>
            }
          />
        </Space>
      </Card>
    </div>
  );
}
