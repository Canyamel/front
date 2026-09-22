import { Outlet } from "react-router-dom";

import { Footer, HeaderSpa } from "@medml/layout";

import { useCurrentDoctor } from "@/api/hooks/useCurrentDoctor";
import { clearAuthTokens } from "@/lib/tokenStorage";

import "@medml/ui/providers/RootProvider/RootProvider.scss";
import "./AppShell.scss";

export default function AppShell() {
  const doctor = useCurrentDoctor();

  return (
    <div className="root-layout">
      <HeaderSpa
        onLogoutClearStorage={clearAuthTokens}
        userInitials={doctor.initials}
        userName={doctor.shortName}
        userFullName={doctor.profile?.fullName}
      />
      <main className="root-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
