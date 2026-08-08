import type { CSSProperties } from "react";

type TokenLike = {
  colorBgContainer?: string;
  colorBgLayout: string;
};

/** Акцентный цвет вторичных кнопок (был продублирован как magic value в разных местах). */
export const ACCENT_OUTLINE_COLOR = "#194964";

export const getAccentOutlineButtonStyle = (): CSSProperties => ({
  color: ACCENT_OUTLINE_COLOR,
  borderColor: ACCENT_OUTLINE_COLOR,
});

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
