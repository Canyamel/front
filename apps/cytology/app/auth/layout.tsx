import { AuthLayout } from "@medml/auth";

export default function AuthLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}

