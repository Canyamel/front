'use client'

import './send_patient_card.css'
import { useCallback, useState } from 'react'
import {
    Flex,
    Form,
    Input,
    Space,
    Descriptions,
    Badge,
    Select,
    Tag,
    Col,
    Row,
    Button,
    Tooltip,
} from 'antd'
import type { DescriptionsProps } from 'antd'
import Text from '@/components/Universal/Text/Text'
import Spacer from '@/components/Universal/Spacer/Spacer'

const { useForm, Item } = Form
const { TextArea } = Input
const { Option } = Select

interface Specialist {
    id: number
    lastName: string
    firstName: string
    fatherName: string
    medOrganisation: string
}

const id_patiend = 1
const lastName = 'Алексеев'
const firstName = 'Алексей'
const fatherName = 'Алексеевич'
const birthDate = '01.01.2000'
const policy = '1234512456123451'
const status = true
const email = 'example@mail.ru'
const diagnosis =
    'Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere est, autem inventore accusantium voluptates, laborum libero atque distinctio magnam a ullam nesciunt hic veritatis quis alias. Facilis odio quis natus.'

const items: DescriptionsProps['items'] = [
    {
        key: 1,
        label: 'ФИО',
        children: lastName + ' ' + firstName + ' ' + fatherName,
    },
    { key: 2, label: 'Дата рождения', children: birthDate },
    { key: 3, label: 'Полис', children: policy },
    {
        key: 4,
        label: 'Статус',
        children: (
            <Space>
                <Badge status={status ? 'processing' : 'default'} />
                <Text>{status ? 'Активный' : 'Не активный'}</Text>
            </Space>
        ),
    },
    { key: 5, label: 'Email', children: email },
    { key: 6, label: 'Диагноз', children: diagnosis },
]

const specialistOptions: Specialist[] = [
    {
        id: 1,
        lastName: 'Иванов',
        firstName: 'Иван',
        fatherName: 'Иванович',
        medOrganisation: 'Больница №1',
    },
    {
        id: 2,
        lastName: 'Петрова',
        firstName: 'Анна',
        fatherName: 'Сергеевна',
        medOrganisation: 'Клиника "Здоровье"',
    },
    {
        id: 3,
        lastName: 'Сидоров',
        firstName: 'Петр',
        fatherName: 'Алексеевич',
        medOrganisation: 'Медицинский центр "Вита"',
    },
    {
        id: 4,
        lastName: 'Иванов1',
        firstName: 'Сергей',
        fatherName: 'Иванович',
        medOrganisation: 'Больница №1',
    },
    {
        id: 5,
        lastName: 'Алексеевна1',
        firstName: 'Анна',
        fatherName: 'Сергеевна',
        medOrganisation: 'Клиника "Здоровье"',
    },
    {
        id: 6,
        lastName: 'Сидоров1',
        firstName: 'Петр',
        fatherName: 'Алексеевич',
        medOrganisation: 'Медицинский центр "Вита"',
    },
    {
        id: 7,
        lastName: 'Иванов2',
        firstName: 'Иван',
        fatherName: 'Иванович',
        medOrganisation: 'Больница №1',
    },
    {
        id: 8,
        lastName: 'Петрова2',
        firstName: 'Анна',
        fatherName: 'Сергеевна',
        medOrganisation: 'Клиника "Здоровье"',
    },
    {
        id: 9,
        lastName: 'Сидоров2',
        firstName: 'Петр',
        fatherName: 'Алексеевич',
        medOrganisation: 'Медицинский центр "Вита"',
    },
    {
        id: 10,
        lastName: 'Иванов3',
        firstName: 'Иван',
        fatherName: 'Иванович',
        medOrganisation: 'Больница №1',
    },
    {
        id: 11,
        lastName: 'Петрова3',
        firstName: 'Анна',
        fatherName: 'Сергеевна',
        medOrganisation: 'Клиника "Здоровье"',
    },
    {
        id: 12,
        lastName: 'Сидоров3',
        firstName: 'Петр',
        fatherName: 'Алексеевич',
        medOrganisation: 'Медицинский центр "Вита"',
    },
]

