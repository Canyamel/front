'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { notification } from 'antd'
import type { NotificationArgsProps } from 'antd'
import { isNil } from 'lodash-es'
export const ApiContext = React.createContext<any>({ duration: 3 })

export const NotificationProvider = ({ children, context, error }: any) => {
    const [api, contextHolder] = notification.useNotification({ duration: 3 })
    const [providerApi, setProviderApi] = useState<any>({ duration: 3 })

    useEffect(() => {
        if (!isNil(api)) {
            setProviderApi(api)
        }
        console.log('use effect api: ', api)
    }, [api, setProviderApi])

    const openNotification = ({ error }: any) => {
        api.info({
            message: `Notification`,
            description: (
                <ApiContext.Consumer>
                    {({ error }) => `Error, ${error}!`}
                </ApiContext.Consumer>
            ),
            placement: 'top',
            duration: 5,
        })
    }
    // const contextValue = useMemo(()=>({error: error}),[])

    return (
        <ApiContext.Provider value={providerApi}>
            {children}
            {contextHolder}
        </ApiContext.Provider>
    )
}
