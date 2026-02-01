'use client'
import './patients.css'
import Page from '@/components/Page/Page'
import Button from '@/components/Universal/Button/Button'
import Text from '@/components/Universal/Text/Text'
import React, { useCallback, useEffect, useState } from 'react'
import Table from 'antd/es/table'
import Flex from 'antd/es/flex'
import Input from 'antd/es/input'
import Tag from 'antd/es/tag'
import type { TableProps } from 'antd'
import Spacer from '@/components/Universal/Spacer/Spacer'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useDeleteItemOfListModal } from '@/components/Modals/DeleteModal/DeleteItemOfListModal'
import MethodsPatientModal from '@/components/Modals/MethodsPatientsModal/methodsPatientModal'
import useAPI from '@/utils/useAPI/useAPI'
import { isNil } from 'lodash-es'
import {
    CardRequestType,
    PatientDataType,
    PatientDataResponseType,
    PatientRequestType,
    DoctorDataType,
    PaymentProvider,
} from './interfaces'
import { PatientResponseType } from '@/app/upload_photo/interfaces'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import {
    SubscriptionPurchaseRequest,
    Subscription,
    SubscriptionStatus,
    TariffPlan,
} from './interfaces/ISubscription'
import axios from 'axios'
import { SubscriptionModal } from './components/SubscriptionModal/SubscriptionModal'
import { SubscriptionInfo } from './components/SubscriptionInfo/SubscriptionInfo'
const { Search } = Input

