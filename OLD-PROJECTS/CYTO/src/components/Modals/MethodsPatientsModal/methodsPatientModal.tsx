"use client";

import "./methodsPatientModal.css";
import Spacer from "@/components/Universal/Spacer/Spacer";
import Button from "@/components/Universal/Button/Button";
import TextField from "@/components/Universal/TextField/TextField";
import ConditionalRender from "@/components/Universal/ConditionalRender/ConditionalRender";
import { Modal, Flex, Form, Checkbox, DatePicker } from "antd";
import { useEffect, useMemo } from "react";
import ConfigProvider from "antd/es/config-provider";
import locale from "antd/locale/ru_RU";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../stores/store";
import { handleOk, handleCancel } from "../../../stores/methodsPatientModalSlice";
import {
    useAddPatientMutation,
    useEditPatientMutation,
} from "../../../service/medWorkerAndPatient";
import { useRTKEffects } from "../../../service/hook";
import isHaveEmailErrors from "@/utils/isHaveEmailErrors";
import dayjs from "dayjs";

const { useForm, useWatch, Item } = Form;

function formatPolicy(str: string) {
    return str.replace(/(.{4})/g, "$1 ");
}

function splitFIO(fullName: string) {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length != 3) throw new Error("The full name must consist of three parts");
    return [parts[0], parts[1], parts[2]];
}

