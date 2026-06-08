import { ApiFormRequestError, apiFormRequest, baseApi } from "@medml/store";
import type { AuthState } from "@medml/store";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { CytologyStagedCreateFields } from "@medml/cytology-upload";
import { CYTOLOGY_STAGED_CREATE_URL, formatCytologyUploadApiError } from "@medml/cytology-upload";

/** Строка для multipart — как `.toString()` в OLD CYTO, без Number(). */
export function cytologyFormFieldToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return String(value).trim();
}

/** Файл из antd Upload / Dragger. */
export function resolveUploadFile(file: File | Blob & { name?: string }): File {
  if (file instanceof File) return file;
  const name = file.name ?? "upload.svs";
  return new File([file], name, { type: file.type || "application/octet-stream" });
}

export function buildCreateCytologyFormData(body: CreateCytologyBody): FormData {
  const formData = new FormData();
  const image = resolveUploadFile(body.image);
  // Как в OLD-PROJECTS/CYTO: append без явного filename
  formData.append("image", image);
  formData.append("diagnostic_marking", body.diagnostic_marking);
  formData.append("diagnostic_number", body.diagnostic_number);
  formData.append("material_type", body.material_type);
  formData.append("calcitonin", body.calcitonin);
  formData.append("thyroglobulin", body.thyroglobulin);
  formData.append("calcitonin_in_flush", body.calcitonin_in_flush);
  formData.append("patient_card", body.patient_card);
  return formData;
}

export function formatCreateCytologyError(error: unknown): string {
  return formatCytologyUploadApiError(error);
}

export function mapUploadValuesToCreateCytologyBody(
  file: File | Blob,
  values: Record<string, unknown>
): CreateCytologyBody {
  return {
    image: resolveUploadFile(file),
    diagnostic_marking: cytologyFormFieldToString(values.marking),
    diagnostic_number: cytologyFormFieldToString(values.number),
    material_type: cytologyFormFieldToString(values.localization),
    calcitonin: cytologyFormFieldToString(values.calcitonin),
    thyroglobulin: cytologyFormFieldToString(values.thyroglobulin),
    calcitonin_in_flush: cytologyFormFieldToString(values.calcInSense),
    patient_card: cytologyFormFieldToString(values.patientCard),
  };
}

export type CreateCytologyBody = {
  image: File | Blob;
  diagnostic_marking: string;
  diagnostic_number: string;
  material_type: string;
  calcitonin: string;
  thyroglobulin: string;
  calcitonin_in_flush: string;
  patient_card: string;
};

export type CytologyProcessingStatus = "pending" | "processing" | "ready" | "failed";

export type CytologyProcessingStatusResponse = {
  image_id: number;
  processing_status: CytologyProcessingStatus;
};

export type CreateCytologyResponse = {
  id?: string | number;
  image_id?: number;
  processing_status?: CytologyProcessingStatus;
};

export type CytologyPatientDto = {
  id?: string | number;
  fullname?: string;
  first_name?: string;
  last_name?: string;
  fathers_name?: string;
  email?: string;
  policy?: string;
  personal_policy?: string;
  active?: boolean;
  is_active?: boolean;
  birth_date?: string;
};

export type CytologyPatientCardDto = {
  id?: string | number;
  diagnosis?: string;
  patient?: number;
  acceptance_datetime?: string;
};

export type CytologyInfoDetailsDto = {
  probs?: number[];
  cell_characteristics?: Record<string, number>;
  cluster_characteristics?: Record<string, number>;
};

export type CytologyInfoResponse = {
  id?: string | number;
  status?: string;
  diagnostic_marking?: string;
  diagnostic_number?: string | number;
  diagnos_date?: string;
  material_type?: string;
  details?: CytologyInfoDetailsDto | null;
  file_path?: string;
  image?: string;
  original_image?: {
    id?: string | number;
    image?: string;
    file_path?: string;
  };
  info?: {
    id?: string | number;
    patient?: CytologyPatientDto;
    patient_card?: string | number | CytologyPatientCardDto;
    diagnosis?: string;
    is_last?: boolean;
    calcitonin?: number;
    calcitonin_in_flush?: number;
    thyroglobulin?: number;
  };
};

type CytologyInfoGroupDto = {
  id?: string | number;
  diagnostic_marking?: string;
  diagnostic_number?: string | number;
  diagnos_date?: string;
  material_type?: string;
  details?: CytologyInfoDetailsDto | null;
  diagnosis?: string;
  calcitonin?: number;
  calcitonin_in_flush?: number;
  thyroglobulin?: number;
  is_last?: boolean;
  prev?: string | number | null;
  parent_prev?: string | number | null;
  original_image?: number | null;
};

