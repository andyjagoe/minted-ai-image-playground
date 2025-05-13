export type TransformationType = 
  | "transform"
  | "mirror"
  | "inpaint" 
  | "auto-enhance"
  | "auto-enhance-sharp"
  | "search-and-replace"

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TransformationRequest {
  image: string
  prompt?: string
  mask?: string
  rect?: Rect
}

export interface TransformationResponse {
  data: {
    image: string
  }
  error: null
}

export interface TransformationConfig {
  endpoint: string
  requiresPrompt: boolean
  requiresMask?: boolean
  requiresRect?: boolean
  requiresSearchPrompt?: boolean
  label: string
  description: string
}

export const TRANSFORMATION_CONFIGS: Record<TransformationType, TransformationConfig> = {
  transform: {
    endpoint: "/api/transform",
    requiresPrompt: true,
    requiresRect: false,
    label: "Style Transform",
    description: "Transform the image style using AI"
  },
  mirror: {
    endpoint: "/api/mirror",
    requiresPrompt: false,
    requiresRect: false,
    label: "Mirror",
    description: "Create a mirrored version of the image"
  },
  inpaint: {
    endpoint: "/api/inpaint/stability-ai",
    requiresPrompt: true,
    requiresRect: true,
    label: "Inpaint",
    description: "Replace a selected area with AI-generated content"
  },
  "auto-enhance": {
    endpoint: "/api/auto-enhance/gemini-2.0",
    requiresPrompt: false,
    requiresRect: false,
    label: "Auto-Enhance",
    description: "Automatically enhance image quality and colors"
  },
  "auto-enhance-sharp": {
    endpoint: "/api/auto-enhance/sharp",
    requiresPrompt: false,
    requiresRect: false,
    label: "Auto-Enhance (Sharp)",
    description: "Enhance image using Sharp's normalization and sharpening"
  },
  "search-and-replace": {
    endpoint: "/api/search-and-replace",
    requiresPrompt: true,
    requiresRect: false,
    requiresSearchPrompt: true,
    label: "Search and Replace",
    description: "Replace objects in the image with AI"
  }
} 