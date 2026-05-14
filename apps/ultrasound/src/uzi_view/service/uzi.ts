import { createApi } from '@reduxjs/toolkit/query/react'

import { IUzi, IUziPage } from '../types/uzi'

import { getApiBaseUrl } from './apiBaseUrl'
import { createBaseQueryWithReauth } from './reauth'

export const uziApi = createApi({
    reducerPath: 'uziApi',
    baseQuery: createBaseQueryWithReauth(`${getApiBaseUrl()}uzi/`),
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
