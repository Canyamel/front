import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { formatApiDateToDisplay } from "@medml/shared";
import { baseApi } from "@medml/store";
import type { PatientProfileViewModel } from "@medml/patient_view";

type MedPatientDto = {
  id: string;
  fullname: string;
  email: string;
  policy: string;
  active: boolean;
  malignancy: boolean;
  birth_date?: string | null;
  birthDate?: string | null;
};

type MedPatientCardDto = {
  diagnosis?: unknown;
};

/** Строка таблицы снимков (название аппарата подставляется в UI по словарю `/uzi/devices`). */
export type PatientUziStudyRow = {
  /** id записи УЗИ (для ссылки на просмотр анализа) */
  key: string;
  projectionLabel: string;
  checkedLabel: string;
  /** id аппарата для сопоставления с `UziDeviceDto.id` */
  deviceIdRaw: string;
  /** Нормализованный код статуса для цвета Tag */
  statusRaw: string;
  statusLabel: string;
  /** Только дата (DD.MM.YYYY) */
  createdAtLabel: string;
};

type UziExternalItemDto = {
  id?: string;
  projection?: string;
  checked?: boolean;
  external_id?: string;
  author_id?: string;
  device_id?: string | number;
  status?: string;
  create_at?: string;
};

function diagnosisToDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeUzisPayload(response: unknown): UziExternalItemDto[] {
  if (Array.isArray(response)) return response as UziExternalItemDto[];
  if (response && typeof response === "object" && Array.isArray((response as { results?: unknown }).results)) {
    return (response as { results: UziExternalItemDto[] }).results;
  }
  return [];
}

function projectionLabel(projection: string | undefined): string {
  if (projection === "cross") return "Поперечная";
  if (projection === "long") return "Продольная";
  return projection?.trim() ? String(projection) : "—";
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Завершено",
  pending: "Ожидание",
  processing: "В обработке",
  in_progress: "В работе",
  failed: "Ошибка",
  error: "Ошибка",
  new: "Новое",
  cancelled: "Отменено",
};

function statusLabel(status: string | undefined): string {
  if (status == null || String(status).trim() === "") return "—";
  const k = String(status).trim().toLowerCase();
  return STATUS_LABELS[k] ?? status;
}

/** Дата без времени; для ISO берётся календарный день. */
function formatDateOnly(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const s = String(iso).trim();
  const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (ymd) {
    return formatApiDateToDisplay(ymd[1]) ?? "—";
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return formatApiDateToDisplay(`${y}-${m}-${day}`) ?? `${day}.${m}.${y}`;
}

function mapUziItemsToRows(response: unknown): PatientUziStudyRow[] {
  const list = normalizeUzisPayload(response);
  return list.map((item, index) => {
    const rawStatus = String(item.status ?? "").trim().toLowerCase();
    return {
      key: String(item.id ?? index),
      projectionLabel: projectionLabel(item.projection),
      checkedLabel: item.checked === true ? "Да" : item.checked === false ? "Нет" : "—",
      deviceIdRaw:
        item.device_id != null && item.device_id !== ""
          ? String(item.device_id)
          : "",
      statusRaw: rawStatus,
      statusLabel: statusLabel(item.status),
      createdAtLabel: formatDateOnly(item.create_at),
    };
  });
}

export const patientProfileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMedPatientById: builder.query<PatientProfileViewModel, string>({
      query: (patientId) => ({ url: `/med/patient/${patientId}` }),
      transformResponse: (raw: MedPatientDto): PatientProfileViewModel => ({
        id: raw.id,
        fullName: raw.fullname,
        email: raw.email,
        policyNumber: raw.policy,
        birthDate: formatApiDateToDisplay(raw.birth_date ?? raw.birthDate),
        active: raw.active,
        malignancy: raw.malignancy,
      }),
      providesTags: (_result, _err, patientId) => [{ type: "Patient", id: patientId }],
    }),

    getMedPatientCard: builder.query<{ diagnosis: string }, { doctorId: string; patientId: string }>({
      async queryFn({ doctorId, patientId }, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: `/med/card/${doctorId}/${patientId}`,
        });
        if (result.error) {
          const e = result.error as FetchBaseQueryError;
          if (e.status === 404) {
            return { data: { diagnosis: "" } };
          }
          return { error: result.error };
        }
        const raw = result.data as MedPatientCardDto | null | undefined;
        return {
          data: {
            diagnosis: diagnosisToDisplayString(raw?.diagnosis),
          },
        };
      },
    }),

    /** 404 от бэка при отсутствии снимков — не ошибка, пустой список (без дублирующего toast). */
    getPatientUziStudies: builder.query<PatientUziStudyRow[], string>({
      async queryFn(patientId, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: `/uzis/external/${patientId}`,
        });
        if (result.error) {
          const e = result.error as FetchBaseQueryError;
          if (e.status === 404) {
            return { data: [] };
          }
          return { error: result.error };
        }
        return { data: mapUziItemsToRows(result.data) };
      },
    }),
  }),
});

export const { useGetMedPatientByIdQuery, useGetMedPatientCardQuery, useGetPatientUziStudiesQuery } =
  patientProfileApi;

/** Цвет Tag для статуса снимка (в духе статуса пациента выше). */
export function uziStudyStatusTagColor(statusRaw: string): string {
  const k = statusRaw.trim().toLowerCase();
  if (k === "completed") return "success";
  if (k === "pending" || k === "new") return "default";
  if (k === "processing" || k === "in_progress") return "processing";
  if (k === "failed" || k === "error") return "error";
  if (k === "cancelled") return "default";
  return "default";
}
