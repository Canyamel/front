import { Dayjs } from 'dayjs'

export interface DialogDataType {
    id: number
    themeName: string
    themeDate: Dayjs
    patientFullName: string
    birthdayDate: Dayjs
    experts: string[]
    isHaveNewMessage: boolean
}
