'use client'

import './patient_profile.css'
import { useRouter, useSearchParams } from 'next/navigation'
import PatientCommonInformation from '@/app/patient_profile/components/PatientCommonInformation/PatientCommonInformation'
import { useDeleteItemOfListModal } from '@/components/Modals/DeleteModal/DeleteItemOfListModal'
import UploadDiagnosticPhotoModal from '@/components/Modals/UploadPhoto/UploadDiagnosticPhotoModal'
import ManagePanel from '@/app/patient_profile/components/ManagePanel/ManagePanel'
import Page from '@/components/Page/Page'
import Flex from 'antd/es/flex'
import Table from 'antd/es/table'
import Link from 'next/link'
import { uploadUzi } from '@/app/upload_photo/utils/requests'
import React, { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { TableProps } from 'antd'
import MethodsPatientModal from '@/components/Modals/MethodsPatientsModal/methodsPatientModal'
import useAPI from '@/utils/useAPI/useAPI'
import { isNil } from 'lodash-es'
import noop from 'lodash-es/noop'
import {
    PatientDataType,
    DeviceDataType,
    PatientResponseDataType,
} from './interfaces'
import { DoctorDataType } from '@/app/patients/interfaces'
import { useSession } from 'next-auth/react'
import { SubscriptionStatus } from '../patients/interfaces/ISubscription'

interface DiagnosticDataType {
    key: React.Key
    id?: string
    projection?: string
    patient_id?: string
    external_id?: string
    device_id?: number
    create_at?: string
}

interface DiagnosticResponseType {
    uzis?: DiagnosticDataType[]
}

export default function PatientProfile() {
    const [error, setError] = useState<string | null>(null)
    const { data: session } = useSession()
    const idDoctor = (session as any)?.id ?? ''
    const [dataSource, setDataSource] = useState<DiagnosticDataType[]>([])
    const router = useRouter()
    const params = useSearchParams()

    const [isDeviceOption, setIsDeviceOption] = useState<DeviceDataType[]>([])

    const [patient, setPatient] = useState<PatientDataType>({
        key: '',
        id: '',
        fullName: '',
        email: '',
        policy: '',
        active: true,
        malignancy: true,
        lastUziDate: '',
        birthdayDate: '',
        diagnosis: '',
    })

    const [{ data: devicesList }] = useAPI<any>({
        APIController: 'uzi',
        APIMethod: 'devices',
        isShowSuccessResultsNotification: false,
    })

    const [{ data: patientData, isLoading }] = useAPI<PatientResponseDataType>({
        APIController: 'med',
        APIMethod: `patient/${params.get('id')}`,
        isShowSuccessResultsNotification: false,
    })
    const [{ data: cardData }] = useAPI<PatientResponseDataType>({
        APIController: 'med',
        APIMethod: `card/${idDoctor}/${params.get('id')}`,
        isShowSuccessResultsNotification: false,
    })

    const [, editPatientDiagnosis] = useAPI<any>({
        APIController: 'med',
        APIMethod: `card/${idDoctor}/${params.get('id')}`,
        requestMethod: 'patch',
        isCallback: true,
    })

    const [, editPatientHealth] = useAPI<any>({
        APIController: 'med',
        APIMethod: `patient/${params.get('id')}`,
        requestMethod: 'patch',
        isCallback: true,
    })

    useEffect(() => {
        if (!isNil(patientData)) {
            console.log('patientData', patientData)

            const {
                fullname,
                id,
                email,
                policy,
                active,
                malignancy,
                birth_date,
                last_uzi_date,
            } = patientData

            setPatient({
                key: id,
                id: id,
                fullName: fullname,
                email,
                policy,
                active,
                malignancy,
                birthdayDate: birth_date,
                lastUziDate: last_uzi_date,
                diagnosis: cardData?.diagnosis || '',
            })
        }
    }, [setPatient, isLoading, patientData])

    useEffect(() => {
        if (!isNil(devicesList)) {
            const devices = devicesList?.map((item: any, index: number) => ({
                id: index,
                name: item.name,
            }))
            console.log('devices ', devices)

            setIsDeviceOption(devices)
        }
    }, [devicesList])

    const [{ data: diagnosticData }] = useAPI<any>({
        APIController: 'uzis',
        APIMethod: `external/${params.get('id')}`,
        isShowErrorResultsNotification: false,
    })

    useEffect(() => {
        console.log(params.get('id'))
        console.log(diagnosticData)
        if (!isNil(diagnosticData)) {
            const diagnostics = diagnosticData?.map(
                (item: DiagnosticDataType): DiagnosticDataType => ({
                    key: item.id ?? '',
                    create_at: item.create_at ?? '',
                    device_id: item.device_id,
                    id: item.id ?? '',
                    patient_id: item.external_id,
                    projection: item.projection,
                })
            )
            console.log('diagnostics ', diagnostics)
            setDataSource(diagnostics)
        }
    }, [diagnosticData])

    const handleSend = async (
        projection: string,
        patientId: string,
        deviceId: string,
        fileImg: File
    ) => {
        console.log('handleSend', projection, patientId, deviceId)
        if (
            fileImg != null &&
            projection != 'undefined' &&
            patientId != 'undefined' &&
            deviceId != 'undefined'
        ) {
            uploadUzi({ fileImg, projection, patientId, deviceId })
                .then((response) => {
                    if (!response.ok) {
                        return response.text().then((errorText) => {
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
                .catch((error) => {
                    setError(error.message || 'An unexpected error occurred')
                })
        }
    }

    const {
        DeleteItemOfListModal: DeletePatient,
        setDeletingItemId: setDeletingPatient,
        showModalDeleteItem: showModalDeletePatient,
        setConfirmationText: setConfirmationPatientText,
    } = useDeleteItemOfListModal<any>({
        dataSource: [patient],
        setDataSource: (newList) => setPatient(newList[0]),
        title: 'Удаление карты',
        checkBoxText: 'Подтверждаю удаление карты',
    })

    const showDeletePatientModal = useCallback(
        (patientKey: React.Key) => {
            setDeletingPatient(patientKey)
            showModalDeletePatient()
            const deletingPatient = [patient]?.find(
                (item) => item?.key === patientKey
            )
            setConfirmationText(
                `Вы уверены, что хотите удалить карту ${deletingPatient?.fullName}?`
            )
        },
        [patient, showModalDeletePatient, setConfirmationPatientText]
    )
    const {
        DeleteItemOfListModal,
        setDeletingItemId,
        showModalDeleteItem,
        setConfirmationText,
    } = useDeleteItemOfListModal<DiagnosticDataType>({
        dataSource,
        setDataSource,
        title: 'Удаление диагностики',
        checkBoxText: 'Подтверждаю удаление диагностики',
    })

    const showDeleteDiagnosticModal = useCallback(
        (patientKey: React.Key) => {
            setDeletingItemId(patientKey)
            showModalDeleteItem()
            const deletingDiagnostic = dataSource.find(
                ({ key }) => key === patientKey
            )
            setConfirmationText(
                `Вы уверены, что хотите удалить диагностику от ${(
                    deletingDiagnostic as any
                )?.admissionDate?.format('DD.MM.YYYY')}?`
            )
        },
        [
            dataSource,
            setConfirmationText,
            setDeletingItemId,
            showModalDeleteItem,
        ]
    )

    useEffect(() => {
        const id = params.get('id')
    }, [dataSource, params])

    const rowSelection: TableProps<DiagnosticDataType>['rowSelection'] = {
        onChange: (
            selectedRowKeys: React.Key[],
            selectedRows: DiagnosticDataType[]
        ) => {
            console.log(
                `selectedRowKeys: ${selectedRowKeys}`,
                'selectedRows: ',
                selectedRows
            )
        },
    }

    const [isModalOpenAddDiagnostic, setIsModalOpenAddDiagnostic] =
        useState<boolean>(false)

    const showModalAddDiagnostic = useCallback(() => {
        setIsModalOpenAddDiagnostic(true)
    }, [setIsModalOpenAddDiagnostic])

    const handleOkAddPatient = useCallback(() => {
        setIsModalOpenAddDiagnostic(false)
    }, [setIsModalOpenAddDiagnostic])

    const handleCancelAddDiagnostic = useCallback(() => {
        setIsModalOpenAddDiagnostic(false)
    }, [setIsModalOpenAddDiagnostic])

    const ModalFinishAddDiagnostic = useCallback(
        (newDiagnostic: DiagnosticDataType) => {
            newDiagnostic = {
                ...newDiagnostic,
                key: Number(dataSource?.at(-1)?.key) + 1,
            }
            setDataSource([...dataSource, newDiagnostic])
            editPatientDiagnosis().catch(noop)
            console.log('newDiagnostic ', newDiagnostic)
            handleOkAddPatient()
        },
        [handleOkAddPatient, dataSource, setDataSource]
    )

    const [isModalOpenEditPatient, setIsModalOpenEditPatient] =
        useState<boolean>(false)

    const showModalEditPatient = useCallback(() => {
        setIsModalOpenEditPatient(true)
    }, [setIsModalOpenEditPatient])

    const handleOkEditPatient = useCallback(() => {
        setIsModalOpenEditPatient(false)
    }, [setIsModalOpenEditPatient])

    const handleCancelEditPatient = useCallback(() => {
        setIsModalOpenEditPatient(false)
    }, [setIsModalOpenEditPatient])

    const ModalFinishEditPatient = useCallback(
        async (diagnosisPatient: any) => {
            setPatient((prevPatient: PatientDataType) => ({
                ...prevPatient,
                diagnosis: diagnosisPatient.diagnosis,
                malignancy: diagnosisPatient.malignancy,
                active: diagnosisPatient.active,
            }))
            editPatientDiagnosis({
                requestBody: {
                    diagnosis: diagnosisPatient.diagnosis,
                },
            }).then(
                await editPatientHealth({
                    requestBody: {
                        active: diagnosisPatient.active,
                        malignancy: diagnosisPatient.malignancy,
                    },
                })
            )
            handleOkEditPatient()
        },
        [editPatientDiagnosis, handleOkEditPatient]
    )

    const columns: any = [
        // {
        //   title: "Типы узлов",
        //   dataIndex: "nodeTypes",
        //   key: "nodeTypes",
        //   render: (nodeTypes) => {
        //     return nodeTypes.join(", ");
        //   },
        // },
        {
            title: 'Дата приема',
            dataIndex: 'create_at',
            key: 'create_at',
            render: (create_at: any) => {
                return dayjs(create_at).format('DD.MM.YYYY')
            },
        },
        // {
        //   title: "Количество узлов",
        //   dataIndex: "nodeCount",
        //   key: "nodeCount",
        // },

        {
            title: 'Проекция',
            dataIndex: 'projection',
            key: 'projection',
            render: (value: string) => {
                return value === 'cross' ? 'Поперечная' : 'Продольная'
            },
        },
        {
            title: 'Аппарат',
            dataIndex: 'device_id',
            key: 'device_id',
        },
        {
            dataIndex: 'open',
            key: 'open',
            render: () => (
                <Link href="/uzi_view" className="table_button">
                    Открыть
                </Link>
            ),
        },
        {
            dataIndex: 'delete',
            key: 'delete',
            render: (_: never, record: any) => (
                <div
                    className="table_button"
                    onClick={() => {
                        showDeleteDiagnosticModal(record.key)
                    }}
                >
                    Удалить
                </div>
            ),
        },
    ]

    return (
        <Page className="page patient_profile_page">
            <Flex gap={20}>
                <Flex vertical gap={15} style={{ width: '40%' }}>
                    <Link className="link" href="/patients">
                        Пациенты
                    </Link>
                    <div className="patient_name">{patient?.fullName}</div>
                    <PatientCommonInformation
                        patientCommonInformation={patient}
                    />
                </Flex>
                <Flex vertical gap={15} style={{ width: '60%' }}>
                    <ManagePanel
                        showModalEditPatient={showModalEditPatient}
                        showModalAddDiagnostic={showModalAddDiagnostic}
                        showModalDeletePatient={showModalDeletePatient}
                    />
                    <div className="diagnostic_table_container">
                        <Table
                            className="diagnostic_table"
                            rowSelection={{ type: 'checkbox', ...rowSelection }}
                            dataSource={dataSource}
                            columns={columns}
                            pagination={{ pageSize: 20 }}
                            scroll={{ y: 480 }}
                        />
                    </div>
                </Flex>
            </Flex>
            <DeletePatient />
            <DeleteItemOfListModal />

            <UploadDiagnosticPhotoModal
                title="Заполните данные о диагностике"
                withUploadPhotoArea={true}
                ModalFinish={ModalFinishAddDiagnostic}
                isModalOpen={isModalOpenAddDiagnostic}
                handleCancel={handleCancelAddDiagnostic}
                error={error}
                devices={isDeviceOption}
                patients={[patient]}
                fileImg={null}
                diagnosticTextDescription="Для сохранения результатов диагностики их необходимо добавить в карту пациента"
                handleSend={handleSend}
            />

            <MethodsPatientModal
                patient={patient}
                ModalFinish={ModalFinishEditPatient}
                isModalOpen={isModalOpenEditPatient}
                handleCancel={handleCancelEditPatient}
                method={'update'}
            />
        </Page>
    )
}
