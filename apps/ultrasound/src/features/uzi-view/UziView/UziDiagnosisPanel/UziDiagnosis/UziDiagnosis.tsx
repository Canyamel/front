import React from "react";
import { Flex, Typography, Button } from "antd";
import { EditOutlined } from "@ant-design/icons";

import DiagnosisCard from "@/features/uzi-view/common/DiagnosisCard/DiagnosisCard";

import { IDiagnosisInfo } from "@/features/uzi-view/types/diagnosis";

import "./UziDiagnosis.css";
import UziInfo from "./UziInfo/UziInfo";

const { Text } = Typography;

interface IUziDiagnosisProps {
    nodes: IDiagnosisInfo[];
    openEdit: () => void;
    openEcho: () => void;
    selectedNode: IDiagnosisInfo | null;
    onClickCard: (newValue: IDiagnosisInfo | null) => void;
    /** Когда данные исследования показаны отдельным блоком выше */
    omitUziInfo?: boolean;
}

const UziDiagnosis: React.FC<IUziDiagnosisProps> = ({
    nodes,
    openEdit,
    openEcho,
    selectedNode,
    onClickCard,
    omitUziInfo = false,
}) => {
    return (
        <Flex vertical className="uzi-diagnosis-wrapper">
            {!omitUziInfo && <UziInfo />}
            <Flex vertical gap={10} className="uzi-diagnosis-cards-wrapper">
                {nodes.map((node) => (
                    <DiagnosisCard
                        node={node}
                        isActive={selectedNode?.id === node.id}
                        key={node.id}
                        onClick={() => onClickCard(node)}
                        needSpecialistTitle
                    />
                ))}
            </Flex>
            <Button className="uzi-diagnosis-edit" type="primary" onClick={openEdit}>
                <Flex gap={10} align="center">
                    <Text className="text-inherit">Редактировать</Text>
                    <EditOutlined />
                </Flex>
            </Button>
            <Button className="uzi-diagnosis-echo" onClick={openEcho}>
                Просмотр эхографических признаков
            </Button>
        </Flex>
    );
};

export default UziDiagnosis;
