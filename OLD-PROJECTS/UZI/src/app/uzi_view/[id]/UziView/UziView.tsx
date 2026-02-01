import React, { useEffect, useState } from 'react'
import { Col, notification, Row } from 'antd'
import dynamic from 'next/dynamic'
import { skipToken } from '@reduxjs/toolkit/query'
import { Session } from 'next-auth'
import { useSession } from 'next-auth/react'

import {
    useGetNodesSegmentsQuery,
    useGetUziNodesQuery,
} from '../service/nodesSegments'
import { useGetUziIdsQuery } from '../service/uzi'
import { useRTKEffects } from '../service/hook'

import Spinner from '../common/Spinner/Spinner'
import UziDiagnosisPanel from './UziDiagnosisPanel/UziDiagnosisPanel'
import UziViewer from './UziViewer/UziViewer'

import { useAppDispatch, useAppSelector } from '../store/hook'
import { setImageId, setSelectedNode, setUziId } from '../store/uziSlice'
import { setToken } from '../store/authSlice'
import { deleteError } from '../store/utilsSlice'

import { Modals, Modes } from '../types/types'
import { GET_NODES, GET_NODES_SEGMENTS, GET_UZI_IDS } from '../types/consts'

import './UziView.css'
import { ISegmentRedux } from '../types/segments'

const UziModal = dynamic(() => import('./UziModal/UziModal'), { ssr: false })

interface UziViewProps {
    generalUziId: string
}

const UziView: React.FC<UziViewProps> = ({ generalUziId }) => {
    const dispatch = useAppDispatch()

    const { data }: { data: (Session & { accessToken?: string }) | null } =
        useSession()

    useEffect(() => {
        dispatch(setToken(data?.accessToken))
    }, [data])

    const [mode, setMode] = useState<Modes>('view')
    const [modalType, setModalType] = useState<Modals | null>(null)
    const [pageIndex, setPageIndex] = useState(0)
    const [segments, setSegments] = useState<ISegmentRedux[]>([])

    const selectedNode = useAppSelector((state) => state.uzi.selectedNode)
    const loadingStack = useAppSelector((state) => state.utils.loading)
    const errorStack = useAppSelector((state) => state.utils.error)
    const editNodes = useAppSelector((state) => state.uzi.nodes)
    const uziReady = useAppSelector((state) => state.uzi.uziReady)

    const [apiNotification, contextHolder] = notification.useNotification()

    const {
        isLoading: isLoadingUziIds,
        data: uziIds,
        error: errorUziIds,
    } = useGetUziIdsQuery(
        !!data?.accessToken && uziReady !== 'new' ? generalUziId : skipToken
    )
    const {
        isLoading: isLoadingNodesSegments,
        data: nodesSegments,
        error: errorNodesSegments,
    } = useGetNodesSegmentsQuery(
        !!data?.accessToken &&
            uziReady === 'completed' &&
            uziIds &&
            uziIds[pageIndex]?.id
            ? uziIds[pageIndex]?.id
            : skipToken
    )
    const {
        isLoading: isLoadingNodes,
        data: nodes,
        error: errorNodes,
    } = useGetUziNodesQuery(
        !!data?.accessToken && uziReady === 'completed'
            ? generalUziId
            : skipToken
    )

    useRTKEffects(
        { isLoading: isLoadingUziIds, error: errorUziIds },
        GET_UZI_IDS
    )
    useRTKEffects(
        { isLoading: isLoadingNodesSegments, error: errorNodesSegments },
        GET_NODES_SEGMENTS
    )
    useRTKEffects({ isLoading: isLoadingNodes, error: errorNodes }, GET_NODES)

    useEffect(() => {
        dispatch(setUziId(generalUziId))
    }, [])

    useEffect(() => {
        if (uziIds) {
            dispatch(setImageId(uziIds[pageIndex]?.id))
        }
    }, [uziIds, pageIndex, dispatch])

    useEffect(() => {
        const errors = Object.entries(errorStack)

        if (errors.length > 0) {
            Object.entries(errorStack).forEach(([key, message]) => {
                apiNotification.error({
                    message,
                    placement: 'bottomLeft',
                })
                dispatch(deleteError(key))
            })
        }
    }, [apiNotification, dispatch, errorStack])

    useEffect(() => {
        if (mode === 'edit') {
            setSegments(
                editNodes.flatMap((node) =>
                    node.id === selectedNode?.id ? node.segments : []
                )
            )
        } else {
            setSegments(
                (nodesSegments?.segments || [])?.flatMap((segment) =>
                    segment.node_id === selectedNode?.id
                        ? { ...segment, exist: true }
                        : []
                )
            )
        }
    }, [nodesSegments, editNodes, selectedNode, mode])

    const handleChangeMode = (mode: Modes) => {
        dispatch(setSelectedNode(null))
        setMode(mode)
    }

    return (
        <>
            {contextHolder}
            {Object.keys(loadingStack).length > 0 && <Spinner />}
            <Row className="uzi-view" gutter={16}>
                <Col span={16} className="uzi-viewer-wrapper">
                    <UziViewer
                        isEditMode={mode === 'edit'}
                        uziId={generalUziId}
                        segments={segments}
                        index={pageIndex}
                        setIndex={setPageIndex}
                        uziIds={uziIds}
                    />
                </Col>
                <Col span={8} className="uzi-diagnosis">
                    <UziDiagnosisPanel
                        mode={mode}
                        nodes={nodes || []}
                        changeMode={handleChangeMode}
                        setModalType={setModalType}
                    />
                </Col>
            </Row>
            <UziModal setOpen={setModalType} modalType={modalType} />
        </>
    )
}

export default UziView
