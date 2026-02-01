'use client'

import './upload_photo.css'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { message, Upload, Flex } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import Page from '@/components/Page/Page'
import Text from '@/components/Universal/Text/Text'
import Spacer from '@/components/Universal/Spacer/Spacer'
import Button from '@/components/Universal/Button/Button'
import ConditionalRender from '@/components/Universal/ConditionalRender/ConditionalRender'
import UploadDiagnosticPhotoModal from '@/components/Modals/UploadPhoto/UploadDiagnosticPhotoModal'
import type { UploadProps } from 'antd'
import { uploadUzi } from './utils/requests'
import useAPI from '@/utils/useAPI/useAPI'
import { isNil } from 'lodash-es'
import {
    PatientDataType,
    PatientResponseType,
    PatientDataResponseType,
    DeviceDataType,
} from '@/app/upload_photo/interfaces'
import { DeviceResponseType } from '@/app/patient_profile/interfaces'
import { DevicesResponseType } from '@/app/patient_profile/interfaces/IDevice'
import { useSession } from 'next-auth/react'
import { SubscriptionStatus } from '../patients/interfaces/ISubscription'

const { Dragger } = Upload

export default function UploadPhoto() {
    const router = useRouter()
    const { data: session }: any = useSession()
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

    const [isFileImg, setIsFileImg] = useState<File | null>(null)

    const [isDeviceOption, setIsDeviceOption] = useState<DeviceDataType[]>([])
    const [isPatientOption, setIsPatientOption] = useState<PatientDataType[]>(
        []
    )
    const idDoctor = session?.id ?? ''

    const [error, setError] = useState<string | null>(null)
    const [disabledUpload, setDisabledUpload] = useState<boolean>(true)

    const [{ data: devicesList }] = useAPI<DeviceResponseType[]>({
        APIController: 'uzi',
        APIMethod: 'devices',
    })

    const [{ data: subscriptionStatus, refetch: refetchSubscriptionStatus }] =
        useAPI<SubscriptionStatus>({
            APIController: 'subscriptions',
            APIMethod: 'check-active',
            isShowSuccessResultsNotification: false,
        })

    useEffect(() => {
        if (!isNil(devicesList)) {
            const devices = devicesList?.map((item: DevicesResponseType) => ({
                key: item.id,
                id: item.id,
                name: item.name,
            }))
            if (devices) {
                setIsDeviceOption(devices)
            }
        }
    }, [devicesList])

    useEffect(() => {
        setDisabledUpload(!subscriptionStatus?.has_active_subscription)
    }, [subscriptionStatus])

    const [{ data: patientList, isLoading, refetch: refetchPatients }] = useAPI<
        PatientDataResponseType[]
    >({
        APIController: 'med',
        APIMethod: `doctor/${idDoctor}/patients`,
        isEnabled: idDoctor.length > 0,
    })

    useEffect(() => {
        const patients = patientList?.map((item) => ({
            key: item.id,
            id: item.id,
            fullName: item.fullname,
            policy: item.policy,
            active: item.active,
            email: item.email,
            lastUziDate: item.last_uzi_date ?? '',
            birthdayDate: item.birth_date ?? '',
        }))

        if (patients) {
            setIsPatientOption(patients)
        }
    }, [patientList])

    const handleSend = async (
        projection: string,
        patientId: string,
        deviceId: string,
        fileImg: File
    ) => {
        //Сюда добавить if как сделано в patient_profile
        uploadUzi(
            { fileImg, projection, patientId, deviceId },
            session?.accessToken
        )
            .then((response) => {
                if (!response.ok) {
                    return response.text().then((errorText: any) => {
                        throw new Error(
                            `HTTP error! status: ${response.status}, text: ${errorText}`
                        )
                    })
                }
                return response.text()
            })
            .then((data) => {
                console.log('Response:', data)
                router.push('/diagnostic_is_running')
            })
            .catch((error: any) => {
                console.log(error)
            })
    }
    const [, addDiagnostic] = useAPI<any>({
        APIController: 'uzi',
        APIMethod: '',
        requestMethod: 'post',
        isCallback: true,
    })

    const showModal = useCallback(() => {
        setIsModalOpen(true)
    }, [setIsModalOpen])

    const handleOk = useCallback(() => {
        setIsModalOpen(false)
    }, [setIsModalOpen, router])

    const handleCancel = useCallback(() => {
        setIsModalOpen(false)
    }, [setIsModalOpen])

    const ModalFinish = useCallback(
        (values: { device: string; patient: string; projection: string }) => {
            addDiagnostic({
                requestBody: {
                    patient_id: values.patient,
                    projection: values.projection,
                    device_id: values.device,
                },
            })
            handleOk()
        },
        [handleOk]
    )

    const propsDragger: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.png,.tiff',
        onChange(info: any) {
            const { file } = info
            const { status } = file
            if (status === 'done') {
                message.success(`${file.name} файла успешно загружен`)
                setIsFileImg(file.originFileObj)
            } else if (status === 'error') {
                message.error(`${file.name} не удалось загрузить файл`)
                setIsFileImg(null)
            } else if (status === 'removed') {
                message.success(`${file.name} файл успешно удалён`)
                setIsFileImg(null)
            }
        },
        onDrop(e: any) {
            console.log('Dropped files', e.dataTransfer.files)
        },
    }

    return (
        <>
            <Page className="page">
                <ConditionalRender condition={error == null}>
                    <Flex vertical>
                        <div className="page">
                            <Spacer space={50} />
                            <Text fontSize={50} className="title">
                                Загрузка снимка
                            </Text>
                            <Spacer space={30} />
                            <Text className="description">
                                Для начала диагностики загрузите интересующий
                                снимок ультразвуковой диагностики щитовидной
                                железы
                            </Text>
                            <Spacer space={20} />

                            <Dragger
                                {...propsDragger}
                                className="download_area"
                                maxCount={1}
                                disabled={disabledUpload}
                            >
                                <Spacer space={20} />
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <Spacer space={20} />
                                <p className="ant-upload-text">
                                    Нажмите или перетащите файл в эту область
                                    для загрузки
                                </p>
                                <Spacer space={10} />
                                <p className="ant-upload-hint">
                                    Выберите файл в формате .png или .tiff
                                </p>
                            </Dragger>
                            <Spacer space={30} />

                            <Button
                                onClick={showModal}
                                title="Начать диагностику"
                                className="download_button"
                                disabled={isFileImg == null}
                            />
                            <UploadDiagnosticPhotoModal
                                title="Заполните данные о пациенте"
                                withUploadPhotoArea={false}
                                ModalFinish={ModalFinish}
                                isModalOpen={isModalOpen}
                                handleCancel={handleCancel}
                                error={error}
                                devices={isDeviceOption}
                                patients={isPatientOption}
                                diagnosticTextDescription="Для сохранения результатов диагностики необходимо добавить карту пациента"
                                fileImg={isFileImg}
                                handleSend={handleSend}
                            />
                        </div>
                    </Flex>
                </ConditionalRender>

                <ConditionalRender condition={error != null}>
                    <Spacer space={50} />
                    <Text className="title_error">Ошибка связи с сервером</Text>
                    <Spacer space={50} />
                    <Text className="title_error_support">Error: {error}</Text>
                </ConditionalRender>
            </Page>
        </>
    )
}
