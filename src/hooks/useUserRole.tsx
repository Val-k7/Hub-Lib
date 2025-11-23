import { useEffect, useState } from "react";
import { localClient } from "@/integrations/local/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await localClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking user role:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  return { isAdmin, loading };
};
