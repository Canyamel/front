import React from "react";
import { Flex, Typography, Button, Tooltip } from "antd";
import { CopyOutlined, DeleteOutlined, InfoCircleOutlined, UndoOutlined } from "@ant-design/icons";

import { Modals } from "@/app/uzi_view/[id]/types/types";
import { IDiagnosisInfo } from "../../types/diagnosis";

import "./DiagnosisCard.css";

import { names } from "./props";

const { Title } = Typography;

interface UziDiagnosisCardProps {
    node: IDiagnosisInfo;
    isActive?: boolean;
    isToDelete?: boolean;
    onClick: () => void;
    needSpecialistTitle?: boolean;
    editMode?: boolean;
    openModal?: (modalType: Modals | null) => void;
    deleteNode?: (id: string) => void;
    undoDeleteNode?: (id: string) => void;
    copyNode?: () => void;
}

const DiagnosisCard: React.FC<UziDiagnosisCardProps> = ({
    node,
    isActive = false,
    isToDelete = false,
    onClick,
    needSpecialistTitle = false,
    editMode = false,
    openModal: setModalType,
    deleteNode,
    undoDeleteNode,
    copyNode,
}) => {
    const classNames = "uzi-diagnosis-card" + (isActive ? " active" : "");
    let styles = editMode ? "edit " : "";

    if (node.tirads === "tirads_5") {
        styles += "diagnosis-red";
    } else if (node.tirads === "tirads_23") {
        styles += "diagnosis-green";
    } else if (node.tirads === "tirads_4") {
        styles += "diagnosis-orange";
    }

    const disablePropagation = (e: { stopPropagation: () => void }, callback: () => void) => {
        e.stopPropagation();
        callback();
    };

    return (
        <Flex
            className={classNames}
            onClick={onClick}
            onDoubleClick={() => setModalType && setModalType("editNode")}
        >
            <Flex justify="space-between" align="center" className="uzi-card-content">
                <Flex vertical>
                    <Title level={5} className="mt-0 align-start" type="secondary">
                        {editMode && (
                            <Tooltip title="Для смены типа образования дважды нажмите на узел">
                                <InfoCircleOutlined />
                            </Tooltip>
                        )}{" "}
                        {node.title} {isToDelete && <DeleteOutlined />}
                    </Title>
                    <Flex vertical>
                        {needSpecialistTitle && node.specialist && (
                            <Title level={5} className="mt-0 align-start">
                                {names[node.specialist]}
                            </Title>
                        )}
                        <Title level={4} className={`diagnosis mt-0 ${styles}`}>
                            {node.result}
                        </Title>
                    </Flex>
                </Flex>
                {editMode && node.specialist === "ai" && (
                    <Tooltip title="Скопировать сегменты и информацию узла на новый">
                        <Button onClick={(e) => copyNode && disablePropagation(e, copyNode)}>
                            <CopyOutlined />
                        </Button>
                    </Tooltip>
                )}
                {editMode && node.specialist !== "ai" && (
                    <Tooltip title={isToDelete ? "Удалить узел" : "Отменить удаление узла"}>
                        <Button
                            onClick={(e) =>
                                !isToDelete
                                    ? deleteNode && disablePropagation(e, () => deleteNode(node.id))
                                    : undoDeleteNode &&
                                      disablePropagation(e, () => undoDeleteNode(node.id))
                            }
                        >
                            {!isToDelete && <DeleteOutlined />}
                            {isToDelete && <UndoOutlined />}
                        </Button>
                    </Tooltip>
                )}
            </Flex>
        </Flex>
    );
};

export default DiagnosisCard;
