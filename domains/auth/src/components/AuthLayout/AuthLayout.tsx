"use client";

import "../../styles/auth.scss";

import { PropsWithChildren, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import AuthCard from "../AuthCard";

const AuthLayout = ({ children }: PropsWithChildren) => {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="auth_pages">
      <AuthCard>{children}</AuthCard>
    </div>
  );
};

export default AuthLayout;
