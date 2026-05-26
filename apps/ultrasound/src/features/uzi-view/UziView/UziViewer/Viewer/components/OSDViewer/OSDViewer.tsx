import React, {useMemo} from 'react';

import {OpenSeadragonAnnotationPopup, OpenSeadragonAnnotator, OpenSeadragonViewer} from "@annotorious/react";
import CommentPopup from "../CommentPopup/CommentPopup";

interface OSDViewerProps {
    drawingEnable?: boolean,
    needPopup?: boolean,
    tool: "rectangle" | "polygon",
    imageUrl: string,
    needInputPopup?: boolean
}

const OSDViewer: React.FC<OSDViewerProps> = (
    {
        drawingEnable = false,
        needPopup = false,
        tool,
        imageUrl,
        needInputPopup = false
    }) => {
    const viewerOptions = useMemo(() => ({
        tileSources: {
            type: 'image',
            url: imageUrl,
        },
        prefixUrl: '/openseadragon-images/',
    }), [imageUrl]);

    return (
        <>
            {
                imageUrl !== '' ?
                    <OpenSeadragonAnnotator
                        drawingEnabled={drawingEnable}
                        tool={tool}
                    >
                        <OpenSeadragonViewer
                            options={viewerOptions}
                            className="osd"
                        />

                        {
                            needPopup && (
                                <OpenSeadragonAnnotationPopup popup={props => (
                                    <CommentPopup {...props} needInput={needInputPopup} isEditingMode={drawingEnable} />
                                )}/>
                            )
                        }
                    </OpenSeadragonAnnotator>
                    :
                    <p style={{width: "100%", height: "100%", margin: 0}}>Изображение отсутствует</p>
            }
        </>
    );
}

export default OSDViewer;
