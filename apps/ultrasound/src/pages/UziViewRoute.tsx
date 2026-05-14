import { Provider } from "react-redux";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { Layout, Typography } from "antd";

import type { RootState } from "@medml/store";

import UziView from "@/uzi_view/UziView/UziView";
import { store as uziViewStore } from "@/uzi_view/store/store";

/**
 * Оригинальный UZI viewer из OLD_PROJECTS (отдельный Redux store внутри Provider).
 * Токен синхронизируется из основного приложения.
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

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Content style={{ padding: 24, width: "100%", maxWidth: "100%" }}>
        <Provider store={uziViewStore}>
          <UziView generalUziId={uziId} accessToken={accessToken ?? undefined} />
        </Provider>
      </Layout.Content>
    </Layout>
  );
}
