import React from 'react'

export interface PatientDataResponseType {
    id: string
    fullname: string
    active: boolean
    email: string
    policy: string
    malignancy: boolean
    birth_date: string
    last_uzi_date: string
}
export interface PatientDataType {
    key: React.Key
    id: string
    fullName: string
    birthdayDate: string
    email: string
    policy: string
    active: boolean
    diagnosis: string
    malignancy: boolean
}
export interface PatientRequestType {
    active: true
    email: string
    full_name: string
    malignancy: true
    policy: string
    id?: string
}
