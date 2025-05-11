export type TransformationType = 'transform' | 'mirror' | 'inpaint' | 'inpaint-dalle'

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

export const TRANSFORMATION_CONFIGS: Record<TransformationType, TransformationConfig> = {
  transform: {
    endpoint: '/api/transform',
    requiresPrompt: true,
  },
  mirror: {
    endpoint: '/api/mirror',
    requiresPrompt: false,
  },
  inpaint: {
    endpoint: '/api/inpaint/stability-ai',
    requiresPrompt: true,
    requiresRect: true,
  },
  'inpaint-dalle': {
    endpoint: '/api/inpaint/dalle',
    requiresPrompt: true,
    requiresRect: true,
  },
} 