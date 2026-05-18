import { ApiFormRequestError, apiFormRequest, baseApi } from "@medml/store";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

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
  if (error && typeof error === "object") {
    if ("data" in error && (error as { data?: unknown }).data != null) {
      const data = (error as { data: unknown }).data;
      if (typeof data === "object") return `Не удалось отправить снимок: ${JSON.stringify(data)}`;
      return `Не удалось отправить снимок: ${String(data)}`;
    }
    if ("error" in error && typeof (error as { error?: string }).error === "string") {
      return `Не удалось отправить снимок: ${(error as { error: string }).error}`;
    }
  }
  return "Не удалось отправить снимок";
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
