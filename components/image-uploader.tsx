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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.match("image.*")) {
      alert("Please select an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === "string") {
        onImageUpload(e.target.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
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
      <h3 className="mb-2 text-xl font-medium">Upload an image</h3>
      <p className="mb-6 text-center text-sm text-muted-foreground">Drag and drop an image, or click to browse</p>
      <Button onClick={handleButtonClick} className="gap-2">
        <Upload className="h-4 w-4" />
        Browse Files
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
      <p className="mt-4 text-xs text-muted-foreground">Supported formats: JPG, PNG, GIF, WEBP</p>
    </div>
  )
}
