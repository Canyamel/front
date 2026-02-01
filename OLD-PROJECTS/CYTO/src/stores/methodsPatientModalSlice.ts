import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IPatient } from "../types/patient";


interface MethodPayload {
  method:"create" | "update" | "";
  patient?:IPatient;
};

interface MethodPatientState {
  open:boolean;
  method:"create" | "update" | "";
  patient?:any;
};

const initialState:MethodPatientState = {
  method:"",
  open:false
};

const methodsPatientModalSlice = createSlice({
  name:"methodsPatientModal",
  initialState,
  reducers: {
      handleShow:(state, action:PayloadAction<MethodPayload>) => {
          state.method = action.payload.method;
          if (action.payload.patient) {
            state.patient = action.payload.patient;
          }
          state.open = true;
      },
      handleOk:(state) => {
          state.open = false;
      },
      handleCancel:(state) => {
          state.open = false;
      }
  }
});

export const { handleShow, handleOk, handleCancel } = methodsPatientModalSlice.actions;

export default methodsPatientModalSlice;