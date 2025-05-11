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

  const handleImageUpload = async (imageDataUrl: string) => {
    setUploadedImage(imageDataUrl)
    setTransformedImages([])
  }

  const handleTransform = async (type: TransformationType, prompt?: string, mask?: string, rect?: Rect, editedImage?: string, index?: number) => {
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
      hasPrompt: !!prompt,
      hasRect: !!rect,
      requiresPrompt: config.requiresPrompt,
      requiresRect: config.requiresRect,
      sourceImage: !!sourceImage
    })

    // Create a Blob from the payload
    const payload = {
      image: sourceImage,
      prompt,
      mask,
      rect,
    };
    
    const blob = new Blob([JSON.stringify(payload)], {
      type: 'application/json'
    });

    console.log('Debug: Request payload size:', {
      sizeInBytes: blob.size,
      sizeInMB: blob.size / (1024 * 1024),
      imageSize: sourceImage.length,
      imageSizeInMB: sourceImage.length / (1024 * 1024)
    });

    setIsTransforming(true)
    setTransformingIndex(index ?? null)

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: blob
      });

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Debug: Server response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
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
    } catch (error) {
      console.error(`Error ${type}ing image:`, error)
    } finally {
      setIsTransforming(false)
      setTransformingIndex(null)
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
              <ImageUploader 
                onImageUpload={handleImageUpload}
                onError={(error) => console.error("Upload error:", error)}
              />
            ) : (
              <div className="space-y-8">
                <ImageTransformer
                  image={uploadedImage}
                  showControls={true}
                  isTransforming={isTransforming && transformingIndex === null}
                  onTransform={(type, prompt, mask, rect) => handleTransform(type, prompt, mask, rect)}
                  onRemove={() => {
                    setUploadedImage(null)
                    setTransformedImages([])
                  }}
                  onCopy={() => handleCopyImage(uploadedImage)}
                  onDownload={() => handleDownloadImage(uploadedImage)}
                  disabled={transformedImages.length > 0}
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
