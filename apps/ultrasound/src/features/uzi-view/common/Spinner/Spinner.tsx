import {Spin, Flex} from "antd";

import './spinner.css';

export default function Spinner() {
    return (
        <Flex className="uzi-spinner-wrapper" justify="center" align="center">
            <Spin size="large"/>
        </Flex>
    );
}
