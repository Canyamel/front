import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CharacteristicItem {
    result:number;
    group:string;
};

interface CharacteristicsPayload {
    data:Record<string, CharacteristicItem>;
    mark:number;
};

interface ModalFormEditCharacteristicsState {
    data:Record<string, CharacteristicItem>;
    mark:number;
    open:boolean;
};

const initialState:ModalFormEditCharacteristicsState = {
    data:{},
    mark:-1,
    open:false
};

const modalFormCharacteristicsSlice = createSlice({
    name:"characteristics",
    initialState,
    reducers: {
        setCharacteristicsData:(state, action:PayloadAction<CharacteristicsPayload>) => {
            state.data = action.payload.data;
            state.mark = action.payload.mark;
        },
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

export const { handleShow, handleOk, handleCancel, setCharacteristicsData } = modalFormCharacteristicsSlice.actions;

export default modalFormCharacteristicsSlice;