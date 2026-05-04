import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  type CytologySegmentStack,
  useAddSegmentMutation,
  useDeleteSegmentMutation,
  useGetCytologyInfoQuery,
  useGetCytologyTypesQuery,
  useLazyGetCytologySegmentsByTypeQuery,
  usePatchSegmentMutation,
} from "@/lib/cytologyApi";
import { buildRectanglePoints, formatPointsJson, parsePointsJson } from "@/features/cytologyViewer/segmentPoints";

export default function CytologyViewRoute() {
  const params = useParams<{ id: string }>();
  const cytologyId = params.id?.trim() ?? "";
  const { data, isFetching } = useGetCytologyInfoQuery(cytologyId, { skip: !cytologyId });
  const { data: segmentTypes = [], isFetching: isTypesFetching } = useGetCytologyTypesQuery(cytologyId, {
    skip: !cytologyId,
  });
  const [loadSegments, { data: segments = [], isFetching: isSegmentsFetching }] =
    useLazyGetCytologySegmentsByTypeQuery();
  const [addSegment, { isLoading: isAddingSegment }] = useAddSegmentMutation();
  const [patchSegment, { isLoading: isPatchingSegment }] = usePatchSegmentMutation();
  const [deleteSegment, { isLoading: isDeletingSegment }] = useDeleteSegmentMutation();

  const [activeSegmentType, setActiveSegmentType] = useState<string>();
  const [editingSegment, setEditingSegment] = useState<CytologySegmentStack | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPointsJson, setEditPointsJson] = useState("");
  const [apiMessage, contextHolder] = message.useMessage();
  const [addForm] = Form.useForm<{ x: number; y: number; width: number; height: number }>();

  useEffect(() => {
    if (!segmentTypes.length) return;
    setActiveSegmentType((prev) =>
      prev && segmentTypes.some((segmentType) => segmentType.code === prev) ? prev : segmentTypes[0]?.code
    );
  }, [segmentTypes]);

  useEffect(() => {
    if (!cytologyId || !activeSegmentType) return;
    loadSegments({ id: cytologyId, segType: activeSegmentType });
  }, [activeSegmentType, cytologyId, loadSegments]);

  const typeColorMap = useMemo(
    () => Object.fromEntries(segmentTypes.map((segmentType) => [segmentType.code, segmentType.color])),
    [segmentTypes]
  );

  const openEditModal = (segment: CytologySegmentStack) => {
    setEditingSegment(segment);
    setEditPointsJson(formatPointsJson(segment.points));
    setIsEditModalOpen(true);
  };

  const handleAddSegment = async () => {
    if (!cytologyId || !activeSegmentType) return;
    try {
      const values = await addForm.validateFields();
      await addSegment({
        cytologyId,
        segment: {
          seg_type: activeSegmentType,
          data: {
            points: buildRectanglePoints(values.x, values.y, values.width, values.height),
          },
        },
      }).unwrap();
      apiMessage.success("Сегмент добавлен.");
      addForm.resetFields();
      await loadSegments({ id: cytologyId, segType: activeSegmentType }, true).unwrap();
    } catch (error) {
      if (error instanceof Error && error.message.includes("validate")) return;
      apiMessage.error("Не удалось добавить сегмент.");
    }
  };

  const handleSaveEditedSegment = async () => {
    if (!editingSegment || !activeSegmentType) return;
    try {
      const points = parsePointsJson(editPointsJson);
      await patchSegment({ segmentId: editingSegment.id, body: { points } }).unwrap();
      apiMessage.success("Сегмент обновлен.");
      setIsEditModalOpen(false);
      setEditingSegment(null);
      if (cytologyId) {
        await loadSegments({ id: cytologyId, segType: activeSegmentType }, true).unwrap();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Не удалось обновить сегмент. Проверьте формат точек.";
      apiMessage.error(errorMessage);
    }
  };

  const handleDeleteSegment = async (segmentId: string | number) => {
    if (!cytologyId || !activeSegmentType) return;
    try {
      await deleteSegment(segmentId).unwrap();
      apiMessage.success("Сегмент удален.");
      await loadSegments({ id: cytologyId, segType: activeSegmentType }, true).unwrap();
    } catch {
      apiMessage.error("Не удалось удалить сегмент.");
    }
  };

  if (!cytologyId) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text type="danger">Не указан идентификатор цитологии.</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      {contextHolder}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Цитология #{cytologyId}
        </Typography.Title>

        <Card loading={isFetching} style={{ borderRadius: 12 }}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Статус">{data?.status ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Маркировка">
              {data?.diagnostic_marking ?? "—"}-{data?.diagnostic_number ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Дата">{data?.diagnos_date ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Материал">{data?.material_type ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Диагноз">{data?.info?.diagnosis ?? "—"}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Просмотр и базовое редактирование сегментов" style={{ borderRadius: 12 }}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {!!data?.image && (
              <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
                <Typography.Text type="secondary">Изображение препарата</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <img
                    src={data.image}
                    alt={`Цитология ${cytologyId}`}
                    style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 6, objectFit: "contain" }}
                  />
                </div>
              </div>
            )}

            {segmentTypes.length > 0 ? (
              <Segmented
                block
                options={segmentTypes.map((segmentType) => ({
                  label: (
                    <Space size={6}>
                      <span>{segmentType.code}</span>
                      <Tag color={segmentType.color}>{segmentType.label}</Tag>
                    </Space>
                  ),
                  value: segmentType.code,
                }))}
                value={activeSegmentType}
                onChange={(value) => setActiveSegmentType(String(value))}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message={isTypesFetching ? "Загрузка типов сегментов..." : "Типы сегментов пока недоступны"}
              />
            )}

            <Form
              form={addForm}
              layout="inline"
              initialValues={{ x: 100, y: 100, width: 60, height: 60 }}
              onFinish={handleAddSegment}
            >
              <Form.Item label="X" name="x" rules={[{ required: true }]}>
                <InputNumber min={0} />
              </Form.Item>
              <Form.Item label="Y" name="y" rules={[{ required: true }]}>
                <InputNumber min={0} />
              </Form.Item>
              <Form.Item label="Ширина" name="width" rules={[{ required: true }, { type: "number", min: 1 }]}>
                <InputNumber min={1} />
              </Form.Item>
              <Form.Item label="Высота" name="height" rules={[{ required: true }, { type: "number", min: 1 }]}>
                <InputNumber min={1} />
              </Form.Item>
              <Form.Item>
                <Button htmlType="submit" type="primary" loading={isAddingSegment || isSegmentsFetching}>
                  Добавить прямоугольник
                </Button>
              </Form.Item>
            </Form>

            <Table<CytologySegmentStack>
              rowKey={(record) => String(record.id)}
              loading={isSegmentsFetching}
              dataSource={segments}
              pagination={false}
              locale={{ emptyText: "Сегменты выбранного типа отсутствуют" }}
              columns={[
                { title: "ID", dataIndex: "id", width: 110 },
                {
                  title: "Тип",
                  dataIndex: "seg_type",
                  render: (value: string) => <Tag color={typeColorMap[value] ?? "default"}>{value}</Tag>,
                },
                {
                  title: "Источник",
                  dataIndex: "is_ai",
                  render: (value: boolean | undefined) => (value ? "AI" : "Ручной"),
                },
                {
                  title: "Точек",
                  render: (_, record) => record.points.length,
                },
                {
                  title: "Действия",
                  width: 220,
                  render: (_, record) => (
                    <Space>
                      <Button size="small" onClick={() => openEditModal(record)}>
                        Редактировать точки
                      </Button>
                      <Popconfirm
                        title="Удалить сегмент?"
                        description="Действие нельзя отменить."
                        onConfirm={() => handleDeleteSegment(record.id)}
                      >
                        <Button danger size="small" loading={isDeletingSegment}>
                          Удалить
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        </Card>

        <Space size={16}>
          <Link to="/history">История</Link>
          <Link to="/dialogs">Диалоги</Link>
          <Link to="/export">Экспорт</Link>
          <Link to={`/diagnosis_is_complete/${encodeURIComponent(cytologyId)}`}>Статус завершения</Link>
        </Space>
      </Space>

      <Modal
        title={editingSegment ? `Редактирование сегмента #${editingSegment.id}` : "Редактирование сегмента"}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleSaveEditedSegment}
        okText="Сохранить"
        confirmLoading={isPatchingSegment}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          Измените JSON-массив точек в формате <code>[{"{"} "x": 10, "y": 20 {"}"}]</code>.
        </Typography.Paragraph>
        <Input.TextArea rows={12} value={editPointsJson} onChange={(event) => setEditPointsJson(event.target.value)} />
      </Modal>
    </div>
  );
}
