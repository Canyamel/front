import React from "react";

import UziDiagnosisEdit from ".//UziDiagnosisEdit/UziDiagnosisEdit";
import UziDiagnosis from "./UziDiagnosis/UziDiagnosis";
import BlockSpace from "@/app/uzi_view/[id]/UziView/UziDiagnosisPanel/BlockSpace/BlockSpace";

import { Modals, Modes } from "@/app/uzi_view/[id]/types/types";
import { IDiagnosisInfo } from "@/app/uzi_view/[id]/types/diagnosis";

import { useAppDispatch, useAppSelector } from "@/app/uzi_view/[id]/store/hook";
import { setSelectedNode } from "@/app/uzi_view/[id]/store/uziSlice";

interface UziDiagnosisPanelProps {
    mode: Modes;
    nodes: IDiagnosisInfo[];
    changeMode: (newMode: Modes) => void;
    setModalType: (value: Modals | null) => void;
}

const UziDiagnosisPanel: React.FC<UziDiagnosisPanelProps> = ({
    nodes,
    mode,
    changeMode,
    setModalType,
}) => {
    const dispatch = useAppDispatch();

    const selectedNode = useAppSelector((state) => state.uzi.selectedNode);

    const handleOnClickCard = (newValue: IDiagnosisInfo | null) =>
        dispatch(setSelectedNode(newValue));

    return (
        <>
            <BlockSpace />
            {mode === "view" ? (
                <UziDiagnosis
                    nodes={nodes}
                    openEdit={() => changeMode("edit")}
                    selectedNode={selectedNode}
                    onClickCard={handleOnClickCard}
                />
            ) : (
                <UziDiagnosisEdit
                    initNodes={nodes}
                    openModal={setModalType}
                    openViewMode={() => changeMode("view")}
                    selectedNode={selectedNode}
                    onClickCard={handleOnClickCard}
                />
            )}
        </>
    );
};

export default UziDiagnosisPanel;
