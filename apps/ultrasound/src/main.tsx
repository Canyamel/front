import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import {
  createStore,
  setToken,
  setRefreshToken as setRefreshTokenState,
} from "@medml/store";

import App from "./App";
import "./lib/uziApi";
import {
  clearAuthToken,
  clearRefreshToken,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from "./lib/tokenStorage";

import "./styles/reset.scss";
import "./styles/global.scss";

const store = createStore();
const persistedAccess = getAuthToken();
const persistedRefresh = getRefreshToken();
if (persistedAccess) {
  store.dispatch(setToken(persistedAccess));
}
if (persistedRefresh) {
  store.dispatch(setRefreshTokenState(persistedRefresh));
}

let prevAccess = store.getState().auth.accessToken;
let prevRefresh = store.getState().auth.refreshToken;
store.subscribe(() => {
  const { accessToken, refreshToken } = store.getState().auth;
  if (accessToken !== prevAccess) {
    prevAccess = accessToken;
    if (accessToken) {
      setAuthToken(accessToken);
    } else {
      clearAuthToken();
    }
  }
  if (refreshToken !== prevRefresh) {
    prevRefresh = refreshToken;
    if (refreshToken) {
      setRefreshToken(refreshToken);
    } else {
      clearRefreshToken();
    }
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
