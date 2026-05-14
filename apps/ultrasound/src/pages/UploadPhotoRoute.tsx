import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { InboxOutlined } from "@ant-design/icons";
import { Card, Layout, Space, Typography, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";

import { ConfigurableSplitUpload, type UploadSchemaField } from "@medml/ui";

import { useGetDoctorPatientsQuery } from "@/lib/patientsApi";
import { useUploadUziDiagnosticMutation, useGetUziDevicesQuery } from "@/lib/uziApi";
import { getRtkErrorMessage } from "@/lib/rtkErrorMessage";
import { useDoctorId } from "@/lib/useDoctorId";

const { Dragger } = Upload;

export default function UploadPhotoRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPatientId = searchParams.get("patientId")?.trim() ?? "";
  const { doctorId, status } = useDoctorId();
  const [uploadUzi, { isLoading: isUploading }] = useUploadUziDiagnosticMutation();

  const { data: devices = [], isFetching: devicesLoading } = useGetUziDevicesQuery(undefined, {
    skip: status !== "authenticated",
  });

  const { data: patientsData, isFetching: patientsLoading } = useGetDoctorPatientsQuery(
    { doctorId, page: 1, pageSize: 500 },
    { skip: !doctorId || status !== "authenticated" }
  );

  const patients = patientsData?.rows ?? [];

  const [file, setFile] = React.useState<File | null>(null);

  const fields = React.useMemo<UploadSchemaField[]>(() => {
    const deviceOptions = devices.map((d) => ({ value: d.id, label: d.name }));
    const patientOptions = patients.map((p) => ({
      value: String(p.id),
      label: `${p.fullName}${p.policyNumber ? ` — ${p.policyNumber}` : ""}`,
    }));

    return [
      {
        name: "device",
        label: "Аппарат",
        type: "select",
        required: true,
        placeholder: "Выберите аппарат",
        options: deviceOptions,
        disabled: devicesLoading && deviceOptions.length === 0,
      },
      {
        name: "projection",
        label: "Проекция",
        type: "select",
        required: true,
        placeholder: "Выберите проекцию",
        options: [
          { value: "long", label: "Продольная" },
          { value: "cross", label: "Поперечная" },
        ],
      },
      {
        name: "patient",
        label: "Пациент",
        type: "select",
        required: true,
        placeholder: "Выберите пациента",
        options: patientOptions,
        disabled: patientsLoading && patientOptions.length === 0,
      },
    ];
  }, [devices, devicesLoading, patients, patientsLoading]);

  const uploadProps: UploadProps = React.useMemo(
    () => ({
      name: "file",
      multiple: false,
      accept: ".png,.tiff",
      maxCount: 1,
      beforeUpload: (next) => {
        setFile(next as File);
        return false;
      },
      onRemove: () => {
        setFile(null);
      },
      fileList: file
        ? [
            {
              uid: "uzi-file",
              name: file.name,
              status: "done",
              originFileObj: file,
            } as UploadFile,
          ]
        : [],
    }),
    [file]
  );

  const handleSubmit = async ({ values }: { values: Record<string, unknown> }) => {
    if (!file) {
      message.error("Выберите файл для загрузки");
      return;
    }
    const projection = String(values.projection ?? "");
    const patientId = String(values.patient ?? "");
    const deviceId = String(values.device ?? "");
    try {
      await uploadUzi({ file, projection, patientId, deviceId }).unwrap();
      message.success("Снимок отправлен на диагностику");
      navigate("/patients");
    } catch (e) {
      message.error(getRtkErrorMessage(e));
      console.error(e);
    }
  };

  const pageBusy =
    status === "authenticated" && (!doctorId || devicesLoading || patientsLoading);

  const uploadInitialValues = React.useMemo(
    () => (presetPatientId ? { patient: presetPatientId } : undefined),
    [presetPatientId]
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Content style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
        <Card style={{ borderRadius: 12 }}>
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Загрузка снимка
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Для начала диагностики загрузите снимок УЗИ щитовидной железы и укажите параметры слева.
            </Typography.Paragraph>

            <ConfigurableSplitUpload
              key={presetPatientId || "upload-default"}
              fields={fields}
              initialValues={uploadInitialValues}
              file={file}
              requireFile
              onSubmit={handleSubmit}
              submitText="Начать диагностику"
              uploadSlot={
                <Dragger {...uploadProps} disabled={pageBusy || isUploading}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Нажмите или перетащите файл в эту область</p>
                  <p className="ant-upload-hint">Форматы: .png или .tiff</p>
                </Dragger>
              }
            />
          </Space>
        </Card>
      </Layout.Content>
    </Layout>
  );
}
