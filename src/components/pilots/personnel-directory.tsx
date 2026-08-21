"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { FitToFlyBadge } from "@/components/status-badge";
import { ReactivatePilotButton } from "@/components/pilots/reactivate-pilot-button";
import type { DirectoryRow } from "@/lib/pilots/queries";

function matchesSearch(pilot: DirectoryRow, query: string): boolean {
  if (!query) return true;
  const rankLabel = pilot.ranks?.label ?? pilot.rank_code;
  return (
    pilot.full_name.toLowerCase().includes(query) ||
    pilot.afsn.toLowerCase().includes(query) ||
    rankLabel.toLowerCase().includes(query)
  );
}

function PilotList({
  pilots,
  total,
  showReactivate,
}: {
  pilots: DirectoryRow[];
  total: number;
  showReactivate?: boolean;
}) {
  if (total === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {showReactivate ? "No deactivated pilots." : "No pilots yet. Add the first one to get started."}
      </p>
    );
  }

  if (pilots.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
        No pilots match your search.
      </p>
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/10">
      {pilots.map((pilot) => (
        <Link
          key={pilot.id}
          href={`/personnel/${pilot.id}`}
          className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
        >
          <PilotAvatar fullName={pilot.full_name} photoUrl={pilot.photo_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {pilot.ranks?.label ?? pilot.rank_code} {pilot.full_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{pilot.afsn}</p>
          </div>
          {showReactivate ? (
            <ReactivatePilotButton pilotId={pilot.id} />
          ) : (
            <FitToFlyBadge fitToFly={pilot.fit_to_fly} />
          )}
        </Link>
      ))}
    </div>
  );
}

export function PersonnelDirectory({
  activePilots,
  inactivePilots,
}: {
  activePilots: DirectoryRow[];
  inactivePilots: DirectoryRow[];
}) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filteredActive = useMemo(
    () => activePilots.filter((p) => matchesSearch(p, query)),
    [activePilots, query],
  );
  const filteredInactive = useMemo(
    () => inactivePilots.filter((p) => matchesSearch(p, query)),
    [inactivePilots, query],
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name, rank, or AFSN…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activePilots.length})</TabsTrigger>
          <TabsTrigger value="deactivated">Deactivated ({inactivePilots.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-2 pt-4">
          {query && (
            <p className="text-xs text-muted-foreground">
              {filteredActive.length} of {activePilots.length}
            </p>
          )}
          <PilotList pilots={filteredActive} total={activePilots.length} />
        </TabsContent>
        <TabsContent value="deactivated" className="space-y-2 pt-4">
          {query && (
            <p className="text-xs text-muted-foreground">
              {filteredInactive.length} of {inactivePilots.length}
            </p>
          )}
          <PilotList pilots={filteredInactive} total={inactivePilots.length} showReactivate />
        </TabsContent>
      </Tabs>
    </div>
  );
}
