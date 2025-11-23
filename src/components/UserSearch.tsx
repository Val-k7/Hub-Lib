import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchUsers } from "@/hooks/useSearchUsers";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserSearchProps {
  onSelectUser: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeUserIds?: string[];
}

export const UserSearch = ({
  onSelectUser,
  placeholder = "Rechercher un utilisateur...",
  disabled = false,
  excludeUserIds = [],
}: UserSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: users = [], isLoading } = useSearchUsers(debouncedQuery);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrer les utilisateurs exclus
  const filteredUsers = users.filter(
    (user) => !excludeUserIds.includes(user.id)
  );

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          aria-label="Rechercher un utilisateur"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && searchQuery.length >= 2 && (
        <div 
          className="absolute z-50 w-full mt-2 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-auto"
          role="listbox"
          aria-label="Résultats de recherche d'utilisateurs"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Recherche en cours...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun utilisateur trouvé
            </div>
          ) : (
            <div className="p-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  role="option"
                  aria-label={`Sélectionner ${user.full_name || user.username || 'utilisateur'}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-accent transition-colors text-left"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {(user.username || user.full_name || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.full_name || user.username || "Utilisateur"}
                    </p>
                    {user.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    )}
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

