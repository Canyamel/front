import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const chunkIndex = formData.get("chunkIndex") as string;
        const totalChunks = formData.get("totalChunks") as string;
        // const fileId = formData.get("fileId") as string;
        // const fileName = formData.get("fileName") as string;
        const uploadId = formData.get("uploadId") as string;

        if (!file) {
            return NextResponse.json(
                { success: false, message: "Файл не найден" },
                { status: 400 }
            );
        }

        const chunksDir = path.join(process.cwd(), "uploads", "chunks", uploadId);
        if (!existsSync(chunksDir)) {
            await mkdir(chunksDir, { recursive: true });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const chunkPath = path.join(chunksDir, `chunk-${chunkIndex}`);

        await writeFile(chunkPath, buffer);

        return NextResponse.json({
            success: true,
            chunkIndex: parseInt(chunkIndex),
            uploadedChunks: parseInt(chunkIndex) + 1,
            totalChunks: parseInt(totalChunks),
        });
    } catch (error) {
        console.error("Chunk upload error:", error);
        return NextResponse.json(
            { success: false, message: "Ошибка загрузки чанка" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
