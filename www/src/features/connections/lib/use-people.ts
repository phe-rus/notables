import { useEffect, useMemo, useState } from "react";
import { activeMembers } from "@/features/sharing/lib/share-members";
import { sessionFor, useShareSessionsVersion } from "@/features/sharing/lib/share-sessions";
import { useShares } from "@/features/sharing/store/share-store";
import { inBrowserSession } from "@/platform/session/browser-session-store";
import { phoneConnection } from "@/platform/session/phone-connection";
import { gatherPeople, PeopleSnapshot, type Person, type ShareSnapshot } from "../model/people";
import { markSeen } from "../store/last-seen-store";

/** Everyone this device shares with, live: re-renders as people come online or leave. */
export function usePeople(pollBrowser = true): Person[] {
  const browser = inBrowserSession();
  const [remote, setRemote] = useState<Person[]>([]);
  const shares = useShares();
  const version = useShareSessionsVersion();
  const people = useMemo(() => {
    const snapshots: ShareSnapshot[] = shares.map((share) => {
      const session = sessionFor(share.noteId);
      return {
        share,
        members: session ? activeMembers(session.doc) : [],
        peers: session?.peers ?? [],
      };
    });
    return gatherPeople(snapshots);
  }, [shares, version]);

  useEffect(() => {
    if (!browser || !pollBrowser) return;
    let active = true;
    const refresh = async () => {
      try {
        const people = PeopleSnapshot.parse(
          await phoneConnection()?.client.request("sharing.people", null),
        );
        if (active) setRemote(people);
      } catch {}
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [browser, pollBrowser]);
  const visible = browser ? remote : people;
  // Whoever is here now was seen now; the list shows when the others last were.
  const online = visible.filter((person) => person.online).map((person) => person.key);
  const onlineKey = online.join("|");
  useEffect(() => {
    markSeen(online);
    if (online.length === 0) return;
    const timer = window.setInterval(() => markSeen(online), 60_000);
    return () => window.clearInterval(timer);
  }, [onlineKey]);

  return visible;
}
