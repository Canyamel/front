import { createApi } from "@reduxjs/toolkit/query/react";

import { isThyroidBackend } from "@/lib/apiBackend";

import { getApiBaseUrl } from "./apiBaseUrl";
import IPatient from "../types/patient";
import { createBaseQueryWithReauth } from "./reauth";
import { loadThyroidUziBundle, thyroidBundleToPatient } from "./thyroidUziBridge";

export const patientApi = createApi({
    reducerPath: "patientApi",
    baseQuery: createBaseQueryWithReauth(`${getApiBaseUrl()}med/patient`),
    endpoints: (builder) => ({
        getPatientInfo: builder.query<IPatient, string>({
            async queryFn(patientOrUziId, api, _extra, baseQuery) {
                if (isThyroidBackend()) {
                    try {
                        const uziId = (api.getState() as { uzi?: { uziId?: string } })?.uzi
                            ?.uziId;
                        const token = (api.getState() as { auth?: { accessToken?: string } })
                            ?.auth?.accessToken;
                        if (!uziId) {
                            return {
                                error: { status: "CUSTOM_ERROR", error: "uziId не задан" },
                            };
                        }
                        const bundle = await loadThyroidUziBundle(uziId, token);
                        return { data: thyroidBundleToPatient(bundle) };
                    } catch (e) {
                        return {
                            error: { status: "CUSTOM_ERROR", error: String(e) },
                        };
                    }
                }
                const result = await baseQuery(`/${patientOrUziId}`);
                if (result.error) return { error: result.error };
                return { data: result.data as IPatient };
            },
        }),
    }),
});

export const { useGetPatientInfoQuery } = patientApi;
