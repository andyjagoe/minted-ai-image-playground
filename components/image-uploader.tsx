"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon } from "lucide-react"

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const processFile = async (file: File) => {
    try {
      // Create a FileReader to read the file
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === "string") {
          onImageUpload(result)
        }
      }

      reader.onerror = (error) => {
        console.error("Error reading file:", error)
        throw new Error("Failed to read file")
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error in processFile:", error)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      await processFile(file)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      await processFile(file)
    }
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-4 rounded-full bg-primary/10 p-3">
        <ImageIcon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-medium">
        Upload an image
      </h3>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Drag and drop an image, or click to browse
      </p>
      <Button 
        onClick={handleButtonClick} 
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Browse Files
      </Button>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*,.heic" 
        className="hidden" 
        onChange={handleFileInput}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Supported formats: JPG, PNG, GIF, WEBP, HEIC
      </p>
    </div>
  )
}
