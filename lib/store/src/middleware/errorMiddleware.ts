import { isRejectedWithValue, isRejected } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";
import { message } from "antd";

const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const payload = action.payload as { data?: { detail?: string } };
    message.error(payload?.data?.detail ?? "Что-то пошло не так");
  } else if (isRejected(action)) {
    message.error("Что-то пошло не так");
  }

  return next(action);
};

export default errorMiddleware;

