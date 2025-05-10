"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ImageIcon } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"
import { ImageTransformer } from "@/components/image-transformer"

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [transformedImages, setTransformedImages] = useState<string[]>([])
  const [prompts, setPrompts] = useState<string[]>([])
  const [isTransforming, setIsTransforming] = useState(false)
  const [transformingIndex, setTransformingIndex] = useState<number | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const transformedImageRefs = useRef<(HTMLDivElement | null)[]>([])

  const handleImageUpload = async (imageDataUrl: string) => {
    const isHeic = imageDataUrl.includes("data:image/heic") || imageDataUrl.includes("data:image/heif")
    
    if (isHeic) {
      setIsConverting(true)
      setUploadedImage(imageDataUrl)
      try {
        const response = await fetch("/api/convert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: imageDataUrl,
          }),
        })

        const result = await response.json()
        if (result.error) {
          throw new Error(result.error)
        }

        setUploadedImage(result.data.image)
      } catch (error) {
        console.error("Error converting HEIC:", error)
      } finally {
        setIsConverting(false)
      }
    } else {
      setUploadedImage(imageDataUrl)
    }
    setTransformedImages([])
    setPrompts([])
  }

  const handleTransform = async (style?: string, index?: number) => {
    const sourceImage = index === undefined 
      ? uploadedImage 
      : transformedImages[index]
    
    if (!sourceImage) return

    // Get the appropriate prompt based on whether we're using a style or custom prompt
    const promptText = style 
      ? `Convert this image to ${style} style`
      : prompts[index ?? 0]?.trim()

    if (!promptText) {
      console.error("No prompt provided")
      return
    }

    // Update the prompt for the current transformation if using style
    if (style && index !== undefined) {
      const newPrompts = [...prompts]
      newPrompts[index + 1] = promptText
      setPrompts(newPrompts)
    }

    setIsTransforming(true)
    setTransformingIndex(index ?? null)
    
    // Only scroll when adding a new transformation (not when transforming an existing one)
    if (index === undefined || index === transformedImages.length - 1) {
      setTimeout(() => {
        const targetRef = index === undefined 
          ? transformedImageRefs.current[0]
          : transformedImageRefs.current[index + 1]
        
        targetRef?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
    }

    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: sourceImage,
          prompt: promptText,
        }),
      })

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      if (index === undefined) {
        // First transformation from original image
        setTransformedImages([result.data.image])
        setPrompts([prompts[0] || "", promptText])
      } else {
        // Append new transformation to the list
        setTransformedImages(prev => [...prev, result.data.image])
        // Don't set the prompt for the next transformation yet
        setPrompts(prev => [...prev, ""])
      }
    } catch (error) {
      console.error("Error transforming image:", error)
    } finally {
      setIsTransforming(false)
      setTransformingIndex(null)
    }
  }

  const handleCopyImage = async (image: string) => {
    try {
      const response = await fetch(image)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ])
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

  const handlePromptChange = (value: string, index: number) => {
    const newPrompts = [...prompts]
    newPrompts[index] = value
    setPrompts(newPrompts)
  }

  const handleRemoveTransformedImage = (index: number) => {
    // Remove the selected image and all subsequent images
    setTransformedImages(prev => prev.slice(0, index))
    setPrompts(prev => prev.slice(0, index + 1))
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
              Upload an image to get started, then describe how you want to transform it
            </p>
          </div>
          <div className="w-full max-w-[800px]">
            {!uploadedImage ? (
              <ImageUploader onImageUpload={handleImageUpload} />
            ) : (
              <div className="space-y-8">
                <ImageTransformer
                  image={uploadedImage}
                  prompt={prompts[0] || ""}
                  isTransforming={isTransforming && transformingIndex === null}
                  isConverting={isConverting}
                  onPromptChange={(value) => handlePromptChange(value, 0)}
                  onTransform={(style) => handleTransform(style)}
                  onRemove={() => {
                    setUploadedImage(null)
                    setTransformedImages([])
                    setPrompts([])
                  }}
                  onCopy={() => handleCopyImage(uploadedImage)}
                  onDownload={() => handleDownloadImage(uploadedImage)}
                  disabled={transformedImages.length > 0}
                />

                {(isTransforming || transformedImages.length > 0) && (
                  <div className="space-y-8">
                    {transformedImages.map((image, index) => (
                      <div
                        key={index}
                        ref={el => {
                          transformedImageRefs.current[index] = el
                        }}
                      >
                        <ImageTransformer
                          image={image}
                          prompt={prompts[index + 1] || ""}
                          isTransforming={isTransforming && transformingIndex === index}
                          onPromptChange={(value) => handlePromptChange(value, index + 1)}
                          onTransform={(style) => handleTransform(style, index)}
                          onRemove={() => handleRemoveTransformedImage(index)}
                          onCopy={() => handleCopyImage(image)}
                          onDownload={() => handleDownloadImage(image)}
                          title={`Transformation ${index + 1}`}
                          showControls={true}
                          disabled={index !== transformedImages.length - 1}
                        />
                      </div>
                    ))}

                    {isTransforming && (
                      <div 
                        ref={el => {
                          transformedImageRefs.current[transformedImages.length] = el
                        }}
                        className="space-y-4"
                      >
                        <h2 className="text-2xl font-semibold text-center">
                          Transforming...
                        </h2>
                        <div className="relative rounded-lg border border-border overflow-hidden">
                          <Image
                            src={transformingIndex === null 
                              ? uploadedImage 
                              : transformedImages[transformingIndex]}
                            alt="Original image"
                            width={800}
                            height={500}
                            className="w-full h-auto max-h-[500px] object-contain blur-sm"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                              <p className="text-sm text-muted-foreground">Transforming your image...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
