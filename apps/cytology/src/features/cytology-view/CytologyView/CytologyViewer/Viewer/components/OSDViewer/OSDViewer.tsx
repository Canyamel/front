import React, { useMemo } from "react";

import {
    OpenSeadragonAnnotationPopup,
    OpenSeadragonAnnotator,
    OpenSeadragonViewer,
} from "@annotorious/react";

import { buildDziTileSources } from "@/lib/dziBaseUrl";

import CommentPopup from "../CommentPopup/CommentPopup";

interface OSDViewerProps {
    drawingEnable?: boolean;
    needPopup?: boolean;
    tool: "rectangle" | "polygon" | "move";
    selected: boolean;
    imageUrl: string;
    needInputPopup?: boolean;
}

const OSDViewer: React.FC<OSDViewerProps> = ({
    drawingEnable = false,
    needPopup = false,
    tool,
    imageUrl,
    selected,
    needInputPopup = false,
}) => {
    const tileSources = buildDziTileSources(imageUrl);
    const drawModeEnabled = drawingEnable && tool !== "move" && selected;
    const drawTool = drawModeEnabled ? tool : null;

    const viewerOptions = useMemo(
        () => ({
            tileSources,
            prefixUrl: "/openseadragon-images/",
            gestureSettingsMouse: {
                clickToZoom: false,
            },
        }),
        [tileSources]
    );

    return (
        <>
            {tileSources ? (
                <OpenSeadragonAnnotator
                    drawingEnabled={drawModeEnabled}
                    tool={drawTool}
                >
                    <OpenSeadragonViewer options={viewerOptions} className="osd" />
                    {needPopup ? (
                        <OpenSeadragonAnnotationPopup
                            popup={(props) => (
                                <CommentPopup
                                    {...props}
                                    needInput={needInputPopup}
                                    isEditingMode={drawingEnable}
                                />
                            )}
                        />
                    ) : null}
                </OpenSeadragonAnnotator>
            ) : (
                <p style={{ width: "100%", height: "100%", margin: 0 }}>Изображение отсутствует</p>
            )}
        </>
    );
};

export default OSDViewer;
