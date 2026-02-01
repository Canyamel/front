"use client";
import { Flex, Form, Space } from "antd";
import { useCallback, useState, useMemo } from "react";
import Link from "next/link";
import TextField from "@/components/Universal/TextField/TextField";
import Text from "@/components/Universal/Text/Text";
import Button from "@/components/Universal/Button/Button";
import { RegisterFormData } from "@/app/auth-pages/register/Types";
import { Templates } from "@/app/auth-pages/register/Templates";
import isHaveEmailErrors from "@/utils/isHaveEmailErrors";
import { signIn } from "next-auth/react";
import noop from "lodash-es/noop";
import { useRouter } from "next/navigation";
import { useRegisterUserMutation } from "@/service/auth";
import { useRTKEffects } from "@/service/hook";

const {
    IS_ERROR_EMAIL_TEXT,
    IS_ERROR_CONFIRM_PASSWORD_TEXT,
    IS_ERROR_STRONG_PASSWORD_TEXT,
    IS_ERROR_LASTNAME_TEXT,
    IS_ERROR_FIRSTNAME_TEXT,
    IS_ERROR_FATHER_NAME_TEXT,
    IS_HAVE_ACCOUNT,
    EMAIL_TEXT,
    PASSWORD_TEXT,
    LASTNAME_TEXT,
    FIRSTNAME_TEXT,
    FATHER_NAME_TEXT,
    CONFIRM_PASSWORD_TEXT,
    CREATE_ACCOUNT_TEXT,
    ENTER_LINK_TEXT,
    PASSWORD_RULES,
} = Templates;
export default function RegisterForm() {
    const router = useRouter();

    const [registerUser, { isLoading: isRegisterLoading, error: registerError }] =
        useRegisterUserMutation();
    useRTKEffects({ isLoading: isRegisterLoading, error: registerError }, "Register user");

    const [form] = Form.useForm<RegisterFormData>();

    const { email, password, confirmPassword, lastName, firstName } = Form.useWatch(
        ({ email, password, confirmPassword, lastName, firstName }) => ({
            email,
            password,
            confirmPassword,
            lastName,
            firstName,
        }),
        form
    ) ?? {
        email: "",
        password: "",
        confirmPassword: "",
        lastName: "",
        firstName: "",
    };

    const isErrorEmail = useMemo(() => {
        console.log(isHaveEmailErrors(email));
        return isHaveEmailErrors(email);
    }, [email]);

    const isErrorPassword = useMemo(() => {
        const hasMinLength = password?.length >= 8;
        const hasUpperLetter = /[A-ZА-Я]/.test(password);
        const hasLowerLetter = /[a-zа-я]/.test(password);
        const hasSpecialCharacter = /[#!$%&^*_+|=?,.\/\\]/.test(password);
        return !(
            hasMinLength &&
            hasUpperLetter &&
            hasUpperLetter &&
            hasLowerLetter &&
            hasSpecialCharacter
        );
    }, [password]);

    const [isVisibleSupportTextPassword, setIsVisibleSupportTextPassword] =
        useState<boolean>(false);

    const handleInputFocus = useCallback(() => {
        setIsVisibleSupportTextPassword(true);
    }, [setIsVisibleSupportTextPassword]);

    const handleInputBlur = useCallback(() => {
        setIsVisibleSupportTextPassword(false);
    }, [setIsVisibleSupportTextPassword]);

    const onFinish = useCallback(
        async ({ email, password, lastName, firstName, fatherName }: RegisterFormData) => {
            try {
                await registerUser({
                    email: email,
                    last_name: lastName,
                    first_name: firstName,
                    fathers_name: fatherName,
                    med_organization: "",
                    password1: password,
                    password2: password,
                }).unwrap();

                const res = await signIn("credentials", {
                    username: email,
                    password: password,
                    redirect: false,
                }).catch(noop);

                if (res?.ok) {
                    router.push("/patients");
                } else {
                    alert("Во время входа возникла ошибка");
                }
            } catch (error) {
                alert("Во время регистрации возникла ошибка");
                console.log("error", error);
            }
        },
        [registerUser, router]
    );

    return (
        <>
            <Form className="register_form" onFinish={onFinish} layout="vertical" form={form}>
                <Flex vertical gap={10}>
                    <Text className="title_auth">Зарегистрироваться</Text>

                    <TextField
                        errorText={IS_ERROR_LASTNAME_TEXT}
                        name="lastName"
                        label={LASTNAME_TEXT}
                        isError={lastName?.length == 0}
                    />

                    <TextField
                        errorText={IS_ERROR_FIRSTNAME_TEXT}
                        name="firstName"
                        label={FIRSTNAME_TEXT}
                        isError={firstName?.length == 0}
                    />

                    <TextField
                        errorText={IS_ERROR_FATHER_NAME_TEXT}
                        name="fatherName"
                        label={FATHER_NAME_TEXT}
                        required={false}
                    />

                    <TextField
                        errorText={IS_ERROR_EMAIL_TEXT}
                        name="email"
                        label={EMAIL_TEXT}
                        isError={isErrorEmail}
                    />

                    <TextField
                        errorText={IS_ERROR_STRONG_PASSWORD_TEXT}
                        name="password"
                        label={PASSWORD_TEXT}
                        isError={isErrorPassword}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        isPassword
                    />

                    <Space
                        style={{
                            overflow: "hidden",
                            height: isVisibleSupportTextPassword ? 115 : 0,
                            transition: "height 0.5s ease-in-out",
                        }}
                    >
                        <Text className="condition_password">{PASSWORD_RULES}</Text>
                    </Space>

                    <TextField
                        errorText={IS_ERROR_CONFIRM_PASSWORD_TEXT}
                        name="confirmPassword"
                        label={CONFIRM_PASSWORD_TEXT}
                        isError={confirmPassword != password}
                        isPassword
                    />

                    <Button
                        title={CREATE_ACCOUNT_TEXT}
                        type="primary"
                        htmlType="submit"
                        size="large"
                    />

                    <Flex gap={10}>
                        <Text className="text_strong">{IS_HAVE_ACCOUNT}</Text>

                        <Link href="/auth-pages/login" className="link_strong">
                            {ENTER_LINK_TEXT}
                        </Link>
                    </Flex>
                </Flex>
            </Form>
        </>
    );
}
