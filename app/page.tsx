"use client"

import { useState } from "react"
import Link from "next/link"
import { ImageIcon } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"
import { ImageTransformer } from "@/components/image-transformer"
import { TransformedImages } from "@/components/transformed-images"
import { TransformationType, TRANSFORMATION_CONFIGS, Rect } from "@/lib/types/transformations"

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [transformedImages, setTransformedImages] = useState<string[]>([])
  const [isTransforming, setIsTransforming] = useState(false)
  const [transformingIndex, setTransformingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = async (imageDataUrl: string) => {
    try {
      // Validate the image data URL
      if (!imageDataUrl.startsWith('data:image/')) {
        throw new Error('Invalid image format. Please upload a valid image file.')
      }

      // Check if the image is too large (e.g., > 10MB)
      const base64Data = imageDataUrl.split(',')[1]
      const sizeInBytes = Math.ceil((base64Data.length * 3) / 4)
      const sizeInMB = sizeInBytes / (1024 * 1024)
      
      if (sizeInMB > 10) {
        throw new Error('Image is too large. Please upload an image smaller than 10MB.')
      }

      setUploadedImage(imageDataUrl)
      setTransformedImages([])
      setError(null)
    } catch (error) {
      console.error('Image upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to process the uploaded image')
      setUploadedImage(null)
    }
  }

  const handleTransform = async (
    type: TransformationType,
    prompt?: string,
    mask?: string,
    rect?: Rect,
    editedImage?: string,
    index?: number,
    searchPrompt?: string,
    outpaintParams?: { left: number; down: number; style_preset?: string }
  ) => {
    setError(null) // Clear any previous errors
    const sourceImage = index === undefined 
      ? uploadedImage 
      : transformedImages[index]
    
    if (!sourceImage) return

    // If we have an edited image, use it directly
    if (editedImage) {
      console.log('Debug: handleTransform received edited image:', {
        index,
        hasImage: !!editedImage,
        imageLength: editedImage.length,
        currentTransformedImages: transformedImages.length
      });

      // Always append the edited image as a new transformation
      setTransformedImages(prev => [...prev, editedImage])
      return
    }

    const config = TRANSFORMATION_CONFIGS[type]
    console.log('Debug: handleTransform values:', {
      type,
      prompt,
      rect,
      searchPrompt,
      hasPrompt: !!prompt,
      hasRect: !!rect,
      hasSearchPrompt: !!searchPrompt,
      requiresPrompt: config.requiresPrompt,
      requiresRect: config.requiresRect,
      requiresSearchPrompt: config.requiresSearchPrompt,
      sourceImage: !!sourceImage
    })

    // Log payload size before sending
    const payload = {
      image: sourceImage,
      prompt,
      mask,
      rect,
      searchPrompt,
    }
    const payloadSize = new Blob([JSON.stringify(payload)]).size
    console.log('Debug: Request payload size:', {
      sizeInBytes: payloadSize,
      sizeInMB: payloadSize / (1024 * 1024),
      imageSize: sourceImage.length,
      imageSizeInMB: sourceImage.length / (1024 * 1024)
    })

    setIsTransforming(true)
    setTransformingIndex(index ?? null)

    try {
      let response;
      switch (type) {
        case "outpaint":
          response = await fetch("/api/outpaint", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: sourceImage,
              left: outpaintParams?.left,
              down: outpaintParams?.down,
              prompt: prompt,
              style_preset: outpaintParams?.style_preset,
            }),
          });
          break;
        default:
          response = await fetch(config.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Debug: Server response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        
        // Try to parse the error message from the response
        let errorMessage = `Server error: ${response.status} ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error) {
            errorMessage = errorJson.error
          }
        } catch (e) {
          // If parsing fails, use the raw error text if it's not empty
          if (errorText) {
            errorMessage = errorText
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data || !result.data.image) {
        throw new Error('Invalid response format from server')
      }

      // Add the transformed image to the array
      setTransformedImages(prev => [...prev, result.data.image])
      setError(null) // Clear error on success
    } catch (error) {
      console.error(`Error ${type}ing image:`, error)
      setError(error instanceof Error ? error.message : 'An error occurred during transformation')
    } finally {
      setIsTransforming(false)
      // Only clear transformingIndex if there's no error
      if (!error) {
        setTransformingIndex(null)
      }
    }
  }

  const handleCopyImage = async (image: string) => {
    try {
      const response = await fetch(image)
      const blob = await response.blob()
      
      // Create a canvas to convert the image to PNG
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Wait for the image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = URL.createObjectURL(blob)
      })
      
      // Set canvas dimensions to match the image
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw the image on the canvas
      ctx?.drawImage(img, 0, 0)
      
      // Convert canvas to PNG blob
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!)
        }, 'image/png')
      })
      
      // Copy the PNG blob to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob
        })
      ])
      
      // Clean up
      URL.revokeObjectURL(img.src)
    } catch (error) {
      console.error('Failed to copy image:', error)
    }
  }

  const handleDownloadImage = async (image: string) => {
    try {
      const response = await fetch(image)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transformed-image.png'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const handleRemoveTransformedImage = (index: number) => {
    setTransformedImages(prev => prev.slice(0, index))
    setError(null) // Clear error when removing images
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xl font-bold">Minted AI Image Playground</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center">
        <section className="container flex flex-col items-center gap-6 pb-8 pt-16 md:py-24 w-full max-w-[1200px]">
          <div className="flex flex-col items-center gap-4 text-center w-full">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              What can I create for you?
            </h1>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Upload an image, then describe how you want to transform it
            </p>
          </div>
          <div className="w-full max-w-[800px]">
            {!uploadedImage ? (
              <div className="space-y-4">
                <ImageUploader 
                  onImageUpload={handleImageUpload}
                  onError={(error) => {
                    console.error("Upload error:", error)
                    setError(error instanceof Error ? error.message : String(error))
                  }}
                />
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <ImageTransformer
                  image={uploadedImage}
                  showControls={true}
                  isTransforming={isTransforming && transformingIndex === null}
                  onTransform={(type, prompt, mask, rect, editedImage, index, searchPrompt, outpaintParams) => 
                    handleTransform(type, prompt, mask, rect, editedImage, index, searchPrompt, outpaintParams)}
                  onRemove={() => {
                    setUploadedImage(null)
                    setTransformedImages([])
                    setError(null)
                  }}
                  onCopy={() => handleCopyImage(uploadedImage)}
                  onDownload={() => handleDownloadImage(uploadedImage)}
                  disabled={transformedImages.length > 0}
                  error={transformingIndex === null ? error : null}
                />

                {(isTransforming || transformedImages.length > 0) && (
                  <TransformedImages
                    images={transformedImages}
                    isTransforming={isTransforming}
                    transformingIndex={transformingIndex}
                    uploadedImage={uploadedImage}
                    onTransform={handleTransform}
                    onRemove={handleRemoveTransformedImage}
                    onCopy={handleCopyImage}
                    onDownload={handleDownloadImage}
                    error={error}
                  />
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Minted AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
