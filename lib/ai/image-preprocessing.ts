/**
 * lib/ai/image-preprocessing.ts
 * 
 * Production server-side image preprocessing & downscaling using Sharp.
 * 
 * Features:
 * - Safely decodes JPEG, PNG, WebP
 * - Handles EXIF orientation (.rotate())
 * - Bounded dimensions: max longest side 768px (fit: inside, withoutEnlargement: true)
 * - Safe flattening: uses pure white '#FFFFFF' for alpha channels when converting to JPEG
 * - High-efficiency JPEG compression: quality 80, mozjpeg optimized
 * - Skips re-compression if image is already small and properly formatted
 * - Bounded output payload: typically 40KB - 120KB (prevents multi-MB payload transfers)
 * - Explicit error reporting on genuine corruption
 */

import sharp, { Metadata } from "sharp";

export interface PreprocessingResult {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  processedSizeBytes: number;
  compressionRatio: number;
  skipped: boolean;
}

export const MAX_IMAGE_DIMENSION = 768; // pixels (longest edge)
export const MAX_REASONABLE_SIZE_BYTES = 200 * 1024; // 200 KB threshold to check if already small

/**
 * Preprocesses a base64-encoded image for vision model consumption.
 * Throws explicit errors if image is corrupt or completely unreadable.
 */
export async function preprocessMealImage(
  rawBase64: string,
  rawMimeType: string
): Promise<PreprocessingResult> {
  if (!rawBase64 || typeof rawBase64 !== "string") {
    throw new Error("Invalid image input: base64 string is required");
  }

  const cleanBase64 = rawBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "").trim();
  const inputBuffer = Buffer.from(cleanBase64, "base64");
  const originalSizeBytes = inputBuffer.length;

  if (originalSizeBytes === 0) {
    throw new Error("Invalid image input: image buffer is empty");
  }

  // 1. Inspect image metadata safely
  let metadata: Metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch (err: any) {
    throw new Error(`Failed to decode image metadata: ${err?.message || "unsupported or corrupt image format"}`);
  }

  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;

  // 2. Check if already sufficiently small (< 200 KB, <= 768px in both dimensions, and is JPEG)
  const isAlreadySmall =
    originalSizeBytes <= MAX_REASONABLE_SIZE_BYTES &&
    origWidth <= MAX_IMAGE_DIMENSION &&
    origHeight <= MAX_IMAGE_DIMENSION &&
    origWidth > 0 &&
    origHeight > 0 &&
    metadata.format === "jpeg";

  if (isAlreadySmall) {
    return {
      base64: cleanBase64,
      mimeType: "image/jpeg",
      width: origWidth,
      height: origHeight,
      originalSizeBytes,
      processedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      skipped: true,
    };
  }

  // 3. Process image with Sharp:
  // - Auto-rotate based on EXIF
  // - Resize to MAX_IMAGE_DIMENSION longest side
  // - Flatten with solid white background (#FFFFFF) to safely handle alpha channels
  // - Encode to JPEG with quality 80
  try {
    let pipeline = sharp(inputBuffer).rotate();

    // Only resize if larger than maximum dimension
    if (origWidth > MAX_IMAGE_DIMENSION || origHeight > MAX_IMAGE_DIMENSION || origWidth === 0) {
      pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Safely flatten with concrete solid white color (#FFFFFF)
    pipeline = pipeline.flatten({ background: "#FFFFFF" });

    const processedBuffer = await pipeline
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toBuffer();

    const finalMetadata = await sharp(processedBuffer).metadata();
    const processedSizeBytes = processedBuffer.length;
    const compressionRatio =
      originalSizeBytes > 0 ? (originalSizeBytes - processedSizeBytes) / originalSizeBytes : 0;

    return {
      base64: processedBuffer.toString("base64"),
      mimeType: "image/jpeg",
      width: finalMetadata.width || origWidth,
      height: finalMetadata.height || origHeight,
      originalSizeBytes,
      processedSizeBytes,
      compressionRatio: Math.max(0, compressionRatio),
      skipped: false,
    };
  } catch (err: any) {
    throw new Error(`Image transformation failed: ${err?.message || "unknown error"}`);
  }
}
