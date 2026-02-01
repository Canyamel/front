'use client'
import { useCallback, useMemo } from 'react'
import { Flex, Form, notification } from 'antd'
import Link from 'next/link'
import TextField from '@/components/Universal/TextField/TextField'
import Text from '@/components/Universal/Text/Text'
import Button from '@/components/Universal/Button/Button'
import { LoginFormData } from '@/app/auth-pages/login/Types'
import { Templates } from './Templates'
import '@/app/auth-pages/auth.css'
import noop from 'lodash-es/noop'
import { signIn } from 'next-auth/react'
import isHaveEmailErrors from '@/utils/isHaveEmailErrors'
import { useRouter } from 'next/navigation'
import useAPI from '@/utils/useAPI/useAPI'
import { NotificationProvider } from '@/utils/NotificationProvider'

const {
    IS_ERROR_EMAIL_TEXT,
    IS_ERROR_PASSWORD_TEXT,
    EMAIL_TEXT,
    PASSWORD_TEXT,
    BUTTON_TEXT,
    IS_NOT_EXIST_ACCOUNT,
    REGISTER_LINK_TEXT,
    ENTER_BUTTON_TEXT,
    IS_LOGIN_ERROR,
} = Templates

export default function LoginForm() {
    const [LoginError, LoginCallback] = useAPI<any>({
        requestMethod: 'post',
        isCallback: true,
        authRequired: false,
        APIController: 'login',
        errorTemplate: IS_LOGIN_ERROR,
        APIMethod: '',
    })

    const router = useRouter()

    const [form] = Form.useForm<LoginFormData>()

    const { email, password } = Form.useWatch(
        ({ email, password }) => ({ email, password }),
        form
    ) ?? {
        email: '',
        password: '',
    }

    const isErrorEmail = useMemo(() => {
        return isHaveEmailErrors(email)
    }, [email])

    const onFinish = useCallback(
        (values: LoginFormData) => {
            console.log(values)

            const { email, password } = values

            signIn('credentials', {
                email: email,
                password: password,
                redirect: true,
                callbackUrl: '/patients',
            })
                .then(async (res) => {
                    console.log('enter', res)
                    if (res?.ok == true) {
                        router.push('/patients')
                    } else {
                        alert('Во время входа возникла ошибка')
                    }
                })
                .catch(noop)
        },
        [router]
    )

    return (
        <Form
            className="enter_form"
            onFinish={onFinish}
            layout="vertical"
            form={form}
        >
            <Flex vertical gap={10}>
                <Text className="title_auth">{ENTER_BUTTON_TEXT}</Text>
                <TextField
                    errorText={IS_ERROR_EMAIL_TEXT}
                    name="email"
                    label={EMAIL_TEXT}
                    isError={isErrorEmail}
                />
                <TextField
                    errorText={IS_ERROR_PASSWORD_TEXT}
                    name="password"
                    label={PASSWORD_TEXT}
                    isPassword
                    isError={password?.length === 0}
                />
                <Button
                    title={BUTTON_TEXT}
                    type="primary"
                    htmlType="submit"
                    size="large"
                />
                <Flex gap={10}>
                    <Text className="text_strong">{IS_NOT_EXIST_ACCOUNT}</Text>
                    <Link href="/auth-pages/register" className="link_strong">
                        {REGISTER_LINK_TEXT}
                    </Link>
                </Flex>
            </Flex>
        </Form>
    )
}
