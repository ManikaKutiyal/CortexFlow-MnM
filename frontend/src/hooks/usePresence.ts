import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/libs/supabase-browser";


export function usePresence(userId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabaseBrowserClient();
    const room = supabase.channel("global_presence", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState();
        const activeUsers = new Set<string>();
        for (const id in state) {
          activeUsers.add(id);
        }
        setOnlineUsers(activeUsers);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await room.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      room.unsubscribe();
    };
  }, [userId]);

  return onlineUsers;
}
