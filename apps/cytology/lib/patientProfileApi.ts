import { formatApiDateToDisplay } from "@medml/shared";
import { baseApi } from "@medml/store";
import type { PatientProfileViewModel } from "@medml/patient_view";

export type CytologyStudyRow = {
  id: string;
  numberLabel: string;
  materialTypeLabel: string;
  bethesdaLabel: string;
  cytologyDateLabel: string;
};

type CytologyShotDto = {
  id: number | string | null;
  diagnos_date?: string;
  diagnostic_marking?: string;
  diagnostic_number?: string | number;
  material_type?: string;
  details?: {
    probs?: number[];
  };
};

type CytologyPatientDto = {
  id: number | string;
  first_name: string;
  last_name: string;
  fathers_name?: string;
  birth_date?: string;
  email?: string;
  personal_policy?: string;
  is_active?: boolean;
};

type CytologyPatientShotsResponse = {
  results?: {
    patient?: CytologyPatientDto;
    shots?: CytologyShotDto[];
  };
};

const materialTypeLabels: Record<string, string> = {
  GS: "Генитальный мазок",
  TP: "Щитовидная железа",
  BP: "Молочная железа",
  PTP: "Околощитовидная железа",
  LNP: "Лимфатический узел",
};

function bethesdaLabelByProbs(probs: number[] | undefined): string {
  if (!Array.isArray(probs) || probs.length === 0) return "—";
  let max = -1;
  let index = -1;
  probs.forEach((value, currentIndex) => {
    if (value > max) {
      max = value;
      index = currentIndex;
    }
  });
  const map = ["Bethesda I", "Bethesda II", "Bethesda III", "Bethesda IV", "Bethesda V", "Bethesda VI"];
  return map[index] ?? "—";
}

function mapPatient(patient: CytologyPatientDto | undefined): PatientProfileViewModel | null {
  if (!patient) return null;
  const fullName = [patient.last_name, patient.first_name, patient.fathers_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: String(patient.id),
    fullName,
    email: patient.email ?? "",
    policyNumber: patient.personal_policy ?? "",
    birthDate: formatApiDateToDisplay(patient.birth_date),
    active: Boolean(patient.is_active),
    diagnosis: "",
  };
}

export const patientProfileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPatientShotsByCardId: builder.query<
      { patient: PatientProfileViewModel | null; studies: CytologyStudyRow[] },
      string
    >({
      query: (cardId) => ({
        url: `/patient/shots/${encodeURIComponent(cardId)}`,
      }),
      transformResponse: (response: CytologyPatientShotsResponse) => {
        const patient = mapPatient(response.results?.patient);
        const studies: CytologyStudyRow[] = (response.results?.shots ?? [])
          .filter((item): item is CytologyShotDto & { id: number | string } => item.id != null)
          .map((item) => ({
            id: String(item.id),
            numberLabel:
              item.diagnostic_marking && item.diagnostic_number != null
                ? `${item.diagnostic_marking}-${item.diagnostic_number}`
                : "—",
            materialTypeLabel: materialTypeLabels[item.material_type ?? ""] ?? item.material_type ?? "—",
            bethesdaLabel: bethesdaLabelByProbs(item.details?.probs),
            cytologyDateLabel: formatApiDateToDisplay(item.diagnos_date) ?? "—",
          }));

        return { patient, studies };
      },
      providesTags: (_result, _error, cardId) => [{ type: "Patient", id: cardId }],
    }),
  }),
});

export const { useGetPatientShotsByCardIdQuery } = patientProfileApi;
