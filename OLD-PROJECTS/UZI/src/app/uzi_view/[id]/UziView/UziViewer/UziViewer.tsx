import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Annotorious } from "@annotorious/react";
import { Flex } from "antd";
import { DisconnectOutlined } from "@ant-design/icons";

import EditPanel from "@/app/uzi_view/[id]/UziView/UziViewer/EditPanel/EditPanel";
import NavButton from "@/app/uzi_view/[id]/UziView/UziViewer/NavButton/NavButton";

import { Tools } from "@/app/uzi_view/[id]/types/types";
import { ISegmentRedux } from "@/app/uzi_view/[id]/types/segments";
import { IPoint } from "@/app/uzi_view/[id]/UziView/UziViewer/Viewer/interfaces/queries";
import { IUziPage } from "../../types/uzi";

import { DOWNLOAD_UZI } from "../../types/consts";

import { useAppDispatch, useAppSelector } from "@/app/uzi_view/[id]/store/hook";

import { downloadUziImage } from "@/app/uzi_view/[id]/service/download";

import { addLoading, deleteLoading } from "../../store/utilsSlice";
import { addSegmentToNode, changeSegment } from "../../store/uziSlice";

import "@annotorious/react/annotorious-react.css";
import "./UziViewer.css";

const Viewer = dynamic(() => import("./Viewer/Viewer"), { ssr: false });

interface UziViewerProps {
    isEditMode: boolean;
    uziId: string;
    segments: ISegmentRedux[];
    setIndex: React.Dispatch<React.SetStateAction<number>>;
    index: number;
    uziIds: IUziPage[] | undefined;
}

const UziViewer: React.FC<UziViewerProps> = ({
    isEditMode,
    uziId,
    segments,
    setIndex,
    index,
    uziIds,
}) => {
    const [imageUrl, setImageUrl] = useState<string>("");
    const [tool, setTool] = useState<Tools>("rectangle");
    const [isLoading, setIsLoading] = useState(false);

    const dispatch = useAppDispatch();
    const accessToken = useAppSelector((state) => state.auth.accessToken);
    const { selectedNode, imageId } = useAppSelector((state) => state.uzi);

    const callbackNextIndex = () => setIndex((prevState) => prevState + 1);
    const callbackPrevIndex = () => setIndex((prevState) => prevState - 1);

    const selectedNodeRef = useRef(selectedNode);
    const imageIdRef = useRef(imageId);

    const handleAddSegment = useCallback(
        (contour: IPoint[]) => {
            if (selectedNodeRef.current) {
                dispatch(
                    addSegmentToNode({
                        uziId: selectedNodeRef.current.id,
                        segment: {
                            id: crypto.randomUUID(),
                            ai: false,
                            node_id: selectedNodeRef.current.id,
                            contor: contour,
                            image_id: imageIdRef.current,
                            tirads_23: selectedNodeRef.current.tirads === "tirads_23" ? 1 : 0,
                            tirads_4: selectedNodeRef.current.tirads === "tirads_4" ? 1 : 0,
                            tirads_5: selectedNodeRef.current.tirads === "tirads_5" ? 1 : 0,
                            exist: false,
                        },
                    })
                );
            }
        },
        [dispatch, selectedNodeRef]
    );

    const handleChangeSegment = useCallback(
        (segmentId: string, contour: IPoint[]) => {
            if (selectedNodeRef.current) {
                dispatch(
                    changeSegment({
                        nodeId: selectedNodeRef.current.id,
                        segmentId,
                        contour,
                    })
                );
            }
        },
        [selectedNodeRef, uziId]
    );

    useEffect(() => {
        setTool("rectangle");
    }, [isEditMode]);

    useEffect(() => {
        selectedNodeRef.current = selectedNode;
    }, [selectedNode]);

    useEffect(() => {
        imageIdRef.current = imageId;
    }, [imageId]);

    useEffect(() => {
        if (isLoading) {
            dispatch(addLoading(DOWNLOAD_UZI));
        } else {
            dispatch(deleteLoading(DOWNLOAD_UZI));
        }
    }, [dispatch, isLoading]);

    useEffect(() => {
        if (uziIds) {
            const downloadHandler = async () => {
                setIsLoading(true);

                return await downloadUziImage(uziId, uziIds[index].id, accessToken);
            };

            downloadHandler()
                .then((response) => {
                    if (response) {
                        const lastImageUrl = imageUrl;

                        setImageUrl(response);

                        if (lastImageUrl !== "") {
                            window.URL.revokeObjectURL(lastImageUrl);
                        }
                    }
                })
                .catch((error) => {
                    console.error(error);
                });

            setIsLoading(false);
        }
    }, [uziIds, index]);

    return (
        <Annotorious>
            <>
                {isEditMode && <EditPanel tool={tool} setTool={setTool} />}
                <Flex justify="center" align="center" className="uzi-viewer">
                    {imageUrl === "" ? (
                        <DisconnectOutlined style={{ fontSize: 50, color: "#8c8c8c" }} />
                    ) : (
                        <>
                            <NavButton
                                disabled={!!uziIds && index === 0}
                                onClick={callbackPrevIndex}
                                position="left"
                            />
                            <Viewer
                                viewerType="img"
                                tool={tool}
                                imageUrl={imageUrl}
                                segments={segments.filter(
                                    (segment) => segment.image_id === imageId
                                )}
                                drawingEnabled={isEditMode && !!selectedNode}
                                needPopup={true}
                                addSegment={handleAddSegment}
                                changeSegment={handleChangeSegment}
                            />
                            <NavButton
                                disabled={!!uziIds && index === uziIds.length - 1}
                                onClick={callbackNextIndex}
                                position="right"
                            />
                        </>
                    )}
                </Flex>
            </>
        </Annotorious>
    );
};

export default UziViewer;
