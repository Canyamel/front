import { useEffect } from "react";

import { useAppDispatch } from "../stores/hook";
import { addError, addLoading, deleteLoading } from "../stores/utilsSlice";

export const useRTKEffects = (
    { isLoading, error }: { isLoading?: boolean; error?: any },
    actionType: string,
    errorDefaultMessage?: string
) => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isLoading !== undefined) {
            if (isLoading) {
                dispatch(addLoading(actionType));
            } else {
                dispatch(deleteLoading(actionType));
            }
        }
    }, [isLoading, actionType, dispatch]);

    useEffect(() => {
        if (error) {
            console.error(error);
            const message = errorDefaultMessage || error.error || "Что-то пошло не так";
            dispatch(addError({ key: actionType, message }));
        }
    }, [error, actionType, dispatch, errorDefaultMessage]);
};
