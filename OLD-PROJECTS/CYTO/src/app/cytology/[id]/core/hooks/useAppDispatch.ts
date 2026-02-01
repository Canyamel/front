import { createAppDispatchGeneric } from "@/hooks";

import type { AppDispatch } from "@cytology/core/store";

const useAppDispatch = createAppDispatchGeneric<AppDispatch>();

export default useAppDispatch;
