"use client";

import { Flex } from "antd";
import { PropsWithChildren } from "react";

import "./AuthFormWrapper.scss";

interface AuthFormWrapperProps extends PropsWithChildren {}

const AuthFormWrapper = ({ children }: AuthFormWrapperProps) => {
  return (
    <Flex className="auth-form-wrapper">
      {children}
    </Flex>
  );
};

export default AuthFormWrapper;
