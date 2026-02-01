import { baseApi } from "@/service/baseApi";

import { IPoint } from "@cytology/CytologyView/CytologyViewer/Viewer/interfaces/queries";
import { ICytolgyInfoPatch, ICytology, ICytologyHistory } from "@cytology/core/types/cytology";
import {
    IGroupedSegments,
    ISegmentCreate,
    ISegmentResponse,
    ISegmentStack,
} from "@cytology/core/types/segments";

export const cytologyApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCytologyInfo: builder.query<ICytology, string | number>({
            query: (id) => `/cytology/${id}`,
            providesTags: ["Cytology"],
        }),
        getCytologySegment: builder.query<IGroupedSegments[], string | number>({
            query: (id) => `/cytology/${id}/segments`,
            providesTags: ["Segments"],
            transformResponse: (response: ISegmentResponse) =>
                response.results.reduce((acc: IGroupedSegments[], segment) => {
                    const existingGroup = acc.find((group) => group.seg_type === segment.seg_type);
                    const { data, seg_type, is_ai } = segment;
                    const segmentsToStack: ISegmentStack[] = data.map((segmentData) => ({
                        id: segmentData.id,
                        seg_type,
                        is_ai,
                        points: segmentData.points,
                        details: segmentData.details,
                    }));

                    if (existingGroup) {
                        existingGroup.segments.push(...segmentsToStack);
                    } else {
                        acc.push({
                            seg_type: seg_type,
                            segments: segmentsToStack,
                        });
                    }

                    return acc;
                }, []),
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
    useGetCytologySegmentQuery,
    useLazyGetCytologySegmentQuery,
    useAddSegmentMutation,
    usePatchSegmentMutation,
    useDeleteSegmentMutation,
    useAddNewReviseMutation,
    usePatchCytologyInfoMutation,
    useGetCytologyHistoryQuery,
} = cytologyApi;
