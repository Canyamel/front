export interface PatientDataType {
    key: React.Key
    fullName: string
    policy: string
    active: boolean
    id: string
}

export interface PatientDataResponseType {
    id: string
    fullname: string
    active: boolean
    email: string
    last_uzi_date: string
    malignancy: boolean
    policy: string
    birth_date: string
}

export type PatientResponseType = PatientDataResponseType[]
