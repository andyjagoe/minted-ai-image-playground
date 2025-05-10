"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageIcon, Wand2, Layers, Scissors, X, Copy, Download } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [transformedImage, setTransformedImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isTransforming, setIsTransforming] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleImageUpload = async (imageDataUrl: string) => {
    // Check if the image is HEIC
    const isHeic = imageDataUrl.includes("data:image/heic") || imageDataUrl.includes("data:image/heif")
    
    if (isHeic) {
      setIsConverting(true)
      setUploadedImage(imageDataUrl) // Set the image immediately to show the loading state
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
        // You might want to add proper error handling UI here
      } finally {
        setIsConverting(false)
      }
    } else {
      setUploadedImage(imageDataUrl)
    }
    setTransformedImage(null)
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    setTransformedImage(null)
  }

  const handleTransform = async () => {
    if (!uploadedImage || !prompt.trim()) return

    setIsTransforming(true)
    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: uploadedImage,
          prompt: prompt.trim(),
        }),
      })

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      setTransformedImage(result.data.image)
    } catch (error) {
      console.error("Error transforming image:", error)
      // You might want to add proper error handling UI here
    } finally {
      setIsTransforming(false)
    }
  }

  const handleCopyImage = async () => {
    if (!transformedImage) return;
    
    try {
      const response = await fetch(transformedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  };

  const handleDownloadImage = async () => {
    if (!transformedImage) return;
    
    try {
      const response = await fetch(transformedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transformed-image.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

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
      <main className="flex-1">
        <section className="container grid items-center gap-6 pb-8 pt-16 md:py-24">
          <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              What can I create for you?
            </h1>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Upload an image to get started, then describe how you want to transform it
            </p>
          </div>
          <div className="mx-auto w-full max-w-[800px]">
            {!uploadedImage ? (
              <ImageUploader onImageUpload={handleImageUpload} />
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg border border-border overflow-hidden">
                  <div className="absolute right-2 top-2 z-10">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                  {isConverting ? (
                    <div className="relative">
                      <Image
                        src={uploadedImage}
                        alt="Original image"
                        width={800}
                        height={500}
                        className="w-full h-auto max-h-[500px] object-contain blur-sm"
                        unoptimized
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                          <p className="text-sm text-muted-foreground">Converting HEIC image...</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={uploadedImage}
                      alt="Uploaded image"
                      width={800}
                      height={500}
                      className="w-full h-auto max-h-[500px] object-contain"
                      unoptimized
                    />
                  )}
                </div>

                <div className="relative">
                  <Input
                    className="h-14 pl-4 pr-12 text-base shadow-md"
                    placeholder="Describe how you want to transform this image..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleTransform()
                      }
                    }}
                  />
                  <Button 
                    className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full p-0"
                    onClick={handleTransform}
                    disabled={isTransforming || !prompt.trim()}
                  >
                    <Wand2 className="h-5 w-5" />
                    <span className="sr-only">Transform</span>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Layers className="h-4 w-4" />
                    Create Variations
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Scissors className="h-4 w-4" />
                    Edit Image
                  </Button>
                </div>

                {(isTransforming || transformedImage) && (
                  <div className="mt-8 space-y-4">
                    <h2 className="text-2xl font-semibold text-center">
                      {isTransforming ? "Transforming..." : "Transformed Image"}
                    </h2>
                    <div className="relative rounded-lg border border-border overflow-hidden">
                      {isTransforming ? (
                        <div className="relative">
                          <Image
                            src={uploadedImage}
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
                      ) : (
                        <div className="relative">
                          <Image
                            src={transformedImage!}
                            alt="Transformed image"
                            width={800}
                            height={500}
                            className="w-full h-auto max-h-[500px] object-contain"
                            unoptimized
                          />
                          <div className="absolute right-2 top-2 z-10 flex gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                              onClick={handleCopyImage}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Copy image</span>
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                              onClick={handleDownloadImage}
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download image</span>
                            </Button>
                          </div>
                          {isCopied && (
                            <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-sm backdrop-blur-sm">
                              Copied to clipboard!
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
