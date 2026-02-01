import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { prepareHeaders } from './headers';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_CYTO_API_BASE_URL || '';
  }
  return process.env.NEXT_PUBLIC_CYTO_API_BASE_URL || '';
};

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders,
});

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['MedWorker', 'Patient', 'Cytology', 'Auth', 'Segments'],
  endpoints: () => ({}),
});

export type BaseApi = typeof baseApi;
export type ApiError = FetchBaseQueryError;

