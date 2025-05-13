import { NextResponse } from "next/server"
import { z } from "zod"
import sharp from "sharp"

// Input validation schema
const inputSchema = z.object({
  image: z.string().min(1, "Image is required"),
})

const TARGET_QUALITY = 80 // WebP compression quality (0-100)

export async function POST(request: Request) {
  try {
    console.log('Debug: Starting Sharp auto-enhance request')

    // Parse and validate the request body
    const body = await request.json()
    console.log('Debug: Request body received:', {
      hasImage: !!body.image,
      imageLength: body.image?.length
    })

    const validatedInput = inputSchema.parse(body)
    console.log('Debug: Input validation passed')

    // Convert base64 image to buffer
    const base64Data = validatedInput.image.split(',')[1]
    const imageBuffer = Buffer.from(base64Data, 'base64')
    console.log('Debug: Image buffer created:', {
      bufferSize: imageBuffer.length,
      bufferSizeInMB: imageBuffer.length / (1024 * 1024)
    })

    try {
      // Get image metadata to check format
      const metadata = await sharp(imageBuffer).metadata()
      console.log('Debug: Image metadata:', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: imageBuffer.length / 1024 / 1024
      })

      // Process the image with Sharp
      const enhancedBuffer = await sharp(imageBuffer)
        .normalize() // Auto-adjusts contrast and brightness
        .sharpen() // Enhances sharpness
        .webp({ quality: TARGET_QUALITY }) // Convert to WebP format
        .toBuffer()

      console.log('Debug: Image enhancement complete:', {
        originalSize: imageBuffer.length / 1024 / 1024,
        enhancedSize: enhancedBuffer.length / 1024 / 1024
      })

      // Convert the enhanced buffer to base64
      const enhancedBase64 = enhancedBuffer.toString('base64')

      // Return the enhanced image
      return NextResponse.json({
        data: {
          image: `data:image/webp;base64,${enhancedBase64}`
        }
      })

    } catch (sharpError) {
      console.error('Debug: Sharp processing error:', sharpError)
      throw new Error(`Image processing error: ${sharpError instanceof Error ? sharpError.message : 'Unknown error'}`)
    }

  } catch (error) {
    console.error('Debug: Auto-enhance error:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input: " + error.errors.map(e => e.message).join(", ") },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred during auto-enhancement" },
      { status: 500 }
    )
  }
} 