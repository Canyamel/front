import { prepareHeaders } from "./headers";

export const downloadUziImage = async (
    uzi_id: string,
    image_id: string,
    token: string | undefined
) => {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL || "http://194.226.121.145:8080/api/v1/";
    const response = await fetch(`${url}download/${uzi_id}/${image_id}`, {
        headers: prepareHeaders(new Headers(), {
            getState: () => ({ auth: { accessToken: token } }),
        }),
    });

    if (response.status === 200) {
        const blob = await response.blob();

        return window.URL.createObjectURL(blob);
    }

    return null;
};
