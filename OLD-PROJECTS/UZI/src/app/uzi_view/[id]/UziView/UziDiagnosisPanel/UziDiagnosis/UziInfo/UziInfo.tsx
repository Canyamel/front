import React, { useEffect, useState } from 'react'
import { Flex, Typography, Badge } from 'antd'
import { DisconnectOutlined } from '@ant-design/icons'
import { skipToken } from '@reduxjs/toolkit/query'

import { useLazyGetUziInfoQuery } from '@/app/uzi_view/[id]/service/uzi'
import { useGetPatientInfoQuery } from '@/app/uzi_view/[id]/service/patient'

import { useRTKEffects } from '@/app/uzi_view/[id]/service/hook'

import {
    GET_PATIENT_INFO,
    GET_UZI_INFO,
} from '@/app/uzi_view/[id]/types/consts'
import { IUzi } from '@/app/uzi_view/[id]/types/uzi'

import { useAppDispatch, useAppSelector } from '@/app/uzi_view/[id]/store/hook'

import { setUziReady } from '@/app/uzi_view/[id]/store/uziSlice'

import { projections, status, statusText } from './props'

const { Text, Title } = Typography

const UziInfo = () => {
    const [uziData, setUziData] = useState<undefined | IUzi>(undefined)
    const [requestes, setRequestes] = useState<number>(0)
    const [sended, setSended] = useState<boolean>(false)

    const dispatch = useAppDispatch()

    const accessToken = useAppSelector((state) => state.auth.accessToken)
    const uziId = useAppSelector((state) => state.uzi.uziId)

    const [getUziInfo, { isLoading: uziLoading, error: uziError }] =
        useLazyGetUziInfoQuery()

    const {
        data: patientData,
        isLoading: patientLoading,
        error: patientError,
    } = useGetPatientInfoQuery(
        uziData && uziData.external_id ? uziData.external_id : skipToken
    )

    useEffect(() => {
        if (
            (!uziData || uziData.status !== 'completed') &&
            accessToken &&
            uziId &&
            uziId !== '' &&
            !sended
        ) {
            setSended(true)
            getUziInfo(uziId).then((result) => {
                setRequestes((prev) => prev + 1)
                setUziData(result.data)
                setTimeout(() => {
                    setSended(false)
                }, 5000)
            })
        }
    }, [requestes, uziData, accessToken, uziId, sended])

    useEffect(() => {
        if (uziData) {
            dispatch(setUziReady(uziData.status))
        }
    }, [uziData])

    useRTKEffects({ isLoading: uziLoading, error: uziError }, GET_UZI_INFO)
    useRTKEffects(
        { isLoading: patientLoading, error: patientError },
        GET_PATIENT_INFO
    )

    return (
        <>
            {uziData && patientData && (
                <>
                    <Flex align="center" gap={10}>
                        <Badge status={status[uziData.status]} />
                        <Text>{statusText[uziData.status]}</Text>
                    </Flex>
                    <Title level={4}>
                        Диагностика от{' '}
                        {new Date(uziData.create_at).toLocaleDateString()}
                    </Title>
                    <Flex vertical>
                        <Text type="secondary" strong>
                            Проекция
                        </Text>
                        <Title level={5} className="mt-0">
                            {projections[uziData.projection]}
                        </Title>
                    </Flex>
                    <Flex vertical>
                        <Text type="secondary" strong>
                            Пациент
                        </Text>
                        <Title level={5} className="mt-0">
                            {patientData.fullname}
                        </Title>
                    </Flex>
                    <Flex vertical>
                        <Text type="secondary" strong>
                            Дата рождения
                        </Text>
                        <Title level={5} className="mt-0">
                            {new Date(
                                patientData.birth_date
                            ).toLocaleDateString()}
                        </Title>
                    </Flex>
                </>
            )}
            {!(uziData && patientData) && (
                <Flex align="center" justify="center">
                    <DisconnectOutlined
                        style={{ fontSize: 25, color: '#8c8c8c' }}
                    />
                </Flex>
            )}
        </>
    )
}

export default UziInfo
