"use client";

import "./Header.scss";

import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Typography } from "antd";

import { useAppDispatch, useAppSelector, setToken } from "@medml/store";
import { HeaderIcon } from "@medml/ui";

const { Text } = Typography;

export interface HeaderSpaProps {
  /** Очистка токенов вне Redux (например localStorage refresh/access). */
  onLogoutClearStorage?: () => void;
}

export default function HeaderSpa({ onLogoutClearStorage }: HeaderSpaProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const isAuthenticated = Boolean(accessToken);
  const showLoginButton = !isAuthenticated && pathname !== "/auth/login";
  const showRegisterButton = !isAuthenticated && pathname === "/auth/login";

  /** Список пациентов и карточка пациента — один раздел навигации. */
  const isPatientsNavActive =
    pathname === "/patients" || pathname === "/patient_profile";

  const isFaqActive = pathname === "/faq";

  const handleLogout = () => {
    dispatch(setToken(undefined));
    onLogoutClearStorage?.();
    navigate("/auth/login", { replace: true });
  };

  return (
    <Card className="header-card">
      <div className="header-content">
        <NavLink to="/" className="header-icon">
          <HeaderIcon />
        </NavLink>

        <div className="header-links">
          <NavLink to="/upload_photo">
            {({ isActive }) => (
              <Text type={isActive ? undefined : "secondary"} className="header-nav-text">
                Загрузка
              </Text>
            )}
          </NavLink>

          <NavLink to="/patients">
            <Text type={isPatientsNavActive ? undefined : "secondary"} className="header-nav-text">
              Пациенты
            </Text>
          </NavLink>

          <NavLink to="/faq">
            <Text type={isFaqActive ? undefined : "secondary"} className="header-nav-text">
              FAQ
            </Text>
          </NavLink>
        </div>

        {isAuthenticated && (
          <Button type="text" onClick={handleLogout}>
            <Text className="header-nav-text">Выйти</Text>
          </Button>
        )}

        {showLoginButton && (
          <NavLink to="/auth/login">
            <Button className="header-button">
              <Text className="header-nav-text">Вход</Text>
            </Button>
          </NavLink>
        )}

        {showRegisterButton && (
          <NavLink to="/auth/register">
            <Button className="header-button">
              <Text className="header-nav-text">Регистрация</Text>
            </Button>
          </NavLink>
        )}
      </div>
    </Card>
  );
}
