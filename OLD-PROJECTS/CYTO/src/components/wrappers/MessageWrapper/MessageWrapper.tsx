"use client";
import { message } from "antd";
import { useEffect, useState, type ReactNode } from "react";

import { MessageContext } from "@/contexts";

interface MessageWrapperProps {
    children: ReactNode;
}

const MessageWrapper: React.FC<MessageWrapperProps> = ({ children }) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (error) {
            messageApi.error(error);
            setError(undefined);
        }
    }, [error, messageApi]);

    return (
        <MessageContext.Provider value={{ messageApi, setError }}>
            {contextHolder}
            {children}
        </MessageContext.Provider>
    );
};

export default MessageWrapper;
