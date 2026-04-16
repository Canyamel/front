import { formatApiDateToDisplay } from "@medml/shared";
import { baseApi } from "@medml/store";
import type { PatientListSortOrder, PatientRow } from "@medml/patient_list";

type CytologyPatientDto = {
  id: string | number;
  first_name: string;
  last_name: string;
  fathers_name?: string;
  birth_date?: string;
  email?: string;
  personal_policy?: string;
  is_active?: boolean;
};

type CytologyCardDto = {
  id: string | number;
  patient: CytologyPatientDto;
  diagnosis?: string;
};

type CytologyMedWorkerDto = {
  id: string | number;
  first_name: string;
  last_name: string;
  fathers_name?: string;
};

type GetMedWorkerPatientsApiResponseLegacy = {
  count?: number;
  results?: {
    cards?: CytologyCardDto[];
    med_worker?: CytologyMedWorkerDto;
  };
};

type GetMedWorkerPatientsApiResponse = CytologyPatientDto[] | GetMedWorkerPatientsApiResponseLegacy;

export type CytologyPatientCard = {
  cardId: string;
  patientId: string;
  fullName: string;
  email?: string;
  policyNumber?: string;
  diagnosis?: string;
  active: boolean;
  birthDate?: string;
};

export type GetMedWorkerPatientsResult = {
  rows: PatientRow[];
  cards: CytologyPatientCard[];
  total: number;
  medWorkerName: string;
};

type GetMedWorkerPatientsArgs = {
  doctorId: string;
  search?: string;
  sortOrder?: PatientListSortOrder;
  sortKey?: keyof PatientRow | null;
};

function normalizeName(item: CytologyPatientDto): string {
  const first = item.first_name?.trim() ?? "";
  const last = item.last_name?.trim() ?? "";
  const father = item.fathers_name?.trim() ?? "";
  return [last, first, father].filter(Boolean).join(" ").trim();
}

function normalizeMedWorkerName(item: CytologyMedWorkerDto | undefined): string {
  if (!item) return "";
  return [item.last_name, item.first_name, item.fathers_name].filter(Boolean).join(" ").trim();
}

function applyClientSort(
  rows: PatientRow[],
  sortKey?: keyof PatientRow | null,
  sortOrder?: PatientListSortOrder
): PatientRow[] {
  if (!sortKey || !sortOrder) return rows;

  const dir = sortOrder === "descend" ? -1 : 1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = String(a[sortKey] ?? "");
    const bv = String(b[sortKey] ?? "");
    return av.localeCompare(bv, "ru") * dir;
  });
  return sorted;
}

export const patientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMedWorkerPatients: builder.query<GetMedWorkerPatientsResult, GetMedWorkerPatientsArgs>({
      query: ({ doctorId }) => ({
        url: `/med/doctor/${encodeURIComponent(doctorId)}/patients`,
      }),
      transformResponse: (
        response: GetMedWorkerPatientsApiResponse,
        _meta,
        arg
      ): GetMedWorkerPatientsResult => {
        const cardsRaw = Array.isArray(response)
          ? response.map((patient) => ({
              id: String(patient.id ?? ""),
              patient,
              diagnosis: "",
            }))
          : (response.results?.cards ?? []);
        const cards: CytologyPatientCard[] = cardsRaw.map((item) => ({
          cardId: String(item.id),
          patientId: String(item.patient?.id ?? ""),
          fullName: normalizeName(item.patient),
          email: item.patient?.email ?? "",
          policyNumber: item.patient?.personal_policy ?? "",
          diagnosis: item.diagnosis ?? "",
          active: Boolean(item.patient?.is_active),
          birthDate: formatApiDateToDisplay(item.patient?.birth_date),
        }));

        const filtered = arg.search?.trim()
          ? cards.filter((item) => {
              const q = arg.search?.trim().toLowerCase() ?? "";
              return (
                item.fullName.toLowerCase().includes(q) ||
                String(item.policyNumber ?? "").toLowerCase().includes(q)
              );
            })
          : cards;

        const rowsUnsorted: PatientRow[] = filtered.map((item) => ({
          id: item.cardId,
          fullName: item.fullName,
          policyNumber: item.policyNumber,
          email: item.email,
          birthDate: item.birthDate,
          diagnosisLabel: item.diagnosis || "Не обнаружено",
          statusLabel: item.active ? "Активен" : "Не активен",
          statusTone: item.active ? "success" : "default",
        }));

        const rows = applyClientSort(rowsUnsorted, arg.sortKey, arg.sortOrder);

        const total = Array.isArray(response)
          ? filtered.length
          : filtered.length || response.count || 0;

        return {
          rows,
          cards,
          total,
          medWorkerName: Array.isArray(response)
            ? ""
            : normalizeMedWorkerName(response.results?.med_worker),
        };
      },
      providesTags: () => [{ type: "Patient", id: "LIST" }, { type: "MedWorker", id: "SELF" }],
    }),
  }),
});

export const { useGetMedWorkerPatientsQuery } = patientsApi;
