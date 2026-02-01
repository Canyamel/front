import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { prepareHeaders } from "./headers";
import IPatient from "../types/patient";

export const patientApi = createApi({
    reducerPath: "patientApi",
    baseQuery: fetchBaseQuery({
        baseUrl: `${
            process.env.NEXT_PUBLIC_API_BASE_URL || "http://194.226.121.145:8080/api/v1/"
        }med/patient`,
        prepareHeaders,
    }),
    endpoints: (builder) => ({
        getPatientInfo: builder.query<IPatient, string>({
            query: (id) => `/${id}`,
        }),
    }),
});

export const { useGetPatientInfoQuery } = patientApi;
