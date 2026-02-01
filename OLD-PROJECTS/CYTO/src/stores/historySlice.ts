import { createSlice } from "@reduxjs/toolkit";

interface HistoryState {
    open:boolean;
};

const initialState:HistoryState = {
    open:false
};

const historySlice = createSlice({
    name:"history",
    initialState,
    reducers: {
        handleShow:(state) => {
            state.open = true;
        },
        handleOk:(state) => {
            //Корректировка истории
            state.open = false;
        },
        handleCancel:(state) => {
            state.open = false;
        }
    }
});

export const { handleShow, handleOk, handleCancel } = historySlice.actions;

export default historySlice;