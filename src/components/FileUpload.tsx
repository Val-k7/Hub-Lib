import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, File, Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: string; // base64
  url?: string;
}

interface FileUploadProps {
  onFileSelect: (file: UploadedFile | null) => void;
  acceptedTypes?: string[];
  maxSize?: number; // en MB
  value?: UploadedFile | null;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB par défaut

export const FileUpload = ({
  onFileSelect,
  acceptedTypes = ["image/*", "text/*", "application/json", "application/pdf"],
  maxSize = 10,
  value,
  disabled = false,
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setProgress(0);

    // Vérifier la taille
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Le fichier est trop volumineux. Taille maximale : ${maxSize}MB`);
      setUploading(false);
      return;
    }

    // Vérifier le type
    const isAccepted = acceptedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const baseType = type.split("/")[0];
        return file.type.startsWith(baseType + "/");
      }
      return file.type === type;
    });

    if (!isAccepted) {
      setError(`Type de fichier non accepté. Types acceptés : ${acceptedTypes.join(", ")}`);
      setUploading(false);
      return;
    }

    try {
      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 50);

      // Convertir en base64
      const reader = new FileReader();
      reader.onload = (e) => {
        clearInterval(progressInterval);
        setProgress(100);

        const result = e.target?.result as string;
        const base64Data = result.split(",")[1]; // Retirer le préfixe data:type;base64,

        const uploadedFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data,
        };

        onFileSelect(uploadedFile);
        setUploading(false);
        setProgress(0);
      };

      reader.onerror = () => {
        clearInterval(progressInterval);
        setError("Erreur lors de la lecture du fichier");
        setUploading(false);
        setProgress(0);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError("Erreur lors de l'upload du fichier");
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setError(null);
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <File className="h-5 w-5" />;
    if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (type.startsWith("text/")) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-2">
      <Label>Fichier (optionnel)</Label>
      
      {!value ? (
        <div className="space-y-2">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              "hover:border-primary/50 cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-destructive"
            )}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Cliquez pour téléverser un fichier
            </p>
            <p className="text-xs text-muted-foreground">
              Taille maximale : {maxSize}MB
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="hidden"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Upload en cours... {progress}%
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
          <div className="flex-shrink-0">
            {getFileIcon(value.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.size)} • {value.type}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

