import { baseApi } from "@medml/store";

export type CreateCytologyBody = {
  image: File;
  diagnostic_marking: string;
  diagnostic_number: string;
  material_type: string;
  calcitonin: string;
  thyroglobulin: string;
  calcitonin_in_flush: string;
  patient_card: string;
};

export type CreateCytologyResponse = {
  id?: string | number;
  image_id?: number;
};

export type CytologyInfoResponse = {
  id?: string | number;
  status?: string;
  diagnostic_marking?: string;
  diagnostic_number?: string | number;
  diagnos_date?: string;
  material_type?: string;
  details?: {
    probs?: number[];
  };
  file_path?: string;
  image?: string;
  info?: {
    id?: string | number;
    patient_card?: string | number;
    diagnosis?: string;
    calcitonin?: number;
    calcitonin_in_flush?: number;
    thyroglobulin?: number;
  };
};

type CytologyInfoRawResponse = {
  original_image?: {
    id?: string | number;
    image?: string;
    file_path?: string;
  };
  info?: {
    image_group?: {
      id?: string | number;
      diagnostic_marking?: string;
      diagnostic_number?: string | number;
      diagnos_date?: string;
      material_type?: string;
      details?: {
        probs?: number[];
      };
      patient_card?: string | number;
      diagnosis?: string;
      calcitonin?: number;
      calcitonin_in_flush?: number;
      thyroglobulin?: number;
    };
  };
};

export type CytologyPoint = {
  id?: number;
  uid?: number;
  x: number;
  y: number;
};

export type CytologySegmentDetails = {
  area?: number;
  probs?: number[];
  min_d?: number;
  max_d?: number;
  aspect_ratio?: number;
  circularity?: number;
  nuclear_cytoplasmic_ratio?: number;
  [key: string]: unknown;
};

export type CytologySegmentType = {
  code: string;
  label: string;
  color: string;
};

type PaginatedResponse<T> = {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
};

export type CytologySegmentGroup = {
  id: number;
  data: Array<{
    id: number;
    points: CytologyPoint[];
    details?: CytologySegmentDetails;
  }>;
  seg_type: string;
  is_ai?: boolean;
  group_type?: string;
};

export type CytologySegmentStack = {
  id: number | string;
  points: CytologyPoint[];
  details?: CytologySegmentDetails;
  seg_type: string;
  is_ai?: boolean;
  isNew?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
};

export type CreateSegmentPayload = {
  seg_type: string;
  data: {
    points: CytologyPoint[];
  };
};

export type PatchSegmentPayload = {
  points?: CytologyPoint[];
  details?: CytologySegmentDetails;
  [key: string]: unknown;
};

export type PatchCytologyInfoPayload = {
  patient_card?: {
    patient?: number;
    diagnosis?: string;
  };
  details?: {
    material_type?: string;
    calcitonin?: number;
    calcitonin_in_flush?: number;
    thyroglobulin?: number;
  };
  material_type?: string;
  calcitonin?: number;
  calcitonin_in_flush?: number;
  thyroglobulin?: number;
  [key: string]: unknown;
};

export type CytologyHistoryItem = {
  id: number;
  diagnos_date?: string;
  diagnostic_marking?: string;
  diagnostic_number?: number;
  material_type?: string;
  is_last?: boolean;
  [key: string]: unknown;
};

export type CytologyHistoryResponse = PaginatedResponse<CytologyHistoryItem>;

