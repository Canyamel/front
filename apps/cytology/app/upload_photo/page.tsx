"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { CytologyUploadPhoto } from "@medml/cytology_upload";

import {
  mapUploadValuesToCreateCytologyBody,
  useCreateCytologyMutation,
} from "@/lib/cytologyApi";
import { useGetMedWorkerPatientsQuery } from "@/lib/patientsApi";
import { useDoctorId } from "@/lib/useDoctorId";

export default function UploadPhotoRoutePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetPatientCardId = searchParams.get("patientId")?.trim() ?? "";
  const { doctorId, status } = useDoctorId();

  const { data, isFetching } = useGetMedWorkerPatientsQuery(
    { doctorId },
    { skip: !doctorId || status !== "authenticated" }
  );

  const [createCytology, { isLoading }] = useCreateCytologyMutation();

  const patientOptions =
    data?.cards.map((card) => ({
      value: card.cardId,
      label: `${card.fullName}${card.policyNumber ? ` — ${card.policyNumber}` : ""}`,
    })) ?? [];

  return (
    <CytologyUploadPhoto
      presetPatientCardId={presetPatientCardId}
      patientOptions={patientOptions}
      patientsLoading={isFetching}
      isSubmitting={isLoading}
      onCreate={({ file, values }) =>
        createCytology(mapUploadValuesToCreateCytologyBody(file, values)).unwrap()
      }
      onSuccess={(id) => router.push(`/diagnostic_is_running/${encodeURIComponent(String(id))}`)}
    />
  );
}
