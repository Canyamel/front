import { Tirads } from "@/app/uzi_view/[id]/types/types";

export interface IDiagnosisInfoRaw {
    id: string;
    specialist: "ai" | "med";
    result: string;
    tirads: Tirads;
    tiradsValue: number;
}

export interface IDiagnosisInfo extends IDiagnosisInfoRaw {
    title: string;
    serial: number;
}
