import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceDelay?: number;
}

export const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Rechercher des ressources...",
  debounceDelay = 300
}: SearchBarProps) => {
  const [inputValue, setInputValue] = useState(value);
  const debouncedValue = useDebounce(inputValue, debounceDelay);

  // Update parent when debounced value changes
  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  // Sync with external value changes
  useEffect(() => {
    if (value !== inputValue && value !== debouncedValue) {
      setInputValue(value);
    }
  }, [value, inputValue, debouncedValue]);

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  return (
    <div className="relative w-full max-w-2xl group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        aria-label={placeholder}
        className="pl-12 pr-12 h-14 text-base bg-card/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all rounded-xl"
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-destructive/10 hover:text-destructive hover-scale"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
