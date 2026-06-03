import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
    accessToken: string | undefined;
}

const initialState: AuthState = {
    accessToken: undefined,
};

const authSlice = createSlice({
    name: "authSlice",
    initialState,
    reducers: {
        setToken(state, action: PayloadAction<string | undefined>) {
            state.accessToken = action.payload;
        },
    },
});

export const { setToken } = authSlice.actions;

export default authSlice;
