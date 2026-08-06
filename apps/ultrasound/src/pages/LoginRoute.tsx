import { useNavigate, useSearchParams } from 'react-router-dom'

import LoginPage from '../../../../domains/auth/src/pages/login/page'
import AuthLayoutSpa from '../../../../domains/auth/src/components/AuthLayoutSpa/AuthLayoutSpa'
import { AuthApiProvider } from '../../../../domains/auth/src/contexts/AuthApiContext'
import { DEFAULT_POST_AUTH_PATH } from '../../../../domains/auth/src/constants/routes'
import { sanitizeInternalPath } from '../../../../domains/auth/src/utils/sanitizeCallbackUrl'
import { useUltrasoundAuthApi } from '@/lib/authApiAdapter'

export default function LoginRoute() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const authApi = useUltrasoundAuthApi()

	const handleSuccess = () => {
		const raw = searchParams.get('callbackUrl')
		const target = sanitizeInternalPath(raw) ?? DEFAULT_POST_AUTH_PATH
		navigate(target, { replace: true })
	}

	return (
		<AuthApiProvider api={authApi}>
			<AuthLayoutSpa>
				<LoginPage onSuccess={handleSuccess} callbackUrl={searchParams.get('callbackUrl')} />
			</AuthLayoutSpa>
		</AuthApiProvider>
	)
}
