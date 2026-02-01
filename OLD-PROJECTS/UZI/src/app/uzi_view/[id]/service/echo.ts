import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { IEchographics } from "@/app/uzi_view/[id]/types/echographics";

import { prepareHeaders } from "./headers";

export const echoApi = createApi({
    reducerPath: "echoApi",
    tagTypes: ["Echo"],
    baseQuery: fetchBaseQuery({
        baseUrl: `${
            process.env.NEXT_PUBLIC_API_BASE_URL || "http://194.226.121.145:8080/api/v1/"
        }uzi/`,
        prepareHeaders,
    }),
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
