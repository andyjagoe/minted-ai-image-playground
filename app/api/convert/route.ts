export const maxDuration = 300;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

import { NextResponse } from "next/server"
import heicConvert from "heic-convert"

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      )
    }

    // Remove the data URL prefix to get the base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Check if the image is HEIC
    const isHeic = image.includes("data:image/heic") || image.includes("data:image/heif")

    if (isHeic) {
      try {
        // Convert HEIC to JPEG using heic-convert
        const convertedBuffer = await heicConvert({
          buffer,
          format: "JPEG",
          quality: 0.9
        })

        // Convert back to base64
        const convertedBase64 = convertedBuffer.toString("base64")
        const convertedDataUrl = `data:image/jpeg;base64,${convertedBase64}`

        return NextResponse.json(
          { data: { image: convertedDataUrl } },
          { status: 200 }
        )
      } catch (error) {
        console.error("HEIC conversion error:", error)
        return NextResponse.json(
          { error: "Failed to convert HEIC image" },
          { status: 500 }
        )
      }
    }

    // If not HEIC, return the original image
    return NextResponse.json(
      { data: { image } },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error processing image:", error)
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    )
  }
} 