import type { Metadata } from 'next'
import '../styles/reset.css'
import '../styles/global.css'
import React from 'react'
import Header from '@/components/Header/Header'
import Footer from '@/components/Footer/Footer'

export const metadata: Metadata = {
    title: 'Виртуальный ассистент',
    description: 'Умный помощник врача',
}

import AuthProvider from '@/utils/AuthProvider'
import { getServerSession } from 'next-auth'
import AntDesignProvider from '@/utils/AntDesignProvider'
import ReactQueryProvider from '@/utils/ReactQueryProvider'
import { NotificationProvider } from '@/utils/NotificationProvider'

export default async function RootLayout({
    children,
}: React.PropsWithChildren) {
    const session = await getServerSession()
    console.log('session сервер', session)

    return (
        <html lang="ru">
            <body>
                <AuthProvider session={session}>
                    <AntDesignProvider>
                        <NotificationProvider>
                            <ReactQueryProvider>
                                <Header />
                                {children}
                                <Footer />
                            </ReactQueryProvider>
                        </NotificationProvider>
                    </AntDesignProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
