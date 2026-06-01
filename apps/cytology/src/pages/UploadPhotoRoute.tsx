import { useNavigate, useSearchParams } from "react-router-dom";

import { CytologyUploadPhoto } from "@medml/cytology_upload";

import { mapUploadValuesToCytologyStagedBody } from "@medml/cytology_upload";

import { useCreateCytologyFromStagedMutation } from "@/lib/cytologyApi";
import { useGetMedWorkerPatientsQuery } from "@/lib/patientsApi";
import { useDoctorId } from "@/lib/useDoctorId";

export default function UploadPhotoRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPatientCardId = searchParams.get("patientId")?.trim() ?? "";
  const { doctorId, status } = useDoctorId();

  const { data, isFetching } = useGetMedWorkerPatientsQuery(
    { doctorId },
    { skip: !doctorId || status !== "authenticated" }
  );

  const [createCytologyFromStaged, { isLoading }] = useCreateCytologyFromStagedMutation();

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
      onCreate={({ values, uploadedFileMeta }) =>
        createCytologyFromStaged(mapUploadValuesToCytologyStagedBody(values, uploadedFileMeta)).unwrap()
      }
      onSuccess={(id) => navigate(`/diagnostic_is_running/${encodeURIComponent(String(id))}`)}
    />
  );
}
