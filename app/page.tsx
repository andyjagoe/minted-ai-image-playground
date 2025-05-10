"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageIcon, Wand2, Layers, Scissors, X } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  const handleImageUpload = (imageDataUrl: string) => {
    setUploadedImage(imageDataUrl)
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
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
      <main className="flex-1">
        <section className="container grid items-center gap-6 pb-8 pt-16 md:py-24">
          <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              What image can I create for you?
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
                  <Image
                    src={uploadedImage || "/placeholder.svg"}
                    alt="Uploaded image"
                    width={800}
                    height={500}
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>

                <div className="relative">
                  <Input
                    className="h-14 pl-4 pr-12 text-base shadow-md"
                    placeholder="Describe how you want to transform this image..."
                  />
                  <Button className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full p-0">
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
