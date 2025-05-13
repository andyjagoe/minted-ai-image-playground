export const maxDuration = 300;

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

export async function POST(request: Request) {
  try {
    console.log('Debug: Search and Replace request received');
    
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

    const { image, prompt, searchPrompt } = body;

    console.log('Debug: Request parameters:', {
      hasImage: !!image,
      promptLength: prompt?.length,
      searchPromptLength: searchPrompt?.length,
      imageLength: image?.length
    });

    if (!image || !prompt || !searchPrompt) {
      console.error('Debug: Missing required parameters:', {
        hasImage: !!image,
        hasPrompt: !!prompt,
        hasSearchPrompt: !!searchPrompt
      });
      return NextResponse.json(
        { error: "Image, prompt, and search prompt are required" },
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

    // Validate prompt length
    if (prompt.length > MAX_PROMPT_LENGTH || searchPrompt.length > MAX_PROMPT_LENGTH) {
      console.error('Debug: Prompt length exceeds limit:', {
        promptLength: prompt.length,
        searchPromptLength: searchPrompt.length,
        maxLength: MAX_PROMPT_LENGTH
      });
      return NextResponse.json(
        { error: `Prompts must be ${MAX_PROMPT_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.split(',')[1], 'base64');
    
    // Log the size of the decoded image buffer
    console.log('Debug: Decoded image buffer size:', {
      sizeInBytes: imageBuffer.length,
      sizeInMB: imageBuffer.length / (1024 * 1024)
    });

    // Validate and get image dimensions
    const { width, height } = await validateImage(imageBuffer);

    // Compress and resize image if needed
    const { buffer: processedImageBuffer, scale } = await resizeImage(imageBuffer);
    const compressedImageBuffer = await compressImage(processedImageBuffer);

    // Convert processed image to base64
    const processedImageBase64 = `data:image/png;base64,${compressedImageBuffer.toString('base64')}`;

    // Log the final dimensions
    const finalImageMetadata = await sharp(compressedImageBuffer).metadata();
    console.log('Debug: Final image dimensions:', {
      width: finalImageMetadata.width,
      height: finalImageMetadata.height,
      pixels: (finalImageMetadata.width || 0) * (finalImageMetadata.height || 0),
      format: finalImageMetadata.format,
      size: compressedImageBuffer.length / (1024 * 1024) + 'MB'
    });

    // Make the API call to Stability AI
    const form = new FormData();
    form.append('image', Buffer.from(processedImageBase64.split(',')[1], 'base64'), {
      filename: 'image.png',
      contentType: 'image/png'
    });
    form.append('prompt', prompt);
    form.append('search_prompt', searchPrompt);
    form.append('output_format', 'png');

    console.log('Debug: Sending request to Stability AI with form data:', {
      promptLength: prompt.length,
      searchPromptLength: searchPrompt.length,
      imageSize: compressedImageBuffer.length / (1024 * 1024) + 'MB'
    });

    const response = await fetch(
      'https://api.stability.ai/v2beta/stable-image/edit/search-and-replace',
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

    console.log('Debug: Stability AI response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('Debug: Stability AI API error:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      throw new Error(`Stability AI API error: ${error.message || response.statusText}`);
    }

    // Get the generated image as a buffer
    const responseBuffer = await response.buffer();
    
    // Compress the response image
    console.log('Debug: Compressing response image:', {
      originalSize: responseBuffer.length / (1024 * 1024),
      originalFormat: await sharp(responseBuffer).metadata().then(m => m.format)
    });

    const compressedResponseBuffer = await sharp(responseBuffer)
      .png({ quality: 85, compressionLevel: 9 })
      .toBuffer();

    console.log('Debug: Response image compression complete:', {
      originalSize: responseBuffer.length / (1024 * 1024),
      compressedSize: compressedResponseBuffer.length / (1024 * 1024),
      compressionRatio: (compressedResponseBuffer.length / responseBuffer.length * 100).toFixed(2) + '%'
    });

    const imageData = `data:image/png;base64,${compressedResponseBuffer.toString('base64')}`;

    console.log('Debug: Search and replace completed successfully');
    return NextResponse.json({ data: { image: imageData } });
  } catch (error) {
    console.error('Debug: Error in search-and-replace endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during search and replace' },
      { status: 500 }
    );
  }
} 