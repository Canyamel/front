"use client";
import type React from "react";
import { useState, type ReactNode } from "react";
import { Modal } from "antd";

import { ModalContext } from "@/contexts";
import { IModalConfig } from "@/contexts/ModalContext";

import "./ModalWrapper.css";

interface ModalWrapperProps {
    children: ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ children }) => {
    const [opened, setOpened] = useState<boolean>(false);
    const [config, setConfig] = useState<IModalConfig | undefined>(undefined);

    const open = (config: IModalConfig) => {
        setOpened(true);
        setConfig(config);
    };

    const close = () => {
        setOpened(false);
        setConfig(undefined);
    };

    const changeModalProps = (props: IModalConfig["props"]) => {
        setConfig((prev) => (prev ? { ...prev, props } : undefined));
    };

    return (
        <ModalContext.Provider value={{ open, close, changeModalProps }}>
            {children}
            <Modal
                open={opened}
                {...config?.props}
                onCancel={close}
                destroyOnClose
                className="modal-container"
            >
                {config?.content}
            </Modal>
        </ModalContext.Provider>
    );
};

export default ModalWrapper;
