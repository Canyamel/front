import { AuthState } from '../slices/authSlice';

export const prepareHeaders = (
  headers: Headers,
  { getState }: { getState: () => unknown }
) => {
  const state = getState() as { auth: AuthState };
  const token = state?.auth?.accessToken;

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }

  return headers;
};

