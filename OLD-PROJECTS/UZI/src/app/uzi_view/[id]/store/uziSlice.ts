import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { IDiagnosisInfo } from '@/app/uzi_view/[id]/types/diagnosis'
import { INodeRedux } from '../types/nodes'
import { ISegmentRedux } from '../types/segments'
import { IPoint } from '../UziView/UziViewer/Viewer/interfaces/queries'
import { Tirads } from '../types/types'

interface uziState {
    uziReady: 'new' | 'pending' | 'completed'
    imageId: string
    selectedNode: IDiagnosisInfo | null
    uziId: string
    nodes: INodeRedux[]
}

const initialState: uziState = {
    uziReady: 'new',
    imageId: '',
    selectedNode: null,
    uziId: '',
    nodes: [],
}

const uziSlice = createSlice({
    name: 'uziSlice',
    initialState,
    reducers: {
        setUziReady: (
            state,
            action: PayloadAction<'new' | 'pending' | 'completed'>
        ) => {
            state.uziReady = action.payload
        },
        setImageId: (state, action: PayloadAction<string>) => {
            state.imageId = action.payload
        },
        setSelectedNode: (
            state,
            action: PayloadAction<IDiagnosisInfo | null>
        ) => {
            state.selectedNode =
                state.selectedNode === action.payload ? null : action.payload
        },
        setUziId: (state, action: PayloadAction<string>) => {
            state.uziId = action.payload
        },
        addNode: (state, action: PayloadAction<Omit<INodeRedux, 'serial'>>) => {
            state.nodes.push({
                ...action.payload,
                serial: state.nodes.length + 1,
            })
        },
        addCurrentNodes: (state, action: PayloadAction<INodeRedux[]>) => {
            state.nodes.push(...action.payload)
        },
        addSegmentToNode: (
            state,
            action: PayloadAction<{ uziId: string; segment: ISegmentRedux }>
        ) => {
            state.nodes
                .find((node) => node.id === action.payload.uziId)
                ?.segments.push({ ...action.payload.segment, exist: false })
        },
        deleteAllNodes: (state) => {
            state.nodes = []
        },
        deleteSegment: (
            state,
            action: PayloadAction<{ nodeId: string; segmentId: string }>
        ) => {
            const segment = state.nodes
                .find((node) => node.id === action.payload.nodeId)
                ?.segments.find(
                    (segment) => segment.id === action.payload.segmentId
                )

            if (segment) {
                segment.toDelete = true
            }
        },
        undoDeleteSegment: (
            state,
            action: PayloadAction<{ nodeId: string; segmentId: string }>
        ) => {
            const segment = state.nodes
                .find((node) => node.id === action.payload.nodeId)
                ?.segments.find(
                    (segment) => segment.id === action.payload.segmentId
                )

            if (segment) {
                segment.toDelete = false
            }
        },
        changeSegment: (
            state,
            action: PayloadAction<{
                nodeId: string
                segmentId: string
                contour: IPoint[]
            }>
        ) => {
            const segment = state.nodes
                .find((node) => node.id === action.payload.nodeId)
                ?.segments.find(
                    (segment) => segment.id === action.payload.segmentId
                )

            if (segment) {
                segment.edited = true
                segment.contor = action.payload.contour
            }
        },
        changeNodeTirads: (
            state,
            action: PayloadAction<{ nodeId: string; tirads: Tirads }>
        ) => {
            const founded = state.nodes.find(
                (node) => node.id === action.payload.nodeId
            )
            const tirdas23 = action.payload.tirads === 'tirads_23' ? 1 : 0
            const tirdas4 = action.payload.tirads === 'tirads_4' ? 1 : 0
            const tirdas5 = action.payload.tirads === 'tirads_5' ? 1 : 0

            if (
                founded &&
                (founded.tirads_23 !== tirdas23 ||
                    founded.tirads_4 !== tirdas4 ||
                    founded.tirads_5 !== tirdas5)
            ) {
                founded.tirads_23 = tirdas23
                founded.tirads_4 = tirdas4
                founded.tirads_5 = tirdas5
                founded.edited = true

                founded.segments.forEach((segment) => {
                    segment.tirads_23 = tirdas23
                    segment.tirads_4 = tirdas4
                    segment.tirads_5 = tirdas5
                })
            }
        },
        markAsDeleted: (state, action: PayloadAction<string>) => {
            const founded = state.nodes.find(
                (node) => node.id === action.payload
            )

            if (founded) {
                founded.toDelete = true
            }
        },
        unmarkAsDeleted: (state, action: PayloadAction<string>) => {
            const founded = state.nodes.find(
                (node) => node.id === action.payload
            )

            if (founded) {
                founded.toDelete = false
            }
        },
        copyNode: (state, action: PayloadAction<INodeRedux>) => {
            const { id, serial, exist, ai, ...node } = action.payload

            state.nodes.push({
                ...node,
                id: crypto.randomUUID(),
                exist: false,
                ai: false,
                serial: state.nodes.length + 1,
            })
        },
    },
})

export const {
    setUziReady,
    setImageId,
    setSelectedNode,
    setUziId,
    addNode,
    copyNode,
    addCurrentNodes,
    addSegmentToNode,
    deleteAllNodes,
    deleteSegment,
    undoDeleteSegment,
    changeSegment,
    changeNodeTirads,
    markAsDeleted,
    unmarkAsDeleted,
} = uziSlice.actions

export default uziSlice
