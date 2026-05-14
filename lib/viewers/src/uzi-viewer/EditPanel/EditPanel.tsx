import React, { useEffect, useRef } from "react";
import { Flex, Radio, Typography } from "antd";
import type { CheckboxGroupProps } from "antd/es/checkbox";

import PolygonIcon from "./assets/PolygonIcon";
import RectangleIcon from "./assets/RectangleIcon";
import { UziDrawingTool } from "../types";

const { Title } = Typography;

interface EditPanelProps {
  tool: UziDrawingTool;
  setTool: (value: UziDrawingTool) => void;
  onHeightChange?: (height: number) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ tool, setTool, onHeightChange }) => {
  const toolOptions: CheckboxGroupProps<UziDrawingTool>["options"] = [
    {
      label: (
        <Flex align="center" justify="center" gap={10}>
          <RectangleIcon fillColor={tool === "rectangle" ? "#FFF" : "#000"} />
          Прямоугольник
        </Flex>
      ),
      value: "rectangle",
    },
    {
      label: (
        <Flex align="center" justify="center" gap={10}>
          <PolygonIcon fillColor={tool === "polygon" ? "#FFF" : "#000"} />
          Полигон
        </Flex>
      ),
      value: "polygon",
    },
  ];

  const toolPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (toolPanelRef.current) {
      onHeightChange?.(toolPanelRef.current.getBoundingClientRect().height);
    }

    return () => {
      onHeightChange?.(0);
    };
  }, [onHeightChange]);

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
          onChange={(e) => setTool(e.target.value)}
        />
      </Flex>
    </Flex>
  );
};

export default EditPanel;
