import { Flex } from 'antd'
import Button from '@/components/Universal/Button/Button'
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SendOutlined,
} from '@ant-design/icons'
import React, { useEffect, useState } from 'react'
import useAPI from '@/utils/useAPI/useAPI'
import { SubscriptionStatus } from '@/app/patients/interfaces/ISubscription'

export default function ManagePanel({
    showModalEditPatient,
    showModalAddDiagnostic,
    showModalDeletePatient,
}: any) {
    const [disabledUpload, setDisabledUpload] = useState<boolean>(true)
    const [{ data: subscriptionStatus, refetch: refetchSubscriptionStatus }] =
        useAPI<SubscriptionStatus>({
            APIController: 'subscriptions',
            APIMethod: 'check-active',
            isShowSuccessResultsNotification: false,
        })

    useEffect(() => {
        setDisabledUpload(!subscriptionStatus?.has_active_subscription)
    }, [subscriptionStatus])
    return (
        <Flex justify="space-between" className="manage_panel">
            <Flex vertical justify="end" className="title">
                Диагностики
            </Flex>
            <Flex vertical gap={10} className="button_container">
                <Flex className="control_buttons" justify="end" gap={10}>
                    <EditOutlined onClick={showModalEditPatient} />
                    <DeleteOutlined
                        className="delete_icon"
                        onClick={showModalDeletePatient}
                    />
                    <SendOutlined />
                </Flex>

                <Button
                    onClick={showModalAddDiagnostic}
                    disabled={disabledUpload}
                    title={
                        <>
                            <PlusOutlined /> Добавить снимок
                        </>
                    }
                    size={'middle'}
                />
            </Flex>
        </Flex>
    )
}
