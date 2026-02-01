import './DiagnosticDrawer.css'
import Button from '@/components/Universal/Button/Button'
import { Flex, Drawer } from 'antd'
import dayjs from 'dayjs'

interface DiagnosticDrawerProps {
    DrawerFinish: () => void
    isDrawerOpen: boolean
    handleCancel: () => void
}

export default function DiagnosticDrawer({
    DrawerFinish,
    isDrawerOpen,
    handleCancel,
}: DiagnosticDrawerProps) {
    const yearDiagnostics = [
        {
            year: 2024,
            diagnostics: [
                {
                    date: dayjs(),
                    projectionType: 'продольная',
                    euTirads: 3,
                },
                {
                    date: dayjs(),
                    projectionType: 'продольная',
                    euTirads: 3,
                },
            ],
        },

        {
            year: 2023,
            diagnostics: [
                {
                    date: dayjs(),
                    projectionType: 'продольная',
                    euTirads: 3,
                },
                {
                    date: dayjs(),
                    projectionType: 'продольная',
                    euTirads: 3,
                },
            ],
        },
    ]

    return (
        <Drawer
            className="diagnostics_drawer"
            style={{ marginRight: '0' }}
            open={isDrawerOpen}
            onClose={handleCancel}
            title={
                <Flex gap={10}>
                    <p>Диагностики пациента</p>
                    <Button
                        size={'middle'}
                        onClick={handleCancel}
                        width={22}
                        title="Отмена"
                        type="default"
                        className="button"
                        block={false}
                    />
                    <Button
                        size={'middle'}
                        onClick={DrawerFinish}
                        width={20}
                        title="Ок"
                        htmlType="submit"
                        type="primary"
                        block={false}
                    />
                </Flex>
            }
            width={480}
            destroyOnClose={true}
        >
            <div>
                {yearDiagnostics.map(({ year, diagnostics }) => {
                    return (
                        <div className="yearDiagnostics">
                            <div className="year">{year} год</div>
                            {diagnostics.map(
                                ({ date, projectionType, euTirads }) => {
                                    return (
                                        <Flex
                                            className="diagnosticsBlock"
                                            vertical
                                            gap={10}
                                        >
                                            <div className="date">
                                                Дата:{' '}
                                                <span className="border">
                                                    {dayjs(date).format(
                                                        'DD.MM.YYYY'
                                                    )}
                                                </span>
                                            </div>
                                            <div className="projectionType">
                                                Тип проекции:{' '}
                                                <span className="border">
                                                    {projectionType}
                                                </span>
                                            </div>
                                            <div className="euTirads">
                                                EU-TIRADS:{' '}
                                                <span className="border">
                                                    {euTirads}
                                                </span>
                                            </div>
                                        </Flex>
                                    )
                                }
                            )}
                        </div>
                    )
                })}
            </div>
        </Drawer>
    )
}
