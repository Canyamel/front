"use client";

import "./editDoctorModal.css";
import Spacer from "@/components/Universal/Spacer/Spacer";
import Button from "@/components/Universal/Button/Button";
import TextField from "@/components/Universal/TextField/TextField";
import { Modal, Form, Flex, Input, Checkbox } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../stores/store";
import { handleOk, handleCancel } from "../../../../stores/editMedWorkerModalSlice";
import { useEditMedWorkerMutation } from "../../../../service/medWorkerAndPatient";
import { useRTKEffects } from "../../../../service/hook";

const { useForm, useWatch, Item } = Form;
const { TextArea } = Input;

export default function EditDoctorModal() {
    const [form] = useForm();
    const dispatch = useDispatch();
    const { open, doctor } = useSelector((state: RootState) => state.editDoctor);

    const watchedValues = useWatch([], form);
    const isValidForm =
        watchedValues?.lastName && watchedValues?.firstName && watchedValues?.fathersName;

    const changeField = (field: string, value: any) => {
        form.setFieldsValue({ [field]: value });
    };
    useEffect(() => {
        changeField("lastName", doctor.lastName);
        changeField("firstName", doctor.firstName);
        changeField("fathersName", doctor.fathersName);
        changeField("medOrganization", doctor.medOrganization);
        changeField("job", doctor.job);
        changeField("expertDetails", doctor.expertDetails);
        changeField("isRemoteWorker", doctor.isRemoteWorker);
    }, [open]);

    const [editMedWorker, { isLoading: isEditMedWorker, error: errorEditMedWorker }] =
        useEditMedWorkerMutation();
    useRTKEffects({ isLoading: isEditMedWorker, error: errorEditMedWorker }, "Edit medworker");

    const handlePatchMedWorker = () => {
        if (
            doctor.lastName != watchedValues?.lastName ||
            doctor.firstName != watchedValues?.firstName ||
            doctor.fathersName != watchedValues?.fathersName ||
            doctor.expertDetails != watchedValues?.expertDetails ||
            doctor.job != watchedValues?.job ||
            doctor.medOrganization != watchedValues?.medOrganization ||
            doctor.isRemoteWorker != watchedValues?.isRemoteWorker
        ) {
            editMedWorker({
                id: String(localStorage.getItem("id")),
                payload: {
                    id: Number(localStorage.getItem("id")),
                    last_name: watchedValues?.lastName,
                    first_name: watchedValues?.firstName,
                    fathers_name: watchedValues?.fathersName,
                    med_organization: watchedValues?.medOrganization,
                    job: watchedValues?.job,
                    is_remote_worker: watchedValues?.isRemoteWorker,
                    expert_details: watchedValues?.expertDetails,
                },
            });
        }
        dispatch(handleOk());
    };

    return (
        <Modal
            title="Редактирование профиля врача"
            onCancel={() => dispatch(handleCancel())}
            open={open}
            footer={null}
            width={600}
        >
            <Form form={form} style={{ fontWeight: 600 }} layout="vertical">
                <Flex className="modal-form" style={{ fontSize: "30px" }} vertical>
                    <Spacer space={10} />
                    <TextField
                        errorText="Введите фамилию пациента"
                        name="lastName"
                        label="Фамилия"
                    />

                    <Spacer space={20} />
                    <TextField errorText="Введите имя пациента" name="firstName" label="Имя" />

                    <Spacer space={20} />
                    <TextField
                        errorText="Введите отчество пациента"
                        name="fathersName"
                        label="Отчество"
                    />

                    <Spacer space={20} />
                    <TextField
                        errorText="Введите место работы"
                        name="medOrganization"
                        label="Место работы"
                    />

                    <Spacer space={20} />
                    <TextField errorText="Введите должность" name="job" label="Должность" />

                    <Spacer space={20} />
                    <Item
                        name="expertDetails"
                        label="Опыт работы"
                        rules={[{ required: true, message: "Введите опыт работы" }]}
                        required={false}
                    >
                        <TextArea
                            style={{ fontSize: "16px" }}
                            size="middle"
                            disabled={!watchedValues?.isRemoteWorker}
                        />
                    </Item>

                    <Item name="isRemoteWorker" label={null} valuePropName="checked">
                        <Checkbox>Я хочу давать экспертное заключение</Checkbox>
                    </Item>
                </Flex>

                <Spacer space={15} />
                <Flex className="modal-buttons" gap={10} justify="end">
                    <Button
                        onClick={() => dispatch(handleCancel())}
                        title="Отменить"
                        type="default"
                        className="button"
                        block={false}
                    />
                    <Button
                        onClick={() => handlePatchMedWorker()}
                        title="Сохранить"
                        type="primary"
                        block={false}
                        disabled={!isValidForm}
                    />
                </Flex>
            </Form>
        </Modal>
    );
}
