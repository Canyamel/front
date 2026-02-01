"use client";

import "./patients.css";
import Page from "@/components/Page/Page";
import Button from "@/components/Universal/Button/Button";
import Text from "@/components/Universal/Text/Text";
import React, { useCallback, useEffect, useState } from "react";
import Table from "antd/es/table";
import Flex from "antd/es/flex";
import Input from "antd/es/input";
import Tag from "antd/es/tag";
import Spacer from "@/components/Universal/Spacer/Spacer";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useDeleteItemOfListModal } from "@/components/Modals/DeleteModal/DeleteItemOfListModal";
import MethodsPatientModal from "@/components/Modals/MethodsPatientsModal/methodsPatientModal";
import EditDoctorModal from "./components/editDoctorModal/editDoctorModal";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { handleShow as handleShow_editDoctorModal } from "../../stores/editMedWorkerModalSlice";
import { handleShow as handleShow_methodsPatientModal } from "../../stores/methodsPatientModalSlice";
import { setToken } from "../../stores/authSlice";
import { useGetMedWorkerQuery } from "../../service/medWorkerAndPatient";
import { useRTKEffects } from "../../service/hook";
import { IPatient } from "../../types/patient";
import { IMedWorker } from "../../types/medWorker";
import dayjs from "dayjs";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useAppSelector } from "@/stores/hook";
import { skipToken } from "@reduxjs/toolkit/query";
import { Empty } from "antd";

const { Search } = Input;

function formatPolicy(str: string) {
    return str.replace(/(.{4})/g, "$1 ");
}

