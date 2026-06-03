import * as React from "react";
import { Button, Flex, Form, Progress, Space, Typography, message } from "antd";
import type { FormInstance } from "antd/es/form";
import { uploadFileInChunks, type ChunkedUploadConfig } from "@medml/shared";

import type { UploadSchemaField } from "../ConfigurableUploadForm/uploadSchemaTypes";
import { UploadSchemaFieldItems } from "../ConfigurableUploadForm/UploadSchemaFieldItems";

export type ConfigurableSplitUploadProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  fields: UploadSchemaField[];
  uploadSlot: React.ReactNode;
  form?: FormInstance<Record<string, unknown>>;
  initialValues?: Record<string, unknown>;
  submitText?: React.ReactNode;
  cancelText?: React.ReactNode;
  className?: string;
  file?: File | null;
  requireFile?: boolean;
  /** Чанковая загрузка перед onSubmit (как OLD CYTO). */
  chunked?: ChunkedUploadConfig;
  /** Текст второй фазы после сборки чанков (отправка на API). */
  postUploadStatusLabel?: React.ReactNode;
  onCancel?: () => void;
  onSubmit: (payload: {
    values: Record<string, unknown>;
    uploadedFileMeta?: unknown;
  }) => void | Promise<void>;
};

export function ConfigurableSplitUpload({
  title,
  description,
  fields,
  uploadSlot,
  form: formProp,
  initialValues,
  submitText = "Начать",
  cancelText = "Отменить",
  className,
  file,
  requireFile = true,
  chunked,
  postUploadStatusLabel = "Отправка на сервер диагностики…",
  onCancel,
  onSubmit,
}: ConfigurableSplitUploadProps) {
  const [innerForm] = Form.useForm<Record<string, unknown>>();
  const form = formProp ?? innerForm;
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [submitPhase, setSubmitPhase] = React.useState<"chunks" | "api" | null>(null);

  const handleFinish = async (values: Record<string, unknown>) => {
    if (requireFile && !file) {
      message.error("Выберите файл для загрузки");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setSubmitPhase(chunked?.mode === "chunked" ? "chunks" : "api");
    try {
      let uploadedFileMeta: unknown;
      if (file && chunked?.mode === "chunked") {
        uploadedFileMeta = await uploadFileInChunks(file, chunked, {
          onProgress: setUploadProgress,
        });
        setSubmitPhase("api");
      }

      await onSubmit({ values, uploadedFileMeta });
    } finally {
      setSubmitting(false);
      setSubmitPhase(null);
      setUploadProgress(0);
    }
  };

  return (
    <div className={className}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {title ? (
          <Typography.Title level={3} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
        ) : null}
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}

        <Form<Record<string, unknown>>
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleFinish}
        >
          <Flex gap={24} align="flex-start" wrap="wrap">
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <UploadSchemaFieldItems fields={fields} disabled={submitting} />
            </div>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>{uploadSlot}</div>
          </Flex>

          {submitting && submitPhase === "chunks" && uploadProgress > 0 ? (
            <div style={{ marginTop: 16 }}>
              <Progress percent={uploadProgress} status="active" />
              <Typography.Text type="secondary">Загрузка файла: {uploadProgress}%</Typography.Text>
            </div>
          ) : null}

          {submitting && submitPhase === "api" ? (
            <div style={{ marginTop: 16 }}>
              <Progress percent={100} status="active" showInfo={false} />
              <Typography.Text type="secondary">{postUploadStatusLabel}</Typography.Text>
            </div>
          ) : null}

          <Space style={{ justifyContent: "flex-end", width: "100%", marginTop: 16 }}>
            {onCancel ? (
              <Button onClick={onCancel} disabled={submitting}>
                {cancelText}
              </Button>
            ) : null}
            <Button type="primary" htmlType="submit" loading={submitting}>
              {submitting && submitPhase === "chunks"
                ? `Загрузка… ${uploadProgress}%`
                : submitting && submitPhase === "api"
                  ? postUploadStatusLabel
                  : submitText}
            </Button>
          </Space>
        </Form>
      </Space>
    </div>
  );
}
