import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import RegisterPage from "../../../../domains/auth/src/pages/register/page";
import AuthLayoutSpa from "../../../../domains/auth/src/components/AuthLayoutSpa/AuthLayoutSpa";
import { AuthApiProvider } from "../../../../domains/auth/src/contexts/AuthApiContext";
import { DEFAULT_POST_AUTH_PATH } from "../../../../domains/auth/src/constants/routes";
import { sanitizeInternalPath } from "../../../../domains/auth/src/utils/sanitizeCallbackUrl";
import type { IAuthApi } from "../../../../domains/auth/src/types";
import {
  setRefreshToken as setRefreshTokenState,
  setToken,
  unwrapMutation,
  useAppDispatch,
} from "@medml/store";

import { useLoginMutation, useRegisterUserMutation } from "@/lib/authApi";
import { setAuthToken, setRefreshToken } from "@/lib/tokenStorage";

export default function RegisterRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterUserMutation();
  const loginWithUnwrap = unwrapMutation(loginMutation);
  const registerWithUnwrap = unwrapMutation(registerMutation);

  const authApi: IAuthApi = useMemo(
    () => ({
      login: async (payload) => {
        const data = await loginWithUnwrap(payload);
        dispatch(setToken(data.accessToken));
        dispatch(setRefreshTokenState(data.refreshToken));
        setAuthToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return data;
      },
      register: async (payload) => {
        await registerWithUnwrap(payload);
      },
    }),
    [dispatch, loginWithUnwrap, registerWithUnwrap]
  );

  const handleSuccess = () => {
    const raw = searchParams.get("callbackUrl");
    const target = sanitizeInternalPath(raw) ?? DEFAULT_POST_AUTH_PATH;
    navigate(target, { replace: true });
  };

  return (
    <AuthApiProvider api={authApi}>
      <AuthLayoutSpa>
        <RegisterPage onSuccess={handleSuccess} />
      </AuthLayoutSpa>
    </AuthApiProvider>
  );
}
