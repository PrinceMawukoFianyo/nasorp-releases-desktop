import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { UploadButton } from "@/lib/uploadthing"

interface ImageUploadFieldProps {
  label: string
  currentThumbnail?: string
  currentImages?: string[] // This miUSt need to be currentImageUrl for single image
  onChange: (thumbnail: string, images: string[]) => void
}

export default function ImageUploadField({
  label,
  currentThumbnail = "",
  currentImages = [],
  onChange,
}: ImageUploadFieldProps) {
  const [thumbnail, setThumbnail] = useState(currentThumbnail)
  const [images, setImages] = useState<string[]>(currentImages)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isThumb: boolean) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please select an image smaller than 5MB",
      })
      return
    }

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string

        if (isThumb) {
          setThumbnail(base64)
          onChange(base64, images)
          toast.success("Thumbnail uploaded successfully")
        } else {
          const newImages = [...images, base64]
          setImages(newImages)
          onChange(thumbnail, newImages)
          toast.success("Image added successfully")
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error("Upload failed", {
        description: "Failed to process image",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    onChange(thumbnail, newImages)
    toast.success("Image removed")
  }

  const removeThumbnail = () => {
    setThumbnail("")
    onChange("", images)
    toast.success("Thumbnail removed")
  }

  const handleMultipleImageUpload = (uploadedImages: { url: string }[]) => {
    const newimageUrl = uploadedImages.map((item) => item.url)
    const newImages = [...images, ...newimageUrl]
    setImages(newImages)
    onChange(thumbnail, newImages)
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-3 block">{label}</Label>

        {/* Thumbnail Upload */}
        <div className="space-y-3 mb-6">
          <Label htmlFor="thumbnail-upload" className="text-sm">
            Main Product Image (Thumbnail)
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {thumbnail ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative w-full h-40 bg-muted">
                    <Image
                      src={thumbnail || "/placeholder.svg"}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={removeThumbnail}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border-2 border-dashed border-input rounded-lg p-6 text-center">
                <Upload className="mx-auto mb-2 text-muted-foreground" size={32} />
                <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Input
                id="thumbnail-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, true)}
                disabled={isUploading}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => document.getElementById("thumbnail-upload")?.click()}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? "Uploading..." : "Upload Thumbnail"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Recommended: 500x500px, Max 5MB</p>
            </div>
          </div>
        </div>

        {/* Additional Images Upload - Integrated UploadButton */}
        <div className="space-y-3">
          <Label className="text-sm">Additional Product Images</Label>
          
          {/* Image Preview Grid */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative w-full h-24 bg-muted">
                          <Image
                            src={image || "/placeholder.svg"}
                            alt={`Product image ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UploadButton for multiple images */}
          <UploadButton
            className="w-full"
            endpoint="itemImages"
            onClientUploadComplete={(res) => {
              handleMultipleImageUpload(res)
              toast.success("Images uploaded successfully")
            }}
            onUploadError={(error: Error) => {
              toast.error("Upload failed", {
                description: error.message,
              })
            }}
          />

          <p className="text-xs text-muted-foreground">{images.length} image(s) added • Max 5MB per image</p>
        </div>
      </div>
    </div>
  )
}