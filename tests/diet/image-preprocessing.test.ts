import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { preprocessMealImage, MAX_IMAGE_DIMENSION } from "@/lib/ai/image-preprocessing";

describe("Server-Side Image Preprocessing", () => {
  it("safely handles a large landscape JPEG image and downscales to <= 768px", async () => {
    // Generate a 1600x1200 synthetic JPEG
    const largeJpegBuf = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 200, g: 150, b: 100 },
      },
    })
      .jpeg()
      .toBuffer();

    const base64 = largeJpegBuf.toString("base64");
    const result = await preprocessMealImage(base64, "image/jpeg");

    expect(result.width).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(result.height).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(result.width).toBe(768);
    expect(result.height).toBe(576); // 1600x1200 scaled by 768/1600 = 576
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.processedSizeBytes).toBeLessThan(result.originalSizeBytes);
    expect(result.skipped).toBe(false);
  });

  it("safely handles a large portrait JPEG image and downscales to <= 768px", async () => {
    // Generate a 1200x1800 synthetic JPEG
    const portraitBuf = await sharp({
      create: {
        width: 1200,
        height: 1800,
        channels: 3,
        background: { r: 100, g: 180, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    const base64 = portraitBuf.toString("base64");
    const result = await preprocessMealImage(base64, "image/jpeg");

    expect(result.width).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(result.height).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(result.height).toBe(768);
    expect(result.width).toBe(512); // 1200x1800 scaled by 768/1800 = 512
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("safely handles PNG with transparency by flattening to white background", async () => {
    // 4-channel transparent PNG
    const pngBuf = await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    const base64 = pngBuf.toString("base64");
    const result = await preprocessMealImage(base64, "image/png");

    expect(result.mimeType).toBe("image/jpeg");
    expect(result.width).toBe(500);
    expect(result.height).toBe(500);

    // Verify output is valid JPEG with 3 channels
    const decoded = await sharp(Buffer.from(result.base64, "base64")).metadata();
    expect(decoded.channels).toBe(3);
    expect(decoded.format).toBe("jpeg");
  });

  it("skips re-processing when image is already small JPEG", async () => {
    // 300x300 small JPEG
    const smallBuf = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 50, g: 50, b: 50 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = smallBuf.toString("base64");
    const result = await preprocessMealImage(base64, "image/jpeg");

    expect(result.skipped).toBe(true);
    expect(result.width).toBe(300);
    expect(result.height).toBe(300);
  });

  it("throws clear error on corrupt or empty image buffer", async () => {
    await expect(preprocessMealImage("", "image/jpeg")).rejects.toThrow("Invalid image input");
    await expect(preprocessMealImage("not-a-valid-base64-image-buffer", "image/jpeg")).rejects.toThrow(
      "Failed to decode image metadata"
    );
  });
});

