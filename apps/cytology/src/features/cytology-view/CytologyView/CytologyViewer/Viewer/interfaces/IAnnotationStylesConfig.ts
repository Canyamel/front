import type { ViewerAnnotationStyle } from '@medml/viewers'

export interface IAnnotationStyleConfig extends ViewerAnnotationStyle {
	hover?: ViewerAnnotationStyle
	select?: ViewerAnnotationStyle
}

export interface IAnnotationStylesConfig {
	[key: string]: IAnnotationStyleConfig
}
