import { createApi } from "@reduxjs/toolkit/query/react";

import { isThyroidBackend } from "@/lib/apiBackend";

import { INodeSegmentRaw, INodesSegments } from "@/uzi_view/types/nodesSegments";
import { ISegment, ISegmentRaw } from "@/uzi_view/types/segments";
import { IDiagnosisInfo } from "@/uzi_view/types/diagnosis";
import { IPoint } from "../UziView/UziViewer/Viewer/interfaces/queries";
import { ITirads } from "../types/tirads";

import { getApiBaseUrl } from "./apiBaseUrl";
import { transformNodes } from "../store/utils";
import { createBaseQueryWithReauth } from "./reauth";
import {
  loadThyroidUziBundle,
  thyroidBundleToNodesSegments,
} from "./thyroidUziBridge";

export const nodesSegmentsApi = createApi({
    reducerPath: "nodesSegmentsApi",
    tagTypes: ["Nodes", "Segments"],
    baseQuery: createBaseQueryWithReauth(`${getApiBaseUrl()}uzi/`),
    endpoints: (builder) => ({
        getNodesSegments: builder.query<INodesSegments, string>({
            async queryFn(uziId, api, _extra, baseQuery) {
                if (isThyroidBackend()) {
                    try {
                        const token = (api.getState() as { auth?: { accessToken?: string } })
                            ?.auth?.accessToken;
                        const resolvedUziId =
                            (api.getState() as { uzi?: { uziId?: string } })?.uzi?.uziId ?? uziId;
                        const bundle = await loadThyroidUziBundle(resolvedUziId, token);
                        return {
                            data: thyroidBundleToNodesSegments(bundle, resolvedUziId),
                        };
                    } catch (e) {
                        return {
                            error: { status: "CUSTOM_ERROR", error: String(e) },
                        };
                    }
                }
                const result = await baseQuery(`image/${uziId}/nodes-segments`);
                if (result.error) return { error: result.error };
                return { data: result.data as INodesSegments };
            },
            providesTags: ["Nodes", "Segments"],
        }),
        addSegments: builder.mutation<void, ISegmentRaw>({
            query: (body) =>
                isThyroidBackend()
                    ? {
                          url: `/segment/add/`,
                          method: "POST",
                          body: {
                              points: body.contor,
                              segment_group: body.node_id,
                          },
                      }
                    : { url: `/segment`, method: "POST", body },
            invalidatesTags: ["Segments"],
        }),
        addNode: builder.mutation<void, { uziId: string; payload: INodeSegmentRaw }>({
            async queryFn(body, api, _extra, baseQuery) {
                if (isThyroidBackend()) {
                    try {
                        const token = (api.getState() as { auth?: { accessToken?: string } })
                            ?.auth?.accessToken;
                        const bundle = await loadThyroidUziBundle(body.uziId, token);
                        const imageId = bundle.image?.id;
                        const result = await baseQuery({
                            url: `segment/group/create/solo/${imageId}/`,
                            method: "POST",
                            body: body.payload.node,
                        });
                        if (result.error) return { error: result.error };
                        return { data: undefined };
                    } catch (e) {
                        return {
                            error: { status: "CUSTOM_ERROR", error: String(e) },
                        };
                    }
                }
                const result = await baseQuery({
                    url: `/${body.uziId}/nodes-segments`,
                    method: "POST",
                    body: body.payload,
                });
                if (result.error) return { error: result.error };
                return { data: undefined };
            },
            invalidatesTags: ["Nodes"],
        }),
        getUziNodes: builder.query<IDiagnosisInfo[], string>({
            async queryFn(uziId, api, _extra, baseQuery) {
                if (isThyroidBackend()) {
                    try {
                        const token = (api.getState() as { auth?: { accessToken?: string } })
                            ?.auth?.accessToken;
                        const bundle = await loadThyroidUziBundle(uziId, token);
                        const mapped = thyroidBundleToNodesSegments(bundle, uziId);
                        return {
                            data: transformNodes(mapped.nodes ?? []),
                        };
                    } catch (e) {
                        return {
                            error: { status: "CUSTOM_ERROR", error: String(e) },
                        };
                    }
                }
                const result = await baseQuery(`${uziId}/nodes`);
                if (result.error) return { error: result.error };
                return { data: transformNodes(result.data as Parameters<typeof transformNodes>[0]) };
            },
            providesTags: ["Nodes"],
        }),
        deleteSegment: builder.mutation<void, string>({
            query: (id) => ({
                url: isThyroidBackend() ? `/segment/update/${id}/` : `/segment/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Nodes", "Segments"],
        }),
        getSegmentsByNode: builder.query<ISegment[], string>({
            query: (id) =>
                isThyroidBackend() ? `segment/group/${id}/` : `nodes/${id}/segments`,
        }),
        deleteNode: builder.mutation<void, string>({
            query: (id) => ({
                url: isThyroidBackend() ? `/segment/group/update/${id}/` : `/nodes/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Nodes"],
        }),
        changeSegment: builder.mutation<
            void,
            { segmentId: string; contor?: IPoint[] } & Partial<ITirads>
        >({
            query: (payload) => ({
                url: isThyroidBackend()
                    ? `/segment/update/${payload.segmentId}/`
                    : `/segment/${payload.segmentId}`,
                method: isThyroidBackend() ? "PUT" : "PATCH",
                body: {
                    ...(payload.contor && { points: payload.contor }),
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
                url: isThyroidBackend()
                    ? `/segment/group/update/${payload.nodeId}/`
                    : `/nodes/${payload.nodeId}`,
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
