'use client'
import Flex from 'antd/es/flex'
import Link from 'next/link'

export default function Error() {
    return (
        <Flex
            className="page page_upload_photo"
            justify="center"
            align="center"
            vertical
            gap={20}
        >
            <p>Возникла ошибка</p>
            <p>
                <Link href="/" replace>
                    Перейти на стартовую страницу
                </Link>
            </p>
        </Flex>
    )
}
