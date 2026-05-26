import { Provider } from "react-redux";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { Button, Layout, Space, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import type { RootState } from "@medml/store";

import { isThyroidBackend } from "@/lib/apiBackend";
import ThyroidResultsPage from "@/pages/ResultPage/ResultsPage";
import UziView from "@/uzi_view/UziView/UziView";
import { store as uziViewStore } from "@/uzi_view/store/store";

/**
 * Просмотр и редактирование снимка УЗИ.
 * Thyroid: UI как ResultPage (Gallery + сегменты Annotorious).
 * Med: legacy UziView.
 * URL: /uzi_view/:uziId
 */
export default function UziViewRoute() {
  const { uziId } = useParams<{ uziId: string }>();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);

  if (!uziId?.trim()) {
    return (
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        <Layout.Content style={{ padding: 24, width: "100%", maxWidth: "100%" }}>
          <Typography.Text type="danger">Не указан идентификатор снимка УЗИ.</Typography.Text>
        </Layout.Content>
      </Layout>
    );
  }

  const backLink = (
    <Space style={{ marginBottom: 16 }}>
      <Link to="/patients">
        <Button type="text" icon={<ArrowLeftOutlined />}>
          К списку пациентов
        </Button>
      </Link>
    </Space>
  );

  if (isThyroidBackend()) {
    return (
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        <Layout.Content style={{ padding: 24, width: "100%", maxWidth: "100%" }}>
          {backLink}
          <ThyroidResultsPage uziId={uziId.trim()} />
        </Layout.Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Content
        style={{
          padding: 24,
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
        }}
      >
        {backLink}
        <Provider store={uziViewStore}>
          <UziView generalUziId={uziId} accessToken={accessToken ?? undefined} />
        </Provider>
      </Layout.Content>
    </Layout>
  );
}
