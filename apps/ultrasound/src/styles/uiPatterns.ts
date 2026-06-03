import type { CSSProperties } from "react";

type TokenLike = {
  colorBgContainer?: string;
  colorBgLayout: string;
};

export const getSurfaceCardStyle = (token: TokenLike): CSSProperties => ({
  background: token.colorBgContainer || "#ffffff",
  borderRadius: 8,
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  border: "1px solid #e5e7eb",
});

export const getPageSurfaceStyle = (token: TokenLike): CSSProperties => ({
  backgroundColor: token.colorBgLayout,
  padding: "16px",
  borderRadius: 8,
});
