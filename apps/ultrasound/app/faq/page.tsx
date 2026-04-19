"use client";

import FAQHeader from "./ui/FAQHeader";
import FAQAccordion from "./ui/FAQAccordion";
import FAQContainer from "./ui/FAQContainer";

const FAQPage = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        padding: "20px 0",
      }}
    >
      <FAQContainer>
        <FAQHeader
          title="Как использовать ассистента?"
          subtitle="Ответы на часто задаваемые вопросы о работе системы диагностики щитовидной железы"
        />

        <FAQAccordion />
      </FAQContainer>
    </div>
  );
};

export default FAQPage;

