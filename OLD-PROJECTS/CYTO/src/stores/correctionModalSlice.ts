import { createSlice } from "@reduxjs/toolkit";

interface CorrectionModalState {
  open:boolean;
};

const initialState:CorrectionModalState = {
  open:false
};

const correctionModalSlice = createSlice({
  name:"correction",
  initialState,
  reducers: {
      handleShow:(state) => {
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

export const { handleShow, handleOk, handleCancel } = correctionModalSlice.actions;

export default correctionModalSlice;