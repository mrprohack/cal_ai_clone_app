import { useState, useCallback } from "react"

/**
 * useImageQuality - Hook for validating image quality before AI analysis
 * Checks file type, size, dimensions, and blur detection
 */
export function useImageQuality() {
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const validateImage = useCallback(async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // Reset state
      setIsValid(false)
      setError(null)
      setWarning(null)

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("File must be an image (JPEG, PNG, etc.)")
        resolve(false)
        return
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10MB")
        resolve(false)
        return
      }

      // Check dimensions and quality via Image loading
      const img = new Image()
      img.onload = () => {
        // Validate minimum dimensions
        if (img.width < 480) {
          setError("Image too small (minimum 480px width)")
          resolve(false)
          return
        }

        if (img.height < 480) {
          setError("Image too small (minimum 480px height)")
          resolve(false)
          return
        }

        // Blur detection (basic heuristic)
        // Check if image has been downscaled significantly
        const pixelRatio = img.naturalWidth / img.width
        if (pixelRatio < 0.5) {
          setWarning(
            "Image may be blurry - use a clearer photo for better AI analysis"
          )
        }

        setIsValid(true)
        resolve(true)
      }

      img.onerror = () => {
        setError("Could not read image file")
        resolve(false)
      }

      img.src = URL.createObjectURL(file)
    })
  }, [])

  return { isValid, error, warning, validateImage }
}
