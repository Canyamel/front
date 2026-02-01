"use client";
import React, { useMemo } from "react";
import { Provider } from "react-redux";
import { useParams } from "next/navigation";

import { useLoading } from "@/contexts/LoadingContext";
import { useMessages } from "@/contexts/MessageContext";

import { createStore } from "./core/store";

import PageWrapper from "./PageWrapper/PageWrapper";
import CytologyView from "./CytologyView/CytologyView";

export default function Page() {
    const { start, stop } = useLoading();
    const { setError } = useMessages();
    const params = useParams();
    const cytologyId = params.id as string;

    const loadingMethods = useMemo(
        () => ({
            addLoading: start,
            removeLoading: stop,
        }),
        []
    );

    const errorMethods = useMemo(
        () => ({
            setError,
        }),
        []
    );

    const store = useMemo(
        () => createStore(loadingMethods, errorMethods),
        [loadingMethods, errorMethods]
    );

    return (
        <Provider store={store}>
            <PageWrapper>
                <CytologyView generalCytologyId={Number(cytologyId)} />
            </PageWrapper>
        </Provider>
    );
}
