import './DialogBlock.css'
import { DialogDataType } from '@/app/dialogs/Types'
import ConditionalRender from '@/components/Universal/ConditionalRender/ConditionalRender'
import React, { Fragment, useCallback, useMemo, useState } from 'react'
import Flex from 'antd/es/flex'
import Button from 'antd/es/button'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

export default function DialogBlock({
    id,
    themeName,
    themeDate,
    patientFullName,
    birthdayDate,
    experts,
    isHaveNewMessage,
}: DialogDataType) {
    const router = useRouter()
    const [isShowExpert, setIsShowExpert] = useState<boolean>(true)

    const showedExperts = useMemo(() => {
        if (isShowExpert) {
            return experts
        } else {
            return experts.slice(0, 2)
        }
    }, [experts, isShowExpert])

    const redirectToChat = useCallback(() => {
        router.push(`/chat/${id}`)
    }, [id, router])
    return (
        <div>
            <ConditionalRender condition={isHaveNewMessage}>
                <div className="new_message"> Новое сообшение</div>
            </ConditionalRender>
            <Flex>
                <div className="card">
                    <div className="column">
                        <div className="column_name">Тема</div>
                        <div className="theme_name">{themeName}</div>
                        <div className="date">
                            {themeDate.format('DD.MM.YYYY')}
                        </div>
                        <Button
                            style={{ marginLeft: 1, top: 3 }}
                            onClick={redirectToChat}
                        >
                            Перейти
                        </Button>
                    </div>
                    <div className="column">
                        <div className="column_name">Пациент </div>
                        <div className="theme_name">{patientFullName}</div>
                        <div className="birthday_date">
                            {birthdayDate.format('DD.MM.YYYY')}
                        </div>
                    </div>
                    <Flex vertical gap={20}>
                        <div className="column">
                            <div className="column_name">Эксперты</div>
                            <Flex gap={20}>
                                <div>
                                    {showedExperts.map((expert, index) => {
                                        return (
                                            <>
                                                <div className="expert_card">
                                                    {expert}
                                                </div>
                                                <ConditionalRender
                                                    condition={index % 2 !== 0}
                                                >
                                                    <br />
                                                </ConditionalRender>
                                            </>
                                        )
                                    })}
                                </div>
                                <ConditionalRender
                                    condition={
                                        !isShowExpert && experts.length > 2
                                    }
                                >
                                    <Flex
                                        align="center"
                                        className="switch_button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setIsShowExpert(true)
                                        }}
                                    >
                                        <Flex gap={5}>
                                            <span>Показать еще</span>
                                            <DownOutlined />
                                        </Flex>
                                    </Flex>
                                </ConditionalRender>
                            </Flex>
                        </div>
                        <ConditionalRender
                            condition={isShowExpert && experts.length > 2}
                        >
                            <div
                                className="switch_button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    setIsShowExpert(false)
                                }}
                            >
                                <Flex gap={5}>
                                    <span>Скрыть</span> <UpOutlined />
                                </Flex>
                            </div>
                        </ConditionalRender>
                    </Flex>
                </div>
            </Flex>
        </div>
    )
}
