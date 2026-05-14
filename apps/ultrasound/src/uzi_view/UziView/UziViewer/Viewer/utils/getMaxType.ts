export type TiradsKeys = "tirads_23" | "tirads_4" | "tirads_5";
export const tiradsKeys: TiradsKeys[] = ["tirads_23", "tirads_4", "tirads_5"];

export const getMaxType = <T extends { tirads_23: number; tirads_4: number; tirads_5: number }>(
    obj: T
): TiradsKeys => {
    let maxKey: TiradsKeys = "tirads_23";
    let maxValue = -Infinity;

    for (const key of tiradsKeys) {
        const keyTyped = key as TiradsKeys;

        if (obj[keyTyped] > maxValue) {
            maxKey = keyTyped;
            maxValue = obj[keyTyped];
        }
    }

    return maxKey;
};
