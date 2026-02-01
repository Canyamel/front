import React from 'react'

export interface PatientDataType {
    key: React.Key
    fullName: string
    birthdayDate: string
    email: string
    policy: string
    active: boolean
    diagnosis: string
    lastUziDate: string
    malignancy: boolean
    id: string
}

export interface PatientResponseDataType {
    id: string
    fullname: string
    email: string
    policy: string
    active: boolean
    malignancy: boolean
    birth_date: string
    last_uzi_date: string
    diagnosis: string
}
