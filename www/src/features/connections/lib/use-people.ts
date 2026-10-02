import { useEffect, useMemo } from "react";
import { activeMembers } from "../../sharing/lib/share-members";
import { sessionFor, useShareSessionsVersion } from "../../sharing/lib/share-sessions";
import { useShares } from "../../sharing/store/share-store";
import { gatherPeople, type Person, type ShareSnapshot } from "../model/people";
import { markSeen } from "../store/last-seen-store";

/** Everyone this device shares with, live: re-renders as people come online or leave. */
export function usePeople(): Person[] {
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

  // Whoever is here now was seen now; the list shows when the others last were.
  const online = people.filter((person) => person.online).map((person) => person.key);
  const onlineKey = online.join("|");
  useEffect(() => {
    markSeen(online);
    if (online.length === 0) return;
    const timer = window.setInterval(() => markSeen(online), 60_000);
    return () => window.clearInterval(timer);
  }, [onlineKey]);

  return people;
}
