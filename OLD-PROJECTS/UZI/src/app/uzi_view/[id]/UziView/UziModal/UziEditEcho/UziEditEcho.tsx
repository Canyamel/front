import React, { useEffect } from "react";
import { Form, FormInstance, Row, Col, Input, InputNumber, Typography } from "antd";

import { useAppSelector } from "@/app/uzi_view/[id]/store/hook";
import {
    useGetEchographicsQuery,
    usePatchEchographicsMutation,
} from "@/app/uzi_view/[id]/service/echo";

import "./UziEditEcho.css";
import { useRTKEffects } from "../../../service/hook";
import { EDIT_ECHO, GET_ECHO } from "../../../types/consts";

const { Title } = Typography;
const { TextArea } = Input;

interface UziEditEchoProps {
    form: FormInstance<any>;
    closeModal: () => void;
}

const UziEditEcho: React.FC<UziEditEchoProps> = ({ form, closeModal }) => {
    const lobes = [
        {
            name: "length",
            label: "Длина",
        },
        {
            name: "width",
            label: "Ширина",
        },
        {
            name: "thick",
            label: "Толщина",
        },
        {
            name: "volum",
            label: "Объем",
            disabled: true,
        },
    ];

    const uziId = useAppSelector((state) => state.uzi.uziId);
    const { data, isLoading: isGettingEcho, error: errorGetEcho } = useGetEchographicsQuery(uziId);
    const [editEcho, { isLoading: isEditingEcho, error: errorPatchEcho }] =
        usePatchEchographicsMutation();

    useRTKEffects({ isLoading: isEditingEcho, error: errorPatchEcho }, EDIT_ECHO);
    useRTKEffects({ isLoading: isGettingEcho, error: errorGetEcho }, GET_ECHO);

    useEffect(() => {
        if (data) {
            form.setFieldsValue(data);
        }
    }, [data]);

    const handleEditEcho = () => {
        form.validateFields().then((res) => {
            console.log(res);
            editEcho({ id: uziId, body: { id: uziId, ...form.getFieldsValue() } });
            closeModal();
        });
    };

    const calculateVolumeLobe = () => {
        const {
            left_lobe_length,
            left_lobe_thick,
            left_lobe_width,
            right_lobe_length,
            right_lobe_thick,
            right_lobe_width,
        } = form.getFieldsValue();

        let leftVolum;
        let rightVolum;

        if (
            typeof left_lobe_length === "number" &&
            typeof left_lobe_thick === "number" &&
            typeof left_lobe_width === "number"
        ) {
            leftVolum = left_lobe_length * left_lobe_thick * left_lobe_width * 0.479;
            form.setFieldValue("left_lobe_volum", leftVolum);
        } else {
            form.setFieldValue("left_lobe_volum", undefined);
            leftVolum = undefined;
        }

        if (
            typeof right_lobe_length === "number" &&
            typeof right_lobe_thick === "number" &&
            typeof right_lobe_width === "number"
        ) {
            rightVolum = right_lobe_length * right_lobe_thick * right_lobe_width * 0.479;
            form.setFieldValue("right_lobe_volum", rightVolum);
        } else {
            form.setFieldValue("right_lobe_volum", undefined);
            rightVolum = undefined;
        }

        if (typeof leftVolum === "number" && typeof rightVolum === "number") {
            form.setFieldValue("gland_volum", leftVolum + rightVolum);
        } else {
            form.setFieldValue("gland_volum", undefined);
        }
    };

    return (
        <Form
            layout="vertical"
            form={form}
            style={{ height: "500px", overflow: "auto" }}
            onFieldsChange={calculateVolumeLobe}
            onFinish={handleEditEcho}
        >
            <Form.Item
                name="contors"
                label="Конутры"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <Input />
            </Form.Item>
            <Row gutter={[0, 0]}>
                <Col span={11}>
                    <Title level={5}>Левая доля</Title>
                </Col>
                <Col span={2}></Col>
                <Col span={11}>
                    <Title level={5}>Правая доля</Title>
                </Col>
                {lobes.map((item) => (
                    <React.Fragment key={`lobe-${item.name}`}>
                        {["left", "space", "right"].map((side) => (
                            <>
                                {side !== "space" ? (
                                    <Col span={11} key={`${side}-${item.label}`}>
                                        <Form.Item
                                            name={`${side}_lobe_${item.name}`}
                                            label={item.label}
                                            style={{ marginBottom: "0 !important" }}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: "Пожалуйста, заполните поле",
                                                },
                                            ]}
                                        >
                                            <InputNumber disabled={!!item.disabled} />
                                        </Form.Item>
                                    </Col>
                                ) : (
                                    <Col span={2} key={`${side}-${item.label}-space`}></Col>
                                )}
                            </>
                        ))}
                    </React.Fragment>
                ))}
            </Row>
            <Form.Item
                name="gland_volum"
                label="Объем железы"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <InputNumber disabled value={0} />
            </Form.Item>
            <Form.Item
                name="isthmus"
                label="Перешеек"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <InputNumber />
            </Form.Item>
            <Form.Item
                name="struct"
                label="Структура"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name="echogenicity"
                label="Эхогенность"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name="regional_lymph"
                label="Регионарные лимфатические узлы"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name="vascularization"
                label="Васкуляризация по ЦДК"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name="location"
                label="Расположение"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name="additional"
                label="Дополнительные данные"
                rules={[{ required: true, message: "Пожалуйста, заполните поле" }]}
            >
                <TextArea rows={4} />
            </Form.Item>
        </Form>
    );
};

export default UziEditEcho;
