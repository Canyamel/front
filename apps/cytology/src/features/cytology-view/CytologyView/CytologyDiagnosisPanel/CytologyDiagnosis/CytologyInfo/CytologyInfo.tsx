import React, { useContext } from "react";
import { Descriptions, Flex, Typography } from "antd";
import { RightOutlined } from "@ant-design/icons";

import { ModalContext } from "@medml/ui";

import { useAppSelector } from "@cytology/core/hooks";
import { prepareCytologyInfo } from "@cytology/core/functions/prepareCytologyInfo";
import { getHighestProbIndex } from "@cytology/core/functions/highestProb";
import { formatDisplayValue } from "@cytology/core/functions/formatDisplayValue";

import ViewEditConclusion from "../../ViewEditConclusion/ViewEditConclusion";
import ViewProbs from "./ViewProbs/ViewProbs";
import CharacteristicsTable from "./CharacteristicsTable/CharacteristicsTable";

import "./CytologyInfo.css";

const { Text } = Typography;

export type CytologyInfoProps = {
    layout?: "default" | "banner";
};

function hasCharacteristicData(
    cell?: Record<string, number> | null,
    cluster?: Record<string, number> | null
): boolean {
    const values = [...Object.values(cell ?? {}), ...Object.values(cluster ?? {})];
    return values.some((value) => value !== null && value !== undefined && !Number.isNaN(value));
}

const CytologyInfo: React.FC<CytologyInfoProps> = ({ layout = "banner" }) => {
    const { open } = useContext(ModalContext);
    const cytologyInfo = useAppSelector((state) => state.cytology.cytologyInfo);

    const patientData = cytologyInfo?.patient;
    const probs = cytologyInfo?.details?.probs;
    const hasProbs = Boolean(probs?.length);
    const hasCharacteristics = hasCharacteristicData(
        cytologyInfo?.details?.cell_characteristics,
        cytologyInfo?.details?.cluster_characteristics
    );
    const isBanner = layout === "banner";

    const handleViewProbs = () => {
        if (!hasProbs || !probs) {
            return;
        }
        open({
            content: <ViewProbs probs={probs} />,
        });
    };

    const handleResulCharacteristics = () => {
        if (
            !hasCharacteristics ||
            !cytologyInfo?.details?.cell_characteristics ||
            !cytologyInfo?.details?.cluster_characteristics
        ) {
            return;
        }
        open({
            content: (
                <CharacteristicsTable
                    characteristics={{
                        ...cytologyInfo.details.cell_characteristics,
                        ...cytologyInfo.details.cluster_characteristics,
                    }}
                />
            ),
        });
    };

    const handleViewConclusion = () => {
        if (cytologyInfo) {
            open({
                content: <ViewEditConclusion initData={prepareCytologyInfo(cytologyInfo)} />,
            });
        }
    };

    if (!cytologyInfo) {
        return (
            <div className="cytology-info-empty">
                <Text type="secondary">Данные исследования загружаются…</Text>
            </div>
        );
    }

    const patientName = [patientData?.last_name, patientData?.first_name, patientData?.fathers_name]
        .filter(Boolean)
        .join(" ");
    const birthDate = patientData?.birth_date
        ? (() => {
              const parsed = new Date(patientData.birth_date);
              return Number.isNaN(parsed.getTime())
                  ? patientData.birth_date
                  : parsed.toLocaleDateString("ru-RU");
          })()
        : null;

    const resultActions = (
        <div
            className={
                isBanner ? "cytology-info-actions cytology-info-actions--row" : "cytology-info-actions"
            }
        >
            <button
                type="button"
                className={`cytology-info-action${hasProbs ? "" : " cytology-info-action--disabled"}`}
                onClick={handleViewProbs}
                disabled={!hasProbs}
            >
                <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                    <div>
                        <Text type="secondary" className="cytology-info-action-label">
                            Новообразования
                        </Text>
                        <div className="cytology-info-action-value">
                            {hasProbs ? (
                                getHighestProbIndex(probs)
                            ) : (
                                <Text type="secondary">Нет данных</Text>
                            )}
                        </div>
                    </div>
                    {hasProbs ? <RightOutlined className="cytology-info-action-chevron" /> : null}
                </Flex>
            </button>

            <button
                type="button"
                className={`cytology-info-action${hasCharacteristics ? "" : " cytology-info-action--disabled"}`}
                onClick={handleResulCharacteristics}
                disabled={!hasCharacteristics}
            >
                <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                    <div>
                        <Text type="secondary" className="cytology-info-action-label">
                            Результаты исследования
                        </Text>
                        <div className="cytology-info-action-value">
                            {hasCharacteristics ? (
                                "Просмотреть"
                            ) : (
                                <Text type="secondary">Нет данных</Text>
                            )}
                        </div>
                    </div>
                    {hasCharacteristics ? (
                        <RightOutlined className="cytology-info-action-chevron" />
                    ) : null}
                </Flex>
            </button>

            <button type="button" className="cytology-info-action" onClick={handleViewConclusion}>
                <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                    <div>
                        <Text type="secondary" className="cytology-info-action-label">
                            Заключение
                        </Text>
                        <div className="cytology-info-action-value">Просмотреть</div>
                    </div>
                    <RightOutlined className="cytology-info-action-chevron" />
                </Flex>
            </button>
        </div>
    );

    return (
        <div className={`cytology-info${isBanner ? " cytology-info--banner" : ""}`}>
            <div className="cytology-info-patient">
                <Text className="cytology-section-label">Пациент</Text>
                <Descriptions
                    className="cytology-info-descriptions"
                    column={isBanner ? { xs: 1, sm: 2, lg: 3 } : 1}
                    size="small"
                >
                    <Descriptions.Item label="ФИО">
                        {formatDisplayValue(patientName || null)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Дата рождения">
                        {formatDisplayValue(birthDate)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                        {formatDisplayValue(patientData?.email)}
                    </Descriptions.Item>
                </Descriptions>
            </div>

            <div className="cytology-info-results">
                <Text className="cytology-section-label">Результаты</Text>
                {resultActions}
            </div>
        </div>
    );
};

export default CytologyInfo;
