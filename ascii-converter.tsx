"use client"

import type React from "react"
import { useDropzone } from "react-dropzone"

import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { GripVertical, Upload, Download } from "lucide-react"

// Define a type for colored ASCII characters
type ColoredChar = {
  char: string
  color: string
}

export default function AsciiConverter() {
  const [resolution, setResolution] = useState(0.11)
  const [inverted, setInverted] = useState(false)
  const [grayscale, setGrayscale] = useState(true)
  const [charSet, setCharSet] = useState("standard")
  const [loading, setLoading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [asciiArt, setAsciiArt] = useState<string>("")
  const [coloredAsciiArt, setColoredAsciiArt] = useState<ColoredChar[][]>([])
  const [leftPanelWidth, setLeftPanelWidth] = useState(25) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [sidebarNarrow, setSidebarNarrow] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: false,
    onDrop: (files: File[]) => files[0] && handleFileUpload(files[0])
  });

  const charSets = {
    standard: " .:-=+*#%@",
    detailed: " .,:;i1tfLCG08@",
    blocks: " ░▒▓█",
    minimal: " .:█",
  }

  // Set hydration state
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // Check if we're on the client side
    setIsDesktop(window.innerWidth >= 768)

    // Add resize listener
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 768
      setIsDesktop(newIsDesktop)

      // Reset panel width if switching between mobile and desktop
      if (newIsDesktop !== isDesktop) {
        setLeftPanelWidth(25) // Reset to default when switching layouts
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [isDesktop, isHydrated])

  // Check if sidebar is narrow
  useEffect(() => {
    if (!isHydrated || !isDesktop) return

    // Check if sidebar is narrow (less than 200px)
    const checkSidebarWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const sidebarWidth = (leftPanelWidth / 100) * containerWidth
        setSidebarNarrow(sidebarWidth < 350)
      }
    }

    checkSidebarWidth()

    // Add resize listener to check sidebar width
    window.addEventListener("resize", checkSidebarWidth)

    return () => {
      window.removeEventListener("resize", checkSidebarWidth)
    }
  }, [leftPanelWidth, isHydrated, isDesktop])

  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      convertToAscii()
    }
  }, [resolution, inverted, grayscale, charSet, imageLoaded])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

        // Limit the minimum width of each panel to 20%
        if (newLeftWidth >= 20 && newLeftWidth <= 80) {
          setLeftPanelWidth(newLeftWidth)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const startDragging = () => {
    setIsDragging(true)
  }

  const loadImage = (src: string) => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    // Create a new image element
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        setError("Invalid image dimensions")
        setLoading(false)
        return
      }

      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
    }

    img.onerror = () => {
      setError("Failed to load image")
      setLoading(false)
    }

    // Set the source after setting up event handlers
    img.src = src
  }

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        loadImage(e.target.result as string)
      }
    }
    reader.onerror = () => {
      setError("Failed to read file")
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = () => {
    setIsDraggingFile(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // Helper function to adjust color brightness
  const adjustColorBrightness = (r: number, g: number, b: number, factor: number): string => {
    // Ensure the colors are visible against black background
    const minBrightness = 40 // Minimum brightness to ensure visibility
    r = Math.max(Math.min(Math.round(r * factor), 255), minBrightness)
    g = Math.max(Math.min(Math.round(g * factor), 255), minBrightness)
    b = Math.max(Math.min(Math.round(b * factor), 255), minBrightness)
    return `rgb(${r}, ${g}, ${b})`
  }

  const convertToAscii = () => {
    try {
      if (!canvasRef.current || !imageRef.current) {
        throw new Error("Canvas or image not available")
      }

      const img = imageRef.current

      // Validate image dimensions
      if (img.width === 0 || img.height === 0) {
        throw new Error("Invalid image dimensions")
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      // Calculate dimensions based on resolution
      const width = Math.floor(img.width * resolution)
      const height = Math.floor(img.height * resolution)

      // Set canvas dimensions to match the image
      canvas.width = img.width
      canvas.height = img.height

      // Clear the canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, img.width, img.height)

      // Get image data - this is where the error was occurring
      let imageData
      try {
        imageData = ctx.getImageData(0, 0, img.width, img.height)
      } catch (e) {
        throw new Error("Failed to get image data. This might be a CORS issue.")
      }

      const data = imageData.data

      // Choose character set
      const chars = charSets[charSet as keyof typeof charSets]

      // Calculate aspect ratio correction for monospace font
      const fontAspect = 0.5 // Width/height ratio of monospace font characters
      const widthStep = Math.ceil(img.width / width)
      const heightStep = Math.ceil(img.height / height / fontAspect)

      let result = ""
      const coloredResult: ColoredChar[][] = []

      // Process the image
      for (let y = 0; y < img.height; y += heightStep) {
        const coloredRow: ColoredChar[] = []

        for (let x = 0; x < img.width; x += widthStep) {
          const pos = (y * img.width + x) * 4

          const r = data[pos]
          const g = data[pos + 1]
          const b = data[pos + 2]

          // Calculate brightness based on grayscale setting
          let brightness
          if (grayscale) {
            // Standard grayscale calculation
            brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
          } else {
            // Color-aware brightness (perceived luminance)
            brightness = Math.sqrt(
              0.299 * (r / 255) * (r / 255) + 0.587 * (g / 255) * (g / 255) + 0.114 * (b / 255) * (b / 255),
            )
          }

          // Invert if needed
          if (inverted) brightness = 1 - brightness

          // Map brightness to character
          const charIndex = Math.floor(brightness * (chars.length - 1))
          const char = chars[charIndex]

          result += char

          // For colored mode, store the character and its color
          if (!grayscale) {
            // Adjust color brightness based on the character density
            // Characters with more "ink" (later in the charset) should be brighter
            const brightnessFactor = (charIndex / (chars.length - 1)) * 1.5 + 0.5
            const color = adjustColorBrightness(r, g, b, brightnessFactor)
            coloredRow.push({ char, color })
          } else {
            // For grayscale mode, we still need to populate the array
            coloredRow.push({ char, color: "white" })
          }
        }

        result += "\n"
        coloredResult.push(coloredRow)
      }

      setAsciiArt(result)
      setColoredAsciiArt(coloredResult)
      setError(null)
    } catch (err) {
      console.error("Error converting to ASCII:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setAsciiArt("")
      setColoredAsciiArt([])
    }
  }

  const downloadAsciiArt = () => {
    if (!asciiArt) {
      setError("No ASCII art to download")
      return
    }

    const element = document.createElement("a")
    const file = new Blob([asciiArt], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "ascii-art.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <div
        ref={containerRef}
        className="flex flex-col md:flex-row min-h-screen w-full overflow-hidden select-none"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ASCII Art Preview - Top on mobile, Right on desktop */}
        <div
          {...getRootProps()}
          ref={previewRef}
          className={`order-1 md:order-2 flex-1 bg-black overflow-auto flex items-center justify-center p-2 md:p-4 relative ${
            isDragActive ? "border-4 border-dashed border-blue-500 bg-blue-500/10" : ""
          }`}
          style={{
            ...(isHydrated && isDesktop
              ? {
                  width: `${100 - leftPanelWidth}%`,
                  marginLeft: `${leftPanelWidth}%`,
                }
              : {}),
          }}
        >
          <input {...getInputProps()} />
          {!imageLoaded && !loading && (
            <div className="text-center space-y-6 p-8 border-2 border-dashed border-stone-700 rounded-lg bg-stone-900/50">
              <div className="flex flex-col items-center space-y-4">
                <Upload className="h-20 w-20 text-blue-500 mx-auto" />
                <div className="space-y-2">
                  <p className="text-2xl text-white font-mono font-bold">
                    {isDragActive ? 'Drop your image here' : 'Upload your image'}
                  </p>
                  <p className="text-stone-400 text-lg">
                    Drag & drop or click to browse
                  </p>
                </div>
                <Button
                  onClick={e => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2"
                >
                  Choose Image
                </Button>
                <p className="text-stone-500 text-sm mt-4">
                  Supported formats: JPG, PNG, GIF, WEBP
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-white font-mono select-none flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p>Processing image...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 font-mono p-4 text-center select-none">
              {error}
              <div className="mt-2 text-white text-sm">Try uploading a different image or refreshing the page.</div>
            </div>
          ) : grayscale ? (
            <pre className="font-mono text-[0.4rem] leading-[0.4rem] md:text-[0.45rem] md:leading-[0.45rem] lg:text-[0.5rem] lg:leading-[0.5rem] text-white whitespace-pre select-text">
              {asciiArt}
            </pre>
          ) : (
            <div className="font-mono text-[0.4rem] leading-[0.4rem] md:text-[0.45rem] md:leading-[0.45rem] lg:text-[0.5rem] lg:leading-[0.5rem] whitespace-pre select-text">
              {coloredAsciiArt.map((row, rowIndex) => (
                <div key={rowIndex} style={{ lineHeight: "0.5rem" }}>
                  {row.map((col, colIndex) => (
                    <span key={`${rowIndex}-${colIndex}`} style={{ color: col.color }}>
                      {col.char}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resizable divider - Only visible on desktop after hydration */}
        {isHydrated && isDesktop && (
          <div
            className="order-3 w-2 bg-stone-800 hover:bg-stone-700 cursor-col-resize items-center justify-center z-10 transition-opacity duration-300"
            onMouseDown={startDragging}
            style={{
              position: "absolute",
              left: `${leftPanelWidth}%`,
              top: 0,
              bottom: 0,
              display: "flex",
            }}
          >
            <GripVertical className="h-6 w-6 text-stone-500" />
          </div>
        )}

        {/* Control Panel - Bottom on mobile, Left on desktop */}
        <div
          className={`order-2 md:order-1 w-full md:h-auto p-2 md:p-4 bg-stone-900 font-mono text-stone-300 transition-opacity duration-300 ${
            !isHydrated ? "opacity-0" : "opacity-100"
          }`}
          style={{
            width: "100%",
            height: "auto",
            flex: "0 0 auto",
            ...(isHydrated && isDesktop
              ? {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${leftPanelWidth}%`,
                  overflowY: "auto",
                }
              : {}),
          }}
        >
          <div className="space-y-4 p-2 md:p-4 border border-stone-700 rounded-md">
            <div className="space-y-1">
              <h1 className="text-lg text-stone-100 font-bold">ASCII Art Converter</h1>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2 border-t border-stone-700 pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="resolution" className="text-stone-300">
                    Resolution: {resolution.toFixed(2)}
                  </Label>
                </div>
                <Slider
                  id="resolution"
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  value={[resolution]}
                  onValueChange={(value: number[]) => setResolution(value[0])}
                  className="[&>span]:border-none [&_.bg-primary]:bg-stone-800 [&>.bg-background]:bg-stone-500/30"
                />
              </div>

              <div className="space-y-2 border-t border-stone-700 pt-4">
                <Label htmlFor="charset" className="text-stone-300">
                  Character Set
                </Label>
                <Select value={charSet} onValueChange={setCharSet}>
                  <SelectTrigger id="charset" className="bg-stone-800 border-stone-700 text-stone-300">
                    <SelectValue placeholder="Select character set" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-800 border-stone-700 text-stone-300">
                    <SelectItem value="standard" className="focus:bg-stone-700 focus:text-stone-100">
                      Standard
                    </SelectItem>
                    <SelectItem value="detailed" className="focus:bg-stone-700 focus:text-stone-100">
                      Detailed
                    </SelectItem>
                    <SelectItem value="blocks" className="focus:bg-stone-700 focus:text-stone-100">
                      Block Characters
                    </SelectItem>
                    <SelectItem value="minimal" className="focus:bg-stone-700 focus:text-stone-100">
                      Minimal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 border-t border-stone-700 pt-4">
                <Switch
                  id="invert"
                  checked={inverted}
                  onCheckedChange={setInverted}
                  className="data-[state=checked]:bg-stone-600"
                />
                <Label htmlFor="invert" className="text-stone-300">
                  Invert Colors
                </Label>
              </div>

              <div className="flex items-center space-x-2 border-t border-stone-700 pt-4">
                <Switch
                  id="grayscale"
                  checked={grayscale}
                  onCheckedChange={setGrayscale}
                  className="data-[state=checked]:bg-stone-600"
                />
                <Label htmlFor="grayscale" className="text-stone-300">
                  Grayscale Mode
                </Label>
              </div>

              <div className="hidden">
                <canvas ref={canvasRef} width="300" height="300"></canvas>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-stone-700">
                <Button
                  onClick={() => {
                    if (!asciiArt) {
                      setError("No ASCII art to copy")
                      return
                    }
                    const el = document.createElement("textarea")
                    el.value = asciiArt
                    document.body.appendChild(el)
                    el.select()
                    document.execCommand("copy")
                    document.body.removeChild(el)
                    alert("ASCII art copied to clipboard!")
                  }}
                  className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                  disabled={loading || !imageLoaded}
                >
                  {sidebarNarrow ? "Copy" : "Copy ASCII Art"}
                </Button>

                <Button
                  onClick={downloadAsciiArt}
                  className="bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                  title="Download ASCII Art"
                  disabled={loading || !imageLoaded || !asciiArt}
                >
                  <Download className="h-4 w-4" />
                </Button>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600"
                  title="Upload Image"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
