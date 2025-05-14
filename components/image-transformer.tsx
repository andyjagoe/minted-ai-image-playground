"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Wand2, Scissors, Trash2, Copy, Download, Palette, Plus, FlipHorizontal, Search, ZoomOut } from "lucide-react"
import { TransformationType, Rect } from "@/lib/types/transformations"
import { AddItemDialog } from "@/components/add-item-dialog"
import { SearchReplaceDialog } from "@/components/search-replace-dialog"
import { OutpaintDialog } from "@/components/outpaint-dialog"

interface ImageTransformerProps {
  image: string
  title?: string
  showControls?: boolean
  disabled?: boolean
  isTransforming?: boolean
  onTransform: (
    type: TransformationType,
    prompt?: string,
    mask?: string,
    rect?: Rect,
    editedImage?: string,
    index?: number,
    searchPrompt?: string,
    outpaintParams?: { left: number; right: number; up: number; down: number; style_preset?: string }
  ) => Promise<void>
  onRemove?: () => void
  onCopy?: () => void
  onDownload?: () => void
  isLastImage?: boolean
  error?: string | null
}

export function ImageTransformer({
  image,
  title,
  showControls = false,
  disabled = false,
  isTransforming = false,
  onTransform,
  onRemove,
  onCopy,
  onDownload,
  isLastImage = false,
  error = null,
}: ImageTransformerProps) {
  const [prompt, setPrompt] = useState("")
  const [searchPrompt, setSearchPrompt] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [isSearchReplaceModalOpen, setIsSearchReplaceModalOpen] = useState(false)
  const [isOutpaintModalOpen, setIsOutpaintModalOpen] = useState(false)
  const [hasTransformed, setHasTransformed] = useState(false)

  // Reset hasTransformed and prompt when this becomes the last image
  useEffect(() => {
    if (isLastImage) {
      setHasTransformed(false)
      setPrompt("")
    }
  }, [isLastImage])

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy()
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleStyleConvert = async (style: string) => {
    const formattedPrompt = `Convert this image to ${style} style`
    setPrompt(formattedPrompt)
    try {
      await onTransform('transform', formattedPrompt)
      setHasTransformed(true)
    } catch (error) {
      console.error('Error converting style:', error)
      setHasTransformed(false)
    }
  }

  const handleAddItem = async (prompt: string, rect: Rect) => {
    try {
      await onTransform('inpaint', prompt, undefined, rect)
      setHasTransformed(true)
    } catch (error) {
      console.error('Error adding item:', error)
      setHasTransformed(false)
    }
  }

  const handleSearchReplace = async (prompt: string, searchPrompt: string) => {
    try {
      console.log('Debug: handleSearchReplace called with:', { prompt, searchPrompt });
      await onTransform('search-and-replace', prompt, undefined, undefined, undefined, undefined, searchPrompt)
      setHasTransformed(true)
    } catch (error) {
      console.error('Error in search and replace:', error)
      setHasTransformed(false)
    }
  }

  const handleOutpaint = async (left: number, right: number, up: number, down: number, prompt?: string, style_preset?: string) => {
    try {
      await onTransform('outpaint', prompt, undefined, undefined, undefined, undefined, undefined, { left, right, up, down, style_preset })
      setHasTransformed(true)
    } catch (error) {
      console.error('Error in outpaint:', error)
      setHasTransformed(false)
    }
  }

  return (
    <div className="space-y-4">
      {title && title !== "Original Image" && (
        <h2 className="text-2xl font-semibold text-center">
          {title}
        </h2>
      )}
      <div className="relative rounded-lg border border-border overflow-hidden">
        <Image
          src={image}
          alt={title || "Original image"}
          width={800}
          height={500}
          className="w-full h-auto max-h-[500px] object-contain"
          unoptimized
        />
        {isTransforming && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Transforming your image...</p>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          {onCopy && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
              disabled={isTransforming}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {onDownload && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={onDownload}
              disabled={isTransforming}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={onRemove}
              disabled={isTransforming}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Input
            className="h-14 pl-4 pr-12 text-base shadow-md"
            placeholder="Describe how you want to transform this image..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                const trimmedPrompt = prompt.trim()
                setPrompt(trimmedPrompt)
                onTransform('transform', trimmedPrompt)
              }
            }}
            disabled={disabled || isTransforming || hasTransformed}
          />
          <Button 
            className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full p-0"
            onClick={() => {
              const trimmedPrompt = prompt.trim()
              setPrompt(trimmedPrompt)
              onTransform('transform', trimmedPrompt)
            }}
            disabled={disabled || isTransforming || hasTransformed || !prompt.trim()}
          >
            <Wand2 className="h-5 w-5" />
            <span className="sr-only">Transform</span>
          </Button>
        </div>
        {showControls && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 gap-1.5"
                  disabled={disabled || isTransforming || hasTransformed}
                >
                  <Palette className="h-4 w-4" />
                  Convert to Style
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => handleStyleConvert("Disney")} disabled={disabled || isTransforming || hasTransformed}>
                  Disney Style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Pixar")} disabled={disabled || isTransforming || hasTransformed}>
                  Pixar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Anime")} disabled={disabled || isTransforming || hasTransformed}>
                  Anime Style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Ghibli")} disabled={disabled || isTransforming || hasTransformed}>
                  Ghibli
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Simpsons")} disabled={disabled || isTransforming || hasTransformed}>
                  Simpsons
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Family Guy")} disabled={disabled || isTransforming || hasTransformed}>
                  Family Guy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Muppet")} disabled={disabled || isTransforming || hasTransformed}>
                  Muppet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Retro Pixel Art")} disabled={disabled || isTransforming || hasTransformed}>
                  Retro Pixel Art
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Hérge")} disabled={disabled || isTransforming || hasTransformed}>
                  Hérge
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Watercolor Painting")} disabled={disabled || isTransforming || hasTransformed}>
                  Watercolor Painting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Baroque Oil Painting")} disabled={disabled || isTransforming || hasTransformed}>
                  Baroque Oil Painting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 gap-1.5"
                  disabled={disabled || isTransforming || hasTransformed}
                >
                  <Scissors className="h-4 w-4" />
                  Edit Image
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => setIsSearchReplaceModalOpen(true)} disabled={disabled || isTransforming || hasTransformed}>
                  <Search className="h-4 w-4 mr-2" />
                  Search and Replace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAddItemModalOpen(true)} disabled={disabled || isTransforming || hasTransformed}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item (Inpaint)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setHasTransformed(false)
                  setIsOutpaintModalOpen(true)
                }} disabled={disabled || isTransforming || hasTransformed}>
                  <ZoomOut className="h-4 w-4 mr-2" />
                  Extend Image (Outpaint)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 gap-1.5"
                  disabled={disabled || isTransforming || hasTransformed}
                >
                  <Wand2 className="h-4 w-4" />
                  Transform
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={disabled || isTransforming || hasTransformed}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Auto-Enhance
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => {
                      const sharpPrompt = 'Enhanced image using Sharp (normalization and sharpening)'
                      setPrompt(sharpPrompt)
                      onTransform('auto-enhance-sharp', sharpPrompt)
                    }} disabled={disabled || isTransforming || hasTransformed}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Sharp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const geminiPrompt = 'Enhanced image using Gemini 2.0 (AI-powered enhancement)'
                      setPrompt(geminiPrompt)
                      onTransform('auto-enhance', geminiPrompt)
                    }} disabled={disabled || isTransforming || hasTransformed}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Gemini 2.0
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => {
                  const mirrorPrompt = 'Flip the image horizontally'
                  setPrompt(mirrorPrompt)
                  onTransform('mirror', mirrorPrompt)
                }} disabled={disabled || isTransforming || hasTransformed}>
                  <FlipHorizontal className="h-4 w-4 mr-2" />
                  Mirror
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <AddItemDialog
        isOpen={isAddItemModalOpen}
        onOpenChange={setIsAddItemModalOpen}
        image={image}
        disabled={disabled}
        isTransforming={isTransforming}
        hasTransformed={hasTransformed}
        onAddItem={handleAddItem}
        onPromptChange={setPrompt}
      />

      <SearchReplaceDialog
        isOpen={isSearchReplaceModalOpen}
        onOpenChange={setIsSearchReplaceModalOpen}
        disabled={disabled}
        isTransforming={isTransforming}
        hasTransformed={hasTransformed}
        onSearchReplace={handleSearchReplace}
        onPromptChange={setPrompt}
      />

      <OutpaintDialog
        isOpen={isOutpaintModalOpen}
        onOpenChange={setIsOutpaintModalOpen}
        disabled={disabled}
        isTransforming={isTransforming}
        hasTransformed={hasTransformed}
        onOutpaint={handleOutpaint}
        onPromptChange={setPrompt}
      />
    </div>
  )
} 