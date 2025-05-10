export const maxDuration = 300;

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { image, prompt } = await request.json();

    if (!image || !prompt) {
      return NextResponse.json(
        { error: "Image and prompt are required" },
        { status: 400 }
      );
    }

    // Convert base64 image to buffer
    const imageBuffer = Buffer.from(image.split(",")[1], "base64");

    // Create a temporary file from the buffer
    const imageFile = await OpenAI.toFile(imageBuffer, "image.png", {
      type: "image/png",
    });

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: prompt,
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
    console.error("Error transforming image:", error);
    return NextResponse.json(
      { data: null, error: "Failed to transform image" },
      { status: 500 }
    );
  }
} 