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
}

export function SearchReplaceDialog({
  isOpen,
  onOpenChange,
  disabled = false,
  isTransforming = false,
  hasTransformed = false,
  onSearchReplace,
}: SearchReplaceDialogProps) {
  const [prompt, setPrompt] = useState("")
  const [searchPrompt, setSearchPrompt] = useState("")

  const handleSearchReplace = async () => {
    if (prompt.trim() && searchPrompt.trim()) {
      setPrompt("")
      setSearchPrompt("")
      onOpenChange(false)
      await onSearchReplace(prompt, searchPrompt)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search and Replace</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">What would you like to search for?</label>
            <Input
              placeholder="e.g., dog, tree, person..."
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

          <div className="space-y-2">
            <label className="text-sm font-medium">What would you like to replace it with?</label>
            <Input
              placeholder="e.g., cat, flower, robot..."
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