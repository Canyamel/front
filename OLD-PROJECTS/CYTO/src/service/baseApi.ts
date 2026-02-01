import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { prepareHeaders } from "./headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://109.73.201.164:8000/api/v3";

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: BASE_URL,
        prepareHeaders,
    }),
    tagTypes: ["MedWorker", "Patient", "Cytology", "Auth", "Segments"],
    endpoints: () => ({}),
});

export type BaseApi = typeof baseApi;

