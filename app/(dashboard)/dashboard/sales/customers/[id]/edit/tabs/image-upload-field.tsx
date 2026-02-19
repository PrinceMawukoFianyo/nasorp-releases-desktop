import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { UploadButton } from "@/lib/uploadthing"

interface ImageUploadFieldProps {
  label: string
  currentThumbnail?: string | null
  currentImages?: string[]
  onChange: (thumbnail: string) => Promise<void>
  isUploading?: boolean
}

export default function ImageUploadField({
  label,
  currentThumbnail = "",
  currentImages = [],
  onChange,
  isUploading = false,
}: ImageUploadFieldProps) {
  const [thumbnail, setThumbnail] = useState(currentThumbnail || "")
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isLocalUploading, setIsLocalUploading] = useState(false)

  // Sync with parent component's current thumbnail - only when not previewing
  useEffect(() => {
    if (!previewUrl) {
      setThumbnail(currentThumbnail || "")
    }
  }, [currentThumbnail, previewUrl])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please select an image smaller than 5MB",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
      setPendingFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleUpdateImage = async () => {
    if (!previewUrl) return

    setIsLocalUploading(true)
    try {
      // Call the onChange handler with the preview URL
      await onChange(previewUrl)
      
      // Only clear preview and update thumbnail after successful save
      setThumbnail(previewUrl)
      setPreviewUrl("")
      setPendingFile(null)
      
      // Clear file input
      const fileInput = document.getElementById("image-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
      
      toast.success("Image updated successfully")
    } catch (error) {
      console.error("Image update error:", error)
      toast.error("Failed to update image")
    } finally {
      setIsLocalUploading(false)
    }
  }

  const cancelPreview = () => {
    setPreviewUrl("")
    setPendingFile(null)
    // Reset file input
    const fileInput = document.getElementById("image-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  const removeThumbnail = async () => {
    setIsLocalUploading(true)
    try {
      await onChange("")
      setThumbnail("")
      setPreviewUrl("")
      setPendingFile(null)
      toast.success("Image removed")
    } catch (error) {
      console.error("Image removal error:", error)
      toast.error("Failed to remove image")
    } finally {
      setIsLocalUploading(false)
    }
  }

  const handleUploadThingComplete = async (uploadedImages: { url: string }[]) => {
    if (uploadedImages.length > 0) {
      const imageUrl = uploadedImages[0].url
      setIsLocalUploading(true)
      try {
        await onChange(imageUrl)
        setThumbnail(imageUrl)
        setPreviewUrl("")
        setPendingFile(null)
        toast.success("Image uploaded and saved permanently!")
      } catch (error) {
        console.error("UploadThing save error:", error)
        toast.error("Failed to save uploaded image")
      } finally {
        setIsLocalUploading(false)
      }
    }
  }

  // Determine what to display
  const displayUrl = previewUrl || thumbnail
  const isProcessing = isUploading || isLocalUploading

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">{label}</Label>

      {/* Image Preview */}
      {displayUrl ? (
        <Card className="overflow-hidden max-w-md">
          <CardContent className="p-0">
            <div className="relative w-full h-64 bg-muted">
              <Image
                src={displayUrl}
                alt="Customer logo preview"
                fill
                className="object-contain p-4"
                priority
              />
              {!previewUrl && !isProcessing && (
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  aria-label="Remove image"
                >
                  <X size={20} />
                </button>
              )}
              {previewUrl && (
                <div className="absolute bottom-2 left-2 bg-yellow-500/90 text-white text-xs px-2 py-1 rounded">
                  Preview - Not Saved
                </div>
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed border-input rounded-lg p-12 text-center max-w-md">
          <Upload className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-sm text-muted-foreground mb-2">No image uploaded</p>
          <p className="text-xs text-muted-foreground">Select an image to preview, then update</p>
        </div>
      )}

      {/* Upload Options */}
      <div className="space-y-3 max-w-md">
        {/* File Input Upload with Update Button */}
        <div className="space-y-2">
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
          
          {!previewUrl ? (
            <Button
              type="button"
              onClick={() => document.getElementById("image-upload")?.click()}
              disabled={isProcessing}
              className="w-full"
              variant="outline"
            >
              Select Image from Device
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleUpdateImage}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Image"
                )}
              </Button>
              <Button
                type="button"
                onClick={cancelPreview}
                disabled={isProcessing}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* UploadThing Button */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or Upload Permanently
            </span>
          </div>
        </div>

        <UploadButton
          className="w-full ut-button:w-full ut-button:bg-primary ut-button:text-primary-foreground"
          endpoint="itemImages"
          onClientUploadComplete={handleUploadThingComplete}
          onUploadError={(error: Error) => {
            toast.error("Upload failed", {
              description: error.message,
            })
          }}
          disabled={isProcessing}
        />

        <p className="text-xs text-muted-foreground text-center">
          Recommended: 500x500px or larger • Max 5MB
        </p>
      </div>
    </div>
  )
}