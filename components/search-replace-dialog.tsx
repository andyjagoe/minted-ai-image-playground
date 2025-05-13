"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SearchReplaceDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  isTransforming?: boolean
  hasTransformed?: boolean
  onSearchReplace: (prompt: string, searchPrompt: string) => Promise<void>
  onPromptChange?: (prompt: string) => void
}

export function SearchReplaceDialog({
  isOpen,
  onOpenChange,
  disabled = false,
  isTransforming = false,
  hasTransformed = false,
  onSearchReplace,
  onPromptChange,
}: SearchReplaceDialogProps) {
  const [prompt, setPrompt] = useState("")
  const [searchPrompt, setSearchPrompt] = useState("")

  const handleSearchReplace = async () => {
    if (prompt.trim() && searchPrompt.trim()) {
      const formattedPrompt = `Replace ${searchPrompt.trim()} with ${prompt.trim()}`
      setPrompt("")
      setSearchPrompt("")
      onOpenChange(false)
      onPromptChange?.(formattedPrompt)
      await onSearchReplace(prompt, searchPrompt)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search and Replace</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto flex-1 px-1 pb-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                What do you want to search for?
              </label>
              <div className="px-1">
                <Input
                  id="search"
                  placeholder="e.g., a red car"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSearchReplace()
                    }
                  }}
                  disabled={disabled || isTransforming || hasTransformed}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="replace" className="text-sm font-medium">
                What do you want to replace it with?
              </label>
              <div className="px-1">
                <Input
                  id="replace"
                  placeholder="e.g., a blue car"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSearchReplace()
                    }
                  }}
                  disabled={disabled || isTransforming || hasTransformed}
                />
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
                setPrompt("")
                setSearchPrompt("")
              }}
              disabled={isTransforming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSearchReplace}
              disabled={!prompt.trim() || !searchPrompt.trim() || disabled || isTransforming || hasTransformed}
            >
              Replace
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 