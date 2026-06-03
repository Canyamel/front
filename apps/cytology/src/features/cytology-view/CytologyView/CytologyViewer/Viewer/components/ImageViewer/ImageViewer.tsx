import React from "react";
import { ImageAnnotationPopup, ImageAnnotator, UserSelectAction } from "@annotorious/react";

import CommentPopup from "../CommentPopup/CommentPopup";

interface ImageViewerProps {
    drawingEnable?: boolean;
    tool: "rectangle" | "polygon" | null;
    needPopup?: boolean;
    imageUrl: string;
    needInputPopup?: boolean;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
    drawingEnable = false,
    tool,
    needPopup = true,
    imageUrl,
    needInputPopup = false,
}) => {
    return (
        <>
            <ImageAnnotator
                drawingEnabled={drawingEnable}
                tool={tool ? tool : ""}
                userSelectAction={!drawingEnable ? UserSelectAction.SELECT : UserSelectAction.EDIT}
            >
                <img src={imageUrl} alt="" />
            </ImageAnnotator>

            {needPopup && (
                <ImageAnnotationPopup
                    popup={(props) => (
                        <CommentPopup
                            {...props}
                            needInput={needInputPopup}
                            isEditingMode={drawingEnable}
                        />
                    )}
                />
            )}
        </>
    );
};

export default ImageViewer;
