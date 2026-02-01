"use client";

import React from "react";
import { Provider } from "react-redux";
import { store } from "../stores/store";
import AntDesignProvider from "../utils/AntDesignProvider";
import AuthProvider from "../utils/AuthProvider";

export default function ProvidersClient({
    children,
    session
}: {
    children: React.ReactNode;
    session: any;
}) {
    return (
        <Provider store={store}>
            <AuthProvider session={session}>
                <AntDesignProvider>
                    {children}
                </AntDesignProvider>
            </AuthProvider>
        </Provider>
    );
};