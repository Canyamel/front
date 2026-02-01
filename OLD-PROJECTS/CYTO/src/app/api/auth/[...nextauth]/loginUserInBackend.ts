import apiInstance from "@/utils/apiInstance";

export default async function loginUserInBackend(email: string, password: string) {
    console.log("loginUserInBackend");

    console.log("email", email);

    console.log("password", password);

    const response = await apiInstance({
        method: "POST",
        url: `auth/login/`,
        data: {
            email,
            password,
        },
    });

    const { access, refresh } = response.data;
    console.log(response.data);
    return { access, refresh };
}
