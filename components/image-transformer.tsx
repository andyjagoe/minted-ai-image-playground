import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Wand2, Scissors, Trash2, Copy, Download, Palette } from "lucide-react"

interface ImageTransformerProps {
  image: string
  prompt: string
  isTransforming: boolean
  isConverting?: boolean
  onPromptChange: (value: string) => void
  onTransform: (style?: string) => Promise<void>
  onRemove?: () => void
  onCopy?: () => void
  onDownload?: () => void
  title?: string
  showControls?: boolean
  disabled?: boolean
}

export function ImageTransformer({
  image,
  prompt,
  isTransforming,
  isConverting = false,
  onPromptChange,
  onTransform,
  onRemove,
  onCopy,
  onDownload,
  title,
  showControls = true,
  disabled = false,
}: ImageTransformerProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy()
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleStyleConvert = (style: string) => {
    onTransform(style)
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-2xl font-semibold text-center">
          {title}
        </h2>
      )}
      <div className="relative rounded-lg border border-border overflow-hidden">
        {isConverting ? (
          <div className="relative">
            <Image
              src={image}
              alt={title || "Image"}
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
            src={image}
            alt={title || "Image"}
            width={800}
            height={500}
            className="w-full h-auto max-h-[500px] object-contain"
            unoptimized
          />
        )}
        <div className="absolute right-2 top-2 z-10 flex gap-2">
          {onCopy && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy image</span>
            </Button>
          )}
          {onDownload && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download image</span>
            </Button>
          )}
          {onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full bg-destructive/90 hover:bg-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 text-destructive-foreground" />
              <span className="sr-only">Remove image</span>
            </Button>
          )}
        </div>
      </div>

      {showControls && !isConverting && (
        <div className="space-y-4">
          <div className="relative">
            <Input
              className="h-14 pl-4 pr-12 text-base shadow-md"
              placeholder="Describe how you want to transform this image..."
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onTransform()
                }
              }}
              disabled={isTransforming || disabled}
            />
            <Button 
              className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full p-0"
              onClick={() => onTransform()}
              disabled={isTransforming || disabled || !prompt.trim()}
            >
              <Wand2 className="h-5 w-5" />
              <span className="sr-only">Transform</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 gap-1.5"
                  disabled={isTransforming || disabled}
                >
                  <Palette className="h-4 w-4" />
                  Convert to Style
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => handleStyleConvert("Disney Style")}>
                  Disney Style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Pixar")}>
                  Pixar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Anime Style")}>
                  Anime Style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Ghibli")}>
                  Ghibli
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Cyberpunk Neon")}>
                  Cyberpunk Neon
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Watercolor Painting")}>
                  Watercolor Painting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Baroque Oil Painting")}>
                  Baroque Oil Painting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Retro Pixel Art")}>
                  Retro Pixel Art
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Vaporwave Aesthetic")}>
                  Vaporwave Aesthetic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Surrealist Art")}>
                  Surrealist Art
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Simpsons")}>
                  Simpsons
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Family Guy")}>
                  Family Guy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Muppet")}>
                  Muppet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStyleConvert("Hérge")}>
                  Hérge
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-1.5"
              disabled={isTransforming || disabled}
            >
              <Scissors className="h-4 w-4" />
              Edit Image
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 