export const cytologyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createCytology: builder.mutation<CreateCytologyResponse, CreateCytologyBody>({
      query: (payload) => {
        const formData = new FormData();
        formData.append("image", payload.image);
        formData.append("diagnostic_marking", payload.diagnostic_marking);
        formData.append("diagnostic_number", payload.diagnostic_number);
        formData.append("material_type", payload.material_type);
        formData.append("calcitonin", payload.calcitonin);
        formData.append("thyroglobulin", payload.thyroglobulin);
        formData.append("calcitonin_in_flush", payload.calcitonin_in_flush);
        formData.append("patient_card", payload.patient_card);
        return {
          url: "/cytology/create/",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: () => [{ type: "Cytology", id: "LIST" }],
    }),
    getCytologyInfo: builder.query<CytologyInfoResponse, string>({
      query: (id) => `/cytology/${encodeURIComponent(id)}`,
      transformResponse: (raw: CytologyInfoRawResponse): CytologyInfoResponse => {
        const group = raw.info?.image_group;
        return {
          id: group?.id ?? raw.original_image?.id,
          diagnostic_marking: group?.diagnostic_marking,
          diagnostic_number: group?.diagnostic_number,
          diagnos_date: group?.diagnos_date,
          material_type: group?.material_type,
          details: group?.details,
          file_path: raw.original_image?.file_path,
          image: raw.original_image?.image,
          info: {
            id: group?.id,
            patient_card: group?.patient_card,
            diagnosis: group?.diagnosis,
            calcitonin: group?.calcitonin,
            calcitonin_in_flush: group?.calcitonin_in_flush,
            thyroglobulin: group?.thyroglobulin,
          },
        };
      },
      providesTags: (_result, _error, id) => [{ type: "Cytology", id }],
    }),
    getCytologyTypes: builder.query<CytologySegmentType[], string>({
      query: (id) => `/cytology/${encodeURIComponent(id)}/segments/types/`,
      transformResponse: (response: PaginatedResponse<CytologySegmentType>) => response.results ?? [],
      providesTags: (_result, _error, id) => [{ type: "Segments", id }],
    }),
    getCytologySegmentsByType: builder.query<CytologySegmentStack[], { id: string; segType: string }>({
      query: ({ id, segType }) =>
        `/cytology/${encodeURIComponent(id)}/segments/${encodeURIComponent(segType)}/`,
      transformResponse: (response: CytologySegmentGroup[]): CytologySegmentStack[] =>
        response.flatMap((segmentGroup) =>
          (segmentGroup.data ?? []).map((segmentData) => ({
            id: segmentData.id,
            seg_type: segmentGroup.seg_type,
            is_ai: segmentGroup.is_ai,
            points: segmentData.points ?? [],
            details: segmentData.details,
          }))
        ),
      providesTags: (_result, _error, { id, segType }) => [{ type: "Segments", id: `${id}:${segType}` }],
    }),
    addSegment: builder.mutation<void, { cytologyId: string | number; segment: CreateSegmentPayload }>({
      query: ({ cytologyId, segment }) => ({
        url: `/cytology/segment/group/create/${encodeURIComponent(String(cytologyId))}/`,
        method: "POST",
        body: segment,
      }),
      invalidatesTags: (_result, _error, { cytologyId, segment }) => [
        { type: "Segments", id: `${cytologyId}:${segment.seg_type}` },
      ],
    }),
    patchSegment: builder.mutation<void, { segmentId: string | number; body: PatchSegmentPayload }>({
      query: ({ segmentId, body }) => ({
        url: `/cytology/segment/update/${encodeURIComponent(String(segmentId))}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Segments" }],
    }),
    deleteSegment: builder.mutation<void, string | number>({
      query: (segmentId) => ({
        url: `/cytology/segment/update/${encodeURIComponent(String(segmentId))}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Segments" }],
    }),
    addReviseCopy: builder.mutation<{ id: number }, string | number>({
      query: (pk) => ({
        url: "/cytology/copy/",
        method: "POST",
        body: { pk: Number(pk) },
      }),
      invalidatesTags: [{ type: "Cytology", id: "LIST" }],
    }),
    patchCytologyInfo: builder.mutation<void, { id: string | number; body: PatchCytologyInfoPayload }>({
      query: ({ id, body }) => ({
        url: `/cytology/${encodeURIComponent(String(id))}/update/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Cytology", id }],
    }),
    getCytologyHistory: builder.query<CytologyHistoryResponse, string>({
      query: (id) => `/cytology/history/${encodeURIComponent(id)}/`,
      providesTags: (_result, _error, id) => [{ type: "Cytology", id: `history:${id}` }],
    }),
  }),
});

export const {
  useCreateCytologyMutation,
  useGetCytologyInfoQuery,
  useGetCytologyTypesQuery,
  useLazyGetCytologySegmentsByTypeQuery,
  useAddSegmentMutation,
  usePatchSegmentMutation,
  useDeleteSegmentMutation,
  useAddReviseCopyMutation,
  usePatchCytologyInfoMutation,
  useGetCytologyHistoryQuery,
} = cytologyApi;

export const useAddNewReviseMutation = useAddReviseCopyMutation;
