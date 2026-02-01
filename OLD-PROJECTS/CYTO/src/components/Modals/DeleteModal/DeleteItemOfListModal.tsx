import "./DeleteItemOfListModal.css";
import Spacer from "@/components/Universal/Spacer/Spacer";
import Text from "@/components/Universal/Text/Text";
import Button from "@/components/Universal/Button/Button";
import { Modal, Form, Checkbox, Flex, ConfigProvider } from "antd";
import React, { Dispatch, useCallback, useMemo, useState } from "react";
import { useDeletePatientMutation } from "../../../service/medWorkerAndPatient";
import { useRTKEffects } from "../../../service/hook";

const { Item } = Form;

interface BaseItemDataType {
    id: React.Key;
}

interface useDeleteItemOfListModalProps<ItemDataType extends BaseItemDataType> {
    dataSource: ItemDataType[];
    setDataSource: Dispatch<ItemDataType[]>;
    title: string;
    checkBoxText: string;
    itemType: string;
}

export function useDeleteItemOfListModal<ItemDataType extends BaseItemDataType>({
    dataSource,
    setDataSource,
    title,
    checkBoxText,
    itemType,
}: useDeleteItemOfListModalProps<ItemDataType>) {
    const [confirmationText, setConfirmationText] = useState<string>();

    const [deletingItemId, setDeletingItemId] = useState<React.Key>();

    const [isModalOpenDeleteItem, setIsModalOpenDeleteItem] = useState<boolean>();

    const [deletePatient, { isLoading: isDeletingPatient, error: errorDeletePatient }] =
        useDeletePatientMutation();
    useRTKEffects({ isLoading: isDeletingPatient, error: errorDeletePatient }, "ADD_NODE");

    const showModalDeleteItem = useCallback(() => {
        setIsModalOpenDeleteItem(true);
    }, [setIsModalOpenDeleteItem]);

    const handleOkDeleteItem = useCallback(() => {
        setIsModalOpenDeleteItem(false);
    }, [setIsModalOpenDeleteItem]);

    const handleCancelDeleteItem = useCallback(() => {
        setIsModalOpenDeleteItem(false);
    }, [setIsModalOpenDeleteItem]);

    const ModalFinishDeleteItem = useCallback(() => {
        if (itemType === "patient" && deletingItemId != undefined) {
            deletePatient(deletingItemId.toString());
        }
        //setDataSource(dataSource.filter(({ key }) => key != deletingItemId));
        handleOkDeleteItem();
    }, [dataSource, deletingItemId, handleOkDeleteItem, setDataSource]);

    function DeleteItemOfListModal() {
        const [form] = Form.useForm();

        const { checked } = Form.useWatch(({ checked }) => ({ checked }), form) ?? {
            checked: true,
        };

        return (
            <ConfigProvider
                theme={{
                    components: {
                        Button: {
                            colorPrimary: "#d9363e",
                            colorPrimaryActive: "#ff4d4f",
                            colorPrimaryHover: "#ff4d4f",
                            defaultActiveBorderColor: "#d9d9d9",
                            defaultActiveColor: "black",
                            defaultHoverBorderColor: "#d9d9d9",
                            defaultHoverColor: "black",
                        },
                        Checkbox: {
                            colorPrimary: "#d9363e",
                            colorPrimaryActive: "#ff4d4f",
                            colorPrimaryHover: "#ff4d4f",
                        },
                    },
                }}
            >
                <Modal
                    title={title}
                    open={isModalOpenDeleteItem}
                    onCancel={handleCancelDeleteItem}
                    footer={null}
                    width={600}
                    destroyOnClose={true}
                >
                    <Spacer space={15} />
                    <Form onFinish={ModalFinishDeleteItem} form={form}>
                        <Flex className="modal-form" vertical>
                            <Spacer space={15} />
                            <Text>{confirmationText}</Text>

                            <Spacer space={15} />
                            <Item
                                layout="vertical"
                                rules={[
                                    {
                                        required: true,
                                        message: "Подтвердите свое действие",
                                        validator: (rule: any, value: boolean) =>
                                            !value
                                                ? Promise.reject(
                                                      new Error("Подтвердите свое действие")
                                                  )
                                                : Promise.resolve(),
                                    },
                                ]}
                                name="checked"
                                valuePropName="checked"
                            >
                                <Checkbox style={{ fontWeight: 600 }}>{checkBoxText}</Checkbox>
                            </Item>
                            <Spacer space={65} />
                        </Flex>

                        <Spacer space={15} />
                        <Flex className="modal-buttons" gap={10} justify="end">
                            <Button
                                onClick={handleCancelDeleteItem}
                                title="Отменить"
                                type="default"
                                className="button"
                                block={false}
                            />
                            <Button
                                className="delete-button"
                                title="Удалить"
                                htmlType="submit"
                                type="primary"
                                block={false}
                                disabled={!checked}
                            />
                        </Flex>
                    </Form>
                </Modal>
            </ConfigProvider>
        );
    }

    return {
        DeleteItemOfListModal: DeleteItemOfListModal,
        setDeletingItemId: setDeletingItemId,
        deletingItemId: deletingItemId,
        showModalDeleteItem: showModalDeleteItem,
        setConfirmationText: setConfirmationText,
    };
}
