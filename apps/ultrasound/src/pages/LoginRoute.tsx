import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  AuthApiProvider,
  LoginPage,
  AuthLayoutSpa,
  DEFAULT_POST_AUTH_PATH,
  sanitizeInternalPath,
  type IAuthApi,
} from "@medml/auth";
import {
  setToken,
  setRefreshToken as setRefreshTokenState,
  unwrapMutation,
  useAppDispatch,
} from "@medml/store";

import { useLoginMutation } from "@/api/authApi";
import { setAuthToken, setRefreshToken } from "@/lib/tokenStorage";

export default function LoginRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const [loginMutation] = useLoginMutation();
  const loginWithUnwrap = unwrapMutation(loginMutation);

  const stubAuthApi: IAuthApi = useMemo(
    () => ({
      login: async (payload) => {
        const data = await loginWithUnwrap(payload);
        dispatch(setToken(data.accessToken));
        dispatch(setRefreshTokenState(data.refreshToken));
        setAuthToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return data;
      },
      register: async () => {
        throw new Error("Регистрация для этого приложения не подключена");
      },
    }),
    [loginWithUnwrap, dispatch]
  );

  const handleSuccess = () => {
    const raw = searchParams.get("callbackUrl");
    const target = sanitizeInternalPath(raw) ?? DEFAULT_POST_AUTH_PATH;
    navigate(target, { replace: true });
  };

  return (
    <AuthApiProvider api={stubAuthApi}>
      <AuthLayoutSpa>
        <LoginPage
          onSuccess={handleSuccess}
          callbackUrl={searchParams.get("callbackUrl")}
        />
      </AuthLayoutSpa>
    </AuthApiProvider>
  );
}
