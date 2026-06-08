import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { DiagnosticIsRunningView } from "@/features/diagnostic-running/DiagnosticIsRunningView";

export default function DiagnosticIsRunningRoute() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const cytologyId = params.id?.trim() ?? "";

  const onReady = useCallback(
    (readyId: string) => {
      navigate(`/diagnosis_is_complete/${encodeURIComponent(readyId)}`, {
        replace: true,
      });
    },
    [navigate],
  );

  const onUploadAgain = useCallback(() => {
    navigate("/upload_photo");
  }, [navigate]);

  return (
    <DiagnosticIsRunningView
      cytologyId={cytologyId}
      onReady={onReady}
      onUploadAgain={onUploadAgain}
    />
  );
}
