import React, {useEffect, useRef} from "react";
import {Flex, Radio, Typography} from "antd";
import type {CheckboxGroupProps} from 'antd/es/checkbox';

import {useAppDispatch} from "@/app/uzi_view/[id]/store/hook";

import {setToolPanelHeight} from "@/app/uzi_view/[id]/store/refSlice";

import {Tools} from "@/app/uzi_view/[id]/types/types";

import PolygonIcon from "@/app/uzi_view/[id]/UziView/UziViewer/EditPanel/assets/PolygonIcon";
import RectangleIcon from "@/app/uzi_view/[id]/UziView/UziViewer/EditPanel/assets/RectangleIcon";

const {Title} = Typography;

interface EditPanelProps {
    tool: Tools
    setTool: (value: Tools) => void
}

const EditPanel: React.FC<EditPanelProps> = ({ tool, setTool }) => {
    const toolOptions: CheckboxGroupProps<Tools>['options'] = [
        {
            label: (
                <Flex align="center" justify="center" gap={10}>
                    <RectangleIcon fillColor={tool === "rectangle" ? "#FFF" : "#000"} />
                    Прямоугольник
                </Flex>
            ),
            value: 'rectangle',
        },
        {
            label: (
                <Flex align="center" justify="center" gap={10}>
                    <PolygonIcon fillColor={tool === "polygon" ? "#FFF" : "#000"} />
                    Полигон
                </Flex>
            ),
            value: 'polygon'
        },
    ];

    const dispatch = useAppDispatch();
    const toolPanelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (toolPanelRef.current) {
            dispatch(setToolPanelHeight(toolPanelRef.current.getBoundingClientRect().height));
        }

        return () => {
            dispatch(setToolPanelHeight(0));
        };
    }, [dispatch]);

    return (
        <Flex vertical align="center" ref={toolPanelRef}>
            <Title level={5}>Инструменты для рисования</Title>
            <Flex vertical className="uzi-toolbox" justify="center">
                <Radio.Group
                    block
                    options={toolOptions}
                    defaultValue="rectangle"
                    optionType="button"
                    buttonStyle="solid"
                    onChange={e => setTool(e.target.value)}
                />
            </Flex>
        </Flex>
    );
};

export default EditPanel;
