import { Outlet, useLocation } from "react-router-dom";

import { ErrorBoundary, Footer, HeaderSpa } from "@medml/layout";

import { useCurrentDoctor } from "@/lib/useCurrentDoctor";
import { clearAuthTokens } from "@/lib/tokenStorage";

import "@medml/ui/providers/RootProvider/RootProvider.scss";
import "./AppShell.scss";

export default function AppShell() {
  const doctor = useCurrentDoctor();
  const location = useLocation();

  return (
    <div className="root-layout">
      <HeaderSpa
        onLogoutClearStorage={clearAuthTokens}
        userInitials={doctor.initials}
        userName={doctor.shortName}
        userFullName={doctor.profile?.fullName}
      />
      <main className="root-content">
        {/* Смена адреса снимает ошибку: по шапке можно уйти со сломанной страницы. */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
