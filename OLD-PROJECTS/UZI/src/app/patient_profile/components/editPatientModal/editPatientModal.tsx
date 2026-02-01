'use client'
import './methodsPatientModal.css'
import Spacer from '@/components/Universal/Spacer/Spacer'
import Button from '@/components/Universal/Button/Button'
import { Modal, Form } from 'antd'
import { Flex } from 'antd'
import TextField from '@/components/Universal/TextField/TextField'
import { DatePicker } from 'antd'
import { useMemo } from 'react'
const { Item } = Form
import ConfigProvider from 'antd/es/config-provider'
import locale from 'antd/locale/ru_RU'

interface EditPatientModalProps {
    ModalFinish: (values: any) => void
    isModalOpen: boolean
    handleCancel: () => void
}

export default function EditPatientModal({
    ModalFinish,
    isModalOpen,
    handleCancel,
}: EditPatientModalProps) {
    const { rules } = useMemo(
        () => ({
            rules: [
                {
                    required: true,
                    message: 'Введите дату рождения пациента',
                    validator: (_: any, value: any) =>
                        !value
                            ? Promise.reject(
                                  new Error('Введите дату рождения пациента')
                              )
                            : Promise.resolve(),
                },
            ],
        }),
        []
    )

    return (
        <Modal
            title="Создание карты"
            open={isModalOpen}
            onCancel={handleCancel}
            footer={null}
            width={600}
            destroyOnClose={true}
        >
            <Form onFinish={ModalFinish} layout="vertical">
                <Flex className="modal_form" vertical>
                    <Spacer space={0} />
                    <TextField
                        errorText="Введите фамилию пациента"
                        name="surname"
                        required
                        label="Фамилия"
                    />
                    <TextField
                        errorText="Введите имя пациента"
                        name="name"
                        required
                        label="Имя"
                    />
                    <TextField
                        errorText="Введите отчество пациента"
                        name="patronymic"
                        required
                        label="Отчество"
                    />
                    <TextField
                        errorText="Введите полис пациента"
                        name="polis"
                        required
                        label="Полис ОМС"
                    />
                    <TextField
                        errorText="Введите email пациента"
                        name="email"
                        required
                        label="Электронная почта"
                        rulesType="email"
                    />

                    <ConfigProvider locale={locale}>
                        <Item
                            rules={rules}
                            name="birthdayDate"
                            label="Дата рождения пациента"
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                size="large"
                            />
                        </Item>
                    </ConfigProvider>

                    <TextField
                        errorText="Введите диагноз пациента"
                        name="diagnosis"
                        required
                        label="Диагноз"
                    />

                    <Spacer space={0} />
                </Flex>
                <Spacer space={15} />
                <Flex className="modal_buttons" gap={10} justify="end">
                    <Button
                        onClick={handleCancel}
                        width={20}
                        title="Отменить"
                        type="default"
                        className="button"
                        block={false}
                    />
                    <Button
                        width={20}
                        title="Начать"
                        htmlType="submit"
                        type="primary"
                        block={false}
                    />
                </Flex>
            </Form>
        </Modal>
    )
}
