import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UploadPhotoState {
    open: boolean;
    idCard: number;
    marking: string;
    number: number;
    localization: string;
    calcitonin: string;
    thyroglobulin: string;
    calcInSense: string;
};

const initialState:UploadPhotoState = {
    open:false,
    idCard:-1,
    marking:"",
    number:-1,
    localization:"",
    calcitonin:"",
    thyroglobulin:"",
    calcInSense:""
};

interface HandleShowPayload {
    idCard: number;
    marking: string;
    number: number;
    localization: string;
    calcitonin: string;
    thyroglobulin: string;
    calcInSense: string;
};

const uploadPhotoSlice = createSlice({
    name:"uploadPhoto",
    initialState,
    reducers: {
        handleShow: (state, action: PayloadAction<HandleShowPayload>) => {
            state.open = true;

            state.idCard = action.payload.idCard;
            state.marking = action.payload.marking;
            state.number = action.payload.number;
            state.localization = action.payload.localization;
            state.calcitonin = action.payload.calcitonin;
            state.thyroglobulin = action.payload.thyroglobulin;
            state.calcInSense = action.payload.calcInSense;
        },
        handleOk: (state) => {
            state.open = false;
        },
        handleCancel: (state) => {
            state.open = false;
        }
    }
});

export const { handleShow, handleOk, handleCancel } = uploadPhotoSlice.actions;

export default uploadPhotoSlice;