import { baseApi } from "@medml/store";

export type UziDeviceDto = {
  id: string;
  name: string;
};

/** Кадры снимка (как в OLD UZI `IUziPage`). */
export type UziImagePageDto = {
  id: string;
  uzi_id: string;
  page: number;
};

/** Узел с TIRADS (как в OLD `INode`). */
export type UziNodeDto = {
  id: string;
  uzi_id: string;
  ai: boolean;
  validation: string;
  tirads_23: number;
  tirads_4: number;
  tirads_5: number;
};

export type UziSegmentDto = {
  id: string;
  node_id: string;
  image_id: string;
  ai: boolean;
  contor: { x: number; y: number }[];
  tirads_23: number;
  tirads_4: number;
  tirads_5: number;
};

export type UziImageNodesSegmentsDto = {
  nodes?: UziNodeDto[];
  segments?: UziSegmentDto[];
};

export type UziInfoDto = {
  id: string;
  projection: string;
  checked: boolean;
  external_id: string;
  author_id: string;
  device_id: number;
  status: string;
  create_at: string;
};

export const uziApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUziDevices: builder.query<UziDeviceDto[], void>({
      query: () => ({ url: "/uzi/devices" }),
    }),

    getUziInfo: builder.query<UziInfoDto, string>({
      query: (uziId) => ({ url: `/uzi/${encodeURIComponent(uziId)}` }),
    }),

    getUziImagePages: builder.query<UziImagePageDto[], string>({
      query: (uziId) => ({ url: `/uzi/${encodeURIComponent(uziId)}/images` }),
    }),

    getUziNodes: builder.query<UziNodeDto[], string>({
      query: (uziId) => ({ url: `/uzi/${encodeURIComponent(uziId)}/nodes` }),
    }),

    getUziImageNodesSegments: builder.query<UziImageNodesSegmentsDto, string>({
      query: (imageId) => ({
        url: `/uzi/image/${encodeURIComponent(imageId)}/nodes-segments`,
      }),
    }),
    uploadUziDiagnostic: builder.mutation<
      unknown,
      { file: File; projection: string; patientId: string; deviceId: string }
    >({
      query: ({ file, projection, patientId, deviceId }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projection", projection);
        formData.append("external_id", patientId);
        formData.append("device_id", deviceId);
        return {
          url: "/uzi",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: () => [{ type: "Patient", id: "LIST" }],
    }),
  }),
});

export const {
  useGetUziDevicesQuery,
  useUploadUziDiagnosticMutation,
  useGetUziInfoQuery,
  useGetUziImagePagesQuery,
  useGetUziNodesQuery,
  useGetUziImageNodesSegmentsQuery,
} = uziApi;
