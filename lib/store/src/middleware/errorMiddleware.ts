import { isRejectedWithValue, isRejected } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { message } from "antd";

/** Текст из тела ответа API: `message`, `detail`, массивы FastAPI и т.п. */
function textFromResponseData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const msg = d.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg) && msg.length && typeof msg[0] === "string") return msg.join(" ");
  const detail = d.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    if (first && typeof first === "object" && first !== null && "msg" in first) {
      const m = (first as { msg?: unknown }).msg;
      if (typeof m === "string" && m.trim()) return m;
    }
  }
  return null;
}

function textFromRejectedPayload(payload: unknown): string | null {
  if (payload == null) return null;
  const e = payload as FetchBaseQueryError;
  if (typeof e === "object" && e !== null && "status" in e) {
    if (e.status === "FETCH_ERROR" || e.status === "PARSING_ERROR" || e.status === "TIMEOUT_ERROR") {
      return typeof e.error === "string" && e.error.trim() ? e.error : null;
    }
    const fromBody = textFromResponseData(e.data);
    if (fromBody) return fromBody;
  }
  return null;
}

const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const text =
      textFromRejectedPayload(action.payload) ?? "Что-то пошло не так";
    message.error(text);
  } else if (isRejected(action)) {
    const se = action.error as SerializedError | undefined;
    const fromSerialized =
      typeof se?.message === "string" && se.message.trim() ? se.message : null;
    message.error(fromSerialized ?? "Что-то пошло не так");
  }

  return next(action);
};

export default errorMiddleware;

