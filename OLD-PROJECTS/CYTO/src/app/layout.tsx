import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import React from "react";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

import {
    LoadingWrapper,
    MessageWrapper,
    ModalWrapper,
    SyncAuthWrapper,
} from "@/components/wrappers";

import ProvidersClient from "./providersClient";

import "../styles/reset.css";
import "../styles/global.css";

export const metadata: Metadata = {
    title: "Виртуальный ассистент",
    description: "Умный помощник врача",
};

export default async function RootLayout({ children }: React.PropsWithChildren) {
    const session = await getServerSession();

    return (
        <html lang="ru">
            <body>
                <ProvidersClient session={session}>
                    <LoadingWrapper>
                        <MessageWrapper>
                            <ModalWrapper>
                                <SyncAuthWrapper>
                                    <Header />
                                    {children}
                                    <Footer />
                                </SyncAuthWrapper>
                            </ModalWrapper>
                        </MessageWrapper>
                    </LoadingWrapper>
                </ProvidersClient>
            </body>
        </html>
    );
}
