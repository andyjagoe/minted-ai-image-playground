"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Wand2, Scissors, Trash2, Copy, Download, Palette, Plus, Undo2, FlipHorizontal } from "lucide-react"
import { TransformationType, TRANSFORMATION_CONFIGS, Rect } from "@/lib/types/transformations"

interface ImageTransformerProps {
  image: string
  title?: string
  showControls?: boolean
  disabled?: boolean
  isTransforming?: boolean
  onTransform: (type: TransformationType, prompt?: string, mask?: string, rect?: Rect) => Promise<void>
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
  const [isCopied, setIsCopied] = useState(false)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [itemToAdd, setItemToAdd] = useState("")
  const [isDrawing, setIsDrawing] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)
  const [hasTransformed, setHasTransformed] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

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

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const bounds = canvas.getBoundingClientRect()
    const scaleX = img.width / bounds.width
    const scaleY = img.height / bounds.height

    const startX = (e.clientX - bounds.left) * scaleX
    const startY = (e.clientY - bounds.top) * scaleY

    setRect({ x: startX, y: startY, width: 0, height: 0 })
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !rect) return
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const bounds = canvas.getBoundingClientRect()
    const scaleX = img.width / bounds.width
    const scaleY = img.height / bounds.height

    const currentX = (e.clientX - bounds.left) * scaleX
    const currentY = (e.clientY - bounds.top) * scaleY

    // Calculate width and height, ensuring they're positive
    const width = Math.abs(currentX - rect.x)
    const height = Math.abs(currentY - rect.y)

    // Calculate new x and y based on direction of drag
    const x = currentX < rect.x ? currentX : rect.x
    const y = currentY < rect.y ? currentY : rect.y

    setRect({ x, y, width, height })
    drawCanvas()
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const img = imageRef.current
    if (!canvas || !ctx || !img) return

    // Get container dimensions
    const container = canvas.parentElement
    if (!container) return
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Calculate dimensions to maintain aspect ratio
    const imgAspectRatio = img.width / img.height
    let canvasWidth = containerWidth
    let canvasHeight = containerWidth / imgAspectRatio

    // If height is too large, scale based on height instead
    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight
      canvasWidth = containerHeight * imgAspectRatio
    }

    // Set canvas size
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Draw rectangle in display coordinates
    if (rect) {
      const scaleX = canvas.width / img.width
      const scaleY = canvas.height / img.height
      
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.strokeRect(
        rect.x * scaleX,
        rect.y * scaleY,
        rect.width * scaleX,
        rect.height * scaleY
      )
    }
  }

  const handleAddItem = async (method: 'inpaint') => {
    if (itemToAdd.trim()) {
      if (!rect) {
        console.error('Debug: No rectangle selected')
        return
      }

      const formattedPrompt = `Add ${itemToAdd.trim()} to this image`

      console.log('Debug: handleAddItem values:', {
        prompt: formattedPrompt,
        rect,
        hasPrompt: !!itemToAdd.trim(),
        hasRect: !!rect,
        method
      })

      setIsAddItemModalOpen(false)
      
      try {
        setPrompt(formattedPrompt)
        await onTransform(method, formattedPrompt, undefined, rect)
        setItemToAdd("")
        setRect(null)
        setHasTransformed(true)
      } catch (error) {
        console.error('Error adding item:', error);
        setHasTransformed(false)
        // TODO: Add error handling UI
      }
    }
  }

  const clearMask = () => {
    setRect(null)
    drawCanvas()
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
                <DropdownMenuItem onClick={() => handleStyleConvert("Disney Style")} disabled={disabled || isTransforming || hasTransformed}>
                  Disney Style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Pixar")} disabled={disabled || isTransforming || hasTransformed}>
                  Pixar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Anime Style")} disabled={disabled || isTransforming || hasTransformed}>
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
                <DropdownMenuItem onClick={() => {
                  setIsAddItemModalOpen(true)
                  setItemToAdd("")
                }} disabled={disabled || isTransforming || hasTransformed}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
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
                <DropdownMenuItem onClick={() => {
                  onTransform('auto-enhance')
                }} disabled={disabled || isTransforming || hasTransformed}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Auto-Enhance
                </DropdownMenuItem>
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

      <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>What would you like to add?</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., a red car, a tree, a person..."
                  value={itemToAdd}
                  onChange={(e) => setItemToAdd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleAddItem('inpaint')
                    }
                  }}
                  disabled={disabled || isTransforming || hasTransformed}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Draw a rectangle where you would like your item</label>
              <div className="relative">
                <img
                  ref={imageRef}
                  src={image}
                  alt="Source image"
                  className="w-full h-auto object-contain"
                  style={{ display: 'none' }}
                  onLoad={drawCanvas}
                />
                <div className="overflow-auto border rounded-lg flex items-center justify-center min-h-[300px]">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: 'crosshair' }}
                  />
                </div>
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={clearMask}
                    disabled={disabled || isTransforming || hasTransformed}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddItemModalOpen(false)
                  setRect(null)
                  clearMask()
                }}
                disabled={isTransforming}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAddItem('inpaint')}
                disabled={!itemToAdd.trim() || disabled || isTransforming || hasTransformed}
              >
                Add Item
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 