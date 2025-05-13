"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Undo2 } from "lucide-react"
import { Rect } from "@/lib/types/transformations"

interface AddItemDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  image: string
  disabled?: boolean
  isTransforming?: boolean
  hasTransformed?: boolean
  onAddItem: (prompt: string, rect: Rect) => Promise<void>
}

export function AddItemDialog({
  isOpen,
  onOpenChange,
  image,
  disabled = false,
  isTransforming = false,
  hasTransformed = false,
  onAddItem,
}: AddItemDialogProps) {
  const [itemToAdd, setItemToAdd] = useState("")
  const [isDrawing, setIsDrawing] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const bounds = canvas.getBoundingClientRect()
    const scaleX = img.width / bounds.width
    const scaleY = img.height / bounds.height

    // Get coordinates from either mouse or touch event
    let clientX: number
    let clientY: number

    if ('touches' in e) {
      // For touch events, prevent default to avoid scrolling
      e.preventDefault()
      const touch = e.touches[0]
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const startX = (clientX - bounds.left) * scaleX
    const startY = (clientY - bounds.top) * scaleY

    setRect({ x: startX, y: startY, width: 0, height: 0 })
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !rect) return
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    // For touch events, prevent default to avoid scrolling
    if ('touches' in e) {
      e.preventDefault()
    }

    const bounds = canvas.getBoundingClientRect()
    const scaleX = img.width / bounds.width
    const scaleY = img.height / bounds.height

    // Get coordinates from either mouse or touch event
    let clientX: number
    let clientY: number

    if ('touches' in e) {
      const touch = e.touches[0]
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const currentX = (clientX - bounds.left) * scaleX
    const currentY = (clientY - bounds.top) * scaleY

    // Calculate width and height, ensuring they're positive
    const width = Math.abs(currentX - rect.x)
    const height = Math.abs(currentY - rect.y)

    // Calculate new x and y based on direction of drag
    const x = currentX < rect.x ? currentX : rect.x
    const y = currentY < rect.y ? currentY : rect.y

    setRect({ x, y, width, height })
    drawCanvas()
  }

  const handleMouseUp = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e) {
      e.preventDefault()
    }
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
    
    // Save the current context state
    ctx.save()
    
    // Draw the image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // Restore the context state
    ctx.restore()

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

  const clearMask = () => {
    setRect(null)
    drawCanvas()
  }

  const handleAddItem = async () => {
    if (itemToAdd.trim() && rect) {
      const formattedPrompt = `Add ${itemToAdd.trim()} to this image`
      setItemToAdd("")
      setRect(null)
      onOpenChange(false)
      
      // Get the canvas and create a new image with proper orientation
      const canvas = canvasRef.current
      if (!canvas) return
      
      // Create a new image from the canvas
      const newImage = new Image()
      newImage.src = canvas.toDataURL('image/jpeg')
      
      // Wait for the image to load
      await new Promise((resolve) => {
        newImage.onload = resolve
      })
      
      // Create a new canvas to handle orientation
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return
      
      // Set dimensions
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      
      // Draw the image
      tempCtx.drawImage(newImage, 0, 0)
      
      // Get the base64 data
      const base64Image = tempCanvas.toDataURL('image/jpeg')
      
      // Update the rect coordinates to match the new image orientation
      const updatedRect = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
      
      await onAddItem(formattedPrompt, updatedRect)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                    handleAddItem()
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
                crossOrigin="anonymous"
              />
              <div className="overflow-auto border rounded-lg flex items-center justify-center min-h-[300px]">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  style={{ 
                    cursor: 'crosshair', 
                    touchAction: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)'
                  }}
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
                onOpenChange(false)
                setRect(null)
                clearMask()
              }}
              disabled={isTransforming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!itemToAdd.trim() || !rect || disabled || isTransforming || hasTransformed}
            >
              Add Item
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 