"use client";

import "./uploadPhotoFormModal.css";
import { useState } from "react";
import { RootState } from "../../../../stores/store";
import { useSearchParams } from "next/navigation";
import { message, Flex, Form, Select, Input, Modal, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useRouter } from "next/navigation";
import Page from "@/components/Page/Page";
import Spacer from "@/components/Universal/Spacer/Spacer";
import Button from "@/components/Universal/Button/Button";
import { useDispatch, useSelector } from "react-redux";
import { handleCancel, handleOk } from "../../../../stores/uploadPhotoFormModalSlice";
import { useCreateCytologyMutation } from "../../../../service/cytology";
import { useRTKEffects } from "../../../../service/hook";
import { localizations, markings } from "../../../../types/constants";

const { Dragger } = Upload;
const { useWatch, useForm, Item } = Form;

export default function UploadPhotoFormModal() {
    const router = useRouter();
    const dispatch = useDispatch();
    const [form] = useForm();
    const params = useSearchParams();
    const { open } = useSelector((state: RootState) => state.uploadPhotoForm);

    const [isFileImg, setIsFileImg] = useState<File | null>(null);

    const [createCytology, { isLoading: isCreateCytologyLoading, error: isCreateCytologyError }] =
        useCreateCytologyMutation();
    useRTKEffects(
        { isLoading: isCreateCytologyLoading, error: isCreateCytologyError },
        "Create cytology"
    );

    const watchedValues = useWatch([], form);
    const isValidForm =
        watchedValues?.marking &&
        watchedValues?.number &&
        watchedValues?.localization &&
        watchedValues?.calcitonin &&
        watchedValues?.thyroglobulin &&
        watchedValues?.calcInSense &&
        isFileImg != null;

    const handleCreateCytology = async () => {
        if (isFileImg != null) {
            const formData = new FormData();
            formData.append("image", isFileImg);
            formData.append("diagnostic_marking", watchedValues?.marking);
            formData.append("diagnostic_number", watchedValues?.number.toString());
            formData.append("material_type", watchedValues?.localization);
            formData.append("calcitonin", watchedValues?.calcitonin);
            formData.append("thyroglobulin", watchedValues?.thyroglobulin);
            formData.append("calcitonin_in_flush", watchedValues?.calcInSense);
            formData.append("patient_card", String(params.get("id")));
            createCytology({ payload: formData });
            dispatch(handleOk());
            router.push("/diagnostic_is_running");
        }
    };

    const propsDragger: UploadProps = {
        name: "file",
        multiple: false,
        accept: ".svs",
        onChange(info: any) {
            const { file } = info;
            const { status } = file;

            if (status === "done") {
                message.success(`${file.name} файла успешно загружен`);
                setIsFileImg(file.originFileObj);
            } else if (status === "error") {
                message.error(`${file.name} не удалось загрузить файл`);
                setIsFileImg(null);
            } else if (status === "removed") {
                message.success(`${file.name} файл успешно удалён`);
                setIsFileImg(null);
            }
        },
        onDrop(e: any) {
            console.log("Dropped files", e.dataTransfer.files);
        },
    };

    return (
        <Modal
            className="upload-photo-modal"
            title="Загрузка снимка"
            footer={null}
            open={open}
            onCancel={() => dispatch(handleCancel())}
        >
            <Flex justify="center">
                <Flex vertical className="flex">
                    <Spacer space={10} />
                    <Dragger {...propsDragger} className="download-area" maxCount={1}>
                        <Spacer space={20} />
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>

                        <Spacer space={20} />
                        <p className="ant-upload-text">
                            Нажмите или перетащите файл в эту область для загрузки
                        </p>

                        <Spacer space={10} />
                        <p className="ant-upload-hint">Выберите файл в формате .svs</p>
                    </Dragger>

                    <Form form={form} style={{ fontWeight: 600 }}>
                        <Spacer space={20} />
                        <Item
                            label="Доп. маркировка"
                            layout="vertical"
                            name="marking"
                            required={true}
                        >
                            <Select
                                options={Object.entries(markings).map(([key, value]) => {
                                    return {
                                        label: value,
                                        value: key,
                                    };
                                })}
                                placeholder="Доп. маркировка"
                                size="large"
                            />
                        </Item>

                        <Spacer space={35} />
                        <Item
                            label="Номер исследования"
                            layout="vertical"
                            name="number"
                            required={true}
                        >
                            <Input size="large" placeholder="Номер исследования" />
                        </Item>

                        <Spacer space={35} />
                        <Item
                            label="Локализация"
                            layout="vertical"
                            name="localization"
                            required={true}
                        >
                            <Select
                                options={Object.entries(localizations).map(([key, value]) => {
                                    return {
                                        label: value,
                                        value: key,
                                    };
                                })}
                                placeholder="Локализация"
                                size="large"
                            />
                        </Item>

                        <Spacer space={35} />
                        <Item
                            label="Кальцитонин"
                            layout="vertical"
                            name="calcitonin"
                            required={true}
                        >
                            <Input size="large" placeholder="Кальцитонин" />
                        </Item>

                        <Spacer space={35} />
                        <Item
                            label="Тиреоглобулин в смыве"
                            layout="vertical"
                            name="thyroglobulin"
                            required={true}
                        >
                            <Input size="large" placeholder="Тиреоглобулин в смыве" />
                        </Item>

                        <Spacer space={35} />
                        <Item
                            label="Кальцитонин в смыве"
                            layout="vertical"
                            name="calcInSense"
                            required={true}
                        >
                            <Input size="large" placeholder="Кальцитонин в смыве" />
                        </Item>
                    </Form>

                    <Spacer space={50} />
                    <Flex gap={10} justify="end">
                        <Button
                            onClick={() => dispatch(handleCancel())}
                            title="Отменить"
                            type="default"
                            className="button button-cancel"
                            block={false}
                        />
                        <Button
                            disabled={!isValidForm}
                            onClick={() => handleCreateCytology()}
                            title="Начать диагностику"
                            type="primary"
                            className="button button-ok"
                            block={false}
                        />
                    </Flex>
                </Flex>
            </Flex>
        </Modal>
    );
}
