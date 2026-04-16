"use client";

import * as React from "react";
import { Button, Form, Space, Typography, Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";

import { UploadSchemaFieldItems } from "./UploadSchemaFieldItems";
import type { ChunkedUploadConfig, ConfigurableUploadFormProps } from "./uploadSchemaTypes";

export type {
  UploadSchemaFieldOption,
  UploadSchemaField,
  ChunkedUploadConfig,
  UploadConfig,
  ConfigurableUploadSubmitPayload,
  ConfigurableUploadFormProps,
} from "./uploadSchemaTypes";

const { Dragger } = Upload;

const defaultChunkedStartPayload = (file: File, chunkSize: number) => {
  const totalChunks = Math.ceil(file.size / chunkSize);
  const fileId = `${file.name}-${file.size}-${Date.now()}`;
  return {
    fileName: file.name,
    fileSize: file.size,
    totalChunks,
    chunkSize,
    fileId,
  };
};

const uploadFileInChunks = async (file: File, config: ChunkedUploadConfig) => {
  const chunkSize = (config.chunkSizeMb ?? 20) * 1024 * 1024;
  const startPayload = config.getStartPayload?.(file) ?? defaultChunkedStartPayload(file, chunkSize);
  const totalChunks = Math.ceil(file.size / chunkSize);
  const fileId = String((startPayload as { fileId?: unknown }).fileId ?? `${file.name}-${Date.now()}`);

  const startResponse = await fetch(config.startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(startPayload),
  });
  if (!startResponse.ok) {
    throw new Error("Failed to start upload session");
  }

  const startData = (await startResponse.json()) as { uploadId?: string };

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("chunkIndex", String(chunkIndex));
    formData.append("totalChunks", String(totalChunks));
    formData.append("fileId", fileId);
    formData.append("fileName", file.name);
    if (startData.uploadId) formData.append("uploadId", startData.uploadId);

    const chunkResponse = await fetch(config.chunkUrl, {
      method: "POST",
      body: formData,
    });
    if (!chunkResponse.ok) {
      throw new Error(`Failed uploading chunk ${chunkIndex + 1}/${totalChunks}`);
    }
  }

  const completeResponse = await fetch(config.completeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileId,
      fileName: file.name,
      uploadId: startData.uploadId,
    }),
  });
  if (!completeResponse.ok) {
    throw new Error("Failed to complete upload session");
  }

  return completeResponse.json();
};

export function ConfigurableUploadForm({
  title = "Upload",
  description,
  fields,
  upload,
  initialValues,
  submitText = "Submit",
  cancelText = "Cancel",
  className,
  onCancel,
  onSubmit,
}: ConfigurableUploadFormProps) {
  const [form] = Form.useForm<Record<string, unknown>>();
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const uploadEnabled = upload?.enabled ?? true;
  const maxCount = upload?.maxCount ?? 1;
  const maxSizeBytes = (upload?.maxSizeMb ?? 10240) * 1024 * 1024;

  const fileList: UploadFile[] = file
    ? [
        {
          uid: "upload-file",
          name: file.name,
          size: file.size,
          type: file.type,
          status: "done",
        },
      ]
    : [];

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: upload?.accept,
    maxCount,
    beforeUpload: (nextFile) => {
      if (nextFile.size > maxSizeBytes) {
        message.error(`File must be smaller than ${upload?.maxSizeMb ?? 10240}MB`);
        return Upload.LIST_IGNORE;
      }
      setFile(nextFile as File);
      return false;
    },
    onRemove: () => {
      setFile(null);
    },
    showUploadList: true,
    fileList,
  };

  const handleFinish = async (values: Record<string, unknown>) => {
    if (uploadEnabled && !file) {
      message.error("Choose file before submit");
      return;
    }

    setUploading(true);
    try {
      let uploadedFileMeta: unknown;
      if (file && upload?.chunked?.mode === "chunked") {
        uploadedFileMeta = await uploadFileInChunks(file, upload.chunked);
      }

      await onSubmit({
        values,
        file,
        uploadedFileMeta,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {title ? <Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title> : null}
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}

        <Form<Record<string, unknown>>
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleFinish}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {uploadEnabled ? (
              <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {upload?.draggerDescription ?? "Click or drag file to this area"}
                </p>
                <p className="ant-upload-hint">{upload?.draggerHint ?? "Single file upload supported"}</p>
              </Dragger>
            ) : null}

            <UploadSchemaFieldItems fields={fields} disabled={uploading} />

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              {onCancel ? (
                <Button onClick={onCancel} disabled={uploading}>
                  {cancelText}
                </Button>
              ) : null}
              <Button type="primary" htmlType="submit" loading={uploading}>
                {submitText}
              </Button>
            </Space>
          </Space>
        </Form>
      </Space>
    </div>
  );
}

