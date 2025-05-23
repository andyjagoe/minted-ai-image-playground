"use client"

import { useEffect, useRef } from "react"
import { ImageTransformer } from "@/components/image-transformer"
import { TransformationType, TRANSFORMATION_CONFIGS } from "@/lib/types/transformations"

interface TransformedImagesProps {
  images: string[]
  isTransforming: boolean
  transformingIndex: number | null
  uploadedImage: string
  onTransform: (type: TransformationType, prompt?: string, mask?: string, rect?: { x: number; y: number; width: number; height: number; }, editedImage?: string, index?: number, searchPrompt?: string) => Promise<void>
  onRemove: (index: number) => void
  onCopy: (image: string) => void
  onDownload: (image: string) => void
  error?: string | null
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
  error = null,
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
            onTransform={async (type, prompt, mask, rect, searchPrompt) => {
              console.log('Debug: TransformedImages onTransform values:', {
                type,
                prompt,
                rect,
                searchPrompt,
                hasPrompt: !!prompt,
                hasRect: !!rect,
                hasSearchPrompt: !!searchPrompt,
                requiresPrompt: TRANSFORMATION_CONFIGS[type].requiresPrompt,
                requiresRect: TRANSFORMATION_CONFIGS[type].requiresRect,
                requiresSearchPrompt: TRANSFORMATION_CONFIGS[type].requiresSearchPrompt
              })

              if (!prompt && TRANSFORMATION_CONFIGS[type].requiresPrompt) {
                console.error("No prompt provided for transformation type:", type)
                return Promise.resolve()
              }
              if (!rect && TRANSFORMATION_CONFIGS[type].requiresRect) {
                console.error("No rectangle selected for transformation type:", type)
                return Promise.resolve()
              }
              if (!searchPrompt && TRANSFORMATION_CONFIGS[type].requiresSearchPrompt) {
                console.error("No search prompt provided for transformation type:", type)
                return Promise.resolve()
              }
              return onTransform(type, prompt, mask, rect, undefined, index, searchPrompt)
            }}
            onRemove={() => onRemove(index)}
            onCopy={() => onCopy(image)}
            onDownload={() => onDownload(image)}
            error={transformingIndex === index ? error : null}
          />
        </div>
      ))}
    </div>
  )
} 