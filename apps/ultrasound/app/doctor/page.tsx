"use client";

import React from "react";
import { Row, Col } from "antd";

// UI-only copies from thyroid-ultrasound-intelligent-assistant-front
// NOTE: data-loading hooks (RTK Query) are intentionally removed/commented out

import StatsSection from "./ui/StatsSection";
import QuickActionsSection from "./ui/QuickActionsSection";
import ActivitySection from "./ui/ActivitySection";
import DiagnosticsSection from "./ui/DiagnosticsSection";

// TODO: replace stubs with real data sources (RTK Query / API) in this app

const mockNotifications = {
  results: [
    {
      id: 1,
      title: "Новый результат исследования",
      message: "Появился новый результат УЗИ по пациенту Иванов И.И.",
    },
    {
      id: 2,
      title: "Напоминание",
      message: "Проверьте диагностические заключения за сегодня.",
    },
  ],
};

const mockPatients: any[] = [
  {
    id: 1,
    patient: {
      last_name: "Иванов",
      first_name: "Иван",
      fathers_name: "Иванович",
      personal_policy: "1234567890123456",
    },
    acceptance_datetime: new Date().toISOString(),
    diagnosis: "Узел щитовидной железы",
    has_nodules: "T",
  },
  {
    id: 2,
    patient: {
      last_name: "Петрова",
      first_name: "Анна",
      fathers_name: "Сергеевна",
      personal_policy: "6543210987654321",
    },
    acceptance_datetime: new Date().toISOString(),
    diagnosis: "Без особенностей",
    has_nodules: "F",
  },
];

const DoctorPage = () => {
  // const { isAuthenticated, logout } = useAuth();
  // const userId = useAppSelector((state) => state.auth.userId);
  //
  // const { data: user } = useGetUserDataQuery(String(userId ?? ""), {
  //   skip: !userId,
  // });
  // const { data: rawPatients } = useGetPatientsQuery(String(userId ?? ""), {
  //   skip: !userId,
  // });
  // const { data: notifications } = useGetNotificationsQuery(
  //   String(userId ?? ""),
  //   { skip: !userId }
  // );

  // UI-only stubbed data
  const patients = mockPatients;
  const notifications = mockNotifications;

  const formatDate = (iso: string): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}.${d.getFullYear()}`;
  };

  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, "0")}.${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}.${today.getFullYear()}`;

  const diagnosticsToday = patients.filter(
    (p) => formatDate(p.acceptance_datetime) === todayStr
  ).length;

  const onReview = patients.filter((p) => p.has_nodules === "T").length;
  const withExperts = 0;
  const modelAccuracy = patients.length > 0 ? 94 : 0;

  const sorted = [...patients].sort(
    (a, b) =>
      new Date(b.acceptance_datetime).getTime() -
      new Date(a.acceptance_datetime).getTime()
  );

  return (
    <div className="doctor-dash-container" style={{ padding: 24 }}>
      <StatsSection
        diagnosticsToday={diagnosticsToday}
        onReview={onReview}
        withExperts={withExperts}
        modelAccuracy={modelAccuracy}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <ActivitySection notifications={notifications} />
        </Col>
        <Col xs={24} md={8}>
          <QuickActionsSection />
        </Col>
      </Row>

      <DiagnosticsSection sortedPatients={sorted} formatDate={formatDate} />
    </div>
  );
};

export default DoctorPage;

