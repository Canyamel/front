import { PatientDataType } from '@/app/patients/interfaces'
import { DeviceDataType } from '@/app/upload_photo/interfaces/IDevice'
export interface IUploadDiagnosticPhotoModalProps {
    title: string
    ModalFinish: any
    isModalOpen: boolean
    handleCancel: any
    patients?: PatientDataType[]
    devices?: DeviceDataType[]
    withUploadPhotoArea: boolean
    diagnosticTextDescription: string
    error: string | null
    handleSend?: any
    fileImg?: File | null | undefined
}
