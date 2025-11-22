import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function useUserRole(userId) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    async function fetchRole() {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();
      setRole(data?.role ?? null);
      setLoading(false);
    }

    fetchRole();
  }, [userId]);

  return { role, loading };
}
