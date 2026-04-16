import React, { useEffect, useState } from 'react'
import { Flex, Typography, Badge } from 'antd'
import { DisconnectOutlined } from '@ant-design/icons'
import { skipToken } from '@reduxjs/toolkit/query'

import { useLazyGetUziInfoQuery } from '@/uzi_view/service/uzi'
import { useGetPatientInfoQuery } from '@/uzi_view/service/patient'

import { useRTKEffects } from '@/uzi_view/service/hook'

import {
    GET_PATIENT_INFO,
    GET_UZI_INFO,
} from '@/uzi_view/types/consts'
import { IUzi } from '@/uzi_view/types/uzi'

import { useAppDispatch, useAppSelector } from '@/uzi_view/store/hook'

import { setUziReady } from '@/uzi_view/store/uziSlice'

import { projections, status, statusText } from './props'
import './UziInfo.css'

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
                    <Title level={4}>
                        Диагностика от{' '}
                        {new Date(uziData.create_at).toLocaleDateString()}
                    </Title>
                    <Flex gap={20} wrap className="uzi-info-meta-row">
                        <Badge status={status[uziData.status]} />
                        <Text>{statusText[uziData.status]}</Text>
                        <Text className="uzi-info-meta-item">
                            <Text type="secondary" strong>
                                Проекция:{' '}
                            </Text>
                            {projections[uziData.projection]}
                        </Text>
                        <Text className="uzi-info-meta-item">
                            <Text type="secondary" strong>
                                Пациент:{' '}
                            </Text>
                            {patientData.fullname}
                        </Text>
                        <Text className="uzi-info-meta-item">
                            <Text type="secondary" strong>
                                Дата рождения:{' '}
                            </Text>
                            {new Date(
                                patientData.birth_date
                            ).toLocaleDateString()}
                        </Text>
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
