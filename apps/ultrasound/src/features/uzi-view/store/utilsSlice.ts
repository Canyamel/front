import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UtilsState {
    loading: {
        [key: string]: boolean;
    };
    error: {
        [key: string]: string;
    };
}

const initialState: UtilsState = {
    loading: {},
    error: {},
};

const utilsSlice = createSlice({
    name: "utilsSlice",
    initialState,
    reducers: {
        addLoading(state, action: PayloadAction<string>) {
            state.loading[action.payload] = true;
        },

        deleteLoading(state, action: PayloadAction<string>) {
            delete state.loading[action.payload];
        },

        addError(state, action: PayloadAction<{ key: string; message: string }>) {
            state.error[action.payload.key] = action.payload.message;
        },

        deleteError(state, action: PayloadAction<string>) {
            delete state.error[action.payload];
        },
    },
});

export const { addLoading, deleteLoading, addError, deleteError } = utilsSlice.actions;

export default utilsSlice;
