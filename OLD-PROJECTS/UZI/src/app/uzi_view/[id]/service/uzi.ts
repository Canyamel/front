import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { IUzi, IUziPage } from '../types/uzi'

import { prepareHeaders } from './headers'

export const uziApi = createApi({
    reducerPath: 'uziApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${
            process.env.NEXT_PUBLIC_API_BASE_URL ||
            'http://194.226.121.145:8080/api/v1/'
        }uzi/`,
        prepareHeaders,
    }),
    endpoints: (builder) => ({
        getUziIds: builder.query<IUziPage[], string>({
            query: (id) => `${id}/images`,
        }),
        getUziInfo: builder.query<IUzi, string>({
            query: (id) => `${id}`,
        }),
    }),
})

export const { useGetUziIdsQuery, useLazyGetUziInfoQuery } = uziApi
