import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/types";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "current-user"],
    retry: false,
    queryFn: async () => {
      try {
        return await api.getCurrentUser();
      } catch (error) {
        console.error("Auth query error:", error);
        return null;
      }
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}