export const projections = {
    long: "Продольная",
    cross: "Поперечная",
};

export const status: { [key: string]: "success" | "warning" | "error" } = {
    completed: "success",
    pending: "warning",
    new: "error",
};

export const statusText = {
    completed: "Проверено",
    pending: "На проверке",
    new: "В очереди на проверку",
};
