'use client'
import './dialogs.css'
import Page from '@/components/Page/Page'
import React, { useEffect, useState } from 'react'
import Flex from 'antd/es/flex'
import Input from 'antd/es/input'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { FilterTwoTone, SearchOutlined } from '@ant-design/icons'
import { DialogDataType } from '@/app/dialogs/Types'
import DialogBlock from '@/app/dialogs/components/dialogBlock/DialogBlock'
import { Pagination } from 'antd'

export default function DialogsPage() {
    dayjs.extend(customParseFormat)
    const [dataSource, setDataSource] = useState<DialogDataType[]>([])
    const [page, setPage] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(10)
    const [displayData, setDisplayData] = useState<DialogDataType[]>([])

    useEffect(() => {
        const mockDialogs: DialogDataType[] = []
        mockDialogs.push({
            id: 0,
            themeName: `Определение результатов диагностики ${0}`,
            themeDate: dayjs('10.01.2000', 'DD.MM.YYYY'),
            patientFullName: `Иванов Иван Иванович ${0}`,
            birthdayDate: dayjs('18.01.2000', 'DD.MM.YYYY'),
            experts: [
                'Иванов И.И. НМИЦ Эндокрионологии',
                'Иванов И.И. НМИЦ Эндокрионологии',
                'Иванов И.И. НМИЦ Эндокрионологии',
                'Иванов И.И. НМИЦ Эндокрионологии',
            ],
            isHaveNewMessage: false,
        })

        for (let i = 1; i <= 50; i++) {
            mockDialogs.push({
                id: i,
                themeName: `Определение результатов диагностики ${i}`,
                themeDate: dayjs('10.01.2000', 'DD.MM.YYYY'),
                patientFullName: `Иванов Иван Иванович ${i}`,
                birthdayDate: dayjs('18.01.2000', 'DD.MM.YYYY'),
                experts: ['Иванов И.И. НМИЦ Эндокрионологии'],
                isHaveNewMessage: true,
            })

            setDataSource(mockDialogs)
        }
    }, [setDataSource])

    useEffect(() => {
        const startIndex: number = page ? (page - 1) * (pageSize || 10) : 0
        const endIndex: number = startIndex + (pageSize || 10)
        setDisplayData(dataSource.slice(startIndex, endIndex))
    }, [dataSource, page, pageSize])

    return (
        <Page className="page dialogs_page">
            <Flex vertical gap={20}>
                <Flex justify="space-between" align="center">
                    <Input
                        style={{ marginRight: '30px' }}
                        prefix={<SearchOutlined />}
                        placeholder="Поиск по диалогам"
                    />
                    <Flex
                        justify="center"
                        align="center"
                        className="filter_box"
                    >
                        <FilterTwoTone
                            style={{ fontSize: '18px', cursor: 'pointer' }}
                        />
                    </Flex>
                </Flex>
                <Flex vertical gap={20}>
                    {displayData.map(
                        ({
                            id,
                            themeName,
                            themeDate,
                            patientFullName,
                            birthdayDate,
                            experts,
                            isHaveNewMessage,
                        }) => (
                            // eslint-disable-next-line react/jsx-key

                            <DialogBlock
                                key={id}
                                birthdayDate={birthdayDate}
                                experts={experts}
                                id={id}
                                isHaveNewMessage={isHaveNewMessage}
                                patientFullName={patientFullName}
                                themeDate={themeDate}
                                themeName={themeName}
                            />
                        )
                    )}
                </Flex>
            </Flex>
            <Flex>
                <Pagination
                    style={{ justifyContent: 'right' }}
                    total={dataSource.length}
                    defaultPageSize={10}
                    defaultCurrent={1}
                    onChange={(page, pageSize) => {
                        setPage(page)
                        setPageSize(pageSize)
                    }}
                />
            </Flex>
        </Page>
    )
}
