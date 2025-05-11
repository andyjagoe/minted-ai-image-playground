import { NextResponse } from "next/server";
import sharp from 'sharp';
import FormData from "form-data";
import { STABILITY_API_KEY } from "@/lib/constants";
import fetch from "node-fetch";

// Stability AI API constants
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const MAX_PROMPT_LENGTH = 1000;
const MIN_IMAGE_DIMENSION = 64;
const MAX_IMAGE_DIMENSION = 2048;
const TARGET_QUALITY = 85; // PNG compression quality (0-100)

type Rect = { x: number; y: number; width: number; height: number };

async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  // Start with the original image
  let compressedBuffer = imageBuffer;
  let quality = TARGET_QUALITY;

  // Keep compressing until we're under the size limit or quality is too low
  while (compressedBuffer.length > MAX_IMAGE_SIZE && quality > 20) {
    console.log('Debug: Compressing image, current size:', {
      size: compressedBuffer.length / 1024 / 1024,
      quality
    });

    compressedBuffer = await sharp(imageBuffer)
      .png({ quality })
      .toBuffer();

    quality -= 5; // Reduce quality by 5 each iteration
  }

  if (compressedBuffer.length > MAX_IMAGE_SIZE) {
    throw new Error('Could not compress image to required size while maintaining acceptable quality');
  }

  console.log('Debug: Image compression complete:', {
    originalSize: imageBuffer.length / 1024 / 1024,
    compressedSize: compressedBuffer.length / 1024 / 1024,
    finalQuality: quality + 5 // Add back the last quality reduction
  });

  return compressedBuffer;
}

async function resizeImage(imageBuffer: Buffer): Promise<{ buffer: Buffer; scale: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  const MAX_PIXELS = 9437184; // Stability AI's maximum pixel limit
  const currentPixels = metadata.width * metadata.height;

  // Calculate scale to fit within MAX_PIXELS while maintaining aspect ratio
  const scale = Math.min(
    Math.sqrt(MAX_PIXELS / currentPixels),
    MAX_IMAGE_DIMENSION / metadata.width,
    MAX_IMAGE_DIMENSION / metadata.height
  );

  // Only resize if the image is too large
  if (scale < 1) {
    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);
    
    console.log('Debug: Resizing image:', {
      original: { width: metadata.width, height: metadata.height, pixels: currentPixels },
      new: { width: newWidth, height: newHeight, pixels: newWidth * newHeight },
      scale
    });

    const resizedBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png()
      .toBuffer();

    return { buffer: resizedBuffer, scale };
  }

  return { buffer: imageBuffer, scale: 1 };
}

async function validateImage(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  if (metadata.width < MIN_IMAGE_DIMENSION || metadata.height < MIN_IMAGE_DIMENSION) {
    throw new Error(`Image dimensions must be at least ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels`);
  }

  return { width: metadata.width, height: metadata.height };
}

async function generateMask(imageBuffer: Buffer, rect: Rect): Promise<Buffer> {
  // Validate rectangle coordinates
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error('Invalid rectangle dimensions: width and height must be positive');
  }

  if (rect.x < 0 || rect.y < 0) {
    throw new Error('Invalid rectangle position: x and y must be non-negative');
  }

  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  console.log('Debug: Image metadata:', {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    channels: metadata.channels
  });

  // Validate rectangle is within image bounds
  if (rect.x + rect.width > metadata.width || rect.y + rect.height > metadata.height) {
    throw new Error('Rectangle extends beyond image boundaries');
  }

  console.log('Debug: Creating mask with rectangle:', {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });

  // Create a black image (single channel grayscale)
  const mask = await sharp(Buffer.alloc(metadata.width * metadata.height, 0), {
    raw: {
      width: metadata.width,
      height: metadata.height,
      channels: 1
    }
  })
  .composite([{
    input: Buffer.alloc(Math.round(rect.width) * Math.round(rect.height), 255),
    raw: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      channels: 1
    },
    left: Math.round(rect.x),
    top: Math.round(rect.y)
  }])
  .png()
  .toBuffer();

  // Verify the mask was created correctly
  const maskMetadata = await sharp(mask).metadata();
  console.log('Debug: Generated mask metadata:', {
    width: maskMetadata.width,
    height: maskMetadata.height,
    format: maskMetadata.format,
    channels: maskMetadata.channels,
    hasAlpha: maskMetadata.hasAlpha
  });

  return mask;
}

export async function POST(request: Request) {
  try {
    const { image, prompt, rect } = await request.json();

    if (!image || !prompt || !rect) {
      return NextResponse.json(
        { error: "Image, prompt, and rectangle coordinates are required" },
        { status: 400 }
      );
    }

    if (!STABILITY_API_KEY) {
      throw new Error("STABILITY_API_KEY is not configured");
    }

    // Validate prompt length
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.split(',')[1], 'base64');

    // Validate and get image dimensions
    const { width, height } = await validateImage(imageBuffer);

    // Generate mask from rectangle
    const maskBuffer = await generateMask(imageBuffer, rect);

    // Compress and resize image if needed
    const { buffer: processedImageBuffer, scale } = await resizeImage(imageBuffer);
    const compressedImageBuffer = await compressImage(processedImageBuffer);

    // Resize the mask to match the processed image dimensions
    const maskMetadata = await sharp(maskBuffer).metadata();
    if (!maskMetadata.width || !maskMetadata.height) {
      throw new Error('Could not get mask dimensions');
    }

    const resizedMaskBuffer = await sharp(maskBuffer)
      .resize(Math.round(maskMetadata.width * scale), Math.round(maskMetadata.height * scale), {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png()
      .toBuffer();

    // Convert processed image and mask to base64
    const processedImageBase64 = `data:image/png;base64,${compressedImageBuffer.toString('base64')}`;
    const maskBase64 = `data:image/png;base64,${resizedMaskBuffer.toString('base64')}`;

    // Log the final dimensions
    const finalImageMetadata = await sharp(compressedImageBuffer).metadata();
    const finalMaskMetadata = await sharp(resizedMaskBuffer).metadata();
    console.log('Debug: Final image dimensions:', {
      image: {
        width: finalImageMetadata.width,
        height: finalImageMetadata.height,
        pixels: (finalImageMetadata.width || 0) * (finalImageMetadata.height || 0)
      },
      mask: {
        width: finalMaskMetadata.width,
        height: finalMaskMetadata.height,
        pixels: (finalMaskMetadata.width || 0) * (finalMaskMetadata.height || 0)
      }
    });

    // Make the API call to Stability AI
    const form = new FormData();
    form.append('image', Buffer.from(processedImageBase64.split(',')[1], 'base64'), {
      filename: 'image.png',
      contentType: 'image/png'
    });
    form.append('mask', Buffer.from(maskBase64.split(',')[1], 'base64'), {
      filename: 'mask.png',
      contentType: 'image/png'
    });
    form.append('prompt', prompt);
    form.append('output_format', 'png');

    console.log('Debug: Sending request to Stability AI with form data');
    const response = await fetch(
      'https://api.stability.ai/v2beta/stable-image/edit/inpaint',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'image/*',
          ...form.getHeaders()
        },
        body: form,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Stability AI API error:', error);
      throw new Error(`Stability AI API error: ${error.message || response.statusText}`);
    }

    // Get the generated image as a buffer
    const responseBuffer = await response.buffer();
    const imageData = `data:image/png;base64,${responseBuffer.toString('base64')}`;

    return NextResponse.json({ data: { image: imageData } });
  } catch (error) {
    console.error('Error in inpaint endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during inpainting' },
      { status: 500 }
    );
  }
} 