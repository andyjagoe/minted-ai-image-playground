export const maxDuration = 300;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

import { NextResponse } from "next/server"
import sharp from "sharp"

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      )
    }

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Process image with Sharp
    const mirroredImageBuffer = await sharp(imageBuffer)
      .flop() // Mirror horizontally
      .toBuffer()

    // Convert back to base64
    const mirroredImage = `data:image/png;base64,${mirroredImageBuffer.toString('base64')}`

    return NextResponse.json(
      { data: { image: mirroredImage } },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error mirroring image:", error)
    return NextResponse.json(
      { error: "Failed to mirror image" },
      { status: 500 }
    )
  }
} 