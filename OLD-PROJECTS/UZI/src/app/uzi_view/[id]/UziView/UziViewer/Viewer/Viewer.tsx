import React, {useEffect} from 'react';
import {
    Annotation,
    AnnotoriousImageAnnotator,
    PolygonGeometry,
    RectangleGeometry,
    useAnnotator
} from "@annotorious/react";

import {Tools} from "@/app/uzi_view/[id]/types/types";
import {ISegmentRedux} from "@/app/uzi_view/[id]/types/segments";
import {IPoint} from "@/app/uzi_view/[id]/UziView/UziViewer/Viewer/interfaces/queries";

import OSDViewer from "./components/OSDViewer/OSDViewer";
import ImageViewer from "./components/ImageViewer/ImageViewer";

import {selectStyleFromConfig} from "./utils/selectStyleFromConfig";
import {generateAnnotation} from "./utils/generateAnnotation";

import './viewer.scss';
import '@annotorious/react/annotorious-react.css';

interface ViewerProps {
    viewerType: "osd" | "img",
    tool: Tools,
    needPopup?: boolean,
    imageUrl: string,
    drawingEnabled?: boolean,
    className?: string,
    segments?: ISegmentRedux[],
    addSegment: (contour: IPoint[]) => void,
    changeSegment: (segmentId: string, contour: IPoint[]) => void,
}

const Viewer: React.FC<ViewerProps> = (
    {
        tool,
        needPopup = false,
        viewerType,
        imageUrl,
        drawingEnabled = false,
        className = undefined,
        segments = [],
        addSegment,
        changeSegment,
    }) => {

    const classes = `viewer-wrapper ${className ? className : ''}`;
    const annotator = useAnnotator<AnnotoriousImageAnnotator>();

    useEffect(() => {
        if (annotator) {
            annotator.clearAnnotations();
            annotator.setStyle(selectStyleFromConfig);
        }

        if (annotator && segments.length > 0) {
            annotator.setAnnotations(segments.flatMap(generateAnnotation), true);
        }
    }, [annotator, imageUrl, segments]);

    useEffect(() => {
        if (annotator) {
            annotator.on('selectionChanged', (annotations) => {
                if (annotations.length > 0) {
                    const selectedStyles = selectStyleFromConfig(annotations[0] as Annotation, undefined)

                    if (selectedStyles) {
                        document.body.style.setProperty("--stroke-color", String(selectedStyles.stroke));
                    } else {
                        document.body.style.setProperty("--stroke-color", "");
                    }
                } else {
                    document.body.style.setProperty("--stroke-color", "");
                }
            });

            annotator.on('createAnnotation', (annotation) => {
                let geometry: RectangleGeometry | PolygonGeometry | null = null;
                const contour: IPoint[] = [];

                if (annotation.target.selector.type === "RECTANGLE") {
                    geometry = annotation.target.selector.geometry as RectangleGeometry;
                    contour.push(
                        { x: Math.round(geometry.x), y: Math.round(geometry.y) },
                        { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y) },
                        { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y + geometry.h) },
                        { x: Math.round(geometry.x), y: Math.round(geometry.y + geometry.h) },
                    )
                } else if (annotation.target.selector.type === "POLYGON") {
                    geometry = annotation.target.selector.geometry as PolygonGeometry;
                    contour.push(...geometry.points.map(point => ({ x: Math.round(point[0]), y: Math.round(point[1]) })));
                }

                if (geometry) {
                    addSegment(contour);
                }
            });

            annotator.on('updateAnnotation', (annotation) => {
                let geometry: RectangleGeometry | PolygonGeometry | null = null;
                const contour: IPoint[] = [];

                if (annotation.target.selector.type === "RECTANGLE") {
                    geometry = annotation.target.selector.geometry as RectangleGeometry;
                    contour.push(
                        { x: Math.round(geometry.x), y: Math.round(geometry.y) },
                        { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y) },
                        { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y + geometry.h) },
                        { x: Math.round(geometry.x), y: Math.round(geometry.y + geometry.h) },
                    )
                } else if (annotation.target.selector.type === "POLYGON") {
                    geometry = annotation.target.selector.geometry as PolygonGeometry;
                    contour.push(...geometry.points.map(point => ({ x: Math.round(point[0]), y: Math.round(point[1]) })));
                }

                if (geometry) {
                    changeSegment(annotation.id, contour);
                }
            });
        }
    }, [annotator]);

    return (
        <div className={classes}>
            {
                viewerType === "osd" ?
                <OSDViewer tool={tool} needPopup={needPopup} imageUrl={imageUrl} drawingEnable={drawingEnabled} />
                :
                <ImageViewer tool={tool} needPopup={needPopup} imageUrl={imageUrl} drawingEnable={drawingEnabled} />
            }
        </div>
    );
}

export default Viewer;
