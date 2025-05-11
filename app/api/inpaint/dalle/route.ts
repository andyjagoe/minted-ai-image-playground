export const maxDuration = 300;

import { NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Rect = { x: number; y: number; width: number; height: number };

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

  // Validate rectangle is within image bounds
  if (rect.x + rect.width > metadata.width || rect.y + rect.height > metadata.height) {
    throw new Error('Rectangle extends beyond image boundaries');
  }

  console.log('Debug: Creating DALL-E 2 mask with rectangle:', {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });

  // Create a fully opaque black image (RGBA)
  const mask = await sharp({
    create: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
  // Make the rectangle area transparent
  .composite([{
    input: {
      create: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    },
    left: Math.round(rect.x),
    top: Math.round(rect.y)
  }])
  .png()
  .toBuffer();

  // Verify the mask was created correctly
  const maskMetadata = await sharp(mask).metadata();
  console.log('Debug: Generated DALL-E 2 mask metadata:', {
    width: maskMetadata.width,
    height: maskMetadata.height,
    format: maskMetadata.format,
    channels: maskMetadata.channels,
    hasAlpha: maskMetadata.hasAlpha
  });

  return mask;
}

async function prepareImageForDalle(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  // Resize to 1024x1024 using cover to fill the space
  const processedImage = await sharp(imageBuffer)
    .resize(1024, 1024, {
      fit: 'cover',
      position: 'center' // This ensures the center of the image is preserved
    })
    .png()
    .toBuffer();

  // Check if the processed image is still under 4MB
  if (processedImage.length > 4 * 1024 * 1024) {
    // If still too large, compress the PNG
    return sharp(processedImage)
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();
  }

  return processedImage;
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

    // Convert base64 images to buffers
    const imageBuffer = Buffer.from(image.split(",")[1], "base64");

    // Check file size
    if (imageBuffer.length > 4 * 1024 * 1024) { // 4MB
      return NextResponse.json(
        { error: "Image size must be less than 4MB" },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: "Prompt must be 1000 characters or less" },
        { status: 400 }
      );
    }

    // Prepare image for DALL-E 2
    const preparedImageBuffer = await prepareImageForDalle(imageBuffer);

    // Generate mask from rectangle
    const maskBuffer = await generateMask(preparedImageBuffer, rect);

    // Verify image and mask dimensions match
    const imageMetadata = await sharp(preparedImageBuffer).metadata();
    const maskMetadata = await sharp(maskBuffer).metadata();
    
    if (!imageMetadata.width || !imageMetadata.height || !maskMetadata.width || !maskMetadata.height) {
      throw new Error('Could not get image or mask dimensions');
    }

    if (imageMetadata.width !== maskMetadata.width || imageMetadata.height !== maskMetadata.height) {
      throw new Error('Image and mask dimensions must match');
    }

    console.log('Debug: Image and mask dimensions:', {
      image: {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format: imageMetadata.format,
        size: preparedImageBuffer.length
      },
      mask: {
        width: maskMetadata.width,
        height: maskMetadata.height,
        format: maskMetadata.format,
        size: maskBuffer.length
      }
    });

    console.log('Debug: Sending request to OpenAI with:', {
      imageSize: preparedImageBuffer.length,
      maskSize: maskBuffer.length,
      promptLength: prompt.length,
      imageDimensions: `${imageMetadata.width}x${imageMetadata.height}`,
      maskDimensions: `${maskMetadata.width}x${maskMetadata.height}`
    });

    const imageFile = await OpenAI.toFile(preparedImageBuffer, "image.png", {
      type: "image/png",
    });
    const maskFile = await OpenAI.toFile(maskBuffer, "mask.png", {
      type: "image/png",
    });

    const response = await openai.images.edit({
      model: "dall-e-2",
      image: imageFile,
      mask: maskFile,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    });

    console.log('Debug: Received response from OpenAI:', {
      hasData: !!response?.data,
      dataLength: response?.data?.length,
      hasB64Json: !!response?.data?.[0]?.b64_json
    });

    // Type guard to ensure response data exists and has the expected structure
    if (!response?.data?.[0]?.b64_json) {
      throw new Error("No image data received from OpenAI");
    }

    const transformedImage = response.data[0].b64_json;

    return NextResponse.json({
      data: {
        image: `data:image/png;base64,${transformedImage}`,
      },
      error: null,
    });
  } catch (error) {
    console.error("Error inpainting image:", error);
    return NextResponse.json(
      { data: null, error: "Failed to inpaint image" },
      { status: 500 }
    );
  }
} 