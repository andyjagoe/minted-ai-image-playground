export type TransformationType = 
  | "transform"
  | "mirror"
  | "inpaint" 
  | "auto-enhance"

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
}

export const TRANSFORMATION_CONFIGS: Record<TransformationType, {
  endpoint: string
  requiresPrompt: boolean
  requiresRect: boolean
  label: string
  description: string
}> = {
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
  }
} 