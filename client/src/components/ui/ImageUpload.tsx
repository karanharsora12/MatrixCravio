import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, RefreshCw, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './Button.js';
import { cn } from '../../lib/utils.js';

export interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label = 'Image',
  value,
  onChange,
  helperText = 'Recommended: JPG, PNG or WebP (max 10MB). Image is automatically optimized.',
  error,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(value || '');
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeKb: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress and convert file to web-friendly Base64 Data URL using HTML5 Canvas
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP, etc.)');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Compute resized dimensions (max 1200px width/height for fast mobile delivery)
        const maxDimension = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback to raw base64 if canvas context fails
          onChange(src);
          setIsProcessing(false);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP or JPEG with 85% quality
        let compressedDataUrl = '';
        try {
          compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
          if (!compressedDataUrl.startsWith('data:image/webp')) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }

        const approxSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
        setImageMeta({ width, height, sizeKb: approxSizeKb });
        onChange(compressedDataUrl);
        setUrlInput(compressedDataUrl);
        setIsProcessing(false);
      };

      img.onerror = () => {
        setUploadError('Failed to read and process image');
        setIsProcessing(false);
      };

      img.src = src;
    };

    reader.onerror = () => {
      setUploadError('Failed to read file from disk');
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
      e.target.value = ''; // Reset input to allow selecting same file again
    }
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    setImageMeta(null);
    setUploadError(null);
  };

  const handleUrlApply = () => {
    if (!urlInput.trim()) {
      handleClear();
      return;
    }
    onChange(urlInput.trim());
  };

  const hasImage = Boolean(value && value.trim().length > 0);

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            {label}
          </label>
        )}

        {/* Toggle between Upload File & Direct URL */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={cn(
              'px-2 py-0.5 rounded-md transition-all',
              activeTab === 'upload'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={cn(
              'px-2 py-0.5 rounded-md transition-all',
              activeTab === 'url'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Image URL
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* When Image is Present: Show Preview Card */}
      {hasImage ? (
        <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden p-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="relative h-20 w-24 rounded-xl overflow-hidden bg-muted/60 shrink-0 border border-border/50">
              <img
                src={value}
                alt="Uploaded preview"
                className="h-full w-full object-cover"
                onError={() => setUploadError('Image failed to load. Check the URL or re-upload.')}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate">Image Ready</span>
              </div>

              <p className="text-[11px] text-muted-foreground truncate">
                {value?.startsWith('data:')
                  ? `Optimized Data Image ${imageMeta ? `(${imageMeta.width}×${imageMeta.height}px, ~${imageMeta.sizeKb}KB)` : ''}`
                  : value}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5 rounded-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Replace
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                  onClick={handleClear}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'upload' ? (
        /* Upload Mode: Interactive Drag & Drop Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'group relative flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-all duration-200 select-none',
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-input hover:border-primary/60 hover:bg-muted/40 bg-background/50',
            (error || uploadError) && 'border-rose-500/80 bg-rose-500/5'
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl transition-all shadow-xs',
              isDragging
                ? 'bg-primary text-white scale-110'
                : 'bg-primary/10 text-primary group-hover:scale-105 group-hover:bg-primary group-hover:text-white'
            )}
          >
            {isProcessing ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground">
              {isProcessing
                ? 'Optimizing image...'
                : isDragging
                ? 'Drop image here to upload'
                : 'Click to upload or drag & drop'}
            </p>
            <p className="text-[11px] text-muted-foreground">{helperText}</p>
          </div>
        </div>
      ) : (
        /* URL Mode: Manual Link Input with Instant Preview */
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlApply();
                  }
                }}
                className="w-full h-10 pl-8 pr-3 rounded-xl border border-input bg-background/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUrlApply}
              className="h-10 px-3 text-xs"
            >
              Apply
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Paste a public direct image link from Unsplash, Cloudinary, or your CDN.
          </p>
        </div>
      )}

      {(error || uploadError) && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pt-0.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error || uploadError}</span>
        </div>
      )}
    </div>
  );
};
