import React, { useEffect } from "react";
import { Form, Select, FormInstance } from "antd";

import { tiradsOptions } from "../../../types/tiradsType";
import { addNode, changeNodeTirads } from "../../../store/uziSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hook";

interface UziAddNodeProps {
    form: FormInstance<any>;
    closeModal: () => void;
    editMode?: boolean;
}

const UziAddNode: React.FC<UziAddNodeProps> = ({ form, closeModal, editMode = false }) => {
    const dispatch = useAppDispatch();

    const selectedNode = useAppSelector((state) => state.uzi.selectedNode);
    const uziId = useAppSelector((state) => state.uzi.uziId);

    useEffect(() => {
        if (editMode && selectedNode) {
            form.setFieldValue("node", selectedNode.tirads);
        }
    }, [editMode, selectedNode]);

    const handleAddNode = () => {
        if (form.getFieldsValue().node) {
            dispatch(
                addNode({
                    tirads_23: form.getFieldsValue().node === "tirads_23" ? 1 : 0,
                    tirads_4: form.getFieldsValue().node === "tirads_4" ? 1 : 0,
                    tirads_5: form.getFieldsValue().node === "tirads_5" ? 1 : 0,
                    description: "",
                    segments: [],
                    uzi_id: uziId,
                    id: crypto.randomUUID(),
                    ai: false,
                    exist: false,
                })
            );

            closeModal();
        }
    };

    const handleEditNode = () => {
        if (selectedNode) {
            dispatch(
                changeNodeTirads({ nodeId: selectedNode.id, tirads: form.getFieldsValue().node })
            );

            closeModal();
        }
    };

    return (
        <Form layout="vertical" form={form} onFinish={editMode ? handleEditNode : handleAddNode}>
            <Form.Item name="node" label="Выберите тип нового узла" rules={[{ required: true }]}>
                <Select>
                    {tiradsOptions.map(({ label, value }) => (
                        <Select.Option value={value} key={value}>
                            {label}
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>
        </Form>
    );
};

export default UziAddNode;
