import { formatApiDateToDisplay } from "@medml/shared";
import { baseApi } from "@medml/store";
import type { PatientListSortOrder, PatientRow } from "@medml/patient_list";

import { isThyroidBackend } from "@/lib/apiBackend";

/* ─── Med / legacy ─── */

type MedPatientDto = {
  id: string | number;
  fullname: string;
  active: boolean;
  email: string;
  policy: string;
  malignancy: boolean;
  birth_date?: string | null;
  birthDate?: string | null;
};

export type CreateMedPatientBody = {
  email: string;
  fullname: string;
  policy: string;
  active: boolean;
  malignancy: boolean;
  birth_date: string;
};

export type CreateMedCardBody = {
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
};

export type CreateMedPatientResponse = {
  id: string;
};

const medSortKeyMap: Record<
  Exclude<keyof PatientRow, "id" | "avatarText" | "statusTone" | "patientCardId">,
  string
> = {
  fullName: "fullname",
  policyNumber: "policy",
  email: "email",
  birthDate: "birth_date",
  diagnosisLabel: "malignancy",
  statusLabel: "active",
};

function normalizeMedPatientsPayload(response: unknown): MedPatientDto[] {
  if (Array.isArray(response)) return response as MedPatientDto[];
  if (
    response &&
    typeof response === "object" &&
    Array.isArray((response as { results?: unknown }).results)
  ) {
    return (response as { results: MedPatientDto[] }).results;
  }
  return [];
}

function mapMedPatientToRow(item: MedPatientDto): PatientRow {
  return {
    id: String(item.id),
    fullName: item.fullname,
    policyNumber: item.policy,
    email: item.email,
    birthDate: formatApiDateToDisplay(item.birth_date ?? item.birthDate),
    diagnosisLabel: item.malignancy ? "Обнаружено" : "Не обнаружено",
    statusLabel: item.active ? "Активен" : "Не активен",
    statusTone: item.active ? "success" : "default",
  };
}

/* ─── Thyroid ─── */

type ThyroidPatientCardDto = {
  id: number;
  has_nodules?: string | boolean;
  patient: {
    id: number;
    last_name?: string;
    first_name?: string;
    fathers_name?: string;
    personal_policy?: string;
    email?: string;
    is_active?: boolean;
    birth_date?: string | null;
  };
};

export type CreateUziPatientWithCardBody = {
  doctorId: string;
  surname: string;
  name: string;
  patronymic: string;
  email: string;
  policy: string;
  birth_date: string;
  active: boolean;
  malignancy: boolean;
  diagnosis: string;
};

function normalizeThyroidCardsPayload(response: unknown): ThyroidPatientCardDto[] {
  if (!response || typeof response !== "object") return [];
  const root = response as Record<string, unknown>;
  if (Array.isArray(root.cards)) {
    return root.cards as ThyroidPatientCardDto[];
  }
  const results = root.results;
  if (results && typeof results === "object") {
    const inner = results as Record<string, unknown>;
    if (Array.isArray(inner.cards)) {
      return inner.cards as ThyroidPatientCardDto[];
    }
  }
  return [];
}

function thyroidPatientFullName(p: ThyroidPatientCardDto["patient"]): string {
  return [p.last_name, p.first_name, p.fathers_name]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
}

function mapThyroidCardToRow(card: ThyroidPatientCardDto): PatientRow {
  const p = card.patient;
  const nodules =
    card.has_nodules === true ||
    card.has_nodules === "T" ||
    card.has_nodules === "t";
  return {
    id: String(p.id),
    patientCardId: String(card.id),
    fullName: thyroidPatientFullName(p) || "—",
    policyNumber: String(p.personal_policy ?? ""),
    email: String(p.email ?? ""),
    birthDate: formatApiDateToDisplay(p.birth_date) ?? "—",
    diagnosisLabel: nodules ? "Обнаружено" : "Не обнаружено",
    statusLabel: p.is_active ? "Активен" : "Не активен",
    statusTone: p.is_active ? "success" : "default",
  };
}

const thyroidSortKeyMap: Partial<
  Record<Exclude<keyof PatientRow, "id" | "avatarText" | "statusTone" | "patientCardId">, string>
> = {
  fullName: "patient__last_name",
  policyNumber: "patient__personal_policy",
  email: "patient__email",
  birthDate: "patient__birth_date",
  diagnosisLabel: "has_nodules",
  statusLabel: "patient__is_active",
};

/* ─── Shared ─── */

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

export const patientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Med: POST `/med/patient` */
    createMedPatient: builder.mutation<CreateMedPatientResponse, CreateMedPatientBody>({
      query: (body) => ({
        url: `/med/patient`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: { id?: string | number }) => ({
        id: String(raw?.id ?? ""),
      }),
      invalidatesTags: () => [{ type: "Patient", id: "LIST" }],
    }),

    /** Med: POST `/med/card` */
    createMedPatientCard: builder.mutation<unknown, CreateMedCardBody>({
      query: (body) => ({
        url: `/med/card`,
        method: "POST",
        body,
      }),
      invalidatesTags: () => [{ type: "Patient", id: "LIST" }],
    }),

    /** Thyroid: POST `/patient/create/{doctorId}` */
    createUziPatientWithCard: builder.mutation<
      CreateMedPatientResponse,
      CreateUziPatientWithCardBody
    >({
      query: ({
        doctorId,
        surname,
        name,
        patronymic,
        email,
        policy,
        birth_date,
        active,
        malignancy,
        diagnosis,
      }) => ({
        url: `/patient/create/${doctorId}`,
        method: "POST",
        body: {
          patient: {
            last_name: surname,
            first_name: name,
            fathers_name: patronymic,
            email: email.trim(),
            personal_policy: policy,
            birth_date,
            is_active: active,
          },
          card: {
            has_nodules: malignancy ? "T" : "F",
            diagnosis: diagnosis.trim(),
          },
        },
      }),
      transformResponse: (raw: { patient?: { id?: number | string } }) => ({
        id: String(raw?.patient?.id ?? ""),
      }),
      invalidatesTags: () => [{ type: "Patient", id: "LIST" }],
    }),

    getDoctorPatients: builder.query<GetDoctorPatientsResult, GetDoctorPatientsArgs>({
      query: ({ doctorId, search, page, pageSize, sortKey, sortOrder }) => {
        if (isThyroidBackend()) {
          const mappedSortKey = sortKey
            ? (thyroidSortKeyMap[sortKey as keyof typeof thyroidSortKeyMap] ?? undefined)
            : undefined;
          return {
            url: `/med_worker/patients/${doctorId}`,
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
        }

        const mappedSortKey = sortKey
          ? (medSortKeyMap[sortKey as keyof typeof medSortKeyMap] ?? String(sortKey))
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
        if (isThyroidBackend()) {
          const cards = normalizeThyroidCardsPayload(response);
          const totalFromEnvelope =
            response &&
            typeof response === "object" &&
            typeof (response as { count?: unknown }).count === "number"
              ? (response as { count: number }).count
              : cards.length;

          return {
            rows: cards.map(mapThyroidCardToRow),
            total: totalFromEnvelope,
          };
        }

        const list = normalizeMedPatientsPayload(response);
        const totalFromEnvelope =
          response &&
          typeof response === "object" &&
          typeof (response as { count?: unknown }).count === "number"
            ? (response as { count: number }).count
            : list.length;

        return {
          rows: list.map(mapMedPatientToRow),
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
  useCreateUziPatientWithCardMutation,
} = patientsApi;
