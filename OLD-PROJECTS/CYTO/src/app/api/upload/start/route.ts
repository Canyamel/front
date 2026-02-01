import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        // const { fileName, fileSize, totalChunks, chunkSize, fileId } = await request.json();
        await request.json();

        const uploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);

        return NextResponse.json({
            success: true,
            uploadId,
            message: "Сессия загрузки начата",
        });
    } catch {
        return NextResponse.json(
            { success: false, message: "Ошибка начала сессии" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
