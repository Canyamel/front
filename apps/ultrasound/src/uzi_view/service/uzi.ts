import { createApi } from '@reduxjs/toolkit/query/react'

import { IUzi, IUziPage } from '../types/uzi'

import { getApiBaseUrl } from './apiBaseUrl'
import { createBaseQueryWithReauth } from './reauth'
import { isThyroidBackend } from '@/lib/apiBackend'
import {
  loadThyroidUziBundle,
  thyroidBundleToPages,
  thyroidBundleToUzi,
} from './thyroidUziBridge'

export const uziApi = createApi({
    reducerPath: 'uziApi',
    baseQuery: createBaseQueryWithReauth(`${getApiBaseUrl()}uzi/`),
    endpoints: (builder) => ({
        getUziIds: builder.query<IUziPage[], string>({
            async queryFn(uziId, api, _extra, baseQuery) {
                if (isThyroidBackend()) {
                    try {
                        const token = (api.getState() as { auth?: { accessToken?: string } })
                            ?.auth?.accessToken
                        const bundle = await loadThyroidUziBundle(uziId, token)
                        return { data: thyroidBundleToPages(bundle, uziId) }
                    } catch (e) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: String(e),
                            },
                        }
                    }
                }
                const result = await baseQuery(`${uziId}/images`)
                if (result.error) return { error: result.error }
                return { data: result.data as IUziPage[] }
            },
        }),
        getUziInfo: builder.query<IUzi, string>({
            async queryFn(uziId, api, _extra, baseQuery) {
                if (isThyroidBackend()) {
                    try {
                        const token = (api.getState() as { auth?: { accessToken?: string } })
                            ?.auth?.accessToken
                        const bundle = await loadThyroidUziBundle(uziId, token)
                        return { data: thyroidBundleToUzi(bundle) }
                    } catch (e) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: String(e),
                            },
                        }
                    }
                }
                const result = await baseQuery(`${uziId}`)
                if (result.error) return { error: result.error }
                return { data: result.data as IUzi }
            },
        }),
    }),
})

export const { useGetUziIdsQuery, useLazyGetUziInfoQuery } = uziApi
