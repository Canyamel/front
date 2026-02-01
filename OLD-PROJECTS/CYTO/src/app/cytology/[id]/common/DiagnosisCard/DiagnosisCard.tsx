import React from "react";
import { Flex, Typography } from "antd";

import { Modals } from "@/app/cytology/[id]/core/types/basic";
import { segmentsTranslated, SegmentType } from "@cytology/core/types/segments";

import "./DiagnosisCard.css";

const { Title } = Typography;

interface CytologyDiagnosisCardProps {
    segmentType: SegmentType;
    isActive?: boolean;
    onClick: () => void;
    editMode?: boolean;
    openModal?: (modalType: Modals | null) => void;
}

const DiagnosisCard: React.FC<CytologyDiagnosisCardProps> = ({
    segmentType,
    isActive = false,
    onClick,
    editMode = false,
    openModal: setModalType,
}) => {
    const classNames = "cytology-diagnosis-card" + (isActive ? " active" : "");
    const styles = editMode ? "edit " : "";

    // if (node.tirads === "tirads_5") {
    //     styles += "diagnosis-red";
    // } else if (node.tirads === "tirads_23") {
    //     styles += "diagnosis-green";
    // } else if (node.tirads === "tirads_4") {
    //     styles += "diagnosis-orange";
    // }

    // const disablePropagation = (e: { stopPropagation: () => void }, callback: () => void) => {
    //     e.stopPropagation();
    //     callback();
    // };

    return (
        <Flex
            className={classNames}
            onClick={onClick}
            onDoubleClick={() => setModalType && setModalType("editNode")}
        >
            <Flex justify="space-between" align="center" className="cytology-card-content">
                <Flex vertical>
                    {/* <Title level={5} className="mt-0 align-start" type="secondary"> */}
                    {/* {editMode && (
                            <Tooltip title="Для смены типа образования дважды нажмите на узел">
                                <InfoCircleOutlined />
                            </Tooltip>
                        )}{" "} */}
                    {/* {isToDelete && <DeleteOutlined />} */}
                    {/* </Title> */}
                    <Title level={5} className={`diagnosis mt-0 ${styles}`}>
                        {segmentsTranslated[segmentType]}
                    </Title>
                </Flex>
                {/* {editMode && node.specialist !== "ai" && (
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
                )} */}
            </Flex>
        </Flex>
    );
};

export default DiagnosisCard;
