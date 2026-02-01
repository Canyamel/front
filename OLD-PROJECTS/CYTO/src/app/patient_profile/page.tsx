"use client";

import "./patient_profile.css";
import { useSearchParams } from "next/navigation";
//import { useDeleteItemOfListModal } from "@/components/Modals/DeleteModal/DeleteItemOfListModal";
import Page from "@/components/Page/Page";
import Text from "@/components/Universal/Text/Text";
import Spacer from "@/components/Universal/Spacer/Spacer";
import Button from "@/components/Universal/Button/Button";
import Flex from "antd/es/flex";
import Table from "antd/es/table";
import Link from "next/link";
import UploadPhotoFormModal from "./components/uploadPhotoFormModal/uploadPhotoFormModal";
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Dropdown, Space, Descriptions, Badge, Input, Empty } from "antd";
import type { DescriptionsProps } from "antd";
import { MoreOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import MethodsPatientModal from "@/components/Modals/MethodsPatientsModal/methodsPatientModal";
import { localizations } from "../../types/constants";
import { useDispatch } from "react-redux";
import { setToken } from "../../stores/authSlice";
import { useGetMedWorkerQuery, useGetShotsQuery } from "../../service/medWorkerAndPatient";
import { useRTKEffects } from "../../service/hook";
import { ICardReq } from "@/types/card";
import { IShot } from "@/types/shot";
import { IPatient } from "@/types/patient";
import { handleShow as handleShow_methodsPatientModalSlice } from "../../stores/methodsPatientModalSlice";
import { handleShow as handleShow_uploadPhotoFormModalSlice } from "../../stores/uploadPhotoFormModalSlice";
import { useAppSelector } from "@/stores/hook";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { skipToken } from "@reduxjs/toolkit/query";

const { Search } = Input;

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

export default function PatientProfile() {
    const dispatch = useDispatch();
    const params = useSearchParams();
    const accessToken = useAppSelector((state) => state.auth.accessToken);

    const { data }: { data: (Session & { accessToken?: string }) | null } = useSession();
    useEffect(() => {
        dispatch(setToken(data?.accessToken));
    }, [data]);

    const [isPatientData, setIsPatientData] = useState<IPatient>({
        idCard: "",
        id: 0,
        fullName: "",
        birthDate: "",
        diagnosis: "",
        email: "",
        personalPolicy: "",
        isActive: false,
    });
    const [isShotsData, setIsShotsData] = useState<IShot[]>([]);

    const {
        data: medWorkerData,
        isLoading: isMedWorkerLoading,
        error: errorMedWorker,
    } = useGetMedWorkerQuery(accessToken ? String(localStorage.getItem("id")) : skipToken);
    const {
        data: shotsData,
        isLoading: isShotsLoading,
        error: errorShots,
    } = useGetShotsQuery(accessToken ? String(params.get("id")) : skipToken);

    useRTKEffects({ isLoading: isMedWorkerLoading, error: errorMedWorker }, "Get medworker");
    useRTKEffects({ isLoading: isShotsLoading, error: errorShots }, "Get shots");

    useEffect(() => {
        if (medWorkerData && params.get("id") && shotsData) {
            const patientCard = medWorkerData.results.cards.find(
                (item: ICardReq) => String(item.id) == params.get("id")
            );
            if (patientCard) {
                const patient: any = {
                    idCard: patientCard.id.toString(),
                    id: patientCard.patient.id,
                    fullName:
                        patientCard.patient.last_name +
                        " " +
                        patientCard.patient.first_name +
                        " " +
                        patientCard.patient.fathers_name,
                    birthDate: patientCard.patient.birth_date,
                    diagnosis: patientCard.diagnosis,
                    email: patientCard.patient.email,
                    personalPolicy: patientCard.patient.personal_policy,
                    isActive: patientCard.patient.is_active,
                };
                setIsPatientData(patient);
            }

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
        }
    }, [medWorkerData, shotsData]);

    const [isSearchShots, setIsSearchShots] = useState<string>("");

    const filteredShotsData =
        isShotsData?.filter(
            (item: IShot) =>
                item.number?.toLowerCase().includes(isSearchShots.toLowerCase()) ||
                item.materialType?.toLowerCase().includes(isSearchShots.toLowerCase()) ||
                item.bethesda?.toLowerCase().includes(isSearchShots.toLowerCase()) ||
                dayjs(item.cytologyDate).format("DD.MM.YYYY").includes(isSearchShots.toLowerCase())
        ) || [];

    const onSearchChange = (value: string) => {
        setIsSearchShots(value);
    };

    const itemsDescriptions: DescriptionsProps["items"] = [
        { key: 1, label: "ФИО", children: isPatientData.fullName },
        {
            key: 2,
            label: "Дата рождения",
            children: dayjs(isPatientData.birthDate).format("DD.MM.YYYY"),
        },
        {
            key: 3,
            label: "Полис",
            children: isPatientData?.personalPolicy
                ? formatPolicy(isPatientData.personalPolicy)
                : "",
        },
        {
            key: 4,
            label: "Статус",
            children: (
                <Space>
                    <Badge status={isPatientData.isActive ? "processing" : "default"} />
                    <Text>{isPatientData.isActive ? "Активен" : "Не активен"}</Text>
                </Space>
            ),
        },
        { key: 5, label: "Почта", children: isPatientData.email },
        {
            key: 6,
            label: "Диагноз",
            children: isPatientData.diagnosis ? isPatientData.diagnosis : "Не обнаружено",
        },
    ];

    const columns: any = [
        {
            title: "Дата забора",
            dataIndex: "cytologyDate",
            key: "cytologyDate",
            render: (cytologyDate: any) => {
                return dayjs(cytologyDate).format("DD.MM.YYYY");
            },
            sorter: (a: any, b: any) => {
                const dateA = dayjs(a.cytologyDate);
                const dateB = dayjs(b.cytologyDate);
                return dateA.valueOf() - dateB.valueOf();
            },
        },
        {
            title: "Номер исследования",
            dataIndex: "number",
            key: "number",
        },
        {
            title: "Локализация",
            dataIndex: "materialType",
            key: "materialType",
        },
        {
            title: "Категория",
            dataIndex: "bethesda",
            key: "bethesda",
        },
        {
            key: "action",
            render: (text: string, record: IShot) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: "punctuation",
                                label: (
                                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                                        Пунктация
                                    </span>
                                ),
                                disabled: true,
                                //onClick: () => handleMenuClick(record, { key: "punctuation" }),
                            },
                            {
                                key: "result",
                                label: (
                                    <Link
                                        href={`/cytology/${record?.id}`}
                                        style={{ fontSize: "14px", fontWeight: "500" }}
                                    >
                                        Результат
                                    </Link>
                                ),
                                //onClick: () => handleMenuClick(record, { key: "result" }),
                            },
                            {
                                key: "delete",
                                label: (
                                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                                        Удалить
                                    </span>
                                ),
                                danger: true,
                                //onClick: () => handleMenuClick(record, { key: "delete" }),
                            },
                        ],
                    }}
                    trigger={["click"]}
                >
                    <a onClick={(e) => e.preventDefault()}>
                        <MoreOutlined
                            className="icon_moreOutlined"
                            style={{ color: "black", fontWeight: "100" }}
                        />
                    </a>
                </Dropdown>
            ),
        },
    ];

    return (
        <Page className="page patient_profile_page">
            <Text className="title">Личная карта пациента</Text>

            <Spacer space={28} />
            <Space direction="horizontal" style={{ width: "100%", justifyContent: "end" }}>
                <Search
                    size="large"
                    placeholder="Поиск диагностики"
                    onChange={(e) => onSearchChange(e.target.value)}
                    value={isSearchShots}
                    style={{ width: 350 }}
                />
                <Button
                    onClick={() => dispatch(handleShow_uploadPhotoFormModalSlice())}
                    title={
                        <>
                            <PlusOutlined /> Добавить снимок
                        </>
                    }
                    size={"large"}
                />
            </Space>

            <Spacer space={20} />
            <Flex gap={20}>
                <Flex vertical gap={15} style={{ width: "40%" }}>
                    <Flex gap={10}>
                        <Text className="patient_name">Пациент</Text>
                        <EditOutlined
                            onClick={() =>
                                dispatch(
                                    handleShow_methodsPatientModalSlice({
                                        method: "update",
                                        patient: isPatientData,
                                    })
                                )
                            }
                            className="medical-organization-edit-icon"
                        />
                    </Flex>
                    <Descriptions
                        labelStyle={{ fontWeight: 500, fontSize: 18 }}
                        contentStyle={{ fontSize: 20 }}
                        items={itemsDescriptions}
                        column={1}
                        bordered
                    />
                </Flex>

                <Flex vertical gap={15} style={{ width: "60%" }}>
                    <div className="patient_name">Дагностики</div>
                    <div className="diagnostic_table_container">
                        <Table<IShot>
                            rowKey="id"
                            className="diagnostic_table"
                            dataSource={filteredShotsData}
                            columns={columns}
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: <Empty description="Нет данных" /> }}
                        />
                    </div>
                </Flex>
            </Flex>

            <MethodsPatientModal />
            <UploadPhotoFormModal />
        </Page>
    );
}
