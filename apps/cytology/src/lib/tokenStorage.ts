import { tokenStorage } from '@medml/store'

export const {
	isSessionRemembered,
	setRememberSession,
	getAuthToken,
	setAuthToken,
	getRefreshToken,
	setRefreshToken,
	clearAuthToken,
	clearRefreshToken,
	clearAuthTokens,
} = tokenStorage
