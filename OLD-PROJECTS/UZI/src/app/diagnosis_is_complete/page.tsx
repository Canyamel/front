'use client'

import Text from '@/components/Universal/Text/Text'
import './diagnosis_is_complete.css'
import { Flex } from 'antd'
import Spacer from '@/components/Universal/Spacer/Spacer'
import Button from '@/components/Universal/Button/Button'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function DiagnosisIsComplete() {
    const router = useRouter()

    const downloadMore = useCallback(() => {
        router.push('/upload_photo')
    }, [router])

    return (
        <>
            <Flex className="page" vertical align="center">
                <Spacer space={50} />
                <Text fontSize={50} className="title">
                    Диагностика завершена
                </Text>
                <Spacer space={30} />
                <Text className="description">
                    Нажмите на кнопку ниже для перехода на страницу диагностики
                </Text>
                <Spacer space={20} />
                <Button
                    width={20}
                    title="Открыть результат"
                    htmlType="submit"
                    type="primary"
                    block={false}
                />
                <Spacer space={20} />
                <Button
                    width={20}
                    title="Загрузить еще"
                    type="default"
                    className="button"
                    block={false}
                    onClick={downloadMore}
                />
            </Flex>
        </>
    )
}
