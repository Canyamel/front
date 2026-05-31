"use client";

import * as React from "react";
import { InboxOutlined } from "@ant-design/icons";
import { Card, Space, Typography, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
import type { ChunkedUploadCompleteMeta } from "@medml/shared";
import {
  CYTOLOGY_UPLOAD_MAX_SIZE_GB,
  cytologyChunkUploadConfig,
} from "@medml/cytology-upload";
import { ConfigurableSplitUpload, type UploadSchemaField } from "@medml/ui";

import { cytologyLocalizations, cytologyMarkings } from "./constants";
import { formatCytologyUploadError, resolveCytologyCreateId } from "./mapUploadValues";

const { Dragger } = Upload;

export type CytologyPatientOption = {
  value: string;
  label: string;
};

export type CytologyUploadPhotoProps = {
  presetPatientCardId?: string;
  patientOptions: CytologyPatientOption[];
  patientsLoading?: boolean;
  isSubmitting?: boolean;
  /** POST multipart на API (через Vite proxy `/api/v3/cytology/create/`), как в OLD CYTO. */
  onCreate: (params: {
    file: File;
    values: Record<string, unknown>;
  }) => Promise<{ id?: string | number; image_id?: string | number; pk?: string | number }>;
  onSuccess: (id: string | number) => void;
};

export function CytologyUploadPhoto({
  presetPatientCardId = "",
  patientOptions,
  patientsLoading = false,
  isSubmitting = false,
  onCreate,
  onSuccess,
}: CytologyUploadPhotoProps) {
  const [file, setFile] = React.useState<File | null>(null);

  const fields = React.useMemo<UploadSchemaField[]>(
    () => [
      {
        name: "marking",
        label: "Доп. маркировка",
        type: "select",
        required: true,
        options: Object.entries(cytologyMarkings).map(([value, label]) => ({ value, label })),
      },
      { name: "number", label: "Номер исследования", type: "input", required: true },
      {
        name: "localization",
        label: "Локализация",
        type: "select",
        required: true,
        options: Object.entries(cytologyLocalizations).map(([value, label]) => ({ value, label })),
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
        disabled: patientsLoading && patientOptions.length === 0,
      },
    ],
    [patientOptions, patientsLoading]
  );

  const uploadProps: UploadProps = React.useMemo(
    () => ({
      name: "file",
      multiple: false,
      accept: ".svs",
      maxCount: 1,
      beforeUpload: (next) => {
        const maxSize = CYTOLOGY_UPLOAD_MAX_SIZE_GB * 1024 * 1024 * 1024;
        if (next.size > maxSize) {
          message.error(`Файл должен быть меньше ${CYTOLOGY_UPLOAD_MAX_SIZE_GB} ГБ`);
          return Upload.LIST_IGNORE;
        }
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

  const onSubmit = async ({
    values,
    uploadedFileMeta,
  }: {
    values: Record<string, unknown>;
    uploadedFileMeta?: unknown;
  }) => {
    if (!file) {
      message.error("Выберите файл формата .svs");
      return;
    }
    if (!uploadedFileMeta) {
      message.error("Сначала завершите чанковую загрузку файла");
      return;
    }

    try {
      const result = await onCreate({ file, values });
      const nextId = resolveCytologyCreateId(result);
      if (nextId == null) {
        throw new Error("No cytology id in response");
      }
      message.success("Снимок отправлен на диагностику");
      onSuccess(nextId);
    } catch (error) {
      message.error(formatCytologyUploadError(error));
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
            Файл .svs загружается по частям (по 20 МБ), затем отправляется на диагностику.
          </Typography.Paragraph>

          <ConfigurableSplitUpload
            key={presetPatientCardId || "cyto-upload"}
            fields={fields}
            initialValues={presetPatientCardId ? { patientCard: presetPatientCardId } : undefined}
            file={file}
            requireFile
            chunked={cytologyChunkUploadConfig}
            onSubmit={onSubmit}
            submitText="Начать диагностику"
            uploadSlot={
              <Dragger {...uploadProps} disabled={isSubmitting}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Нажмите или перетащите файл в эту область</p>
                <p className="ant-upload-hint">
                  Формат .svs, до {CYTOLOGY_UPLOAD_MAX_SIZE_GB} ГБ (чанки по 20 МБ)
                </p>
              </Dragger>
            }
          />
        </Space>
      </Card>
    </div>
  );
}
