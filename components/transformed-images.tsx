"use client"

import { useEffect, useRef } from "react"
import { ImageTransformer } from "@/components/image-transformer"
import { TransformationType, TRANSFORMATION_CONFIGS } from "@/lib/types/transformations"

interface TransformedImagesProps {
  images: string[]
  isTransforming: boolean
  transformingIndex: number | null
  uploadedImage: string
  onTransform: (type: TransformationType, prompt?: string, mask?: string, rect?: { x: number; y: number; width: number; height: number; }, editedImage?: string, index?: number) => Promise<void>
  onRemove: (index: number) => void
  onCopy: (image: string) => void
  onDownload: (image: string) => void
}

export function TransformedImages({
  images,
  isTransforming,
  transformingIndex,
  uploadedImage,
  onTransform,
  onRemove,
  onCopy,
  onDownload,
}: TransformedImagesProps) {
  const lastImageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (lastImageRef.current) {
      lastImageRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [images])

  return (
    <div className="space-y-8">
      {images.map((image, index) => (
        <div key={index} ref={index === images.length - 1 ? lastImageRef : null}>
          <ImageTransformer
            image={image}
            showControls={true}
            isTransforming={isTransforming && transformingIndex === index}
            disabled={index !== images.length - 1}
            isLastImage={index === images.length - 1}
            onTransform={async (type, prompt, mask, rect) => {
              console.log('Debug: TransformedImages onTransform values:', {
                type,
                prompt,
                rect,
                hasPrompt: !!prompt,
                hasRect: !!rect,
                requiresPrompt: TRANSFORMATION_CONFIGS[type].requiresPrompt,
                requiresRect: TRANSFORMATION_CONFIGS[type].requiresRect
              })

              if (!prompt && TRANSFORMATION_CONFIGS[type].requiresPrompt) {
                console.error("No prompt provided for transformation type:", type)
                return Promise.resolve()
              }
              if (!rect && TRANSFORMATION_CONFIGS[type].requiresRect) {
                console.error("No rectangle selected for transformation type:", type)
                return Promise.resolve()
              }
              return onTransform(type, prompt, mask, rect, undefined, index)
            }}
            onRemove={() => onRemove(index)}
            onCopy={() => onCopy(image)}
            onDownload={() => onDownload(image)}
          />
        </div>
      ))}
    </div>
  )
} 