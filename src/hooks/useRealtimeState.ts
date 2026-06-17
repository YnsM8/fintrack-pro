import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeState<T extends { id: string }>(
  tableName: string,
  initialState: T[] = []
) {
  const [state, setState] = useState<T[]>(initialState);
  const supabase = createClient();

  useEffect(() => {
    // Load initial values
    const fetchInitial = async () => {
      const { data } = await supabase.from(tableName).select('*');
      if (data) setState(data as T[]);
    };
    fetchInitial();

    // Subscribe to real-time events
    const channel = supabase
      .channel(`realtime-changes-${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setState((prev) => [...prev, payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setState((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as T) : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setState((prev) => prev.filter((item) => item.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName]);

  return [state, setState] as const;
}
