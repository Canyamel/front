import { formatApiDateToDisplay } from "@medml/shared";
import { baseApi } from "@medml/store";
import type { PatientListSortOrder, PatientRow } from "@medml/patient_list";

/** Карточка из `GET med_worker/patients/{id}/` (thyroid backend). */
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

function normalizeCardsPayload(response: unknown): ThyroidPatientCardDto[] {
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

function patientFullName(p: ThyroidPatientCardDto["patient"]): string {
  return [p.last_name, p.first_name, p.fathers_name]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
}

function mapCardToRow(card: ThyroidPatientCardDto): PatientRow {
  const p = card.patient;
  const nodules =
    card.has_nodules === true ||
    card.has_nodules === "T" ||
    card.has_nodules === "t";
  return {
    id: String(p.id),
    /** id карты приёма — для `POST uzi/create/` (поле `patient_card`) */
    patientCardId: String(card.id),
    fullName: patientFullName(p) || "—",
    policyNumber: String(p.personal_policy ?? ""),
    email: String(p.email ?? ""),
    birthDate: formatApiDateToDisplay(p.birth_date) ?? "—",
    diagnosisLabel: nodules ? "Обнаружено" : "Не обнаружено",
    statusLabel: p.is_active ? "Активен" : "Не активен",
    statusTone: p.is_active ? "success" : "default",
  };
}

const sortKeyMap: Partial<
  Record<Exclude<keyof PatientRow, "id" | "avatarText" | "statusTone">, string>
> = {
  fullName: "patient__last_name",
  policyNumber: "patient__personal_policy",
  email: "patient__email",
  birthDate: "patient__birth_date",
  diagnosisLabel: "has_nodules",
  statusLabel: "patient__is_active",
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

export type CreateMedPatientResponse = {
  id: string;
};

export const patientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
        const mappedSortKey = sortKey
          ? (sortKeyMap[sortKey as keyof typeof sortKeyMap] ?? undefined)
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
      },
      transformResponse: (response: unknown): GetDoctorPatientsResult => {
        const cards = normalizeCardsPayload(response);
        const totalFromEnvelope =
          response &&
          typeof response === "object" &&
          typeof (response as { count?: unknown }).count === "number"
            ? (response as { count: number }).count
            : cards.length;

        return {
          rows: cards.map(mapCardToRow),
          total: totalFromEnvelope,
        };
      },
      providesTags: () => [{ type: "Patient", id: "LIST" }],
    }),
  }),
});

export const {
  useGetDoctorPatientsQuery,
  useCreateUziPatientWithCardMutation,
} = patientsApi;
