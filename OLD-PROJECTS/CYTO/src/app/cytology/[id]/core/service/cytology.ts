import { baseApi } from "@/service/baseApi";

import { IPoint } from "@cytology/CytologyView/CytologyViewer/Viewer/interfaces/queries";
import { ICytolgyInfoPatch, ICytology, ICytologyHistory } from "@cytology/core/types/cytology";
import {
    ISegmentCreate,
    ISegmentStack,
    ISegmentType,
    SegmentType,
    ISegment,
} from "@cytology/core/types/segments";
import { IPaginated } from "../types/basic";

export const cytologyApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCytologyInfo: builder.query<ICytology, string | number>({
            query: (id) => `/cytology/${id}`,
            providesTags: ["Cytology"],
        }),
        getCytologyTypes: builder.query<ISegmentType[], string | number>({
            query: (id) => `/cytology/${id}/segments/types/`,
            providesTags: ["Segments"],
            transformResponse: (response: IPaginated<ISegmentType>) => response.results
        }),
        getCytologySegmentsByType: builder.query<
            ISegmentStack[],
            { id: string | number; segType: SegmentType }
        >({
            query: ({ id, segType }) => `/cytology/${id}/segments/${segType}/`,
            providesTags: ["Segments"],
            transformResponse: (response: ISegment[]) =>
                response.flatMap((segment) => {
                    const { data, seg_type, is_ai } = segment;

                    return data.map((segmentData) => ({
                        id: segmentData.id,
                        seg_type,
                        is_ai,
                        points: segmentData.points,
                        details: segmentData.details,
                    }));
                }),
        }),
        addSegment: builder.mutation<void, { cytologyId: number; segment: ISegmentCreate }>({
            query: ({ cytologyId, segment }) => ({
                url: `/cytology/segment/group/create/${cytologyId}/`,
                method: "POST",
                body: segment,
            }),
            invalidatesTags: ["Segments"],
        }),
        patchSegment: builder.mutation<void, { segmentId: string | number; points: IPoint[] }>({
            query: ({ segmentId, points }) => ({
                url: `/cytology/segment/update/${segmentId}/`,
                method: "PATCH",
                body: { points },
            }),
            invalidatesTags: ["Segments"],
        }),
        deleteSegment: builder.mutation<void, number>({
            query: (segmentId) => ({
                url: `/cytology/segment/update/${segmentId}/`,
                method: "DELETE",
            }),
            invalidatesTags: ["Segments"],
        }),
        addNewRevise: builder.mutation<{ id: number }, number>({
            query: (pk) => ({
                url: `/cytology/copy/`,
                method: "POST",
                body: { pk },
            }),
            invalidatesTags: ["Cytology"],
        }),
        patchCytologyInfo: builder.mutation<void, { id: number; body: ICytolgyInfoPatch }>({
            query: (data) => ({
                url: `/cytology/${data.id}/update/`,
                method: "PATCH",
                body: { ...data.body },
            }),
            invalidatesTags: ["Cytology"],
        }),
        getCytologyHistory: builder.query<ICytologyHistory, number>({
            query: (id) => `/cytology/history/${id}/`,
            providesTags: ["Cytology"],
        }),
    }),
});

export const {
    useGetCytologyInfoQuery,
    useGetCytologyTypesQuery,
    useLazyGetCytologySegmentsByTypeQuery,
    useAddSegmentMutation,
    usePatchSegmentMutation,
    useDeleteSegmentMutation,
    useAddNewReviseMutation,
    usePatchCytologyInfoMutation,
    useGetCytologyHistoryQuery,
} = cytologyApi;
