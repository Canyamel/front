import { createApi } from "@reduxjs/toolkit/query/react";

import { getApiBaseUrl } from "./apiBaseUrl";
import IPatient from "../types/patient";
import { createBaseQueryWithReauth } from "./reauth";

export const patientApi = createApi({
    reducerPath: "patientApi",
    baseQuery: createBaseQueryWithReauth(`${getApiBaseUrl()}med/patient`),
    endpoints: (builder) => ({
        getPatientInfo: builder.query<IPatient, string>({
            query: (id) => `/${id}`,
        }),
    }),
});

export const { useGetPatientInfoQuery } = patientApi;
