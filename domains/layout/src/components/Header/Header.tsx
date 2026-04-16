"use client";

import "./Header.scss";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button, Card, Typography } from "antd";

import { HeaderIcon } from "@medml/ui";
import { usePathname } from "next/navigation";

const { Title } = Typography;

const Header = () => {
  const { status } = useSession();
  const pathname = usePathname();

  const isAuthenticated = status === "authenticated";
  const showLoginButton = !isAuthenticated && status !== "loading" && pathname !== "/auth/login";
  const showRegisterButton =
    !isAuthenticated && status !== "loading" && pathname === "/auth/login";

  return (
    <Card className="header-card">
      <div className="header-content">
        <Link href="/" className="header-icon">
          <HeaderIcon />
        </Link>

        <div className="header-links">
          <Link href="/upload_photo">
            <Title level={5} type="secondary">Загрузка</Title>
          </Link>
          <Link href="/patients" >
            <Title level={5} type="secondary">Пациенты</Title>
          </Link>
          <Link href="/faq">
            <Title level={5} type="secondary">FAQ</Title>
          </Link>
        </div>

        {showLoginButton && (
          <Link href="/auth/login">
            <Button className="header-button">
              <Title level={5}>Вход</Title>
            </Button>
          </Link>
        )}

        {showRegisterButton && (
          <Link href="/auth/register">
            <Button className="header-button">
              <Title level={5}>Регистрация</Title>
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
};

export default Header;

