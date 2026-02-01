import { IPatientRes } from "./patient"

export interface ICardRes {
  id: number;
  patient: IPatientRes;
  acceptance_datetime: string;
  diagnosis: string;
  has_nodules?: any;
};

export interface ICardReq {
  id?: number;
  patient?: IPatientRes;
  acceptance_datetime?: string;
  has_nodules?: string;
  diagnosis: string;
};