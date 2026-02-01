export interface IPatientRes {
    id: number;
    first_name: string;
    last_name: string;
    fathers_name: string;
    birth_date: string;
    personal_policy: string;
    email: string;
    is_active: boolean;
};

export interface IPatient {
    idCard: string;
    id: number;
    fullName: string;
    birthDate: string;
    personalPolicy: string;
    email: string;
    diagnosis: string;
    isActive: boolean;
};

export interface IPatientReq {
    first_name: string;
    last_name: string;
    fathers_name: string;
    birth_date: string;
    personal_policy: string;
    email: string;
    is_active: boolean;
};