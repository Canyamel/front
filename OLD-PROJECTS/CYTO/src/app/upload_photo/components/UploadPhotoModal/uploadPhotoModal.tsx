"use client";

import "./uploadPhotoModal.css";
import { useState } from "react";
import { message, Upload, Flex, Modal, Progress } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import Text from "@/components/Universal/Text/Text";
import Spacer from "@/components/Universal/Spacer/Spacer";
import Button from "@/components/Universal/Button/Button";
import type { UploadProps } from "antd";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../stores/store";
import { handleOk, handleCancel } from "../../../../stores/uploadPhotoSlice";
import { useCreateCytologyMutation } from "../../../../service/cytology";
import { useRTKEffects } from "../../../../service/hook";

const { Dragger } = Upload;

const CHUNK_SIZE = 20 * 1024 * 1024;

export default function UploadPhotoModal() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { open, idCard, marking, number, localization, calcitonin, thyroglobulin, calcInSense } =
        useSelector((state: RootState) => state.uploadPhoto);

    const [isFileImg, setIsFileImg] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const [createCytology, { isLoading: isCreateCytologyLoading, error: isCreateCytologyError }] =
        useCreateCytologyMutation();
    useRTKEffects(
        { isLoading: isCreateCytologyLoading, error: isCreateCytologyError },
        "Create cytology"
    );

    const uploadFileInChunks = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            const fileId = `${file.name}-${file.size}-${Date.now()}`;

            const sessionResponse = await fetch("/api/upload/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fileName: file.name,
                    fileSize: file.size,
                    totalChunks,
                    chunkSize: CHUNK_SIZE,
                    fileId,
                }),
            });

            if (!sessionResponse.ok) {
                throw new Error("Не удалось начать сессию загрузки");
            }

            const sessionData = await sessionResponse.json();

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                const chunkFormData = new FormData();
                chunkFormData.append("file", chunk);
                chunkFormData.append("chunkIndex", chunkIndex.toString());
                chunkFormData.append("totalChunks", totalChunks.toString());
                chunkFormData.append("fileId", fileId);
                chunkFormData.append("fileName", file.name);
                chunkFormData.append("uploadId", sessionData.uploadId);

                const response = await fetch("/api/upload/chunk", {
                    method: "POST",
                    body: chunkFormData,
                });

                if (!response.ok) {
                    throw new Error(`Ошибка загрузки чанка ${chunkIndex}`);
                }

                const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                setUploadProgress(progress);
            }

            const completeResponse = await fetch("/api/upload/complete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fileId,
                    fileName: file.name,
                    uploadId: sessionData.uploadId,
                }),
            });

            if (!completeResponse.ok) {
                throw new Error("Не удалось завершить загрузку");
            }

            const completeData = await completeResponse.json();
            return completeData;
        } catch (error) {
            console.error("Upload error:", error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateCytology = async () => {
        if (isFileImg) {
            try {
                const uploadResult = await uploadFileInChunks(isFileImg);

                const formData = new FormData();

                formData.append("image", isFileImg);

                formData.append("diagnostic_marking", marking);
                formData.append("diagnostic_number", number.toString());
                formData.append("material_type", localization);
                formData.append("calcitonin", calcitonin);
                formData.append("thyroglobulin", thyroglobulin);
                formData.append("calcitonin_in_flush", calcInSense);
                formData.append("patient_card", String(idCard));

                const { image_id } = await createCytology({ payload: formData }).unwrap();

                dispatch(handleOk());
                router.push(`/diagnostic_is_running/${image_id}`);
            } catch (error) {
                console.error("Upload failed:", error);
                message.error("Ошибка загрузки файла");
            }
        }
    };

    const propsDragger: UploadProps = {
        name: "file",
        multiple: false,
        accept: ".svs",
        beforeUpload: (file) => {
            const maxSize = 10 * 1024 * 1024 * 1024;
            if (file.size > maxSize) {
                message.error("Файл должен быть меньше 10GB");
                return Upload.LIST_IGNORE;
            }

            setIsFileImg(file);
            return false;
        },
        onRemove: () => {
            setIsFileImg(null);
            setUploadProgress(0);
            message.success("Файл удален");
        },
        showUploadList: true,
        fileList: isFileImg
            ? [
                  {
                      uid: "1",
                      name: isFileImg.name,
                      size: isFileImg.size,
                      type: isFileImg.type,
                  },
              ]
            : [],
    };

    return (
        <Modal
            className="upload-photo-modal"
            title={<div className="title">Загрузка снимка</div>}
            footer={null}
            open={open}
            onCancel={() => dispatch(handleCancel())}
            width={600}
        >
            <Flex vertical>
                <Spacer space={10} />
                <Text className="description">
                    Для начала диагностики загрузите интересующий
                    <br />
                    снимок цитологии
                </Text>

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
                    <p className="ant-upload-hint">Выберите файл в формате .svs (до 10GB)</p>
                </Dragger>

                {isUploading && (
                    <>
                        <Spacer space={20} />
                        <Progress percent={uploadProgress} status="active" />
                        <Text className="upload-progress">Загрузка: {uploadProgress}%</Text>
                    </>
                )}

                {isFileImg && !isUploading && (
                    <>
                        <Spacer space={10} />
                        <Text className="file-info">
                            Выбран файл: {isFileImg.name} (
                            {(isFileImg.size / 1024 / 1024 / 1024).toFixed(2)} GB)
                        </Text>
                    </>
                )}

                <Spacer space={30} />
                <Flex className="modal-buttons" gap={20} justify="end">
                    <Button
                        onClick={() => dispatch(handleCancel())}
                        title="Отменить"
                        type="default"
                        className="button button-cancel"
                        block={false}
                        disabled={isUploading}
                    />
                    <Button
                        disabled={!isFileImg || isUploading}
                        onClick={handleCreateCytology}
                        title={isUploading ? "Загрузка..." : "Начать диагностику"}
                        type="primary"
                        className="button button-ok"
                        block={false}
                    />
                </Flex>
            </Flex>
        </Modal>
    );
}
