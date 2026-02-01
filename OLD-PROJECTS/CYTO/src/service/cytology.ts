import { baseApi } from "./baseApi";

export const cytologyApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCytology: builder.query<any, string>({
            query: (id) => `/cytology/${id}`,
            providesTags: ["Cytology"],
        }),
        editCytology: builder.mutation<void, { id: string; payload: Partial<any> }>({
            query: ({ id, payload }) => ({
                url: `/cytology/${id}/update`,
                method: "PATCH",
                body: payload,
            }),
            invalidatesTags: ["Cytology"],
        }),
        getHistory: builder.query<any, string>({
            query: (id) => `/cytology/history/${id}`,
            providesTags: ["Cytology"],
        }),
        createCytology: builder.mutation<{ image_id: number }, { payload: Partial<any> }>({
            query: (body) => ({
                url: "/cytology/create/",
                method: "POST",
                body: body.payload,
            }),
            invalidatesTags: ["Cytology"],
        }),
    }),
});

export const {
    useCreateCytologyMutation,
    useGetHistoryQuery,
    useGetCytologyQuery,
    useEditCytologyMutation,
} = cytologyApi;
