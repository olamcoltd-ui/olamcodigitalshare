import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, FileIcon, ImageIcon } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  placeholder?: string;
  description?: string;
  currentFile?: File | null;
  type?: 'image' | 'file';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "*/*",
  maxSize = 100, // 100MB default
  placeholder = "Drag & drop file or click to upload",
  description,
  currentFile,
  type = 'file'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }
    
    if (type === 'image' && !file.type.startsWith('image/')) {
      setError('Please select an image file');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect, maxSize, type]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const clearFile = () => {
    onFileSelect(null);
    setError(null);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const Icon = type === 'image' ? ImageIcon : FileIcon;

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : error 
            ? 'border-destructive bg-destructive/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {currentFile ? (
          <div className="flex items-center justify-center gap-3">
            <Icon className="h-8 w-8 text-success" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-success">{currentFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">{placeholder}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};