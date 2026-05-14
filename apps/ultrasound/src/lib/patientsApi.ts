import { formatApiDateToDisplay } from "@medml/shared";
import { baseApi } from "@medml/store";
import type { PatientListSortOrder, PatientRow } from "@medml/patient_list";

type UziPatientDto = {
  id: string;
  fullname: string;
  active: boolean;
  email: string;
  policy: string;
  malignancy: boolean;
  birth_date?: string | null;
  /** На случай camelCase в JSON */
  birthDate?: string | null;
};

type GetDoctorPatientsArgs = {
  doctorId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortKey?: keyof PatientRow | null;
  sortOrder?: PatientListSortOrder;
};

type GetDoctorPatientsResult = {
  rows: PatientRow[];
  total: number;
};

function normalizePatientsPayload(response: unknown): UziPatientDto[] {
  if (Array.isArray(response)) return response as UziPatientDto[];
  if (response && typeof response === "object" && Array.isArray((response as { results?: unknown }).results)) {
    return (response as { results: UziPatientDto[] }).results;
  }
  return [];
}

const sortKeyMap: Record<
  Exclude<keyof PatientRow, "id" | "avatarText" | "statusTone">,
  string
> = {
  fullName: "fullname",
  policyNumber: "policy",
  email: "email",
  birthDate: "birth_date",
  diagnosisLabel: "malignancy",
  statusLabel: "active",
};

export type CreateMedPatientBody = {
  email: string;
  fullname: string;
  policy: string;
  active: boolean;
  malignancy: boolean;
  birth_date: string;
};

export type CreateMedPatientResponse = {
  id: string;
};

export type CreateMedCardBody = {
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
};

export const patientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createMedPatient: builder.mutation<CreateMedPatientResponse, CreateMedPatientBody>({
      query: (body) => ({
        url: `/med/patient`,
        method: "POST",
        body,
      }),
      invalidatesTags: () => [{ type: "Patient", id: "LIST" }],
    }),

    createMedPatientCard: builder.mutation<unknown, CreateMedCardBody>({
      query: (body) => ({
        url: `/med/card`,
        method: "POST",
        body,
      }),
    }),

    getDoctorPatients: builder.query<GetDoctorPatientsResult, GetDoctorPatientsArgs>({
      query: ({ doctorId, search, page, pageSize, sortKey, sortOrder }) => {
        const mappedSortKey = sortKey
          ? sortKeyMap[sortKey as keyof typeof sortKeyMap] ?? String(sortKey)
          : undefined;

        return {
          url: `/med/doctor/${doctorId}/patients`,
          params: {
            search: search || undefined,
            page,
            page_size: pageSize,
            ordering:
              mappedSortKey && sortOrder
                ? `${sortOrder === "descend" ? "-" : ""}${mappedSortKey}`
                : undefined,
          },
        };
      },
      transformResponse: (response: unknown): GetDoctorPatientsResult => {
        const list = normalizePatientsPayload(response);
        const totalFromEnvelope =
          response &&
          typeof response === "object" &&
          typeof (response as { count?: unknown }).count === "number"
            ? (response as { count: number }).count
            : list.length;

        const rows: PatientRow[] = list.map((item) => ({
          id: item.id,
          fullName: item.fullname,
          policyNumber: item.policy,
          email: item.email,
          birthDate: formatApiDateToDisplay(item.birth_date ?? item.birthDate),
          diagnosisLabel: item.malignancy ? "Обнаружено" : "Не обнаружено",
          statusLabel: item.active ? "Активен" : "Не активен",
          statusTone: item.active ? "success" : "default",
        }));

        return {
          rows,
          total: totalFromEnvelope,
        };
      },
      providesTags: () => [{ type: "Patient", id: "LIST" }],
    }),
  }),
});

export const {
  useGetDoctorPatientsQuery,
  useCreateMedPatientMutation,
  useCreateMedPatientCardMutation,
} = patientsApi;
