"use client";

import "./Header.scss";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button, Card, Typography } from "antd";

import { HeaderIcon } from "@medml/ui";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const { Title } = Typography;

const Header = () => {
  const { data: session } = useSession();
  const pathname = usePathname();

  // const handleSignOut = useCallback(() => {
  //   signOut({ callbackUrl: "/auth/login" });
  // }, []);

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
          <Link href="/export">
            <Title level={5} type="secondary">Профиль врача</Title>
          </Link>
        </div>

        {!session && pathname !== "/auth/login" && (
          <Link href="/auth/login">
            <Button className="header-button">
              <Title level={5}>Вход</Title>
            </Button>
          </Link>
        )}

        {!session && pathname === "/auth/login" && (
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

