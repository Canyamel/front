"use client";

import "./page.scss";

import { useCallback, useState } from "react";
import { Form, Input, Button, Badge, Space } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { UserIcon } from "@medml/ui";
import { EmailIcon, PasswordIcon } from "@medml/ui";

import { useAuthApi } from "../../contexts/AuthApiContext";
import { validateEmail } from "../../utils/validateEmail";
import { validatePassword } from "../../utils/validatePassword";
import AuthFormWrapper from "../../components/AuthFormWrapper";
import { useAuthError } from "../../contexts/AuthErrorContext";

const { Password } = Input;

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

interface RegisterPageProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const RegisterPage = ({ onSuccess, onError }: RegisterPageProps) => {
  const router = useRouter();
  const authApi = useAuthApi();
  const [form] = Form.useForm<RegisterFormData>();
  const [disabledButton, setDisabledButton] = useState(true);
  const password = Form.useWatch('password', form);
  const { hasError, setHasError, setErrorMessage } = useAuthError();
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const checkFormValidity = useCallback(() => {
    form
      .validateFields()
      .then(() => {
        setDisabledButton(false);
        setHasError(false);
        setErrorMessage(null);
      })
      .catch((err: { errorFields?: Array<{ errors: string[] }> }) => {
        setDisabledButton(true);
        setHasError(true);
        const firstMessage = err?.errorFields?.[0]?.errors?.[0];
        setErrorMessage(firstMessage ?? null);
      });
  }, [form, setHasError, setErrorMessage]);

  const handleValuesChange = useCallback(() => {
    setTimeout(() => checkFormValidity(), 0);
  }, [checkFormValidity]);

  const handleFinishFailed = useCallback(
    ({ errorFields }: { errorFields?: Array<{ errors: string[] }> }) => {
      setHasError(true);
      const firstMessage = errorFields?.[0]?.errors?.[0];
      setErrorMessage(firstMessage ?? "Заполните поля корректно");
    },
    [setHasError, setErrorMessage]
  );

  const handleSubmit = useCallback(
    async (values: RegisterFormData) => {
      try {
        setHasError(false);
        setErrorMessage(null);
        setIsRegisterLoading(true);

        const nameParts = values.fullName.trim().split(/\s+/).filter((word: string) => word.length > 0);
        const lastName = nameParts[0] || "";
        const firstName = nameParts[1] || "";
        const fathersName = nameParts[2] || "";

        await authApi.register({
          email: values.email,
          last_name: lastName,
          first_name: firstName,
          fathers_name: fathersName,
          med_organization: "",
          password1: values.password,
          password2: values.confirmPassword,
        });

        const result = await signIn("credentials", {
          username: values.email,
          password: values.password,
          redirect: false,
        });

        if (result?.ok) {
          setHasError(false);
          setErrorMessage(null);
          if (onSuccess) {
            onSuccess();
          } else {
            router.push("/");
          }
        } else {
          const errorMsg = result?.error || "Неверные данные для входа";
          setHasError(true);
          setErrorMessage(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
        }
      } catch (error: unknown) {
        const err = error as { data?: { detail?: string; message?: string } };
        const errorMsg = err?.data?.detail ?? err?.data?.message ?? "Неверные данные";
        setHasError(true);
        setErrorMessage(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      } finally {
        setIsRegisterLoading(false);
      }
    },
    [authApi, router, onSuccess, onError, setHasError, setErrorMessage]
  );

  const passwordRules = useCallback((ruleNumber: number) => {
    if (!password || password.length === 0) {
      return "default";
    }

    if (
      (ruleNumber === 1 && password.length < 8) ||
      (ruleNumber === 2 && !/[A-Z]/.test(password)) ||
      (ruleNumber === 3 && !/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?\/~`]/.test(password))
    ) {
      return "warning";
    }

    if (
      (ruleNumber === 1 && password.length >= 8) ||
      (ruleNumber === 2 && /[A-Z]/.test(password)) ||
      (ruleNumber === 3 && /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?\/~`]/.test(password))
    ) {
      return "success";
    }

    return "default";
  }, [password]);

  return (
    <AuthFormWrapper>
      <Form
        className="register-form"
        form={form}
        onFinish={handleSubmit}
        onFinishFailed={handleFinishFailed}
        onValuesChange={handleValuesChange}
        layout="vertical"
      >
        <Form.Item
          label="ФИО"
          name="fullName"
          rules={[
            { required: true, message: "Введите ФИО" },
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.resolve();
                }
                const words = value.trim().split(/\s+/).filter((word: string) => word.length > 0);
                if (words.length < 2) {
                  return Promise.reject(new Error("ФИО должно состоять минимум из двух слов"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input prefix={<UserIcon />} size="large" placeholder="ФИО" />
        </Form.Item>

        <Form.Item
          label="Электронная почта"
          name="email"
          rules={[
            { required: true, message: "Введите электронную почту" },
            {
              validator: (_, value) => {
                if (!value || validateEmail(value)) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Введите электронную почту")
                );
              },
            },
          ]}
        >
          <Input prefix={<EmailIcon />} type="email" size="large" placeholder="Email" />
        </Form.Item>

        <Form.Item
          label="Пароль"
          name="password"
          rules={[
            { required: true, message: "Введите пароль" },
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.resolve();
                }
                const validation = validatePassword(value);
                if (validation.isValid) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Введите пароль"));
              },
            },
          ]}
        >
          <Password prefix={<PasswordIcon />} size="large" placeholder="Пароль" />
        </Form.Item>

        <Space direction="vertical" className="password-rules">
          <Badge status={passwordRules(1)} text="Не менее 8 символов" />
          <Badge status={passwordRules(2)} text="Минимум одна заглавная буква" />
          <Badge status={passwordRules(3)} text="Минимум один спецсимвол (!, %, #, и т.д.)" />
        </Space>

        <Form.Item
          label="Повторите пароль"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Повторите пароль" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Пароли не совпадают"));
              },
            }),
          ]}
        >
          <Password prefix={<PasswordIcon />} size="large" placeholder="Повторите пароль" />
        </Form.Item>
        <Form.Item>
          <Button
            className="register-submit"
            type="primary"
            htmlType="submit"
            size="large"
            block
            disabled={disabledButton}
            loading={isRegisterLoading}
          >
            {hasError ? "Неверные данные" : "Создать аккаунт"}
          </Button>
        </Form.Item>
      </Form>
    </AuthFormWrapper>
  );
};

export default RegisterPage;
