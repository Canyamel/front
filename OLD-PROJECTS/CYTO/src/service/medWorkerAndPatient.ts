import { baseApi } from "./baseApi";
import { IApiGetMedWorker, IApiResponseGetShots } from "../types/api";
import { IMedWorkerRes } from "../types/medWorker";

export const medWorkerAndPatientApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMedWorker: builder.query<IApiGetMedWorker, string>({
            query: (id) => `/med_worker/patients/${id}`,
            providesTags: ["MedWorker", "Patient"],
        }),
        editMedWorker: builder.mutation<void, { id: string; payload: Partial<IMedWorkerRes> }>({
            query: ({ id, payload }) => ({
                url: `/med_worker/update/${id}`,
                method: "PATCH",
                body: payload,
            }),
            invalidatesTags: ["MedWorker"],
        }),
        addPatient: builder.mutation<void, { id: string; payload: Partial<any> }>({
            query: (body) => ({
                url: `/patient/create/${body.id}`,
                method: "POST",
                body: body.payload,
            }),
            invalidatesTags: ["Patient"],
        }),
        editPatient: builder.mutation<void, { id: string; payload: Partial<any> }>({
            query: ({ id, payload }) => ({
                url: `/patient/update/${id}/`,
                method: "PATCH",
                body: payload,
            }),
            invalidatesTags: ["Patient"],
        }),
        deletePatient: builder.mutation<void, string>({
            query: (id) => ({ url: `/card/${id}/`, method: "DELETE" }),
            invalidatesTags: ["Patient"],
        }),
        getShots: builder.query<IApiResponseGetShots, string>({
            query: (id) => `/patient/shots/${id}`,
            providesTags: ["Patient"],
        }),
    }),
});

export const {
    useGetMedWorkerQuery,
    useEditMedWorkerMutation,
    useAddPatientMutation,
    useEditPatientMutation,
    useDeletePatientMutation,
    useGetShotsQuery,
} = medWorkerAndPatientApi;
