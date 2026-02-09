"use client";

import React from "react";

import { AuthErrorProvider } from "@medml/auth";
import {
  RootProvider,
  LoadingWrapper,
  MessageWrapper,
  ModalWrapper,
  SyncAuthWrapper,
} from "@medml/ui";

const RootLayoutClient = ({ children }: React.PropsWithChildren) => (
    <RootProvider modality="ultrasound">
      <LoadingWrapper>
        <MessageWrapper>
          <ModalWrapper>
            <SyncAuthWrapper>
              <AuthErrorProvider>{children}</AuthErrorProvider>
            </SyncAuthWrapper>
          </ModalWrapper>
        </MessageWrapper>
      </LoadingWrapper>
    </RootProvider>
);

export default RootLayoutClient;
