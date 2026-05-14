import { createApi } from "@reduxjs/toolkit/query/react";

import { INodeSegmentRaw, INodesSegments } from "@/uzi_view/types/nodesSegments";
import { ISegment, ISegmentRaw } from "@/uzi_view/types/segments";
import { IDiagnosisInfo } from "@/uzi_view/types/diagnosis";
import { IPoint } from "../UziView/UziViewer/Viewer/interfaces/queries";
import { ITirads } from "../types/tirads";

import { getApiBaseUrl } from "./apiBaseUrl";
import { transformNodes } from "../store/utils";
import { createBaseQueryWithReauth } from "./reauth";

export const nodesSegmentsApi = createApi({
    reducerPath: "nodesSegmentsApi",
    tagTypes: ["Nodes", "Segments"],
    baseQuery: createBaseQueryWithReauth(`${getApiBaseUrl()}uzi/`),
    endpoints: (builder) => ({
        getNodesSegments: builder.query<INodesSegments, string>({
            query: (id) => `image/${id}/nodes-segments`,
            providesTags: ["Nodes", "Segments"],
        }),
        addSegments: builder.mutation<void, ISegmentRaw>({
            query: (body) => ({ url: `/segment`, method: "POST", body }),
            invalidatesTags: ["Segments"],
        }),
        addNode: builder.mutation<void, { uziId: string; payload: INodeSegmentRaw }>({
            query: (body) => ({
                url: `/${body.uziId}/nodes-segments`,
                method: "POST",
                body: body.payload,
            }),
            invalidatesTags: ["Nodes"],
        }),
        getUziNodes: builder.query<IDiagnosisInfo[], string>({
            query: (id) => `${id}/nodes`,
            transformResponse: transformNodes,
            providesTags: ["Nodes"],
        }),
        deleteSegment: builder.mutation<void, string>({
            query: (id) => ({ url: `/segment/${id}`, method: "DELETE" }),
            invalidatesTags: ["Nodes", "Segments"],
        }),
        getSegmentsByNode: builder.query<ISegment[], string>({
            query: (id) => `nodes/${id}/segments`,
        }),
        deleteNode: builder.mutation<void, string>({
            query: (id) => ({ url: `/nodes/${id}`, method: "DELETE" }),
            invalidatesTags: ["Nodes"],
        }),
        changeSegment: builder.mutation<
            void,
            { segmentId: string; contor?: IPoint[] } & Partial<ITirads>
        >({
            query: (payload) => ({
                url: `/segment/${payload.segmentId}`,
                method: "PATCH",
                body: {
                    ...(payload.contor && { contor: payload.contor }),
                    ...(payload.tirads_23 !== undefined &&
                        payload.tirads_4 !== undefined &&
                        payload.tirads_5 !== undefined && {
                            tirads_23: payload.tirads_23,
                            tirads_4: payload.tirads_4,
                            tirads_5: payload.tirads_5,
                        }),
                },
            }),
            invalidatesTags: ["Segments"],
        }),
        changeNodeTirads: builder.mutation<
            void,
            { nodeId: string; body: Partial<ITirads> & { validation?: string } }
        >({
            query: (payload) => ({
                url: `/nodes/${payload.nodeId}`,
                method: "PATCH",
                body: payload.body,
            }),
            invalidatesTags: ["Nodes"],
        }),
    }),
});

export const {
    useGetNodesSegmentsQuery,
    useAddSegmentsMutation,
    useAddNodeMutation,
    useGetUziNodesQuery,
    useDeleteSegmentMutation,
    useGetSegmentsByNodeQuery,
    useLazyGetSegmentsByNodeQuery,
    useDeleteNodeMutation,
    useChangeSegmentMutation,
    useChangeNodeTiradsMutation,
} = nodesSegmentsApi;
