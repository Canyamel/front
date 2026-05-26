import { Navigate, type RouteObject } from "react-router-dom";

import AppShell from "@/layouts/AppShell";
import RequireAuth from "@/layouts/RequireAuth";
import LoginRoute from "@/pages/LoginRoute";
import PatientsRoute from "@/pages/PatientsRoute";
import PlaceholderRoute from "@/pages/PlaceholderRoute";
import UploadPhotoRoute from "@/pages/UploadPhotoRoute";
import PatientProfileRoute from "@/pages/PatientProfileRoute";
import UziViewRoute from "@/pages/UziViewRoute";
import LegacyResultRedirect from "@/pages/LegacyResultRedirect";
import FaqRoute from "@/pages/FaqRoute";
import SubscriptionRoute from "@/pages/SubscriptionRoute";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        path: "auth/login",
        element: <LoginRoute />,
      },
      {
        path: "auth/register",
        element: <PlaceholderRoute title="Регистрация" />,
      },
      {
        index: true,
        element: <Navigate to="/patients" replace />,
      },
      {
        path: "faq",
        element: (
          <RequireAuth>
            <FaqRoute />
          </RequireAuth>
        ),
      },
      {
        path: "subscription",
        element: (
          <RequireAuth>
            <SubscriptionRoute />
          </RequireAuth>
        ),
      },
      {
        path: "patients",
        element: (
          <RequireAuth>
            <PatientsRoute />
          </RequireAuth>
        ),
      },
      {
        path: "patient_profile",
        element: (
          <RequireAuth>
            <PatientProfileRoute />
          </RequireAuth>
        ),
      },
      {
        path: "upload_photo",
        element: (
          <RequireAuth>
            <UploadPhotoRoute />
          </RequireAuth>
        ),
      },
      {
        path: "result",
        element: (
          <RequireAuth>
            <LegacyResultRedirect />
          </RequireAuth>
        ),
      },
      {
        path: "result/:uziId",
        element: (
          <RequireAuth>
            <LegacyResultRedirect />
          </RequireAuth>
        ),
      },
      {
        path: "uzi_view/:uziId",
        element: (
          <RequireAuth>
            <UziViewRoute />
          </RequireAuth>
        ),
      },
    ],
  },
];

export default routes;
