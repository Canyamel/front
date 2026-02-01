import React from "react";
import { Flex, Typography, Button } from "antd";
import { EditOutlined } from "@ant-design/icons";

import DiagnosisCard from "@/app/uzi_view/[id]/common/DiagnosisCard/DiagnosisCard";

import { IDiagnosisInfo } from "@/app/uzi_view/[id]/types/diagnosis";

import "./UziDiagnosis.css";
import UziInfo from "./UziInfo/UziInfo";

const { Text } = Typography;

interface IUziDiagnosisProps {
    nodes: IDiagnosisInfo[];
    openEdit: () => void;
    selectedNode: IDiagnosisInfo | null;
    onClickCard: (newValue: IDiagnosisInfo | null) => void;
}

const UziDiagnosis: React.FC<IUziDiagnosisProps> = ({
    nodes,
    openEdit,
    selectedNode,
    onClickCard,
}) => {
    return (
        <Flex vertical className="uzi-diagnosis-wrapper">
            <UziInfo />
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
        </Flex>
    );
};

export default UziDiagnosis;
