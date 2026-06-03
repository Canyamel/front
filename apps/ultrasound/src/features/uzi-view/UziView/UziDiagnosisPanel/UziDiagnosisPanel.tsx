import React from "react";

import UziDiagnosisEdit from ".//UziDiagnosisEdit/UziDiagnosisEdit";
import UziDiagnosis from "./UziDiagnosis/UziDiagnosis";
import BlockSpace from "@/features/uzi-view/UziView/UziDiagnosisPanel/BlockSpace/BlockSpace";

import { Modals, Modes } from "@/features/uzi-view/types/types";
import { IDiagnosisInfo } from "@/features/uzi-view/types/diagnosis";

import { useAppDispatch, useAppSelector } from "@/features/uzi-view/store/hook";
import { setSelectedNode } from "@/features/uzi-view/store/uziSlice";

interface UziDiagnosisPanelProps {
    mode: Modes;
    nodes: IDiagnosisInfo[];
    changeMode: (newMode: Modes) => void;
    setModalType: (value: Modals | null) => void;
    omitUziInfo?: boolean;
    /** В вертикальной вёрстке отступ под панель инструментов не нужен */
    omitBlockSpace?: boolean;
}

const UziDiagnosisPanel: React.FC<UziDiagnosisPanelProps> = ({
    nodes,
    mode,
    changeMode,
    setModalType,
    omitUziInfo = false,
    omitBlockSpace = false,
}) => {
    const dispatch = useAppDispatch();

    const selectedNode = useAppSelector((state) => state.uzi.selectedNode);

    const handleOnClickCard = (newValue: IDiagnosisInfo | null) =>
        dispatch(setSelectedNode(newValue));

    return (
        <>
            {!omitBlockSpace && <BlockSpace />}
            {mode === "view" ? (
                <UziDiagnosis
                    nodes={nodes}
                    openEdit={() => changeMode("edit")}
                    openEcho={() => setModalType("viewEcho")}
                    selectedNode={selectedNode}
                    onClickCard={handleOnClickCard}
                    omitUziInfo={omitUziInfo}
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
