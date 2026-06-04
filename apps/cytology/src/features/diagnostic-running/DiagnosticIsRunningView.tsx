import { useEffect } from "react";
import { ConfigProvider, Flex, Result, Spin, Typography } from "antd";

import { useGetProcessingStatusQuery } from "@/lib/cytologyApi";

import "./DiagnosticIsRunningView.css";

export type DiagnosticIsRunningViewProps = {
  cytologyId: string;
  onReady: (id: string) => void;
};

export function DiagnosticIsRunningView({
  cytologyId,
  onReady,
}: DiagnosticIsRunningViewProps) {
  const { data, isError, isFetching } = useGetProcessingStatusQuery(cytologyId, {
    skip: !cytologyId,
    pollingInterval: 3000,
  });

  const status = data?.processing_status;

  useEffect(() => {
    if (status === "ready") {
      onReady(String(data?.image_id ?? cytologyId));
    }
  }, [status, data?.image_id, cytologyId, onReady]);

  if (!cytologyId) {
    return (
      <Result
        status="warning"
        title="Не указан идентификатор исследования"
        subTitle="Вернитесь к загрузке снимка и повторите попытку."
      />
    );
  }

  if (isError || status === "failed") {
    return (
      <Result
        status="error"
        title="Не удалось выполнить диагностику"
        subTitle="Попробуйте загрузить снимок ещё раз или обратитесь в поддержку."
      />
    );
  }

  if (status === "ready") {
    return null;
  }

  return (
    <ConfigProvider
      theme={{
        components: {
          Spin: {
            dotSizeLG: 80,
          },
        },
      }}
    >
      <Flex className="diagnostic-is-running" vertical align="center">
        <div className="diagnostic-is-running__spacer diagnostic-is-running__spacer--top" />
        <Spin size="large" spinning={isFetching || !status} />
        <div className="diagnostic-is-running__spacer" />
        <Typography.Title level={1} className="diagnostic-is-running__title">
          Проводится диагностика
        </Typography.Title>
        <div className="diagnostic-is-running__spacer diagnostic-is-running__spacer--small" />
        <Typography.Paragraph className="diagnostic-is-running__description">
          Анализ снимка занимает некоторое время
        </Typography.Paragraph>
      </Flex>
    </ConfigProvider>
  );
}
