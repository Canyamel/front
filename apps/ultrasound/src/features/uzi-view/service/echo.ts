import { createApi } from "@reduxjs/toolkit/query/react";

import { IEchographics } from "@/features/uzi-view/types/echographics";

import { getApiBaseUrl } from "./apiBaseUrl";
import { createBaseQueryWithReauth } from "./reauth";

export const echoApi = createApi({
    reducerPath: "echoApi",
    tagTypes: ["Echo"],
    baseQuery: createBaseQueryWithReauth(`${getApiBaseUrl()}uzi/`),
    endpoints: (builder) => ({
        getEchographics: builder.query<Partial<IEchographics>, string>({
            query: (id) => `${id}/echographics`,
            providesTags: ["Echo"],
        }),
        patchEchographics: builder.mutation<void, { id: string; body: Partial<IEchographics> }>({
            query: ({ id, body }) => ({ url: `${id}/echographics`, method: "PATCH", body }),
            invalidatesTags: ["Echo"],
        }),
    }),
});

export const { useGetEchographicsQuery, usePatchEchographicsMutation } = echoApi;
