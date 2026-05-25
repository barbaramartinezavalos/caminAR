import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { MOCK_CHALLENGES } from "../models/mocks";
import { Challenge } from "../models/types";


const KEY = "@eco_challenges";

export function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setChallenges(JSON.parse(raw));
        else setChallenges(MOCK_CHALLENGES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Challenge[]) => {
    setChallenges(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const updateProgress = useCallback((id: string, add = 1) => {
    const next = challenges.map((c: { id: string; progress: { current: any; total: number; }; status: any; }) => {
      if (c.id !== id) return c;
      if (!c.progress) return c;
      const current = Math.min((c.progress.current ?? 0) + add, c.progress.total);
      const status = current >= (c.progress.total ?? 0) ? "completed" : c.status;
      return { ...c, progress: { ...c.progress, current }, status };
    });
    persist(next);
  }, [challenges, persist]);

  const completeWithPhoto = useCallback((id: string) => {
    const next = challenges.map((c: { id: string; }) => (c.id === id ? { ...c, status: "completed" as const } : c));
    persist(next);
  }, [challenges, persist]);

  return { challenges, loading, updateProgress, completeWithPhoto };
}
