# Minted AI Image Playground

A Next.js application that provides AI-powered image manipulation capabilities using multiple AI models including Stability AI, OpenAI's GPT-4 Vision, and Google's Gemini 2.0. This project includes various endpoints for image transformation, inpainting, and basic image manipulation.

## Features

- Image inpainting and search and replace using Stable Diffusion 3.0/3.5 (via Stability AI)
- Image transformation using OpenAI's gpt-image-1
- Image auto-enhancement using Gemini's gemini-2.0-flash-preview-image-generation
- Image outpainting (extending images in any direction) using Stability AI
- Basic image manipulation (mirroring)
- HEIC to JPEG conversion
- Automatic image resizing and optimization
- Support for custom rectangular selection areas
- Base64 image handling

## Prerequisites

- Node.js 18+ 
- pnpm
- OpenAI API key
- Stability AI API key
- Google Gemini API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
STABILITY_API_KEY=your_stability_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/minted-ai-image-playground.git
cd minted-ai-image-playground
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

## API Usage

### Image Inpainting (Stability AI)

**Endpoint:** `/api/inpaint/stability-ai`

**Method:** `POST`

**Request Body:**
```typescript
{
  image: string;      // Base64 encoded image
  prompt: string;     // Description of desired changes (max 1000 chars)
  rect: {
    x: number;        // X coordinate of selection
    y: number;        // Y coordinate of selection
    width: number;    // Width of selection
    height: number;   // Height of selection
  }
}
```

### Image Transformation (GPT-4 Vision)

**Endpoint:** `/api/transform`

**Method:** `POST`

**Request Body:**
```typescript
{
  image: string;      // Base64 encoded image
  prompt: string;     // Description of desired changes
}
```

### Image Auto-Enhancement (Gemini 2.0)

**Endpoint:** `/api/auto-enhance/gemini-2.0`

**Method:** `POST`

**Request Body:**
```typescript
{
  image: string;      // Base64 encoded image
}
```

The enhancement process includes:
- Automatic color correction and vibrancy enhancement
- Sharpness and detail improvement
- Smart contrast adjustment
- Noise reduction

### Image Mirroring

**Endpoint:** `/api/mirror`

**Method:** `POST`

**Request Body:**
```typescript
{
  image: string;      // Base64 encoded image
}
```

### HEIC to JPEG Conversion

**Endpoint:** `/api/convert`

**Method:** `POST`

**Request Body:**
```typescript
{
  image: string;      // Base64 encoded HEIC/HEIF image
}
```

### Image Outpainting (Stability AI)

**Endpoint:** `/api/outpaint`

**Method:** `POST`

**Request Body:**
```typescript
{
  image: string;      // Base64 encoded image
  left: number;       // Pixels to extend left (0-2000)
  right: number;      // Pixels to extend right (0-2000)
  up: number;         // Pixels to extend up (0-2000)
  down: number;       // Pixels to extend down (0-2000)
  prompt?: string;    // Optional description of what to generate in extended areas
  style_preset?: string; // Optional style preset for the extended areas
}
```

**Available Style Presets:**
- 3D Model
- Analog Film
- Anime
- Cinematic
- Comic Book
- Digital Art
- Enhance
- Fantasy Art
- Isometric
- Line Art
- Low Poly
- Modeling Compound
- Neon Punk
- Origami
- Photographic
- Pixel Art
- Tile Texture

### Response Format

All endpoints return responses in the following format:

**Success Response:**
```typescript
{
  data: {
    image: string;    // Base64 encoded result image
  },
  error: null
}
```

**Error Response:**
```typescript
{
  data: null,
  error: string
}
```

## Development

The project follows these conventions:

- API routes are located in `app/api/`
- Types are defined in `lib/types/`
- Utility functions are in `lib/utils/`
- Models are stored in `lib/models/`

## Error Handling

The API implements comprehensive error handling for:
- Invalid image sizes
- Invalid prompt lengths
- Invalid rectangle coordinates
- API failures
- Image processing errors
- HEIC conversion errors

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## API Endpoints

### `/api/transform`
Transforms an image using OpenAI's image editing API.

### `/api/mirror`
Creates a mirrored version of the image.

### `/api/inpaint/stability-ai`
Replaces a selected area with AI-generated content using Stability AI's API.

### `/api/outpaint`
Extends an image in any direction with AI-generated content using Stability AI's API.

### `/api/auto-enhance/gemini-2.0`
Automatically enhances image quality and colors using Google's Gemini 2.0 API.

### `/api/auto-enhance/sharp`
Enhances image using Sharp's normalization and sharpening.

### `/api/search-and-replace`
Replaces objects in the image with AI-generated content using Stability AI's API.

**Request Body:**
```json
{
  "image": "base64_encoded_image",
  "prompt": "What to replace the object with",
  "searchPrompt": "What to search for in the image"
}
```

**Response:**
```json
{
  "data": {
    "image": "base64_encoded_transformed_image"
  },
  "error": null
}
```

## Features

- Image upload and transformation
- Style conversion (Disney, Pixar, Anime, etc.)
- Object addition with precise area selection
- Image mirroring
- Image outpainting with directional control
- Auto-enhancement using multiple methods
- Search and replace objects in images
- Copy transformed images to clipboard
- Download transformed images
- Error handling and validation
- Mobile-friendly interface with touch support

