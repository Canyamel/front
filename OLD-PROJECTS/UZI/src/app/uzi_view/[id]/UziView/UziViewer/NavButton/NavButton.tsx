import React from "react";
import {Button} from "antd";
import {LeftCircleOutlined, RightCircleOutlined} from "@ant-design/icons";

interface NavButtonProps {
    disabled: boolean,
    onClick: () => void,
    position: "left" | "right"
}

const NavButton: React.FC<NavButtonProps> = ({ disabled, onClick, position }) => {
    return (
        <Button
            type="link"
            className={position}
            disabled={disabled}
            onClick={onClick}
        >
            { position === "left" && <LeftCircleOutlined className="uzi-icons"/> }
            { position === "right" && <RightCircleOutlined className="uzi-icons"/> }
        </Button>
    );
};

export default NavButton;
