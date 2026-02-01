import { createAppSelectorGeneric } from "@/hooks";
import type { RootState } from "@cytology/core/store";

const useAppSelector = createAppSelectorGeneric<RootState>();

export default useAppSelector;
