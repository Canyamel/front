import React from "react";
import type { ButtonProps } from "antd";
import { Modal, Button, Form } from "antd";

import { Modals } from "@/uzi_view/types/types";

import UziAddNode from "./UziNodes/UziNodes";
import UziEditEcho from "./UziEditEcho/UziEditEcho";

interface UziModalProps {
    setOpen: (newValue: Modals | null) => void;
    modalType: Modals | null;
}

interface ExtendedButtonProps extends Partial<ButtonProps> {
    key: string;
}

interface ModalConfig {
    [key: string]: {
        title: string;
        modalButtons: ExtendedButtonProps[];
    };
}

const UziModal: React.FC<UziModalProps> = ({ setOpen, modalType }) => {
    const [form] = Form.useForm();

    const closeModal = () => {
        form.resetFields();
        setOpen(null);
    };

    const submitForm = () => {
        form.validateFields().then(() => form.submit());
    };

    const modalConfigs: ModalConfig = {
        addNode: {
            title: "Добавление узла",
            modalButtons: [
                {
                    key: "Отменить",
                    onClick: closeModal,
                },
                {
                    key: "Добавить",
                    type: "primary",
                    onClick: submitForm,
                },
            ],
        },
        editNode: {
            title: "Редактирование узла",
            modalButtons: [
                {
                    key: "Отменить",
                    onClick: closeModal,
                },
                {
                    key: "Изменить",
                    type: "primary",
                    onClick: submitForm,
                },
            ],
        },
        editEcho: {
            title: "Результаты диагностики",
            modalButtons: [
                {
                    key: "Отменить",
                    onClick: closeModal,
                },
                {
                    key: "Изменить",
                    type: "primary",
                    onClick: submitForm,
                },
            ],
        },
        viewEcho: {
            title: "Эхографические признаки",
            modalButtons: [
                {
                    key: "Закрыть",
                    onClick: closeModal,
                },
            ],
        },
    };

    return (
        <>
            {modalType !== null && (
                <Modal
                    title={modalConfigs[modalType].title}
                    open={true}
                    footer={modalConfigs[modalType].modalButtons.map((item) => (
                        <Button {...item} key={item.key}>
                            {item.key}
                        </Button>
                    ))}
                    centered
                    onCancel={closeModal}
                >
                    {modalType === "addNode" && (
                        <UziAddNode
                            form={form}
                            closeModal={closeModal}
                        />
                    )}
                    {modalType === "editNode" && (
                        <UziAddNode
                            form={form}
                            closeModal={closeModal}
                            editMode
                        />
                    )}
                    {modalType === "editEcho" && (
                        <UziEditEcho form={form} closeModal={closeModal} />
                    )}
                    {modalType === "viewEcho" && (
                        <UziEditEcho form={form} closeModal={closeModal} readOnly />
                    )}
                </Modal>
            )}
        </>
    );
};

export default UziModal;
