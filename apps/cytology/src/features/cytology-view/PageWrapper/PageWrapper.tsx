import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";

import { useAppDispatch } from "@cytology/core/hooks";
import { setToken } from "@/stores/authSlice";

interface PageWrapperProps {
    children: ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
    const dispatch = useAppDispatch();

    const { data }: { data: (Session & { accessToken?: string }) | null } = useSession();

    useEffect(() => {
        dispatch(setToken(data?.accessToken));
    }, [data]);

    return children;
};

export default PageWrapper;
