import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useSuggestionVoting } from "@/hooks/useSuggestionVoting";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type VoteType = "upvote" | "downvote" | null;

interface VoteButtonsProps {
  suggestionId: string;
  currentVoteType?: VoteType;
  upvotes: number;
  downvotes: number;
  score: number;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  showCounts?: boolean;
}

export const VoteButtons = ({
  suggestionId,
  currentVoteType,
  upvotes,
  downvotes,
  score,
  size = "sm",
  variant = "outline",
  showCounts = true,
}: VoteButtonsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const voteMutation = useSuggestionVoting();

  const handleVote = (voteType: VoteType) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour voter.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Si on clique sur le même vote, on le retire
    const newVoteType = currentVoteType === voteType ? null : voteType;
    
    voteMutation.mutate({
      suggestionId,
      voteType: newVoteType,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Upvote Button */}
      <Button
        variant={currentVoteType === "upvote" ? "default" : variant}
        size={size}
        className={`gap-1.5 ${currentVoteType === "upvote" ? "bg-green-500 hover:bg-green-600" : ""}`}
        onClick={() => handleVote("upvote")}
        disabled={voteMutation.isPending || !user}
      >
        <ThumbsUp className={`h-4 w-4 ${currentVoteType === "upvote" ? "fill-white" : ""}`} />
        {showCounts && (
          <span className="font-medium">{upvotes}</span>
        )}
      </Button>

      {/* Score Badge */}
      {showCounts && (
        <Badge 
          variant={score > 0 ? "default" : score < 0 ? "destructive" : "secondary"}
          className="min-w-[40px] justify-center"
        >
          {score > 0 ? "+" : ""}{score}
        </Badge>
      )}

      {/* Downvote Button */}
      <Button
        variant={currentVoteType === "downvote" ? "default" : variant}
        size={size}
        className={`gap-1.5 ${currentVoteType === "downvote" ? "bg-red-500 hover:bg-red-600" : ""}`}
        onClick={() => handleVote("downvote")}
        disabled={voteMutation.isPending || !user}
      >
        <ThumbsDown className={`h-4 w-4 ${currentVoteType === "downvote" ? "fill-white" : ""}`} />
        {showCounts && (
          <span className="font-medium">{downvotes}</span>
        )}
      </Button>
    </div>
  );
};

