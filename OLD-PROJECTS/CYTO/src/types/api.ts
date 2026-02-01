import { ICardRes, ICardReq } from "./card";
import { IPatientReq } from "./patient";
import { IMedWorkerRes } from "./medWorker";
import { IPatientRes } from "./patient";
import { IShotReq } from "./shot";

export interface IResultsGetMedWorker {
  cards: ICardRes[];
  med_worker: IMedWorkerRes;
};

export interface IApiGetMedWorker {
  count: number;
  next: null | string;
  previous: null | string;
  results: IResultsGetMedWorker;
};

export interface IApiAddPatient {
  patient: IPatientReq;
  card: ICardReq;
};

export interface IApiResponseGetShots {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    patient: IPatientRes;
    shots: IShotReq[];
  };
};

export interface IApiResponseGetCytology {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    patient: IPatientRes;
    shots: IShotReq[];
  };
};