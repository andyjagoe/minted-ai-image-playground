"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface OutpaintDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  isTransforming?: boolean
  hasTransformed?: boolean
  onOutpaint: (left: number, down: number, prompt?: string, style_preset?: string) => Promise<void>
  onPromptChange?: (prompt: string) => void
}

const STYLE_PRESETS = [
  { value: '3d-model', label: '3D Model' },
  { value: 'analog-film', label: 'Analog Film' },
  { value: 'anime', label: 'Anime' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'comic-book', label: 'Comic Book' },
  { value: 'digital-art', label: 'Digital Art' },
  { value: 'enhance', label: 'Enhance' },
  { value: 'fantasy-art', label: 'Fantasy Art' },
  { value: 'isometric', label: 'Isometric' },
  { value: 'line-art', label: 'Line Art' },
  { value: 'low-poly', label: 'Low Poly' },
  { value: 'modeling-compound', label: 'Modeling Compound' },
  { value: 'neon-punk', label: 'Neon Punk' },
  { value: 'origami', label: 'Origami' },
  { value: 'photographic', label: 'Photographic' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: 'tile-texture', label: 'Tile Texture' },
] as const

export function OutpaintDialog({
  isOpen,
  onOpenChange,
  disabled = false,
  isTransforming = false,
  hasTransformed = false,
  onOutpaint,
  onPromptChange,
}: OutpaintDialogProps) {
  const [left, setLeft] = useState(0)
  const [down, setDown] = useState(0)
  const [prompt, setPrompt] = useState("")
  const [stylePreset, setStylePreset] = useState<string>("")

  // Reset form state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLeft(0)
      setDown(0)
      setPrompt("")
      setStylePreset("")
    }
  }, [isOpen])

  const handleOutpaint = async () => {
    const styleText = stylePreset ? ` in ${stylePreset} style` : ''
    const formattedPrompt = `Extend image ${left}px left and ${down}px down${prompt ? ` with ${prompt}` : ''}${styleText}`
    onOpenChange(false)
    onPromptChange?.(formattedPrompt)
    await onOutpaint(left, down, prompt || undefined, stylePreset || undefined)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Zoom Out (Outpaint)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto flex-1 px-1 pb-4">
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="left" className="text-sm font-medium">
                    Extend Left
                  </label>
                  <span className="text-sm text-muted-foreground">{left}px</span>
                </div>
                <div className="px-1">
                  <Slider
                    id="left"
                    min={0}
                    max={2000}
                    step={1}
                    value={[left]}
                    onValueChange={([value]) => setLeft(value)}
                    disabled={disabled || isTransforming || hasTransformed}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="down" className="text-sm font-medium">
                    Extend Down
                  </label>
                  <span className="text-sm text-muted-foreground">{down}px</span>
                </div>
                <div className="px-1">
                  <Slider
                    id="down"
                    min={0}
                    max={2000}
                    step={1}
                    value={[down]}
                    onValueChange={([value]) => setDown(value)}
                    disabled={disabled || isTransforming || hasTransformed}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">
                What should appear in the extended area? (optional)
              </label>
              <div className="px-1">
                <Input
                  id="prompt"
                  placeholder="e.g., a mountain landscape with trees"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleOutpaint()
                    }
                  }}
                  disabled={disabled || isTransforming || hasTransformed}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="style" className="text-sm font-medium">
                Style Preset (optional)
              </label>
              <div className="px-1">
                <Select
                  value={stylePreset}
                  onValueChange={setStylePreset}
                  disabled={disabled || isTransforming || hasTransformed}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                setLeft(0)
                setDown(0)
                setPrompt("")
                setStylePreset("")
              }}
              disabled={isTransforming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOutpaint}
              disabled={disabled || isTransforming || hasTransformed}
            >
              Extend Image
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 