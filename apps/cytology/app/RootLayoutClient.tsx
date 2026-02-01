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

export default function RootLayoutClient({
  children,
}: React.PropsWithChildren) {
  return (
    <RootProvider modality="cytology">
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
}
