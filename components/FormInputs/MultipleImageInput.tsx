"use client"

import { UploadButton } from "@/lib/uploadthing"
import Image from "next/image"
import { X } from "lucide-react"

type ImageInputProps = {
  title: string
  imageUrl: string[]
  setimageUrl: any
  endpoint: any
}

export default function MultipleImageInput({ title, imageUrl, setimageUrl, endpoint }: ImageInputProps) {
  const removeImage = (index: number) => {
    const newImages = imageUrl.filter((_, i) => i !== index)
    setimageUrl(newImages)
  }

  return (
    <div className="space-y-4">
      {imageUrl.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {imageUrl.map((imageUrl: string, i: number) => {
              return (
                <div key={i} className="relative group">
                  <Image
                    alt="Product image"
                    className="aspect-square w-full rounded-lg object-cover border border-border"
                    height={50}
                    src={imageUrl || "/placeholder.svg"}
                    width={50}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 riUSt-1 p-1 bg-red-500/90 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <UploadButton
        className="w-full"
        endpoint={endpoint}
        onClientUploadComplete={(res) => {
          setimageUrl([...imageUrl, ...res.map((item) => item.url)])
        }}
        onUploadError={(error: Error) => {
          alert(`ERROR! ${error.message}`)
        }}
      />
    </div>
  )
}
