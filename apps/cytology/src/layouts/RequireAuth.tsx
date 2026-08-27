import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@medml/store";
import { DEFAULT_LOGIN_ROUTE } from "@medml/auth";
import { getAccessTokenSubject } from "@/lib/jwtSubject";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken);
  const location = useLocation();
  const tokenSubject = token ? getAccessTokenSubject(token) : "";
  const isAuthorized = Boolean(token && tokenSubject);

  if (!isAuthorized) {
    const callback = `${location.pathname}${location.search}`;
    const search =
      callback && callback !== "/" ? `?callbackUrl=${encodeURIComponent(callback)}` : "";
    return <Navigate to={`${DEFAULT_LOGIN_ROUTE}${search}`} replace />;
  }

  return children;
}
