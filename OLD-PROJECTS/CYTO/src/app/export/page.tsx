"use client";

import "./export.css";
import { useEffect, useState } from "react";
import { Flex, Form, Select, Space, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import Page from "@/components/Page/Page";
import Text from "@/components/Universal/Text/Text";
import Spacer from "@/components/Universal/Spacer/Spacer";
import Button from "@/components/Universal/Button/Button";
import { useDispatch } from "react-redux";
import { useGetMedWorkerQuery, useGetShotsQuery } from "../../service/medWorkerAndPatient";
import { useRTKEffects } from "../../service/hook";
import { IPatient } from "../../types/patient";
import { IShot } from "../../types/shot";
import { useAppSelector } from "@/stores/hook";
import { setToken } from "../../stores/authSlice";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { skipToken } from "@reduxjs/toolkit/query";
import dayjs from "dayjs";
import { localizations } from "../../types/constants";

const { useWatch, useForm, Item } = Form;

function formatPolicy(str: string) {
    return str.replace(/(.{4})/g, "$1 ");
}

function typeRendering(types: any, clas: number) {
    if (clas === 0) {
        let max = 0;
        let max_index = 0;
        let index = 0;
        for (const item of types) {
            if (item > max) {
                max = item;
                max_index = index;
            }
            index += 1;
        }
        return max_index === 0
            ? "Bethesda I"
            : max_index === 1
            ? "Bethesda II"
            : max_index === 2
            ? "Bethesda III"
            : max_index === 3
            ? "Bethesda IV"
            : max_index === 4
            ? "Bethesda V"
            : "Bethesda VI";
    } else {
        let max = 0;
        let max_index = 0;
        let index = 0;
        for (const item of types) {
            if (item > max) {
                max = item;
                max_index = index + 1;
            } else {
                continue;
            }
            index += 1;
        }
        return max_index === 0
            ? "Неинформативно"
            : max_index === 1
            ? "Отсутствие метастаза"
            : "Метастаз";
    }
}

function createShotsData(
    id: number,
    number: string,
    cytologyDate: any,
    materialType: unknown,
    bethesda: any,
    punkt: string,
    clas: number
): IShot {
    return {
        id: id,
        number: number,
        cytologyDate: cytologyDate,
        materialType: localizations[String(materialType) as keyof typeof localizations],
        bethesda: typeRendering(bethesda, clas).toString(),
        punkt: punkt.toString(),
    };
}

export default function Export() {
    const dispatch = useDispatch();
    const [form] = useForm();
    const [isPatientData, setIsPatientData] = useState<IPatient[]>([]);
    const [isShotsData, setIsShotsData] = useState<IShot[]>([]);
    const accessToken = useAppSelector((state) => state.auth.accessToken);

    const { data }: { data: (Session & { accessToken?: string }) | null } = useSession();
    useEffect(() => {
        dispatch(setToken(data?.accessToken));
    }, [data]);

    const {
        isLoading: isMedWorkerLoading,
        data: medWorkerData,
        error: errorMedWorker,
    } = useGetMedWorkerQuery(accessToken ? String(localStorage.getItem("id")) : skipToken);
    useRTKEffects({ isLoading: isMedWorkerLoading, error: errorMedWorker }, "Get medworker");

    const selectedPatientId = useWatch("patientId", form);
    const {
        data: shotsData,
        isLoading: isShotsLoading,
        error: errorShots,
    } = useGetShotsQuery(accessToken && selectedPatientId ? String(selectedPatientId) : skipToken);
    useRTKEffects({ isLoading: isShotsLoading, error: errorShots }, "Get shots");

    useEffect(() => {
        if (medWorkerData) {
            const patients: IPatient[] = medWorkerData.results.cards.map((item: any) => ({
                idCard: item.id,
                id: item.patient.id,
                fullName:
                    item.patient.first_name +
                    " " +
                    item.patient.last_name +
                    " " +
                    item.patient.fathers_name,
                birthDate: item.patient.birth_date,
                diagnosis: item.diagnosis,
                email: item.patient.email,
                personalPolicy: item.patient.personal_policy,
                isActive: item.patient.is_active,
            }));
            setIsPatientData(patients);
        }
    }, [medWorkerData]);

    useEffect(() => {
        if (shotsData && selectedPatientId) {
            const tmpAr = [];
            for (const cur of shotsData.results.shots) {
                if (cur.id !== null) {
                    tmpAr.push(
                        createShotsData(
                            cur.id,
                            cur.diagnostic_marking + "-" + cur.diagnostic_number,
                            new Date(Date.parse(cur.diagnos_date)),
                            cur.material_type,
                            cur.details.probs,
                            "",
                            cur.diagnostic_marking[0] === "П" ? 0 : 1
                        )
                    );
                }
            }
            setIsShotsData(tmpAr);
        } else {
            setIsShotsData([]);
        }
    }, [shotsData, selectedPatientId]);

    const watchedValues = useWatch(["patientId", "shots"], form);
    const isValidForm = watchedValues?.patientId && watchedValues?.shots && watchedValues?.shots.length > 0;

    const handleExport = () => {
        if (!isValidForm) {
            message.warning("Пожалуйста, выберите пациента и хотя бы один снимок");
            return;
        }

        const selectedPatient = isPatientData.find((p) => p.idCard === watchedValues.patientId);
        const selectedShots = isShotsData.filter((shot) =>
            watchedValues.shots.includes(shot.id)
        );

        // Заглушка для экспорта в CSV
        const csvData = [
            // Заголовки
            [
                "ФИО",
                "Дата рождения",
                "Полис",
                "Email",
                "Диагноз",
                "Номер исследования",
                "Дата забора",
                "Локализация",
                "Категория",
            ],
            // Данные
            ...selectedShots.map((shot) => [
                selectedPatient?.fullName || "",
                selectedPatient?.birthDate
                    ? dayjs(selectedPatient.birthDate).format("DD.MM.YYYY")
                    : "",
                selectedPatient?.personalPolicy
                    ? formatPolicy(selectedPatient.personalPolicy)
                    : "",
                selectedPatient?.email || "",
                selectedPatient?.diagnosis || "",
                shot.number || "",
                dayjs(shot.cytologyDate).format("DD.MM.YYYY"),
                shot.materialType || "",
                shot.bethesda || "",
            ]),
        ];

        // Конвертация в CSV строку
        const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

        // Создание и скачивание файла
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `export_${selectedPatient?.fullName || "patient"}_${dayjs().format("YYYY-MM-DD")}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        message.success("Экспорт выполнен успешно!");
    };

    return (
        <Page className="page export-page">
            <Text className="title">Экспорт данных</Text>
            <Spacer space={30} />

            <Flex justify="center">
                <Flex vertical className="export-form" style={{ width: "100%", maxWidth: 600 }}>
                    <Form form={form} layout="vertical" style={{ fontWeight: 600 }}>
                        <Item
                            label="Пациент"
                            name="patientId"
                            rules={[{ required: true, message: "Пожалуйста, выберите пациента" }]}
                        >
                            <Select
                                size="large"
                                placeholder="Выберите пациента"
                                options={
                                    Array.isArray(isPatientData)
                                        ? isPatientData.map((patient) => ({
                                              value: patient.idCard,
                                              label: patient.fullName,
                                              policy: patient.personalPolicy,
                                          }))
                                        : []
                                }
                                optionRender={(option) => (
                                    <Space>
                                        <div>{option.label}</div>
                                        <div style={{ color: "#999" }}>
                                            {formatPolicy(option.data.policy)}
                                        </div>
                                    </Space>
                                )}
                                loading={isMedWorkerLoading}
                                onChange={() => {
                                    form.setFieldsValue({ shots: undefined });
                                }}
                            />
                        </Item>

                        <Spacer space={20} />

                        <Item
                            label="Снимки"
                            name="shots"
                            rules={[
                                {
                                    required: true,
                                    message: "Пожалуйста, выберите хотя бы один снимок",
                                },
                            ]}
                        >
                            <Select
                                size="large"
                                mode="multiple"
                                placeholder={
                                    selectedPatientId
                                        ? "Выберите снимки для экспорта"
                                        : "Сначала выберите пациента"
                                }
                                disabled={!selectedPatientId}
                                options={
                                    Array.isArray(isShotsData)
                                        ? isShotsData.map((shot) => ({
                                              value: shot.id,
                                              label: `${shot.number} - ${dayjs(shot.cytologyDate).format("DD.MM.YYYY")}`,
                                          }))
                                        : []
                                }
                                loading={isShotsLoading}
                            />
                        </Item>

                        <Spacer space={30} />

                        <Button
                            size="large"
                            onClick={handleExport}
                            disabled={!isValidForm}
                            title={
                                <>
                                    <DownloadOutlined /> Экспортировать в CSV
                                </>
                            }
                        />
                    </Form>
                </Flex>
            </Flex>
        </Page>
    );
}

