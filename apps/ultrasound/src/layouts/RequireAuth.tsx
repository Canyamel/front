import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@medml/store";
import { DEFAULT_LOGIN_ROUTE } from "@medml/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken);
  const location = useLocation();

  if (!token) {
    const callback = `${location.pathname}${location.search}`;
    const search =
      callback && callback !== "/"
        ? `?callbackUrl=${encodeURIComponent(callback)}`
        : "";
    return <Navigate to={`${DEFAULT_LOGIN_ROUTE}${search}`} replace />;
  }

  return children;
}
