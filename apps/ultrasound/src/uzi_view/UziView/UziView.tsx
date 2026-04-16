import React, { Suspense, useEffect, useState } from "react";
import { Card, Col, Row, Typography, notification } from "antd";
import { skipToken } from "@reduxjs/toolkit/query";

import { useGetNodesSegmentsQuery, useGetUziNodesQuery } from "../service/nodesSegments";
import { useGetUziIdsQuery } from "../service/uzi";
import { useRTKEffects } from "../service/hook";

import Spinner from "../common/Spinner/Spinner";
import UziDiagnosisPanel from "./UziDiagnosisPanel/UziDiagnosisPanel";
import UziViewer from "./UziViewer/UziViewer";
import UziInfo from "./UziDiagnosisPanel/UziDiagnosis/UziInfo/UziInfo";

import { useAppDispatch, useAppSelector } from "../store/hook";
import { setImageId, setSelectedNode, setUziId } from "../store/uziSlice";
import { setToken } from "../store/authSlice";
import { deleteError } from "../store/utilsSlice";

import { Modals, Modes } from "../types/types";
import { GET_NODES, GET_NODES_SEGMENTS, GET_UZI_IDS } from "../types/consts";

import "./UziView.css";
import { ISegmentRedux } from "../types/segments";

const UziModal = React.lazy(() => import("./UziModal/UziModal"));

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  width: "100%",
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

interface UziViewProps {
  generalUziId: string;
  accessToken?: string;
}

const UziView: React.FC<UziViewProps> = ({ generalUziId, accessToken }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setToken(accessToken));
  }, [accessToken, dispatch]);

  const [mode, setMode] = useState<Modes>("view");
  const [modalType, setModalType] = useState<Modals | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [segments, setSegments] = useState<ISegmentRedux[]>([]);

  const selectedNode = useAppSelector((state) => state.uzi.selectedNode);
  const loadingStack = useAppSelector((state) => state.utils.loading);
  const errorStack = useAppSelector((state) => state.utils.error);
  const editNodes = useAppSelector((state) => state.uzi.nodes);
  const uziReady = useAppSelector((state) => state.uzi.uziReady);

  const [apiNotification, contextHolder] = notification.useNotification();

  const {
    isLoading: isLoadingUziIds,
    data: uziIds,
    error: errorUziIds,
  } = useGetUziIdsQuery(!!accessToken && uziReady !== "new" ? generalUziId : skipToken);
  const {
    isLoading: isLoadingNodesSegments,
    data: nodesSegments,
    error: errorNodesSegments,
  } = useGetNodesSegmentsQuery(
    !!accessToken && uziReady === "completed" && uziIds && uziIds[pageIndex]?.id
      ? uziIds[pageIndex]?.id
      : skipToken
  );
  const {
    isLoading: isLoadingNodes,
    data: nodes,
    error: errorNodes,
  } = useGetUziNodesQuery(!!accessToken && uziReady === "completed" ? generalUziId : skipToken);

  useRTKEffects({ isLoading: isLoadingUziIds, error: errorUziIds }, GET_UZI_IDS);
  useRTKEffects({ isLoading: isLoadingNodesSegments, error: errorNodesSegments }, GET_NODES_SEGMENTS);
  useRTKEffects({ isLoading: isLoadingNodes, error: errorNodes }, GET_NODES);

  useEffect(() => {
    dispatch(setUziId(generalUziId));
  }, [dispatch, generalUziId]);

  useEffect(() => {
    if (uziIds) {
      dispatch(setImageId(uziIds[pageIndex]?.id));
    }
  }, [uziIds, pageIndex, dispatch]);

  useEffect(() => {
    const errors = Object.entries(errorStack);

    if (errors.length > 0) {
      Object.entries(errorStack).forEach(([key, message]) => {
        apiNotification.error({
          message,
          placement: "bottomLeft",
        });
        dispatch(deleteError(key));
      });
    }
  }, [apiNotification, dispatch, errorStack]);

  useEffect(() => {
    if (mode === "edit") {
      setSegments(editNodes.flatMap((node) => (node.id === selectedNode?.id ? node.segments : [])));
    } else {
      setSegments(
        (nodesSegments?.segments || [])?.flatMap((segment) =>
          segment.node_id === selectedNode?.id ? { ...segment, exist: true } : []
        )
      );
    }
  }, [nodesSegments, editNodes, selectedNode, mode]);

  const handleChangeMode = (mode: Modes) => {
    dispatch(setSelectedNode(null));
    setMode(mode);
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
      {contextHolder}
      {Object.keys(loadingStack).length > 0 && <Spinner />}
      <Typography.Title level={4} style={{ margin: "0 0 16px" }}>
        Просмотр исследования
      </Typography.Title>
      <Card
        styles={{ body: { padding: "16px 24px 24px" } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <UziInfo />
      </Card>
      <Card
        styles={{ body: { padding: "16px 24px 24px" } }}
        title="Снимок и список узлов"
        style={cardStyle}
      >
        <Row className="uzi-view" gutter={16} wrap>
          <Col xs={24} lg={16} className="uzi-viewer-wrapper">
            <UziViewer
              isEditMode={mode === "edit"}
              uziId={generalUziId}
              segments={segments}
              index={pageIndex}
              setIndex={setPageIndex}
              uziIds={uziIds}
            />
          </Col>
          <Col xs={24} lg={8} className="uzi-diagnosis">
            <UziDiagnosisPanel
              mode={mode}
              nodes={nodes || []}
              changeMode={handleChangeMode}
              setModalType={setModalType}
              omitUziInfo
            />
          </Col>
        </Row>
      </Card>
      <Suspense fallback={null}>
        <UziModal setOpen={setModalType} modalType={modalType} />
      </Suspense>
    </div>
  );
};

export default UziView;
