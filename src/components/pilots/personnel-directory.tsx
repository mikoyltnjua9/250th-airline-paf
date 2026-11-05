"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PilotAvatar } from "@/components/pilots/pilot-avatar";
import { FitToFlyBadge } from "@/components/status-badge";
import { ReactivatePilotButton } from "@/components/pilots/reactivate-pilot-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PERSONNEL_CLASSES, personnelTypeForPosition, type PersonnelClassKey } from "@/lib/types/pilot";
import type { DirectoryRow } from "@/lib/pilots/queries";

function matchesSearch(pilot: DirectoryRow, query: string): boolean {
  if (!query) return true;
  const rankLabel = pilot.ranks?.label ?? pilot.rank_code;
  return (
    pilot.full_name.toLowerCase().includes(query) ||
    pilot.afsn.toLowerCase().includes(query) ||
    pilot.position.toLowerCase().includes(query) ||
    (pilot.unit_section ?? "").toLowerCase().includes(query) ||
    rankLabel.toLowerCase().includes(query)
  );
}

function PilotList({
  pilots,
  total,
  showReactivate,
  canManage,
}: {
  pilots: DirectoryRow[];
  total: number;
  showReactivate?: boolean;
  /** Only accounts that may manage people get the Reactivate button. */
  canManage?: boolean;
}) {
  if (total === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {showReactivate ? "No deactivated personnel." : "No personnel yet. Add the first one to get started."}
      </p>
    );
  }

  if (pilots.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
        No personnel match your search.
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
            <p className="truncate text-xs text-muted-foreground">
              {pilot.afsn}
              {pilot.unit_section ? ` · ${pilot.unit_section}` : ""}
            </p>
          </div>
          {showReactivate ? (
            canManage ? (
              <ReactivatePilotButton pilotId={pilot.id} />
            ) : (
              <Badge variant="secondary">Deactivated</Badge>
            )
          ) : (
            personnelTypeForPosition(pilot.position) === "pilot" ? (
              <FitToFlyBadge fitToFly={pilot.fitness.fit} reason={pilot.fitness.reason} />
            ) : (
              // Fit-to-fly is a pilot concept -- show what the person is instead.
              <Badge variant="secondary">
                {pilot.position}
                {pilot.skill_level ? ` · ${pilot.skill_level} Skill` : ""}
              </Badge>
            )
          )}
        </Link>
      ))}
    </div>
  );
}

const GROUP_ORDER: PersonnelClassKey[] = [
  "fixed_wing",
  "rotary",
  "maintenance_officers",
  "maintenance_personnel",
  "flight_attendants",
];

/** The people split under a heading per classification (anyone who fits none, e.g. Ground Crew, last). */
function groupByClass(pilots: DirectoryRow[]): { label: string; rows: DirectoryRow[] }[] {
  const groups = GROUP_ORDER.map((key) => {
    const c = PERSONNEL_CLASSES.find((x) => x.key === key)!;
    return { label: c.label, rows: pilots.filter((p) => c.positions.includes(p.position)) };
  });
  const placed = new Set(PERSONNEL_CLASSES.flatMap((c) => c.positions));
  groups.push({ label: "Other", rows: pilots.filter((p) => !placed.has(p.position)) });
  return groups.filter((g) => g.rows.length > 0);
}

/** One list when a classification is picked; under a heading per classification when it's "All". */
function PeopleView({
  pilots,
  total,
  grouped,
  showReactivate,
  canManage,
}: {
  pilots: DirectoryRow[];
  total: number;
  grouped: boolean;
  showReactivate?: boolean;
  canManage?: boolean;
}) {
  if (!grouped || pilots.length === 0) {
    return <PilotList pilots={pilots} total={total} showReactivate={showReactivate} canManage={canManage} />;
  }
  return (
    <div className="space-y-6">
      {groupByClass(pilots).map((g) => (
        <section key={g.label} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {g.label} ({g.rows.length})
          </h3>
          <PilotList pilots={g.rows} total={g.rows.length} showReactivate={showReactivate} canManage={canManage} />
        </section>
      ))}
    </div>
  );
}

export function PersonnelDirectory({
  activePilots,
  inactivePilots,
  canManage = false,
  initialClass,
}: {
  activePilots: DirectoryRow[];
  inactivePilots: DirectoryRow[];
  canManage?: boolean;
  /** Which classification to open on (e.g. from a dashboard tile). */
  initialClass?: PersonnelClassKey;
}) {
  const [search, setSearch] = useState("");
  const [cls, setCls] = useState<PersonnelClassKey | "all">(initialClass ?? "all");

  const query = search.trim().toLowerCase();
  const positions = useMemo(
    () => (cls === "all" ? null : new Set(PERSONNEL_CLASSES.find((c) => c.key === cls)!.positions)),
    [cls],
  );
  const filteredActive = useMemo(
    () => activePilots.filter((p) => (!positions || positions.has(p.position)) && matchesSearch(p, query)),
    [activePilots, query, positions],
  );
  const filteredInactive = useMemo(
    () => inactivePilots.filter((p) => (!positions || positions.has(p.position)) && matchesSearch(p, query)),
    [inactivePilots, query, positions],
  );
  const countFor = (key: PersonnelClassKey) => {
    const set = new Set(PERSONNEL_CLASSES.find((c) => c.key === key)!.positions);
    return activePilots.filter((p) => set.has(p.position)).length;
  };
  const chips = [
    { key: "all" as const, label: "All", count: activePilots.length },
    ...PERSONNEL_CLASSES.map((c) => ({ key: c.key, label: c.label, count: countFor(c.key) })),
  ];

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name, rank, AFSN, unit, or position…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Classification">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCls(c.key)}
            aria-pressed={cls === c.key}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              cls === c.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {c.label} <span className="tabular-nums opacity-80">({c.count})</span>
          </button>
        ))}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activePilots.length})</TabsTrigger>
          <TabsTrigger value="deactivated">Deactivated ({inactivePilots.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-2 pt-4">
          {(query || cls !== "all") && (
            <p className="text-xs text-muted-foreground">
              {filteredActive.length} of {activePilots.length}
            </p>
          )}
          <PeopleView pilots={filteredActive} total={activePilots.length} grouped={cls === "all"} />
        </TabsContent>
        <TabsContent value="deactivated" className="space-y-2 pt-4">
          {(query || cls !== "all") && (
            <p className="text-xs text-muted-foreground">
              {filteredInactive.length} of {inactivePilots.length}
            </p>
          )}
          <PeopleView
            pilots={filteredInactive}
            total={inactivePilots.length}
            grouped={cls === "all"}
            showReactivate
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
