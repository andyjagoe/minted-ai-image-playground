import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import FormData from "form-data"
import sharp from "sharp"
import { STABILITY_API_KEY } from "@/lib/constants"
import fetch from "node-fetch"

export const maxDuration = 300;

// Stability AI API constants
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const MIN_IMAGE_DIMENSION = 64;
const MAX_IMAGE_DIMENSION = 2048;
const TARGET_QUALITY = 85; // PNG compression quality (0-100)

// Add style preset validation
const VALID_STYLE_PRESETS = [
  '3d-model',
  'analog-film',
  'anime',
  'cinematic',
  'comic-book',
  'digital-art',
  'enhance',
  'fantasy-art',
  'isometric',
  'line-art',
  'low-poly',
  'modeling-compound',
  'neon-punk',
  'origami',
  'photographic',
  'pixel-art',
  'tile-texture'
] as const;

type StylePreset = typeof VALID_STYLE_PRESETS[number];

function isValidStylePreset(preset: string): preset is StylePreset {
  return VALID_STYLE_PRESETS.includes(preset as StylePreset);
}

async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  console.log('Debug: Starting image compression');
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  console.log('Debug: Image metadata before compression:', {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: imageBuffer.length / 1024 / 1024 + 'MB'
  });

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
  console.log('Debug: Starting image resize');
  const metadata = await sharp(imageBuffer).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  console.log('Debug: Image metadata before resize:', {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: imageBuffer.length / 1024 / 1024 + 'MB'
  });

  const MAX_PIXELS = 9437184; // Stability AI's maximum pixel limit
  const currentPixels = metadata.width * metadata.height;

  // Calculate scale to fit within MAX_PIXELS while maintaining aspect ratio
  const scale = Math.min(
    Math.sqrt(MAX_PIXELS / currentPixels),
    MAX_IMAGE_DIMENSION / metadata.width,
    MAX_IMAGE_DIMENSION / metadata.height
  );

  console.log('Debug: Resize calculations:', {
    currentPixels,
    maxPixels: MAX_PIXELS,
    calculatedScale: scale
  });

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

  console.log('Debug: No resize needed, image is within limits');
  return { buffer: imageBuffer, scale: 1 };
}

async function validateImage(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  console.log('Debug: Validating image');
  const metadata = await sharp(imageBuffer).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  console.log('Debug: Image validation:', {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation
  });

  if (metadata.width < MIN_IMAGE_DIMENSION || metadata.height < MIN_IMAGE_DIMENSION) {
    throw new Error(`Image dimensions must be at least ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels`);
  }

  return { width: metadata.width, height: metadata.height };
}

export async function POST(request: NextRequest) {
  try {
    console.log('Debug: Outpaint request received');
    
    // Log request headers for debugging
    console.log('Debug: Request headers:', {
      'content-length': request.headers.get('content-length'),
      'content-type': request.headers.get('content-type'),
      'accept': request.headers.get('accept'),
      'user-agent': request.headers.get('user-agent')
    });

    const body = await request.json();
    
    // Log the size of the incoming request body
    const bodySize = JSON.stringify(body).length;
    console.log('Debug: Request body size:', {
      sizeInBytes: bodySize,
      sizeInMB: bodySize / (1024 * 1024)
    });

    const { image, left, down, prompt, style_preset } = body;

    console.log('Debug: Request parameters:', {
      hasImage: !!image,
      left,
      down,
      prompt,
      style_preset,
      imageLength: image?.length
    });

    if (!image || typeof left !== 'number' || typeof down !== 'number') {
      console.error('Debug: Missing or invalid parameters:', {
        hasImage: !!image,
        left,
        down
      });
      return NextResponse.json(
        { error: "Image, left, and down values are required" },
        { status: 400 }
      );
    }

    // Validate prompt length if provided
    if (prompt !== undefined && (typeof prompt !== 'string' || prompt.length > 10000)) {
      console.error('Debug: Invalid prompt:', { promptLength: prompt?.length });
      return NextResponse.json(
        { error: "Prompt must be a string with maximum length of 10000 characters" },
        { status: 400 }
      );
    }

    // Validate style preset if provided
    if (style_preset !== undefined && !isValidStylePreset(style_preset)) {
      console.error('Debug: Invalid style preset:', { style_preset });
      return NextResponse.json(
        { error: `Invalid style preset. Must be one of: ${VALID_STYLE_PRESETS.join(', ')}` },
        { status: 400 }
      );
    }

    // Log the size of the base64 image string
    console.log('Debug: Base64 image size:', {
      sizeInBytes: image.length,
      sizeInMB: image.length / (1024 * 1024)
    });

    if (!STABILITY_API_KEY) {
      console.error('Debug: STABILITY_API_KEY is not configured');
      throw new Error("STABILITY_API_KEY is not configured");
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.split(',')[1], 'base64');

    // Validate, resize, and compress the image
    await validateImage(imageBuffer);
    const { buffer: resizedBuffer, scale } = await resizeImage(imageBuffer);
    const compressedBuffer = await compressImage(resizedBuffer);

    // Create form data for Stability AI
    const formData = new FormData();
    formData.append('image', compressedBuffer, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    formData.append('left', left.toString());
    formData.append('down', down.toString());
    formData.append('output_format', 'webp');
    
    // Add optional parameters if provided
    if (prompt) {
      formData.append('prompt', prompt);
    }
    if (style_preset) {
      formData.append('style_preset', style_preset);
    }

    console.log('Debug: Sending request to Stability AI');
    const response = await fetch(
      'https://api.stability.ai/v2beta/stable-image/edit/outpaint',
      {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${STABILITY_API_KEY}`,
          Accept: 'image/*',
        },
      }
    );

    if (!response.ok) {
      console.error('Debug: Stability AI error response:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Stability AI API error: ${response.status}`);
    }

    // Get the processed image buffer
    const processedImageBuffer = Buffer.from(await response.arrayBuffer());

    // Get metadata of the processed image
    const processedMetadata = await sharp(processedImageBuffer).metadata();
    console.log('Debug: Processed image metadata:', processedMetadata);

    // Convert to base64
    const base64Image = processedImageBuffer.toString('base64');
    const dataUrl = `data:image/webp;base64,${base64Image}`;

    return NextResponse.json({ data: { image: dataUrl }, error: null });
  } catch (error) {
    console.error('Debug: Error in outpaint endpoint:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 