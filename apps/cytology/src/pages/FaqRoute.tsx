import { Collapse, Typography } from "antd";

const items = [
  {
    key: "1",
    label: "Как загрузить новый снимок?",
    children: "Откройте карту пациента и нажмите \"Добавить снимок\".",
  },
  {
    key: "2",
    label: "Как открыть результат цитологии?",
    children: "На странице пациента выберите исследование и нажмите \"Открыть\".",
  },
];

export default function FaqRoute() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <Typography.Title level={2}>FAQ</Typography.Title>
      <Collapse items={items} />
    </div>
  );
}