export default function Patients() {
    const { data: session } = useSession()
    const [isPatientData, setIsPatientData] = useState<PatientDataType[]>([])
    const [isDoctorData, setIsDoctorData] = useState<DoctorDataType>()

    const [searchPatient, setSearchPatient] = useState<string>('')

    const [pageSize, setPageSize] = useState(10)
    const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] =
        useState(false)

    useEffect(() => {
        const tableResize = () => {
            const height = window.innerHeight
            const n = Math.floor((height - 450) / 55)
            if (n < 5) setPageSize(5)
            else setPageSize(n)
        }

        tableResize()
        window.addEventListener('resize', tableResize)
        return () => window.removeEventListener('resize', tableResize)
    }, [])

    const filteredData =
        isPatientData?.filter(
            (item: PatientDataType) =>
                item.fullName
                    ?.toLowerCase()
                    .includes(searchPatient.toLowerCase()) ||
                item.policy.includes(searchPatient)
        ) || []

    const onSearchChange = (value: string) => {
        setSearchPatient(value)
    }

    function formatPolicy(str: string) {
        return str.replace(/(.{4})/g, '$1 ')
    }

    const idDoctor = (session as any)?.id ?? ''

    const [{ data: patientList, isLoading, refetch: refetchPatients }] = useAPI<
        PatientDataResponseType[]
    >({
        APIController: 'med',
        APIMethod: `doctor/${idDoctor}/patients`,
        isEnabled: idDoctor.length > 0,
        isShowSuccessResultsNotification: false,
    })

    const [{ data: subscriptionStatus, refetch: refetchSubscriptionStatus }] =
        useAPI<SubscriptionStatus>({
            APIController: 'subscriptions',
            APIMethod: 'check-active',
            isShowSuccessResultsNotification: false,
        })
    const [{ data: subscription, refetch: refetchSubscription }] =
        useAPI<Subscription>({
            APIController: 'subscriptions',
            APIMethod: `get-active`,
            isEnabled: subscriptionStatus?.has_active_subscription,
            isShowSuccessResultsNotification: false,
            isShowErrorResultsNotification: false,
        })
    const [{ data: activeTariffPlan }] = useAPI<TariffPlan>({
        APIController: 'tariff_plans',
        APIMethod: subscription?.tariff_plan_id
            ? `${subscription?.tariff_plan_id}`
            : '',
        isEnabled: !!subscription?.tariff_plan_id,
        isShowSuccessResultsNotification: false,
    })

    const [{ data: plans }] = useAPI<TariffPlan[]>({
        APIController: '',
        APIMethod: `tariff_plans`,
        isShowSuccessResultsNotification: false,
    })

    const [{ data: paymentProviders }] = useAPI<PaymentProvider[]>({
        APIController: '',
        APIMethod: `payment_providers`,
        isShowSuccessResultsNotification: false,
    })

    const [, purchaseSubscription] = useAPI<{ confirmation_url: string }>({
        APIController: 'subscriptions',
        APIMethod: 'purchase',
        requestMethod: 'post',
        isCallback: true,
    })

    useEffect(() => {
        if (!isNil(patientList)) {
            const patients: PatientDataType[] = patientList.map(
                (item: PatientDataResponseType) => ({
                    key: item.id,
                    id: item.id,
                    fullName: item.fullname,
                    birthdayDate: item.birth_date,
                    diagnosis: 'Какой-то диагноз',
                    email: item.email,
                    policy: item.policy,
                    active: item.active,
                    malignancy: item.malignancy,
                })
            )
            console.log('patients ', patients)

            setIsPatientData(patients)
        }
        console.log()
    }, [patientList])

    const [, createPatient] = useAPI<PatientRequestType>({
        APIController: 'med',
        APIMethod: 'patient',
        requestMethod: 'post',
        isCallback: true,
    })

    const [, createCard] = useAPI<CardRequestType>({
        APIController: 'med',
        APIMethod: 'card',
        requestMethod: 'post',
        isCallback: true,
    })

    const [{ data: doctorData }] = useAPI<any>({
        APIController: 'med',
        APIMethod: `doctor/${idDoctor}`,
        isShowSuccessResultsNotification: false,
    })

    useEffect(() => {
        console.log(plans)
    }, [plans])

    useEffect(() => {
        console.log('doctorData', doctorData)
        if (!isNil(doctorData)) {
            const doctor: DoctorDataType = {
                key: doctorData.id,
                id: doctorData.id,
                fullName: doctorData.fullname,
                job: doctorData.job,
                description: doctorData.description,
                org: doctorData.org,
            }
            setIsDoctorData(doctor)
        }
    }, [doctorData])

    const [isModalOpenAddPatient, setIsModalOpenAddPatient] =
        useState<boolean>(false)

    const showModalAddPatient = useCallback(() => {
        setIsModalOpenAddPatient(true)
    }, [setIsModalOpenAddPatient])

    const handleOkAddPatient = useCallback(() => {
        setIsModalOpenAddPatient(false)
    }, [setIsModalOpenAddPatient])

    const handleCancelAddPatient = useCallback(() => {
        setIsModalOpenAddPatient(false)
    }, [setIsModalOpenAddPatient])

    const handleFinishAddPatient = useCallback(
        async (data: any) => {
            console.log('handleFinishAddPatient data: ', data)

            const {
                surname,
                name,
                patronymic,
                email,
                polis,
                diagnosis,
                malignancy,
                active,
                birthdayDate,
            } = data

            const birth_date = dayjs(birthdayDate).format('YYYY-MM-DD')
            const responseDataCreatePatient = await createPatient({
                requestBody: {
                    email: email,
                    fullname: `${surname} ${name} ${patronymic}`,
                    policy: polis,
                    active: active || false,
                    malignancy: malignancy || false,
                    birth_date: birth_date,
                },
            })
            const { id } = responseDataCreatePatient
            await createCard({
                requestBody: {
                    patient_id: id,
                    diagnosis: diagnosis,
                    doctor_id: idDoctor,
                },
            })

            refetchPatients()

            handleOkAddPatient()
        },
        [createCard, createPatient, handleOkAddPatient]
    )

    const columns: any = [
        {
            title: 'ФИО',
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: 'Дата рождения',
            dataIndex: 'birthdayDate',
            key: 'birthdayDate',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Диагноз',
            dataIndex: 'diagnosis',
            key: 'diagnosis',
        },
        {
            title: 'Статус',
            dataIndex: 'active',
            key: 'active',
            render: (value: boolean) => (
                <Tag
                    style={{ fontSize: '15px', fontWeight: 600 }}
                    color={value ? 'green' : 'grey'}
                >
                    {value ? 'Активен' : 'Не активен'}
                </Tag>
            ),
        },
        {
            title: 'Подозрение',
            dataIndex: 'malignancy',
            key: 'malignancy',
            render: (value: boolean) => (
                <Tag
                    style={{ fontSize: '15px', fontWeight: 600 }}
                    color={value ? 'orange' : 'gray'}
                >
                    {value ? 'Присутствует' : 'Отсустствует'}
                </Tag>
            ),
        },
        {
            title: 'Полис',
            dataIndex: 'policy',
            key: 'policy',
            render: (value: string) => <span>{formatPolicy(value)}</span>,
        },
        {
            dataIndex: 'id',
            key: 'id',
            render: (_: never, record: PatientDataType) => (
                <Flex justify="space-evenly">
                    <Link
                        href={`/patient_profile?id=${record.id}`}
                        className="table_button"
                    >
                        Открыть
                    </Link>
                    <div
                        className="table_button"
                        onClick={() => {
                            showDeletePatientModal(record.key)
                        }}
                    >
                        Удалить
                    </div>
                </Flex>
            ),
        },
    ]

    const {
        DeleteItemOfListModal,
        setDeletingItemId,
        showModalDeleteItem,
        setConfirmationText,
    } = useDeleteItemOfListModal<PatientDataType>({
        dataSource: isPatientData,
        setDataSource: setIsPatientData,
        title: 'Удаление карты',
        checkBoxText: 'Подтверждаю удаление карты',
    })

    const showDeletePatientModal = useCallback(
        (patientKey: React.Key) => {
            setDeletingItemId(patientKey)
            showModalDeleteItem()
            const deletingPatient = isPatientData?.find(
                ({ key }) => key === patientKey
            )
            setConfirmationText(
                `Вы уверены, что хотите удалить карту ${deletingPatient?.fullName}?`
            )
        },
        [
            isPatientData,
            setConfirmationText,
            setDeletingItemId,
            showModalDeleteItem,
        ]
    )

    const rowSelection: TableProps<PatientDataType>['rowSelection'] = {
        onChange: (
            selectedRowKeys: React.Key[],
            selectedRows: PatientDataType[]
        ) => {
            console.log(
                `selectedRowKeys:${selectedRowKeys}`,
                'selectedRows:',
                selectedRows
            )
        },
    }

    const handleSubscriptionPurchase = async (
        data: SubscriptionPurchaseRequest
    ) => {
        try {
            const response = await purchaseSubscription({
                requestBody: data,
            })
            return response
        } catch (error) {
            console.error('Error purchasing subscription:', error)
            // message.error('Ошибка при оформлении подписки')
            return { confirmation_url: '' }
        }
    }

    const checkSubscriptionStatus = async () => {
        await refetchSubscriptionStatus()
        console.log(
            'Checking status:',
            subscriptionStatus?.has_active_subscription
        )
        return subscriptionStatus?.has_active_subscription || false
    }

    const handleSubscriptionActive = async () => {
        console.log('Subscription activated, updating data...')
        await refetchSubscription()
        // message.success('Подписка успешно оформлена')
        console.log('Closing modal...')
        setIsSubscriptionModalVisible(false)
    }

    return (
        <>
            <Page className="page page_patients">
                <Flex gap={10}>
                    <Text className="title">{isDoctorData?.fullName}</Text>
                </Flex>

                <Spacer space={15} />
                <Flex gap={10}>
                    <Text className="title_support">
                        Место работы и должность:
                    </Text>
                    <Text fontSize={20}>
                        {isDoctorData?.org}, {isDoctorData?.job}
                    </Text>
                </Flex>

                <Spacer space={10} />
                <Flex gap={10}>
                    <Text className="title_support">Опыт работы:</Text>
                    <Text fontSize={20}>{isDoctorData?.description}</Text>
                </Flex>
                <Spacer space={30} />
                <Spacer space={20} />
                <SubscriptionInfo
                    subscription={subscription as Subscription}
                    tariffPlan={activeTariffPlan as TariffPlan}
                    onSubscribe={() => setIsSubscriptionModalVisible(true)}
                />
                <Spacer space={20} />

                <Spacer space={20} />
                <Flex justify="space-between" align="center">
                    <Text className="title">Пациенты</Text>
                    <Flex gap={20} align="center">
                        <Search
                            size="large"
                            placeholder="Поиск по картам"
                            onChange={(e) => onSearchChange(e.target.value)}
                            value={searchPatient}
                            style={{ width: 300 }}
                        />
                        <Button
                            size="large"
                            onClick={showModalAddPatient}
                            title={
                                <Text>
                                    <PlusOutlined /> Добавить карту
                                </Text>
                            }
                        />
                    </Flex>
                </Flex>

                <Spacer space={20} />
                <Table<PatientDataType>
                    className="table_patient"
                    rowSelection={{ type: 'checkbox', ...rowSelection }}
                    dataSource={filteredData}
                    columns={columns}
                    pagination={{ pageSize, showSizeChanger: false }}
                    loading={isLoading}
                />

                <MethodsPatientModal
                    ModalFinish={handleFinishAddPatient}
                    isModalOpen={isModalOpenAddPatient}
                    handleCancel={handleCancelAddPatient}
                    method={'create'}
                />
                <DeleteItemOfListModal />
                <SubscriptionModal
                    visible={isSubscriptionModalVisible}
                    onCancel={() => setIsSubscriptionModalVisible(false)}
                    onSubscribe={handleSubscriptionPurchase}
                    checkSubscriptionStatus={checkSubscriptionStatus}
                    onSubscriptionActive={handleSubscriptionActive}
                    tariffPlans={plans}
                    paymentProviders={paymentProviders}
                />
            </Page>
            <Spacer space={20} />
        </>
    )
}
