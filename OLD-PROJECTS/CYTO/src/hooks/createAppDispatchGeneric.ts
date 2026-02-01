import { useDispatch } from "react-redux";
import { Dispatch } from "redux";

const createAppDispatchGeneric = <T extends Dispatch>() => useDispatch<T>;

export default createAppDispatchGeneric;
