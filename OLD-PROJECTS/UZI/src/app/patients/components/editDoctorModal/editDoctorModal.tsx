'use client'

import './editDoctorModal.css'
import Spacer from '@/components/Universal/Spacer/Spacer'
import Button from '@/components/Universal/Button/Button'
import TextField from '@/components/Universal/TextField/TextField'
import { Modal, Form, Flex, Input } from 'antd'
import { useEffect, useState } from 'react'

const { useForm, useWatch, Item } = Form
const { TextArea } = Input

interface DoctorDataType {
    key: React.Key
    fullName: string
    job: string
    org: string
    description: string
}

interface EditDoctorModalProps {
    doctor: DoctorDataType
    handleFinish: any
    isModalOpen: boolean
    handleCancel: any
}

function splitFIO(fullName: string) {
    const parts = fullName.trim().split(/\s+/)

    if (parts.length != 3)
        throw new Error('The full name must consist of three parts')
    return [parts[0], parts[1], parts[2]]
}

export default function EditDoctorModal({
    doctor,
    handleFinish,
    isModalOpen,
    handleCancel,
}: EditDoctorModalProps) {
    const [form] = useForm()

    const watchedValues = useWatch([], form)
    const isValidForm =
        watchedValues?.surname &&
        watchedValues?.name &&
        watchedValues?.patronymic &&
        watchedValues?.org &&
        watchedValues?.job &&
        watchedValues?.description

    const [isSurname, setIsSurname] = useState<string>('')
    const [isName, setIsName] = useState<string>('')
    const [isPatronymic, setIsPatronymic] = useState<string>('')
    useEffect(() => {
        if (doctor.fullName != undefined) {
            const [surname, name, patronymic] = splitFIO(doctor.fullName)
            setIsSurname(surname)
            setIsName(name)
            setIsPatronymic(patronymic)
        }
    }, [isModalOpen])

    const changeField = (field: string, value: any) => {
        form.setFieldsValue({ [field]: value })
    }
    useEffect(() => {
        changeField('surname', isSurname)
        changeField('name', isName)
        changeField('patronymic', isPatronymic)
        changeField('org', doctor.org)
        changeField('job', doctor.job)
        changeField('desc', doctor.description)
    }, [isModalOpen])

    return (
        <Modal
            title="Редактирование профиля врача"
            open={isModalOpen}
            onCancel={handleCancel}
            footer={null}
            width={600}
        >
            <Form
                form={form}
                onFinish={() =>
                    handleFinish(
                        watchedValues.description,
                        watchedValues.job,
                        watchedValues.org
                    )
                }
                style={{ fontWeight: 600 }}
                layout="vertical"
                initialValues={{
                    surname: isSurname,
                    name: isName,
                    patronymic: isPatronymic,
                    org: doctor.org,
                    job: doctor.job,
                    description: doctor.description,
                }}
            >
                <Flex
                    className="modal_form"
                    style={{ fontSize: '30px' }}
                    vertical
                >
                    <Spacer space={10} />
                    <TextField
                        errorText="Введите фамилию пациента"
                        name="surname"
                        label="Фамилия"
                        disabled={true}
                    />

                    <Spacer space={20} />
                    <TextField
                        errorText="Введите имя пациента"
                        name="name"
                        label="Имя"
                        disabled={true}
                    />

                    <Spacer space={20} />
                    <TextField
                        errorText="Введите отчество пациента"
                        name="patronymic"
                        label="Отчество"
                        disabled={true}
                    />

                    <Spacer space={20} />
                    <TextField
                        errorText="Введите место работы"
                        name="org"
                        label="Место работы"
                    />

                    <Spacer space={20} />
                    <TextField
                        errorText="Введите должность"
                        name="job"
                        label="Электронная почта"
                    />

                    <Spacer space={20} />
                    <Item
                        name="description"
                        label="Опыт работы"
                        rules={[
                            { required: true, message: 'Введите опыт работы' },
                        ]}
                    >
                        <TextArea style={{ fontSize: '16px' }} size="middle" />
                    </Item>
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
                        title="Сохранить"
                        htmlType="submit"
                        type="primary"
                        block={false}
                        disabled={!isValidForm}
                    />
                </Flex>
            </Form>
        </Modal>
    )
}
