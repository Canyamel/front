import { prepareHeaders } from "./headers";
import { getApiBaseUrl } from "./apiBaseUrl";
import { refreshAccessToken } from "./reauth";

export const downloadUziImage = async (
    uzi_id: string,
    image_id: string,
    token: string | undefined
) => {
    const url = getApiBaseUrl();
    let accessToken = token;
    let response = await fetch(`${url}download/${uzi_id}/${image_id}`, {
        headers: prepareHeaders(new Headers(), {
            getState: () => ({ auth: { accessToken } }),
        }),
    });

    if (response.status === 401) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
            accessToken = refreshedToken;
            response = await fetch(`${url}download/${uzi_id}/${image_id}`, {
                headers: prepareHeaders(new Headers(), {
                    getState: () => ({ auth: { accessToken: refreshedToken } }),
                }),
            });
        }
    }

    if (response.status === 200) {
        const blob = await response.blob();
        return {
            imageUrl: window.URL.createObjectURL(blob),
            accessToken,
        };
    }

    return {
        imageUrl: null,
        accessToken: undefined,
    };
};
