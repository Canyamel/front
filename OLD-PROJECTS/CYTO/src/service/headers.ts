import { AuthState } from "../stores/authSlice";

export const prepareHeaders = (headers: Headers, { getState }: { getState: () => unknown }) => {
    const token = (getState() as { auth: AuthState }).auth.accessToken;

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    } else {
        headers.delete("Authorization");
    }

    return headers;
};
