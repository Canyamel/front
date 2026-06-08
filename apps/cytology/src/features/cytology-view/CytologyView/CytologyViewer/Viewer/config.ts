import { IAnnotationStylesConfig } from "./interfaces/IAnnotationStylesConfig";

export const annotationTypesStyles: IAnnotationStylesConfig = {
    update: {
        stroke: "#53fa00ff",
        fill: "#53fa0056",
        hover: {
            stroke: "#287800ff",
            fill: "#28780055",
        },
    },
    add: {
        stroke: "#00d995",
        fill: "#00d99547",
        hover: {
            stroke: "#00d995",
            fill: "#67d2b56e",
        },
    },
    delete: {
        stroke: "#ff6200",
        fill: "rgba(246, 96, 11, 0.25)",
        hover: {
            stroke: "#ff6200",
            fill: "rgba(246, 96, 11, 0.51)",
        },
    },
    default: {
        stroke: "#00d0fa",
        fill: "rgba(13, 201, 240, 0.35)",
        hover: {
            stroke: "#00768e",
            fill: "rgba(10, 153, 184, 0.5)",
        },
    },
};
