import { baseApi } from "./baseApi";

interface RegisterPayload {
    email: string;
    last_name: string;
    first_name: string;
    fathers_name?: string;
    med_organization?: string;
    password1: string;
    password2: string;
}

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        registerUser: builder.mutation<void, RegisterPayload>({
            query: (payload) => ({
                url: "/auth/register/",
                method: "POST",
                body: payload,
            }),
            invalidatesTags: ["Auth"],
        }),
    }),
});

export const { useRegisterUserMutation } = authApi;

