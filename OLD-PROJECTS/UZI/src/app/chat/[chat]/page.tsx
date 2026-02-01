'use client'
import './chat.css'
import Page from '@/components/Page/Page'
import React, { useCallback, useEffect, useState } from 'react'
import Flex from 'antd/es/flex'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import dayjs, { Dayjs } from 'dayjs'
import clsx from 'clsx'
import { LeftOutlined, SendOutlined } from '@ant-design/icons'
import DiagnosticDrawer from '@/app/chat/DiagnosticDrawer/DiagnosticDrawer'

const { TextArea } = Input
const { Item, useWatch, useForm } = Form

export default function Chat() {
    interface MessageDataType {
        id: number
        textContent: string
        own: boolean
        datetime: Dayjs
    }

    const mockMessage = {
        id: 1,
        textContent: `Биоло́гия (греч. βιολογία; от др.-греч. βίος «жизнь» + λόγος «учение, наука»[1]) — наука о живых 
            существах и их взаимодействии со средой обитания. Изучает все аспекты жизни, в частности: структуру, 
            функционирование, рост, происхождение, эволюцию и распределение живых организмов на Земле. Классифицирует и 
            описывает живые существа, происхождение их видов, взаимодействие между собой и с окружающей средой[2].Как 
            самостоятельная наука биология выделилась из естественных наук в XIX веке, когда учёные обнаружили, что все 
            живые организмы обладают некоторыми общими свойствами и признаками, в совокупности не характерными для 
            неживой природы. Термин «биология» был введён независимо несколькими авторами: Фридрихом Бурдахом в 1800 году, 
            Готфридом Рейнхольдом Тревиранусом[3] и Жаном Батистом Ламарком в 1802 году.`,
        own: true,
        datetime: dayjs('10.11.2024'),
    }

    const [messages, setMessages] = useState<MessageDataType[]>([])

    useEffect(() => {
        const mockMessageList = []
        for (let i = 0; i <= 10; i++) {
            mockMessageList.push({
                ...mockMessage,
                id: i,
                own: i % 2 == 0,
                datetime: dayjs(`11.${10 + i}.2024`),
            })
        }
        setMessages(mockMessageList)
    }, [mockMessage, setMessages])

    const [form] = useForm()
    const textarea_message = useWatch('textarea_message', form)

    const sendMessage = useCallback(() => {
        setMessages([
            ...messages,
            {
                id: messages.length,
                own: true,
                datetime: dayjs(),
                textContent: textarea_message,
            },
        ])

        form.resetFields()
    }, [messages, textarea_message, form])

    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

    const showDrawer = useCallback(() => {
        setIsDrawerOpen(true)
    }, [setIsDrawerOpen])

    const handleOk = useCallback(() => {
        setIsDrawerOpen(false)
        //router.push('/diagnostic_is_running');
    }, [setIsDrawerOpen])

    const handleCancel = useCallback(() => {
        setIsDrawerOpen(false)
    }, [setIsDrawerOpen])

    const DrawerFinish = useCallback(() => {
        handleOk()
    }, [handleOk])

    return (
        <Page className="page chat_page">
            <DiagnosticDrawer
                DrawerFinish={DrawerFinish}
                isDrawerOpen={isDrawerOpen}
                handleCancel={handleCancel}
                // handleOk={handleOk}
            />
            <Button
                className="viewing_diagnostics_button"
                type="primary"
                onClick={showDrawer}
            >
                <LeftOutlined />
                <p>Просмотр диагностик</p>
            </Button>

            <div className="message_list_container">
                <Flex gap={20} className="message_list" vertical>
                    {messages.map(({ own, datetime, textContent, id }) => {
                        return (
                            <div
                                className={clsx('message', {
                                    own_message: own,
                                })}
                                key={id}
                            >
                                <Flex gap={10} vertical>
                                    <div className="datetime">
                                        {datetime.format('DD/MM/YYYY')} -
                                        Цыгулева Ксения Владимировна
                                    </div>
                                    <div className="text_content">
                                        {textContent}
                                    </div>
                                </Flex>
                            </div>
                        )
                    })}
                </Flex>
            </div>
            <Form form={form}>
                <Flex className="input_content" gap={20} align="start">
                    <Item name="textarea_message" className="textarea_item">
                        <TextArea className="textarea" />
                    </Item>
                    <SendOutlined
                        className="send_button"
                        onClick={sendMessage}
                    />
                </Flex>
            </Form>
        </Page>
    )
}
