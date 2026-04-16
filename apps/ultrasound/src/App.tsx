import { App as AntApp } from "antd";
import { useRoutes } from "react-router-dom";

import {
  AntDesignProviderSpa,
  LoadingWrapper,
  MessageWrapper,
  ModalWrapper,
} from "@medml/ui";
import { AuthErrorProvider } from "@medml/auth";

import routes from "./routes";
import SessionSync from "./providers/SessionSync";

import "../../../lib/ui/src/styles/global.scss";

export default function App() {
  const element = useRoutes(routes);

  return (
    <AntDesignProviderSpa>
      <AntApp>
        <LoadingWrapper>
          <MessageWrapper>
            <ModalWrapper>
              <SessionSync>
                <AuthErrorProvider>{element}</AuthErrorProvider>
              </SessionSync>
            </ModalWrapper>
          </MessageWrapper>
        </LoadingWrapper>
      </AntApp>
    </AntDesignProviderSpa>
  );
}
