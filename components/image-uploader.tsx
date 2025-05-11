"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ImageIcon } from "lucide-react"

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => Promise<void>
  onError?: (error: Error) => void
}

export function ImageUploader({ onImageUpload, onError }: ImageUploaderProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    try {
      const imageDataUrl = await readFileAsDataURL(file)
      const isHeic = imageDataUrl.includes("data:image/heic") || imageDataUrl.includes("data:image/heif")
      
      if (isHeic) {
        setIsConverting(true)
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

          await onImageUpload(result.data.image)
        } catch (error) {
          console.error("Error converting HEIC:", error)
          onError?.(error instanceof Error ? error : new Error("Failed to convert HEIC image"))
        } finally {
          setIsConverting(false)
        }
      } else {
        await onImageUpload(imageDataUrl)
      }
    } catch (error) {
      console.error("Error reading file:", error)
      onError?.(error instanceof Error ? error : new Error("Failed to read image file"))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [])

  return (
    <div 
      className={`flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, HEIC up to 10MB
          </p>
        </div>
      </div>
      {isConverting ? (
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Converting your image...</p>
        </div>
      ) : (
        <Button
          variant="outline"
          className="relative"
        >
          Select Image
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/png,image/jpeg,image/heic,image/heif"
            onChange={handleInputChange}
          />
        </Button>
      )}
    </div>
  )
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