export default function MethodsPatientModal({}) {
    const [form] = useForm();
    const dispatch = useDispatch();
    const { open, method, patient } = useSelector((state: RootState) => state.methodPatientCard);

    const watchedValues = useWatch([], form);
    const isValidForm =
        watchedValues?.lastName &&
        watchedValues?.firstName &&
        watchedValues?.fathersName &&
        watchedValues?.personalPolicy &&
        watchedValues?.email &&
        watchedValues?.birthDate;

    const isErrorEmail = useMemo(() => {
        //console.log(isHaveEmailErrors(watchedValues?.email));
        return isHaveEmailErrors(watchedValues?.email);
    }, [watchedValues?.email]);

    const changeField = (field: string, value: any) => {
        form.setFieldsValue({ [field]: value });
    };
    useEffect(() => {
        if (method === "create") {
            changeField("lastName", "");
            changeField("firstName", "");
            changeField("fathersName", "");
            changeField("personalPolicy", "");
            changeField("email", "");
            changeField("birthDate", "");
            changeField("diagnosis", "");
            changeField("isActive", false);
        } else if (method === "update") {
            if (patient?.fullName != undefined) {
                const [lastName, firstName, fathersName] = splitFIO(patient.fullName);
                changeField("lastName", lastName);
                changeField("firstName", firstName);
                changeField("fathersName", fathersName);
            }
            changeField("personalPolicy", formatPolicy(patient.personalPolicy));
            changeField("email", patient.email);
            changeField("birthDate", patient.birthDate ? dayjs(patient.birthDate) : null);
            changeField("diagnosis", patient.diagnosis ? patient.diagnosis : "");
            changeField("isActive", patient.isActive ? true : false);
        }
    }, [open]);

    const [addPatient, { isLoading: isAddPatient, error: errorAddPatient }] =
        useAddPatientMutation();
    const [editPatient, { isLoading: isEditPatient, error: errorEditPatient }] =
        useEditPatientMutation();

    useRTKEffects({ isLoading: isAddPatient, error: errorAddPatient }, "Add patient");
    useRTKEffects({ isLoading: isEditPatient, error: errorEditPatient }, "Edit patient");

    const handleAddPatient = () => {
        const payload = {
            patient: {
                first_name: watchedValues?.firstName,
                last_name: watchedValues?.lastName,
                fathers_name: watchedValues?.fathersName,
                personal_policy: watchedValues?.personalPolicy?.replace(/\s+/g, "") ?? "",
                email: watchedValues?.email,
                ...(watchedValues?.isActive && { is_active: true }),
                birth_date: watchedValues?.birthDate?.toISOString().split("T")[0],
            },
            card: {
                diagnosis: watchedValues?.diagnosis,
            },
        };

        addPatient({
            id: String(localStorage.getItem("id")),
            payload,
        });
        dispatch(handleOk());
    };

    const handleEditPatient = () => {
        const payload = {
            patient: {
                first_name: watchedValues?.firstName,
                last_name: watchedValues?.lastName,
                fathers_name: watchedValues?.fathersName,
                personal_policy: watchedValues?.personalPolicy?.replace(/\s+/g, "") ?? "",
                email: watchedValues?.email,
                ...(watchedValues?.isActive && { is_active: true }),
                birth_date: watchedValues?.birthDate?.toISOString().split("T")[0],
            },
            card: {
                diagnosis: watchedValues?.diagnosis,
            },
        };

        editPatient({
            id: patient.idCard,
            payload,
        });
        dispatch(handleOk());
    };

    const title = method === "create" ? "Создание карты" : "Редактирование карты";

    return (
        <>
            <Modal
                title={title}
                open={open}
                onCancel={() => dispatch(handleCancel())}
                footer={null}
                width={600}
                destroyOnClose={true}
            >
                <Form form={form} layout="vertical" style={{ fontWeight: 600 }}>
                    <Flex className="modal-form" vertical>
                        <Spacer space={30} />
                        <TextField
                            errorText="Введите фамилию пациента"
                            name="lastName"
                            label="Фамилия"
                            required
                        />

                        <Spacer space={15} />
                        <TextField
                            errorText="Введите имя пациента"
                            name="firstName"
                            label="Имя"
                            required
                        />

                        <Spacer space={15} />
                        <TextField
                            errorText="Введите отчество пациента"
                            name="fathersName"
                            label="Отчество"
                            required
                        />

                        <Spacer space={15} />
                        <TextField
                            errorText="Введите полис пациента"
                            name="personalPolicy"
                            label="Полис ОМС"
                            onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "");
                                let formatted = "";
                                if (value.length > 16) {
                                    value = value.slice(0, 16);
                                }
                                for (let i = 0; i < value.length; i++) {
                                    if (i > 0 && i % 4 === 0) {
                                        formatted += " ";
                                    }
                                    formatted += value[i];
                                }
                                form.setFieldsValue({ personalPolicy: formatted });
                            }}
                            required
                        />

                        <Spacer space={15} />
                        <TextField
                            errorText="Введите почту пациента"
                            name="email"
                            label="Электронная почта"
                            isError={isErrorEmail}
                            required
                        />

                        <Spacer space={10} />
                        <ConfigProvider locale={locale}>
                            <Item name="birthDate" label="Дата рождения пациента" required>
                                <DatePicker
                                    style={{ width: "100%" }}
                                    size="large"
                                    format="DD.MM.YYYY"
                                />
                            </Item>
                        </ConfigProvider>

                        <TextField
                            errorText="Введите диагноз пациента"
                            name="diagnosis"
                            label="Диагноз"
                            required={false}
                        />

                        <Spacer space={20} />
                        <Item name="isActive" label={null} valuePropName="checked">
                            <Checkbox>Активен</Checkbox>
                        </Item>
                        <Spacer space={15} />
                    </Flex>

                    <Spacer space={25} />
                    <Flex className="modal-buttons" gap={10} justify="end">
                        <Button
                            onClick={() => dispatch(handleCancel())}
                            title="Отменить"
                            type="default"
                            className="button"
                            block={false}
                        />

                        <ConditionalRender condition={method === "create"}>
                            <Button
                                onClick={() => handleAddPatient()}
                                title="Начать"
                                type="primary"
                                disabled={!isValidForm}
                                block={false}
                            />
                        </ConditionalRender>

                        <ConditionalRender condition={method === "update"}>
                            <Button
                                onClick={() => handleEditPatient()}
                                title="Начать"
                                type="primary"
                                disabled={!isValidForm}
                                block={false}
                            />
                        </ConditionalRender>
                    </Flex>
                </Form>
            </Modal>
        </>
    );
}
