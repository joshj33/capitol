"use client";

import { useMemo, useState } from "react";
import type { Figure, Party, RosterSlot } from "@/lib/types";
import { checkRosterLegality } from "@/lib/scoring";
import { Avatar, PartyChip, officeLabel } from "@/components/ui";

// Roster template for the demo draft: 2 SEN, 2 REP, 1 EXEC, 1 FLEX.
const SLOTS: RosterSlot[] = ["SEN", "SEN", "REP", "REP", "EXEC", "FLEX"];

function slotAccepts(slot: RosterSlot, office: Figure["office"]): boolean {
  if (slot === "FLEX" || slot === "BENCH") return true;
  if (slot === "SEN") return office === "senator";
  if (slot === "REP") return office === "representative";
  if (slot === "EXEC")
    return ["governor", "cabinet", "president", "candidate"].includes(office);
  return false;
}

export function DraftRoom({ figures, parties }: { figures: Figure[]; parties: Party[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [office, setOffice] = useState<string>("all");
  const [party, setParty] = useState<string>("all");
  const [q, setQ] = useState("");

  const abbr = useMemo(() => {
    const m = new Map(parties.map((p) => [p.id, p.abbr]));
    return (id: string) => m.get(id) ?? "?";
  }, [parties]);

  const myFigures = picked
    .map((id) => figures.find((f) => f.id === id)!)
    .filter(Boolean);

  // Assign each picked figure to the first open slot it fits.
  const slotAssignments = useMemo(() => {
    const open = [...SLOTS];
    const assigned: { figure: Figure; slot: RosterSlot }[] = [];
    for (const f of myFigures) {
      let idx = open.findIndex((s) => s !== "FLEX" && slotAccepts(s, f.office));
      if (idx === -1) idx = open.findIndex((s) => slotAccepts(s, f.office));
      if (idx === -1) continue;
      assigned.push({ figure: f, slot: open[idx] });
      open.splice(idx, 1);
    }
    return assigned;
  }, [myFigures]);

  const legality = checkRosterLegality(myFigures, abbr);
  const rosterFull = picked.length >= SLOTS.length;

  const available = figures
    .filter((f) => !picked.includes(f.id))
    .filter((f) => office === "all" || f.office === office)
    .filter((f) => party === "all" || f.partyId === party)
    .filter((f) => f.fullName.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.prominence - a.prominence);

  function canDraft(f: Figure): boolean {
    if (rosterFull) return false;
    const open = [...SLOTS];
    for (const a of slotAssignments) {
      const i = open.indexOf(a.slot);
      if (i !== -1) open.splice(i, 1);
    }
    return open.some((s) => slotAccepts(s, f.office));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Draft Room</h1>
          <p className="text-sm text-gov-400">
            Snake draft · drafting for <strong>Capitol Hawks</strong> · pick{" "}
            {picked.length + 1} of {SLOTS.length}
          </p>
        </div>
        <button className="btn-ghost" onClick={() => setPicked([])}>
          Reset draft
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Board */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search figures…"
              className="flex-1 rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm outline-none focus:border-gov-500"
            />
            <select
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              className="rounded-lg border border-ink-line bg-ink px-2 py-2 text-sm"
            >
              <option value="all">All offices</option>
              <option value="senator">Senators</option>
              <option value="representative">Representatives</option>
              <option value="governor">Governors</option>
            </select>
            <select
              value={party}
              onChange={(e) => setParty(e.target.value)}
              className="rounded-lg border border-ink-line bg-ink px-2 py-2 text-sm"
            >
              <option value="all">All parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="card p-0">
            {available.length === 0 && (
              <p className="p-4 text-sm text-gov-400">No figures match your filters.</p>
            )}
            {available.map((f) => {
              const draftable = canDraft(f);
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between border-b border-ink-line/50 p-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={f.fullName} size={36} />
                    <div>
                      <div className="font-medium">
                        {f.fullName} <PartyChip abbr={abbr(f.partyId)} />
                      </div>
                      <div className="text-xs text-gov-400">
                        {officeLabel(f.office)} · {f.state} · prominence {f.prominence}
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={!draftable}
                    onClick={() => setPicked((p) => [...p, f.id])}
                    className={`btn ${
                      draftable
                        ? "bg-gov-600 text-white hover:bg-gov-500"
                        : "cursor-not-allowed border border-ink-line text-gov-400"
                    }`}
                    title={draftable ? "Draft" : "No open slot for this office"}
                  >
                    {draftable ? "Draft" : "No slot"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* My roster + legality meter */}
        <section className="space-y-4">
          <div className="card">
            <h2 className="mb-3 font-bold">My roster</h2>
            <div className="space-y-2">
              {SLOTS.map((slot, i) => {
                const filled = slotAssignments[i];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-ink-line/60 p-2"
                  >
                    <span className="w-12 shrink-0 text-xs font-semibold text-gov-400">
                      {slot}
                    </span>
                    {filled ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={filled.figure.fullName} size={28} />
                        <span className="text-sm">
                          {filled.figure.fullName}{" "}
                          <PartyChip abbr={abbr(filled.figure.partyId)} />
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-gov-400">empty</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live legality meter */}
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">Roster legality</h2>
              <span
                className={`chip ${
                  legality.legal ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
                }`}
              >
                {legality.legal ? "✓ legal" : "incomplete"}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              {legality.rules.map((r) => (
                <div key={r.key} className="flex items-center justify-between">
                  <span className={r.ok ? "text-good" : "text-gov-400"}>
                    {r.ok ? "✓" : "○"} {r.label}
                  </span>
                  <span className="text-gov-400">{r.detail}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gov-400">
              These ideological-diversity rules are enforced at draft time so an
              unbalanced roster can&apos;t be submitted.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
