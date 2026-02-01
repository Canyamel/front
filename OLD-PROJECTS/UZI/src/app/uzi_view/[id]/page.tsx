"use client"
import React from "react";
import {Provider} from "react-redux";
import { useParams } from 'next/navigation';

import {store} from "./store/store";

import UziView from "./UziView/UziView";

export default function UziViewPage() {
    const params = useParams();
    const uziId = params.id as string;

    return (
        <Provider store={store}>
            <UziView generalUziId={uziId} />
        </Provider>
    );
}
