"use client";

import "../../styles/auth.scss";

import { PropsWithChildren } from "react";

import AuthCard from "../AuthCard";

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="auth_pages">
      <AuthCard>{children}</AuthCard>
    </div>
  );
};

export default AuthLayout;