export default function SendCard() {
    const onFinish = useCallback((values: string[]) => {
        console.log(values)
    }, [])

    const [form] = useForm()

    const [selectedItems, setSelectedItems] = useState([])

    const filteredOptions = specialistOptions.filter(
        (o) => !selectedItems.find((item) => item == o.id)
    )

    const isValidForm = selectedItems.length > 0

    const options = filteredOptions.map((specialist) => ({
        value: specialist.id,
        label: (
            <Space direction="vertical">
                <Text className="title_fio">{`${specialist.lastName} ${specialist.firstName} ${specialist.fatherName}`}</Text>
                <Text>{specialist.medOrganisation}</Text>
            </Space>
        ),
        optionFilterFullName:
            specialist.lastName +
            ' ' +
            specialist.firstName +
            ' ' +
            specialist.fatherName,
        optionFilterMedOrganisation: specialist.medOrganisation,
    }))

    const formatTooltip = (id: number) => {
        const specialist = specialistOptions.find((s) => s.id === id)
        if (specialist) {
            return (
                <Space direction="vertical">
                    <Text>{`${specialist.lastName} ${specialist.firstName} ${specialist.fatherName}`}</Text>
                    <Text>{specialist.medOrganisation}</Text>
                </Space>
            )
        }
        return null
    }

    const formatTag = (id: number) => {
        const specialist = specialistOptions.find((s) => s.id === id)
        if (specialist) {
            return `${specialist.lastName} ${specialist.firstName.charAt(0)}.${specialist.fatherName.charAt(0)}.`
        }
        return null
    }

    const tagRender = (props: any) => {
        const { onClose } = props
        const onPreventMouseDown = (
            event: React.MouseEvent<HTMLSpanElement>
        ) => {
            event.preventDefault()
            event.stopPropagation()
        }
        return (
            <Tooltip title={formatTooltip(props.value)}>
                <Tag
                    onClose={onClose}
                    onMouseDown={onPreventMouseDown}
                    style={{
                        height: '34px',
                        lineHeight: '30px',
                        fontSize: '16px',
                    }}
                    closable
                >
                    {formatTag(props.value)}
                </Tag>
            </Tooltip>
        )
    }

    return (
        <>
            <Flex className="page" justify="space-evenly">
                <Flex vertical>
                    <Row justify="space-evenly">
                        <Col span={8}>
                            <Flex style={{ width: 'auto' }} vertical>
                                <Text className="title">
                                    Отправить эксперту
                                </Text>

                                <Spacer space={20} />

                                <Descriptions
                                    labelStyle={{
                                        fontWeight: 500,
                                        fontSize: 18,
                                    }}
                                    contentStyle={{ fontSize: 20 }}
                                    items={items}
                                    column={1}
                                    bordered
                                />
                            </Flex>
                        </Col>

                        <Col span={14}>
                            <Spacer space={35} />

                            <Form
                                initialValues={{ id_patient: id_patiend }}
                                className="container"
                                onFinish={onFinish}
                                layout="vertical"
                                form={form}
                                style={{ fontWeight: 700 }}
                            >
                                <Item
                                    name="id_patient"
                                    style={{ display: 'none' }}
                                >
                                    <Input />
                                </Item>

                                <Item name="theme" label="Тема обсуждения">
                                    <Input size="large" />
                                </Item>

                                <Spacer space={30} />

                                <Item name="commit" label="Комментарий">
                                    <TextArea size="large" />
                                </Item>

                                <Spacer space={20} />

                                <Item name="type" label="Тип узла">
                                    <Select
                                        style={{ boxShadow: 'none' }}
                                        size="large"
                                        allowClear
                                    >
                                        <Option value="one">1</Option>
                                        <Option value="two">2</Option>
                                        <Option value="three">3</Option>
                                    </Select>
                                </Item>

                                <Spacer space={20} />

                                <Item
                                    name="id_specialist"
                                    label="Специалисты"
                                    required={true}
                                >
                                    <Select
                                        size="large"
                                        mode="multiple"
                                        options={options}
                                        onChange={setSelectedItems}
                                        optionFilterProp="optionFilter"
                                        tagRender={tagRender}
                                    />
                                </Item>

                                <Spacer space={10} />

                                <Button
                                    title="Отправить"
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    disabled={!isValidForm}
                                >
                                    Отправить
                                </Button>
                            </Form>
                        </Col>
                    </Row>
                </Flex>
            </Flex>
        </>
    )
}
