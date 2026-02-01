import {DrawingStyle} from "@annotorious/core/dist/model/DrawingStyle";


export interface IAnnotationStyleConfig extends DrawingStyle {
    hover?: DrawingStyle,
    select?: DrawingStyle
}

export interface IAnnotationStylesConfig {
    [key: string]: IAnnotationStyleConfig,
}
