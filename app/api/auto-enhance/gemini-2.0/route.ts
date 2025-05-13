import { NextResponse } from "next/server"
import { z } from "zod"
import { GoogleGenAI, Modality } from "@google/genai"
import sharp from "sharp"

// Input validation schema
const inputSchema = z.object({
  image: z.string().min(1, "Image is required"),
})

const MAX_IMAGE_SIZE = 7 * 1024 * 1024 // 7MB in bytes
const TARGET_QUALITY = 85 // PNG compression quality (0-100)

async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions')
  }

  // Start with the original image
  let compressedBuffer = imageBuffer
  let quality = TARGET_QUALITY

  // Keep compressing until we're under the size limit or quality is too low
  while (compressedBuffer.length > MAX_IMAGE_SIZE && quality > 20) {
    console.log('Debug: Compressing image, current size:', {
      size: compressedBuffer.length / 1024 / 1024,
      quality
    })

    compressedBuffer = await sharp(imageBuffer)
      .png({ quality })
      .toBuffer()

    quality -= 5 // Reduce quality by 5 each iteration
  }

  if (compressedBuffer.length > MAX_IMAGE_SIZE) {
    throw new Error('Could not compress image to required size while maintaining acceptable quality')
  }

  console.log('Debug: Image compression complete:', {
    originalSize: imageBuffer.length / 1024 / 1024,
    compressedSize: compressedBuffer.length / 1024 / 1024,
    finalQuality: quality + 5 // Add back the last quality reduction
  })

  return compressedBuffer
}

export async function POST(request: Request) {
  try {
    console.log('Debug: Starting auto-enhance request')

    // Parse and validate the request body
    const body = await request.json()
    console.log('Debug: Request body received:', {
      hasImage: !!body.image,
      imageLength: body.image?.length
    })

    const validatedInput = inputSchema.parse(body)
    console.log('Debug: Input validation passed')

    // Get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY
    console.log('Debug: API key check:', {
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      )
    }

    // Initialize the Gemini client
    const genAI = new GoogleGenAI({ apiKey })
    console.log('Debug: Gemini client initialized')

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

      let pngBuffer: Buffer
      if (metadata.format === 'png') {
        console.log('Debug: Image is already PNG, compressing if needed')
        pngBuffer = await compressImage(imageBuffer)
      } else {
        console.log('Debug: Converting image to PNG and compressing')
        pngBuffer = await sharp(imageBuffer)
          .png()
          .toBuffer()
        pngBuffer = await compressImage(pngBuffer)
      }

      // Generate the enhanced image
      console.log('Debug: Sending request to Gemini API')
      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: [
          {
            role: "user",
            parts: [
              { text: "Enhance this image for vibrant colors and sharpness" },
              { inlineData: { mimeType: "image/png", data: pngBuffer.toString('base64') } }
            ]
          }
        ],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE]
        }
      })

      console.log('Debug: Received response from Gemini API')
      const response = result

      // Process the response parts
      let enhancedImage: string | undefined
      let textResponse: string | undefined

      if (!response.candidates?.[0]?.content?.parts) {
        console.error('Debug: Invalid response structure:', {
          response: JSON.stringify(response, null, 2)
        })
        return NextResponse.json(
          { error: "Invalid response from Gemini API" },
          { status: 500 }
        )
      }

      for (const part of response.candidates[0].content.parts) {
        if ('text' in part && part.text) {
          textResponse = part.text
          console.log('Debug: Received text response:', textResponse)
        } else if ('inlineData' in part && part.inlineData?.data) {
          enhancedImage = part.inlineData.data
          console.log('Debug: Received image data:', {
            hasImage: !!enhancedImage,
            imageLength: enhancedImage?.length
          })
        }
      }

      if (!enhancedImage) {
        console.error('Debug: No enhanced image in response:', {
          textResponse,
          response: JSON.stringify(response, null, 2)
        })
        return NextResponse.json(
          { error: "No image generated in response" },
          { status: 500 }
        )
      }

      // Return the enhanced image
      return NextResponse.json({
        data: {
          image: `data:image/png;base64,${enhancedImage}`
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