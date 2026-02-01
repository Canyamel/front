import { NextRequest, NextResponse } from "next/server";
import { createWriteStream, createReadStream, existsSync, rm } from "fs";
import { mkdir, readdir, stat } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const { fileId, fileName, uploadId } = await request.json();

        if (!fileId || !fileName || !uploadId) {
            return NextResponse.json(
                { success: false, message: "Недостаточно данных для сборки файла" },
                { status: 400 }
            );
        }

        const chunksDir = path.join(process.cwd(), "uploads", "chunks", uploadId);
        const finalDir = path.join(process.cwd(), "uploads", "final");

        if (!existsSync(finalDir)) {
            await mkdir(finalDir, { recursive: true });
        }

        if (!existsSync(chunksDir)) {
            return NextResponse.json(
                { success: false, message: "Чанки не найдены" },
                { status: 400 }
            );
        }

        const files = await readdir(chunksDir);

        const chunkFiles = files
            .filter((f) => f.startsWith("chunk-"))
            .sort((a, b) => {
                const aNum = parseInt(a.split("-")[1]);
                const bNum = parseInt(b.split("-")[1]);
                return aNum - bNum;
            });

        if (chunkFiles.length === 0) {
            return NextResponse.json(
                { success: false, message: "Нет чанков для сборки" },
                { status: 400 }
            );
        }

        const finalFilePath = path.join(finalDir, fileName);
        const writeStream = createWriteStream(finalFilePath);

        for (const chunkFile of chunkFiles) {
            const chunkPath = path.join(chunksDir, chunkFile);

            if (!existsSync(chunkPath)) {
                throw new Error(`Чанк ${chunkFile} не найден`);
            }

            const readStream = createReadStream(chunkPath);

            await new Promise((resolve, reject) => {
                readStream.pipe(writeStream, { end: false });
                readStream.on("end", resolve);
                readStream.on("error", reject);
            });
        }

        writeStream.end();

        await new Promise((resolve, reject) => {
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
        });

        if (!existsSync(finalFilePath)) {
            throw new Error("Собранный файл не был создан");
        }

        const fileStats = await stat(finalFilePath);

        await new Promise((resolve) => {
            rm(chunksDir, { recursive: true }, (err) => {
                if (err) {
                    console.error("Ошибка при удалении чанков:", err);
                    resolve(null);
                } else {
                    resolve(null);
                }
            });
        });

        return NextResponse.json({
            success: true,
            message: "Файл успешно собран",
            filePath: finalFilePath,
            fileName: fileName,
            fileSize: fileStats.size,
            fileCreated: fileStats.birthtime,
            chunksCount: chunkFiles.length,
        });
    } catch (error) {
        console.error("Complete upload error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Неизвестная ошибка при сборке файла";

        return NextResponse.json(
            {
                success: false,
                message: "Ошибка сборки файла",
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
