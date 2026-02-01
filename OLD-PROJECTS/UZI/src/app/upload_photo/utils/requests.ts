import { NextResponse } from 'next/server'
import axiosInstance from '@/utils/apiInstance'

export async function uploadUzi(
    body: {
        fileImg: File
        projection: string
        patientId: string
        deviceId: string
    },
    token?: string | undefined | null
) {
    try {
        const formData = new FormData()
        formData.append('file', body.fileImg)
        formData.append('projection', body.projection)
        formData.append('external_id', body.patientId)
        formData.append('device_id', body.deviceId)
        const response = await axiosInstance.post('/uzi', formData, {
            headers: {
                'Content-Type': 'multipart/form-data;',
                Authorization: `Bearer ${token}`,
            },
        })
        const data = response.data
        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json(
            {
                error: 'An error occurred while fetching patients.',
            },
            { status: error.status }
        )
    }
}
