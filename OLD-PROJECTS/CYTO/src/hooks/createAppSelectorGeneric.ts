import { TypedUseSelectorHook, useSelector } from "react-redux";

export const createAppSelectorGeneric = <T>() => {
    return useSelector as TypedUseSelectorHook<T>;
};

export default createAppSelectorGeneric;
