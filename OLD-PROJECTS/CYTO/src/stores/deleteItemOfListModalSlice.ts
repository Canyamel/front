import { createSlice } from "@reduxjs/toolkit";

interface DeleteItemOfListModalState {
  open:boolean;
};

const initialState:DeleteItemOfListModalState = {
  open:false
};

const deleteItemOfListModalSlice = createSlice({
  name:"deleteItem",
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

export const { handleShow, handleOk, handleCancel } = deleteItemOfListModalSlice.actions;

export default deleteItemOfListModalSlice;