export default function Patients() {
    const dispatch = useDispatch();
    const accessToken = useAppSelector((state) => state.auth.accessToken);

    const { data }: { data: (Session & { accessToken?: string }) | null } = useSession();

    const [isPatientData, setIsPatientData] = useState<IPatient[]>([]);
    const [isMedWorkerData, setIsMedWorkerData] = useState<IMedWorker | null>(null);

    const [searchPatient, setSearchPatient] = useState<string>("");

    const [pageSize, setPageSize] = useState(10);

    const {
        isLoading: isMedWorkerLoading,
        data: medWorkerData,
        error: errorMedWorker,
    } = useGetMedWorkerQuery(accessToken ? String(localStorage.getItem("id")) : skipToken);
    useRTKEffects({ isLoading: isMedWorkerLoading, error: errorMedWorker }, "Get medworker");

    useEffect(() => {
        if (data?.accessToken) {
            dispatch(setToken(data.accessToken));
            localStorage.setItem(
                "id",
                jwtDecode<{ user_id: number }>(data.accessToken).user_id.toString()
            );
        }
    }, [data]);

    useEffect(() => {
        if (medWorkerData) {
            setIsMedWorkerData({
                id: medWorkerData.results.med_worker.id,
                lastName: medWorkerData.results.med_worker.last_name,
                firstName: medWorkerData.results.med_worker.first_name,
                fathersName: medWorkerData.results.med_worker.fathers_name,
                job: medWorkerData.results.med_worker.job,
                medOrganization: medWorkerData.results.med_worker.med_organization,
                isRemoteWorker: medWorkerData.results.med_worker.is_remote_worker,
                expertDetails: medWorkerData.results.med_worker.expert_details,
            });

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
        const tableResize = () => {
            const height = window.innerHeight;
            const n = Math.floor((height - 450) / 55);
            if (n < 5) setPageSize(5);
            else setPageSize(n);
        };

        tableResize();
        window.addEventListener("resize", tableResize);
        return () => window.removeEventListener("resize", tableResize);
    }, [medWorkerData]);

    const filteredData =
        isPatientData?.filter(
            (item: IPatient) =>
                item.fullName?.toLowerCase().includes(searchPatient.toLowerCase()) ||
                item.personalPolicy.includes(searchPatient)
        ) || [];

    const onSearchChange = (value: string) => {
        setSearchPatient(value);
    };

    const columns: any = [
        {
            title: "ФИО",
            dataIndex: "fullName",
            key: "fullName",
        },
        {
            title: "Дата рождения",
            dataIndex: "birthDate",
            key: "birthDate",
            render: (value: string) => <span>{dayjs(value).format("DD.MM.YYYY")}</span>,
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "Диагноз",
            dataIndex: "diagnosis",
            key: "diagnosis",
            render: (text: string) => {
                return text ? text : "Не обнаружено";
            },
        },
        {
            title: "Статус",
            dataIndex: "isActive",
            key: "isActive",
            render: (value: boolean) => (
                <Tag style={{ fontSize: "15px", fontWeight: 600 }} color={value ? "green" : "grey"}>
                    {value ? "Активен" : "Не активен"}
                </Tag>
            ),
        },
        {
            title: "Полис",
            dataIndex: "personalPolicy",
            key: "personalPolicy",
            render: (value: string) => <span>{formatPolicy(value)}</span>,
        },
        {
            dataIndex: "idCard",
            key: "idCard",
            render: (_: never, record: IPatient) => (
                <Flex justify="space-evenly">
                    <Link href={`/patient_profile?id=${record?.idCard}`} className="table-button">
                        Открыть
                    </Link>
                    <div
                        className="table-button"
                        onClick={() => {
                            showDeletePatientModal(record.idCard);
                        }}
                    >
                        Удалить
                    </div>
                </Flex>
            ),
        },
    ];

    const { DeleteItemOfListModal, setDeletingItemId, showModalDeleteItem, setConfirmationText } =
        useDeleteItemOfListModal<IPatient>({
            dataSource: isPatientData,
            setDataSource: setIsPatientData,
            title: "Удаление карты",
            checkBoxText: "Подтверждаю удаление карты",
            itemType: "patient",
        });

    const showDeletePatientModal = useCallback(
        (patientIdCard: string) => {
            setDeletingItemId(patientIdCard);
            showModalDeleteItem();
            const deletingPatient = isPatientData?.find(({ idCard }) => idCard === patientIdCard);
            setConfirmationText(
                `Вы уверены, что хотите удалить карту ${deletingPatient?.fullName}?`
            );
        },
        [isPatientData, setConfirmationText, setDeletingItemId, showModalDeleteItem]
    );

    return (
        <>
            <Page className="page page-patients">
                <Flex gap={10}>
                    <Text className="title">{`${isMedWorkerData?.lastName} ${isMedWorkerData?.firstName} ${isMedWorkerData?.fathersName} `}</Text>
                    <EditOutlined
                        onClick={() => {
                            if (isMedWorkerData) {
                                dispatch(handleShow_editDoctorModal({ doctor: isMedWorkerData }));
                            }
                        }}
                        className="medical-organization-edit-icon"
                    />
                </Flex>

                <Spacer space={15} />
                <Flex gap={10}>
                    <Text className="title-support">Место работы и должность:</Text>
                    <Text fontSize={20}>
                        {isMedWorkerData?.medOrganization
                            ? isMedWorkerData.medOrganization
                            : "место работы не указано"}
                        , {isMedWorkerData?.job ? isMedWorkerData.job : "должность не указана"}
                    </Text>
                </Flex>

                <Spacer space={10} />
                <Flex gap={10}>
                    <Text className="title-support">Опыт работы:</Text>
                    <Text fontSize={20}>
                        {isMedWorkerData?.expertDetails
                            ? isMedWorkerData.expertDetails
                            : "не указано"}
                    </Text>
                </Flex>

                <Spacer space={20} />
                <Flex justify="space-between" align="center">
                    <Text className="title">Пациенты</Text>
                    <Flex gap={20} align="center">
                        <Search
                            size="large"
                            placeholder="Поиск по ФИО или номеру полиса"
                            onChange={(e) => onSearchChange(e.target.value)}
                            value={searchPatient}
                            style={{ width: 350 }}
                        />
                        <Button
                            size="large"
                            onClick={() =>
                                dispatch(handleShow_methodsPatientModal({ method: "create" }))
                            }
                            title={
                                <Text>
                                    <PlusOutlined /> Добавить карту
                                </Text>
                            }
                        />
                    </Flex>
                </Flex>

                <Spacer space={20} />
                <Table<IPatient>
                    className="table-patient"
                    rowKey="id"
                    dataSource={filteredData}
                    columns={columns}
                    pagination={{ pageSize, showSizeChanger: false }}
                    loading={isMedWorkerLoading}
                    locale={{ emptyText: <Empty description="Нет данных" /> }}
                />

                {isMedWorkerData !== null && <EditDoctorModal />}

                <MethodsPatientModal />

                <DeleteItemOfListModal />
            </Page>
            <Spacer space={20} />
        </>
    );
}
