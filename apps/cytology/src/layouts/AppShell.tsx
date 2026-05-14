import { Outlet } from "react-router-dom";

import Footer from "../../../../domains/layout/src/components/Footer/Footer";
import HeaderSpa from "../../../../domains/layout/src/components/Header/HeaderSpa";

import { clearAuthTokens } from "@/lib/tokenStorage";

import "../../../../lib/ui/src/providers/RootProvider/RootProvider.scss";
import "./AppShell.scss";

export default function AppShell() {
  return (
    <div className="root-layout">
      <HeaderSpa onLogoutClearStorage={clearAuthTokens} />
      <main className="root-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
