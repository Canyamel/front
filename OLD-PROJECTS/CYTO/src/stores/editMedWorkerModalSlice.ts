import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IMedWorker } from "../types/medWorker";

interface DoctorPayload {
    doctor: IMedWorker;
}

interface EditMedWorkerModalState {
    doctor: IMedWorker;
    open: boolean;
}

const initialState: EditMedWorkerModalState = {
    doctor: {
        id: -1,
        lastName: "",
        firstName: "",
        fathersName: "",
        job: "",
        medOrganization: "",
        isRemoteWorker: false,
        expertDetails: "",
    },
    open: false,
};

const editMedWorkerModalSlice = createSlice({
    name: "editDoctor",
    initialState,
    reducers: {
        handleShow: (state, action: PayloadAction<DoctorPayload>) => {
            state.doctor = action.payload.doctor;
            state.open = true;
        },
        handleOk: (state) => {
            state.open = false;
        },
        handleCancel: (state) => {
            state.open = false;
        },
    },
});

export const { handleShow, handleOk, handleCancel } = editMedWorkerModalSlice.actions;

export default editMedWorkerModalSlice;
