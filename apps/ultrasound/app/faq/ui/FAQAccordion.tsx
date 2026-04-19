import { useState } from "react";
import { Collapse, Typography } from "antd";
import { CaretRightOutlined } from "@ant-design/icons";

const { Paragraph, Text } = Typography;

interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

// Simple static FAQ items; can be replaced with dynamic content later
const accordionItems: AccordionItem[] = [
  {
    id: "1",
    question: "Как загрузить снимки УЗИ?",
    answer:
      "Перейдите в раздел \"Добавить снимок\" на дэшборде врача и следуйте инструкции по загрузке файлов.",
  },
  {
    id: "2",
    question: "Как посмотреть результаты анализа?",
    answer:
      "Откройте карту пациента, выберите исследование и перейдите на страницу результатов УЗИ.",
  },
  {
    id: "3",
    question: "Можно ли редактировать заключение?",
    answer:
      "Да, врач может корректировать заключение и сохранять обновлённую версию результата.",
  },
];

const FAQAccordion = () => {
  const [activeKey, setActiveKey] = useState<string | string[]>([]);

  const handleChange = (keys: string | string[]) => {
    setActiveKey(keys);
  };

  const collapseItems = accordionItems.map((item) => ({
    key: item.id,
    label: (
      <Text
        style={{
          fontWeight: 500,
          color: (Array.isArray(activeKey) ? activeKey : [activeKey]).includes(
            item.id
          )
            ? "#2292cb"
            : "#374151",
        }}
      >
        {item.question}
      </Text>
    ),
    children: (
      <Paragraph
        style={{
          color: "#4b5563",
          lineHeight: 1.7,
          whiteSpace: "pre-line",
          margin: 0,
          fontSize: "15px",
        }}
      >
        {item.answer}
      </Paragraph>
    ),
    style: {
      background: "white",
      borderRadius: "12px",
      marginBottom: "16px",
      border: `1px solid ${
        (Array.isArray(activeKey) ? activeKey : [activeKey]).includes(item.id)
          ? "#2292cb"
          : "#e2e8f0"
      }`,
      boxShadow: (Array.isArray(activeKey) ? activeKey : [activeKey]).includes(
        item.id
      )
        ? "0 8px 25px rgba(34, 146, 203, 0.15)"
        : "0 2px 12px rgba(0,0,0,0.06)",
      transition: "all 0.3s ease",
    },
  }));

  return (
    <Collapse
      activeKey={activeKey}
      onChange={handleChange}
      expandIconPlacement="end"
      expandIcon={({ isActive }) => (
        <CaretRightOutlined
          rotate={isActive ? 90 : 0}
          style={{
            color: isActive ? "#2292cb" : "#64748b",
            transition: "all 0.3s ease",
          }}
        />
      )}
      ghost
      style={{ background: "transparent" }}
      items={collapseItems}
    />
  );
};

export default FAQAccordion;

