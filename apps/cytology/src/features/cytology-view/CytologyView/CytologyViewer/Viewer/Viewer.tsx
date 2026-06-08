import React, { useEffect, useMemo } from "react";
import {
    AnnotoriousOpenSeadragonAnnotator,
    PolygonGeometry,
    RectangleGeometry,
    useAnnotator,
} from "@annotorious/react";

import { useAppSelector } from "@cytology/core/hooks";
import { Tools } from "@cytology/core/types/basic";
import { ISegmentStack } from "@cytology/core/types/segments";
import { IPoint } from "./interfaces/queries";

import OSDViewer from "./components/OSDViewer/OSDViewer";
import ImageViewer from "./components/ImageViewer/ImageViewer";

import { createSelectStyleFromConfig } from "./utils/selectStyleFromConfig";
import { generateAnnotation } from "./utils/generateAnnotation";

import "./viewer.scss";
import "@annotorious/react/annotorious-react.css";

interface ViewerProps {
    viewerType: "osd" | "img";
    tool: Tools;
    needPopup?: boolean;
    imageUrl: string;
    drawingEnabled?: boolean;
    selected: boolean;
    className?: string;
    segments?: ISegmentStack[];
    segmentTypeColors?: Record<string, string>;
    addSegment: (contour: IPoint[]) => void;
    changeSegment: (segmentId: string, contour: IPoint[]) => void;
}

const Viewer: React.FC<ViewerProps> = ({
    tool,
    needPopup = false,
    viewerType,
    imageUrl,
    drawingEnabled = false,
    selected,
    className = undefined,
    segments = [],
    segmentTypeColors = {},
    addSegment,
    changeSegment,
}) => {
    const classes = `viewer-wrapper ${className ? className : ""}`;
    const annotator = useAnnotator<AnnotoriousOpenSeadragonAnnotator>();
    const currentSegment = useAppSelector((state) => state.segment.currentSegment);
    const styleSelector = useMemo(
        () =>
            createSelectStyleFromConfig(segmentTypeColors, {
                isEditMode: drawingEnabled,
                activeSegmentType: currentSegment,
            }),
        [segmentTypeColors, drawingEnabled, currentSegment]
    );

    useEffect(() => {
        if (!annotator) {
            return;
        }

        annotator.clearAnnotations();
        annotator.setStyle(styleSelector);

        if (segments.length > 0) {
            annotator.setAnnotations(
                segments.flatMap((segment) => generateAnnotation(segment)),
                true
            );
        }
    }, [annotator, imageUrl, segments, styleSelector]);

    useEffect(() => {
        if (!annotator) {
            return;
        }

        const handleCreate = (annotation: {
            target: { selector: { type: string; geometry: RectangleGeometry | PolygonGeometry } };
        }) => {
            let geometry: RectangleGeometry | PolygonGeometry | null = null;
            const contour: IPoint[] = [];

            if (annotation.target.selector.type === "RECTANGLE") {
                geometry = annotation.target.selector.geometry as RectangleGeometry;
                contour.push(
                    { x: Math.round(geometry.x), y: Math.round(geometry.y) },
                    { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y) },
                    {
                        x: Math.round(geometry.x + geometry.w),
                        y: Math.round(geometry.y + geometry.h),
                    },
                    { x: Math.round(geometry.x), y: Math.round(geometry.y + geometry.h) }
                );
            } else if (annotation.target.selector.type === "POLYGON") {
                geometry = annotation.target.selector.geometry as PolygonGeometry;
                contour.push(
                    ...geometry.points.map((point) => ({
                        x: Math.round(point[0]),
                        y: Math.round(point[1]),
                    }))
                );
            }

            if (geometry) {
                addSegment(contour);
            }
        };

        const handleUpdate = (annotation: {
            id: string;
            target: { selector: { type: string; geometry: RectangleGeometry | PolygonGeometry } };
        }) => {
            let geometry: RectangleGeometry | PolygonGeometry | null = null;
            const contour: IPoint[] = [];

            if (annotation.target.selector.type === "RECTANGLE") {
                geometry = annotation.target.selector.geometry as RectangleGeometry;
                contour.push(
                    { x: Math.round(geometry.x), y: Math.round(geometry.y) },
                    { x: Math.round(geometry.x + geometry.w), y: Math.round(geometry.y) },
                    {
                        x: Math.round(geometry.x + geometry.w),
                        y: Math.round(geometry.y + geometry.h),
                    },
                    { x: Math.round(geometry.x), y: Math.round(geometry.y + geometry.h) }
                );
            } else if (annotation.target.selector.type === "POLYGON") {
                geometry = annotation.target.selector.geometry as PolygonGeometry;
                contour.push(
                    ...geometry.points.map((point) => ({
                        x: Math.round(point[0]),
                        y: Math.round(point[1]),
                    }))
                );
            }

            if (geometry) {
                changeSegment(annotation.id, contour);
            }
        };

        annotator.on("createAnnotation", handleCreate);
        annotator.on("updateAnnotation", handleUpdate);

        return () => {
            const withOff = annotator as unknown as {
                off?: (event: string, handler: (...args: unknown[]) => void) => void;
            };
            withOff.off?.("createAnnotation", handleCreate as (...args: unknown[]) => void);
            withOff.off?.("updateAnnotation", handleUpdate as (...args: unknown[]) => void);
        };
    }, [annotator, addSegment, changeSegment]);

    return (
        <div className={classes}>
            {viewerType === "osd" ? (
                <OSDViewer
                    tool={tool}
                    needPopup={needPopup}
                    imageUrl={imageUrl}
                    drawingEnable={drawingEnabled}
                    selected={selected}
                />
            ) : (
                <ImageViewer
                    tool={tool !== "move" ? tool : null}
                    needPopup={needPopup}
                    imageUrl={imageUrl}
                    drawingEnable={drawingEnabled}
                />
            )}
        </div>
    );
};

export default Viewer;