type CytologyInfoRawResponse = {
  original_image?: CytologyInfoResponse["original_image"];
  info?: {
    patient?: CytologyPatientDto;
    patient_card?: string | number | CytologyPatientCardDto;
    patient_card_id?: string | number;
    image_group?: CytologyInfoGroupDto;
  } & CytologyInfoGroupDto;
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

export type ReviseCopyResponse = {
  id: string | number;
  pk?: string | number;
};

export type CytologyHistoryItem = {
  id: string | number;
  diagnos_date?: string;
  diagnostic_marking?: string;
  diagnostic_number?: number;
  material_type?: string;
  is_last?: boolean;
  prev?: string | number | null;
  details?: CytologyInfoDetailsDto | null;
  [key: string]: unknown;
};

export type CytologyHistoryResponse = PaginatedResponse<CytologyHistoryItem>;

export const cytologyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createCytology: builder.mutation<CreateCytologyResponse, CreateCytologyBody>({
      async queryFn(body, api) {
        try {
          const data = await apiFormRequest<CreateCytologyResponse>(
            "/cytology/create/",
            buildCreateCytologyFormData(body),
            api.getState
          );
          return { data };
        } catch (error) {
          if (error instanceof ApiFormRequestError) {
            return {
              error: {
                status: error.status,
                data: error.data,
              } satisfies FetchBaseQueryError,
            };
          }
          return {
            error: {
              status: "FETCH_ERROR",
              error: String(error),
            } satisfies FetchBaseQueryError,
          };
        }
      },
      invalidatesTags: () => [{ type: "Cytology", id: "LIST" }],
    }),
    createCytologyFromStaged: builder.mutation<CreateCytologyResponse, CytologyStagedCreateFields>({
      async queryFn(body, api) {
        try {
          const state = api.getState() as { auth: AuthState };
          const token = state.auth?.accessToken;
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const response = await fetch(CYTOLOGY_STAGED_CREATE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });

          const text = await response.text();
          let data: unknown = null;
          if (text.length > 0) {
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          }

          if (!response.ok) {
            return {
              error: {
                status: response.status,
                data,
              } satisfies FetchBaseQueryError,
            };
          }

          return { data: data as CreateCytologyResponse };
        } catch (error) {
          return {
            error: {
              status: "FETCH_ERROR",
              error: String(error),
            } satisfies FetchBaseQueryError,
          };
        }
      },
      invalidatesTags: () => [{ type: "Cytology", id: "LIST" }],
    }),
    getCytologyInfo: builder.query<CytologyInfoResponse, string>({
      query: (id) => `/cytology/${encodeURIComponent(id)}`,
      transformResponse: (raw: CytologyInfoRawResponse): CytologyInfoResponse => {
        const original = raw.original_image;
        const info = raw.info;
        const nestedGroup = info?.image_group;
        const flatGroup = info && !nestedGroup ? info : undefined;
        const group = nestedGroup ?? flatGroup;
        const patientCard = info?.patient_card;
        const patientCardRecord =
          patientCard && typeof patientCard === "object" ? patientCard : undefined;

        return {
          id: group?.id ?? original?.id,
          diagnostic_marking: group?.diagnostic_marking,
          diagnostic_number: group?.diagnostic_number,
          diagnos_date: group?.diagnos_date,
          material_type: group?.material_type,
          details: group?.details ?? null,
          file_path: original?.file_path,
          image: original?.file_path ?? original?.image,
          original_image: original,
          info: {
            id: group?.id,
            patient: info?.patient,
            patient_card: patientCardRecord?.id ?? info?.patient_card_id ?? patientCard,
            diagnosis: patientCardRecord?.diagnosis ?? group?.diagnosis,
            is_last: group?.is_last,
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
    addReviseCopy: builder.mutation<ReviseCopyResponse, number>({
      query: (pk) => ({
        url: "/cytology/copy/",
        method: "POST",
        body: { pk },
      }),
      invalidatesTags: (result, _error, cytologyId) => [
        { type: "Cytology", id: "LIST" },
        { type: "Cytology", id: String(cytologyId) },
        { type: "Cytology", id: `history:${cytologyId}` },
        ...(result?.id
          ? [
              { type: "Cytology" as const, id: String(result.id) },
              { type: "Cytology" as const, id: `history:${result.id}` },
            ]
          : []),
      ],
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
    getProcessingStatus: builder.query<CytologyProcessingStatusResponse, string>({
      query: (id) => `/cytology/${encodeURIComponent(id)}/processing-status/`,
    }),
  }),
});

export const {
  useCreateCytologyMutation,
  useCreateCytologyFromStagedMutation,
  useGetCytologyInfoQuery,
  useGetCytologyTypesQuery,
  useLazyGetCytologySegmentsByTypeQuery,
  useAddSegmentMutation,
  usePatchSegmentMutation,
  useDeleteSegmentMutation,
  useAddReviseCopyMutation,
  usePatchCytologyInfoMutation,
  useGetCytologyHistoryQuery,
  useGetProcessingStatusQuery,
} = cytologyApi;

export const useAddNewReviseMutation = useAddReviseCopyMutation;
