import React, { useEffect } from "react";
import { Flex, Typography, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import DiagnosisCard from "@/app/uzi_view/[id]/common/DiagnosisCard/DiagnosisCard";

import { Modals } from "@/app/uzi_view/[id]/types/types";
import { IDiagnosisInfo } from "@/app/uzi_view/[id]/types/diagnosis";
import {
    ADD_NODE,
    ADD_SEGMENT,
    DELETE_NODE,
    DELETE_SEGMENT,
    EDIT_SEGMENT,
    GET_SEGMENTS,
} from "@/app/uzi_view/[id]/types/consts";
import { IPoint } from "../../UziViewer/Viewer/interfaces/queries";
import { ITirads } from "../../../types/tirads";
import { INodeRedux } from "../../../types/nodes";

import { useAppDispatch, useAppSelector } from "@/app/uzi_view/[id]/store/hook";
import { useRTKEffects } from "@/app/uzi_view/[id]/service/hook";

import { transformNode } from "@/app/uzi_view/[id]/store/utils";

import {
    copyNode,
    addCurrentNodes,
    deleteAllNodes,
    markAsDeleted,
    unmarkAsDeleted,
    setSelectedNode,
} from "@/app/uzi_view/[id]/store/uziSlice";
import { addError } from "@/app/uzi_view/[id]/store/utilsSlice";
import {
    useAddNodeMutation,
    useAddSegmentsMutation,
    useChangeNodeTiradsMutation,
    useChangeSegmentMutation,
    useDeleteNodeMutation,
    useDeleteSegmentMutation,
    useLazyGetSegmentsByNodeQuery,
} from "@/app/uzi_view/[id]/service/nodesSegments";

import "./UziDiagnosisEdit.css";

const { Text } = Typography;

interface UziDiagnosisEditProps {
    initNodes: IDiagnosisInfo[];
    openModal: (value: Modals | null) => void;
    openViewMode: () => void;
    selectedNode: IDiagnosisInfo | null;
    onClickCard: (newValue: IDiagnosisInfo | null) => void;
}

const UziDiagnosisEdit: React.FC<UziDiagnosisEditProps> = ({
    initNodes,
    openModal,
    openViewMode,
    selectedNode,
    onClickCard,
}) => {
    const dispatch = useAppDispatch();
    const uziId = useAppSelector((state) => state.uzi.uziId);
    const nodes = useAppSelector((state) => state.uzi.nodes);
    const [addNode, { isLoading: isAddingNode, error: errorAddNode }] = useAddNodeMutation();
    const [deleteNode, { isLoading: isDeletiongNode, error: errorDeleteNode }] =
        useDeleteNodeMutation();
    const [addSegment, { isLoading: isAddingSegment, error: errorAddSegment }] =
        useAddSegmentsMutation();
    const [deleteSegment, { isLoading: isDeletingSegment, error: errorDeleteSegment }] =
        useDeleteSegmentMutation();
    const [changeSegment, { isLoading: isChangingSegment, error: errorChangeSegment }] =
        useChangeSegmentMutation();
    const [changeNodeTirads, { isLoading: isChangingNodesTirads, error: errorChangeNodeTirads }] =
        useChangeNodeTiradsMutation();
    const [getSegments, { isLoading, error }] = useLazyGetSegmentsByNodeQuery();

    useRTKEffects({ isLoading: isAddingNode, error: errorAddNode }, ADD_NODE);
    useRTKEffects({ isLoading: isDeletiongNode, error: errorDeleteNode }, DELETE_NODE);
    useRTKEffects({ isLoading: isAddingSegment, error: errorAddSegment }, ADD_SEGMENT);
    useRTKEffects({ isLoading: isDeletingSegment, error: errorDeleteSegment }, DELETE_SEGMENT);
    useRTKEffects({ isLoading: isChangingSegment, error: errorChangeSegment }, EDIT_SEGMENT);
    useRTKEffects({ isLoading: isChangingNodesTirads, error: errorChangeNodeTirads }, EDIT_SEGMENT);
    useRTKEffects({ isLoading, error }, GET_SEGMENTS);

    const closeEditMode = () => {
        dispatch(deleteAllNodes());
        openViewMode();
    };
    const createNode = () => openModal("addNode");
    const editEcho = () => openModal("editEcho");
    const saveNodes = () => {
        nodes.forEach((node) => {
            const { segments, ...otherData } = node;

            if (node.exist) {
                if (node.toDelete) {
                    deleteNode(node.id);
                } else if (segments.length === 0) {
                    deleteNode(node.id);
                    dispatch(
                        addError({
                            key: `Node-${node.id}`,
                            message: `Узел ${node.serial} был удален из-за отсутствия сегментов`,
                        })
                    );
                } else {
                    segments.forEach((segment) => {
                        if (!segment.exist && !segment.toDelete) {
                            addSegment(segment);
                        }

                        if (segment.toDelete && segment.exist) {
                            deleteSegment(segment.id);
                        }

                        if (segment.exist && (segment.edited || node.edited) && !segment.toDelete) {
                            const updatedSegment: { contor?: IPoint[] } & Partial<ITirads> = {};

                            if (node.edited) {
                                updatedSegment["tirads_23"] = node.tirads_23;
                                updatedSegment["tirads_4"] = node.tirads_4;
                                updatedSegment["tirads_5"] = node.tirads_5;
                            }

                            if (segment.edited) {
                                updatedSegment["contor"] = segment.contor;
                            }

                            changeSegment({ segmentId: segment.id, ...updatedSegment });
                        }
                    });
                }

                if (node.edited && !node.toDelete) {
                    changeNodeTirads({ nodeId: node.id, body: node });
                }
            } else {
                if (segments.length > 0 && !node.toDelete) {
                    addNode({ uziId: uziId, payload: { node: otherData, segments: segments } });
                } else if (segments.length === 0) {
                    dispatch(
                        addError({
                            key: `Node-${node.id}`,
                            message: `Узел ${node.serial} не был добавлен из-за отсутствия сегментов`,
                        })
                    );
                }
            }
        });

        closeEditMode();
    };
    const markAsDeletedNode = (id: string) => {
        dispatch(markAsDeleted(id));
    };
    const unmarkAsDeletedNode = (id: string) => {
        dispatch(unmarkAsDeleted(id));
    };
    const copyNodeHandler = (node: INodeRedux) => {
        return () => {
            dispatch(copyNode(node));
        };
    };

    useEffect(() => {
        Promise.all(
            initNodes.map((node) =>
                getSegments(node.id)
                    .unwrap()
                    .then((segments) => ({ node, segments }))
            )
        ).then((res) => {
            dispatch(
                addCurrentNodes(
                    res.map(({ node, segments }) => ({
                        description: "",
                        id: node.id,
                        uzi_id: uziId,
                        ai: node.specialist === "ai",
                        segments: segments.map((segment) => ({ exist: true, ...segment })),
                        serial: Number(node.title.split(" ")[1]),
                        tirads_23: node.tirads === "tirads_23" ? node.tiradsValue : 0,
                        tirads_4: node.tirads === "tirads_4" ? node.tiradsValue : 0,
                        tirads_5: node.tirads === "tirads_5" ? node.tiradsValue : 0,
                        exist: true,
                    }))
                )
            );
        });
    }, []);

    return (
        <Flex vertical justify="space-between" gap={20} className="uzi-edit-panel">
            <Flex vertical gap={10} className="uzi-diagnosis-cards-wrapper">
                {nodes.map((nodeRaw) => {
                    const node = transformNode(
                        { ...nodeRaw, validation: "valid" },
                        nodeRaw.serial - 1
                    );

                    return (
                        <DiagnosisCard
                            editMode
                            isToDelete={nodeRaw.toDelete}
                            node={node}
                            isActive={selectedNode?.id === node.id}
                            key={node.id}
                            onClick={() => onClickCard(node)}
                            openModal={openModal}
                            deleteNode={markAsDeletedNode}
                            undoDeleteNode={unmarkAsDeletedNode}
                            copyNode={copyNodeHandler(nodeRaw)}
                        />
                    );
                })}
            </Flex>
            <Flex vertical gap={30} className="uzi-diagnosis-edit-wrapper">
                <Button className="uzi-diagnosis-button" onClick={createNode}>
                    <PlusOutlined />
                    <Text className="text-inherit">Добавить узел</Text>
                </Button>
                <Flex vertical gap={10}>
                    <Button className="uzi-diagnosis-button" onClick={editEcho}>
                        Редактировать эхографические признаки
                    </Button>
                    <Button type="primary" onClick={saveNodes}>
                        Сохранить и вернуться в режим просмотра
                    </Button>
                    <Button type="primary" onClick={closeEditMode}>
                        Вернуться в режим просмотра без сохранения
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
};

export default UziDiagnosisEdit;
