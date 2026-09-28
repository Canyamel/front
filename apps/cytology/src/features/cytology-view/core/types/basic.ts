// Инструменты рисования больше не свои: общий список id живёт в
// `@medml/viewers` (`ViewerToolId`) и одинаков для УЗИ и цитологии.
export type Modes = "view" | "edit";
export type Modals = "addNode" | "editNode";

export interface IPaginated<T> {
    count: number;
    next: string;
    previous: string;
    results: T[];
}
