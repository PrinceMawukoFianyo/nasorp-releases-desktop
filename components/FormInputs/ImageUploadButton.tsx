import { UploadButton } from "@/lib/uploadthing";
import Image from "next/image";
import React, { useState } from "react";

type ImageInputProps = {
  title: string;
  imageUrl: string;
  setImageUrl: any;
  endpoint: any;
  onUploadStart: () => void;
  onUploadComplete: () => void;
};

export default function ImageUploadButton({
  title,
  imageUrl,
  setImageUrl,
  endpoint,
  onUploadStart,
  onUploadComplete,
}: ImageInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Small Upload Button with Thumbnail */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="group relative flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-rose-500 hover:shadow-md transition-all duration-200"
      >
        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <svg
            className="w-4 h-4 text-gray-600 group-hover:text-rose-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-gray-700 group-hover:text-rose-500 font-medium">
            {imageUrl ? "Change" : "Upload"}
          </span>
        </div>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid gap-4">
                {imageUrl && (
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      alt={title}
                      className="w-full h-full object-contain"
                      height={300}
                      src={imageUrl}
                      width={300}
                    />
                  </div>
                )}
                <UploadButton
                  className="w-full"
                  endpoint={endpoint}
                  onUploadBegin={() => {
                    console.log("Upload started");
                    onUploadStart();
                  }}
                  onClientUploadComplete={(res) => {
                    console.log("Files: ", res);
                    if (res && res[0]) {
                      setImageUrl(res[0].url);
                      console.log("Image URL set to:", res[0].url);
                    }
                    onUploadComplete();
                    setIsModalOpen(false);
                  }}
                  onUploadError={(error: Error) => {
                    console.error("Upload error:", error);
                    alert(`ERROR! ${error.message}`);
                    onUploadComplete();
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}