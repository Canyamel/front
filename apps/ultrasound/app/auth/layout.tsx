"use client";

import { useMemo } from "react";
import { signIn } from "next-auth/react";

import { unwrapMutation, useAppDispatch, setToken } from "@medml/store";
import { useLoginMutation } from "@/lib/authApi";
import { AuthLayout, AuthApiProvider } from "@medml/auth";
import type { IAuthApi } from "@medml/auth";

const AuthLayoutWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const [loginMutation] = useLoginMutation();
  const loginWithUnwrap = unwrapMutation(loginMutation);

  const stubAuthApi: IAuthApi = useMemo(
    () => ({
      login: async (payload) => {
        const data = await loginWithUnwrap(payload);
        dispatch(setToken(data.accessToken));
        await signIn("credentials", {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        return data;
      },
      register: async () => {
        throw new Error(
          "Provide your IAuthApi implementation via AuthApiProvider in this layout"
        );
      },
    }),
    [loginWithUnwrap, dispatch]
  );

  return (
    <AuthApiProvider api={stubAuthApi}>
      <AuthLayout>{children}</AuthLayout>
    </AuthApiProvider>
  );
};

export default AuthLayoutWrapper;

