"use client";

import { setToken } from "@medml/store";
import { useAppDispatch } from "@medml/store";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import React, { ReactNode, useEffect } from "react";

interface SyncAuthWrapperProps {
  children: ReactNode;
}

const SyncAuthWrapper: React.FC<SyncAuthWrapperProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { data }: { data: (Session & { accessToken?: string }) | null } =
    useSession();

  useEffect(() => {
    dispatch(setToken(data?.accessToken));
  }, [data, dispatch]);

  return <>{children}</>;
};

export default SyncAuthWrapper;
