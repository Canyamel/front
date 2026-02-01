import { AuthState } from "@/stores/authSlice";

export const authHeaders = async (headers: Headers, { getState }: { getState: () => unknown }) => {
    headers.set(
        "Authorization",
        `Bearer ${(getState() as { auth: AuthState }).auth.accessToken ?? ""}`
    );

    return headers;
};
