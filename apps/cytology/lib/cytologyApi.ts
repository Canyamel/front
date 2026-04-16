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
    };
  };
};

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
        };
      },
      providesTags: (_result, _error, id) => [{ type: "Cytology", id }],
    }),
    getCytologyHistory: builder.query<unknown, string>({
      query: (id) => `/cytology/history/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: "Cytology", id: `history:${id}` }],
    }),
  }),
});

export const {
  useCreateCytologyMutation,
  useGetCytologyInfoQuery,
  useGetCytologyHistoryQuery,
} = cytologyApi;
