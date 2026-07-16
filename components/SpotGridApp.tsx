"use client";

import { useEffect, useMemo, useState } from "react";

export type SlotType = "pre" | "mid" | "post";
export type BookingStatus = "Held" | "Booked" | "Brief received" | "Script approved" | "Recorded" | "Delivered" | "Invoiced" | "Paid";
type View = "inventory" | "pipeline" | "sponsors" | "report";

export interface Show {
  id: string;
  name: string;
  audience: string;
  cadence: string;
}

export interface Episode {
  id: string;
  showId: string;
  title: string;
  publishDate: string;
}

export interface Booking {
  id: string;
  episodeId: string;
  slot: SlotType;
  sponsor: string;
  category: string;
  status: BookingStatus;
  value: number;
  owner: string;
  dueDate: string;
  notes: string;
}

export interface AppState {
  shows: Show[];
  episodes: Episode[];
  bookings: Booking[];
}

const STORAGE_KEY = "spotgrid:workspace:v1";
const slotLabels: Record<SlotType, string> = { pre: "Pre-roll", mid: "Mid-roll", post: "Post-roll" };
const statuses: BookingStatus[] = ["Held", "Booked", "Brief received", "Script approved", "Recorded", "Delivered", "Invoiced", "Paid"];

export const initialState: AppState = {
  shows: [
    { id: "show-founders", name: "Founder Field Notes", audience: "B2B founders", cadence: "Tuesdays" },
    { id: "show-dev", name: "Stack Trace Weekly", audience: "Software teams", cadence: "Wednesdays" },
    { id: "show-health", name: "Care Ops Radio", audience: "Healthcare operators", cadence: "Thursdays" },
    { id: "show-money", name: "Margin Call", audience: "Finance leaders", cadence: "Fridays" }
  ],
  episodes: [
    { id: "ep-f-1", showId: "show-founders", title: "Selling into slow enterprise teams", publishDate: "2026-08-03" },
    { id: "ep-f-2", showId: "show-founders", title: "The practical founder dashboard", publishDate: "2026-08-10" },
    { id: "ep-f-3", showId: "show-founders", title: "Hiring your first operator", publishDate: "2026-08-17" },
    { id: "ep-f-4", showId: "show-founders", title: "Pricing changes that worked", publishDate: "2026-08-24" },
    { id: "ep-f-5", showId: "show-founders", title: "When to hire sales", publishDate: "2026-08-31" },
    { id: "ep-d-1", showId: "show-dev", title: "Postgres at small scale", publishDate: "2026-08-04" },
    { id: "ep-d-2", showId: "show-dev", title: "Incident reviews that do not rot", publishDate: "2026-08-11" },
    { id: "ep-d-3", showId: "show-dev", title: "The state of edge compute", publishDate: "2026-08-18" },
    { id: "ep-d-4", showId: "show-dev", title: "What teams get wrong about QA", publishDate: "2026-08-25" },
    { id: "ep-d-5", showId: "show-dev", title: "Practical AI code review", publishDate: "2026-09-01" },
    { id: "ep-h-1", showId: "show-health", title: "Scheduling without chaos", publishDate: "2026-08-05" },
    { id: "ep-h-2", showId: "show-health", title: "Clinic finance basics", publishDate: "2026-08-12" },
    { id: "ep-h-3", showId: "show-health", title: "Patient comms tooling", publishDate: "2026-08-19" },
    { id: "ep-h-4", showId: "show-health", title: "Small team compliance", publishDate: "2026-08-26" },
    { id: "ep-h-5", showId: "show-health", title: "Referral loops", publishDate: "2026-09-02" },
    { id: "ep-m-1", showId: "show-money", title: "Cash forecasting", publishDate: "2026-08-06" },
    { id: "ep-m-2", showId: "show-money", title: "Founder-friendly debt", publishDate: "2026-08-13" },
    { id: "ep-m-3", showId: "show-money", title: "Insurance for operators", publishDate: "2026-08-20" },
    { id: "ep-m-4", showId: "show-money", title: "The board packet", publishDate: "2026-08-27" },
    { id: "ep-m-5", showId: "show-money", title: "Gross margin habits", publishDate: "2026-09-03" }
  ],
  bookings: [
    { id: "b-1", episodeId: "ep-f-1", slot: "mid", sponsor: "Northstar CRM", category: "SaaS", status: "Recorded", value: 2400, owner: "Maya", dueDate: "2026-07-30", notes: "Host approved alternate CTA." },
    { id: "b-2", episodeId: "ep-d-2", slot: "pre", sponsor: "DeployPilot", category: "DevTools", status: "Script approved", value: 1800, owner: "Jon", dueDate: "2026-08-04", notes: "Needs 30 second read." },
    { id: "b-3", episodeId: "ep-h-2", slot: "mid", sponsor: "ClinicBase", category: "Healthcare SaaS", status: "Brief received", value: 2100, owner: "Ari", dueDate: "2026-08-06", notes: "Mention HIPAA positioning carefully." },
    { id: "b-4", episodeId: "ep-m-2", slot: "post", sponsor: "LedgerOak", category: "Finance", status: "Booked", value: 1500, owner: "Maya", dueDate: "2026-08-08", notes: "Bundle 1 of 4." },
    { id: "b-5", episodeId: "ep-f-3", slot: "mid", sponsor: "Northstar CRM", category: "SaaS", status: "Held", value: 2400, owner: "Maya", dueDate: "2026-08-12", notes: "Pending signed IO." },
    { id: "b-6", episodeId: "ep-d-3", slot: "mid", sponsor: "BugCatcher", category: "DevTools", status: "Delivered", value: 2600, owner: "Jon", dueDate: "2026-08-17", notes: "Report due after publish." },
    { id: "b-7", episodeId: "ep-m-4", slot: "pre", sponsor: "LedgerOak", category: "Finance", status: "Invoiced", value: 1500, owner: "Maya", dueDate: "2026-08-28", notes: "Invoice sent." }
  ]
};

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function niceDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function bookingFor(bookings: Booking[], episodeId: string, slot: SlotType): Booking | undefined {
  return bookings.find((booking) => booking.episodeId === episodeId && booking.slot === slot);
}

function statusClass(status: BookingStatus): "green" | "blue" | "amber" | "red" | "gray" {
  if (status === "Paid" || status === "Delivered" || status === "Recorded") return "green";
  if (status === "Script approved" || status === "Brief received") return "blue";
  if (status === "Held" || status === "Booked") return "amber";
  if (status === "Invoiced") return "gray";
  return "gray";
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function loadState(): AppState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AppState : initialState;
  } catch {
    return initialState;
  }
}

export default function SpotGridApp() {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("inventory");
  const [selectedShowId, setSelectedShowId] = useState("all");
  const [bookingDraft, setBookingDraft] = useState<Booking | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleShows = selectedShowId === "all" ? state.shows : state.shows.filter((show) => show.id === selectedShowId);
  const visibleEpisodeColumns = useMemo(() => {
    const dates = Array.from(new Set(state.episodes.map((episode) => episode.publishDate))).sort();
    return dates.slice(0, 5);
  }, [state.episodes]);

  const metrics = useMemo(() => {
    const booked = state.bookings.filter((booking) => booking.status !== "Held");
    const openSlots = state.shows.length * visibleEpisodeColumns.length * 3 - state.bookings.length;
    const revenue = booked.reduce((sum, booking) => sum + booking.value, 0);
    const blocked = countConflicts(state);
    return { openSlots, booked: booked.length, revenue, blocked };
  }, [state, visibleEpisodeColumns.length]);

  function openSlot(episodeId: string, slot: SlotType) {
    const existing = bookingFor(state.bookings, episodeId, slot);
    setBookingDraft(existing ?? {
      id: `b-${Date.now()}`,
      episodeId,
      slot,
      sponsor: "",
      category: "",
      status: "Held",
      value: 0,
      owner: "",
      dueDate: "",
      notes: ""
    });
  }

  function saveBooking(booking: Booking) {
    if (!booking.sponsor.trim() || !booking.category.trim()) {
      setToast("Sponsor and category are required.");
      return;
    }
    setState((current) => {
      const exists = current.bookings.some((item) => item.id === booking.id);
      return {
        ...current,
        bookings: exists
          ? current.bookings.map((item) => item.id === booking.id ? booking : item)
          : [...current.bookings, booking]
      };
    });
    setBookingDraft(null);
    setToast("Booking saved.");
  }

  function deleteBooking(id: string) {
    setState((current) => ({ ...current, bookings: current.bookings.filter((booking) => booking.id !== id) }));
    setBookingDraft(null);
    setToast("Slot cleared.");
  }

  function exportCsv() {
    const header = ["show", "episode", "publish_date", "slot", "sponsor", "category", "status", "value", "owner", "due_date", "notes"];
    const rows = state.bookings.map((booking) => {
      const episode = state.episodes.find((item) => item.id === booking.episodeId);
      const show = state.shows.find((item) => item.id === episode?.showId);
      return [show?.name, episode?.title, episode?.publishDate, slotLabels[booking.slot], booking.sponsor, booking.category, booking.status, booking.value, booking.owner, booking.dueDate, booking.notes];
    });
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "spotgrid-bookings.csv";
    link.click();
    URL.revokeObjectURL(url);
    setToast("CSV exported.");
  }

  async function importCsv(file: File | null) {
    if (!file) return;
    const rows = parseCsv(await file.text());
    const body = rows.slice(1);
    const bookings = body.map((row, index) => {
      const [showName, episodeTitle, publishDate, slotLabel, sponsor, category, status, value, owner, dueDate, notes] = row;
      const show = state.shows.find((item) => item.name === showName);
      const episode = state.episodes.find((item) => item.showId === show?.id && item.title === episodeTitle && item.publishDate === publishDate);
      const slot = (Object.entries(slotLabels).find(([, label]) => label === slotLabel)?.[0] ?? "mid") as SlotType;
      if (!episode || !sponsor || !category) return null;
      return {
        id: `csv-${Date.now()}-${index}`,
        episodeId: episode.id,
        slot,
        sponsor,
        category,
        status: statuses.includes(status as BookingStatus) ? status as BookingStatus : "Held",
        value: Number(value) || 0,
        owner,
        dueDate,
        notes
      };
    }).filter((booking): booking is Booking => Boolean(booking));

    if (!bookings.length) {
      setToast("No matching bookings found in CSV.");
      return;
    }

    setState((current) => ({ ...current, bookings }));
    setToast(`${bookings.length} bookings imported.`);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">SG</div>
          <div>
            <h1>SpotGrid</h1>
            <span>Host-read ad inventory for podcast networks</span>
          </div>
        </div>
        <div className="topbar-actions">
          <label className="button file-button">
            Import CSV
            <input type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(event.target.files?.[0] ?? null)} />
          </label>
          <button className="button" type="button" onClick={exportCsv}>Export CSV</button>
          <button className="button primary" type="button" onClick={() => setView("inventory")}>Book slot</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="metric-stack">
            <Metric label="Open" value={metrics.openSlots} />
            <Metric label="Booked" value={metrics.booked} />
            <Metric label="Pipeline" value={currency(metrics.revenue)} />
            <Metric label="Conflicts" value={metrics.blocked} />
          </div>
          <nav className="nav-list" aria-label="Views">
            <NavButton label="Inventory" active={view === "inventory"} onClick={() => setView("inventory")} />
            <NavButton label="Pipeline" active={view === "pipeline"} onClick={() => setView("pipeline")} />
            <NavButton label="Sponsors" active={view === "sponsors"} onClick={() => setView("sponsors")} />
            <NavButton label="Report" active={view === "report"} onClick={() => setView("report")} />
          </nav>
          <section className="sidebar-section">
            <h2>Needs attention</h2>
            <div className="mini-list">
              {attentionItems(state).map((item) => (
                <div className="mini-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="main">
          {view === "inventory" && (
            <InventoryView
              state={state}
              shows={visibleShows}
              dates={visibleEpisodeColumns}
              selectedShowId={selectedShowId}
              setSelectedShowId={setSelectedShowId}
              openSlot={openSlot}
            />
          )}
          {view === "pipeline" && <PipelineView state={state} setBookingDraft={setBookingDraft} />}
          {view === "sponsors" && <SponsorsView state={state} />}
          {view === "report" && <ReportView state={state} />}
        </section>
      </div>

      {bookingDraft && (
        <BookingModal
          booking={bookingDraft}
          state={state}
          onChange={setBookingDraft}
          onClose={() => setBookingDraft(null)}
          onSave={saveBooking}
          onDelete={deleteBooking}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={`tab-button ${active ? "active" : ""}`} type="button" onClick={onClick}>{label}</button>;
}

function InventoryView({ state, shows, dates, selectedShowId, setSelectedShowId, openSlot }: {
  state: AppState;
  shows: Show[];
  dates: string[];
  selectedShowId: string;
  setSelectedShowId: (value: string) => void;
  openSlot: (episodeId: string, slot: SlotType) => void;
}) {
  return (
    <>
      <div className="view-head">
        <div>
          <h2>Inventory grid</h2>
          <p>Reserve host-read availability across shows, episodes, and pre/mid/post-roll slots.</p>
        </div>
        <div className="head-actions">
          <span className="badge green">No hosting change</span>
          <span className="badge gray">Baked-in friendly</span>
        </div>
      </div>
      <div className="filters">
        <label>
          Show
          <select value={selectedShowId} onChange={(event) => setSelectedShowId(event.target.value)}>
            <option value="all">All shows</option>
            {state.shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}
          </select>
        </label>
      </div>
      <div className="inventory-wrap">
        <div className="inventory-grid">
          <div className="grid-cell header show-cell">Show</div>
          {dates.map((date) => <div className="grid-cell header" key={date}><span className="episode-date">{niceDate(date)}</span>Upcoming episode</div>)}
          {shows.map((show) => (
            <ShowRow key={show.id} show={show} state={state} dates={dates} openSlot={openSlot} />
          ))}
        </div>
      </div>
    </>
  );
}

function ShowRow({ show, state, dates, openSlot }: { show: Show; state: AppState; dates: string[]; openSlot: (episodeId: string, slot: SlotType) => void }) {
  return (
    <>
      <div className="grid-cell show-cell">
        <strong>{show.name}</strong>
        <span>{show.audience}</span>
        <span>{show.cadence}</span>
      </div>
      {dates.map((date) => {
        const episode = state.episodes.find((item) => item.showId === show.id && item.publishDate === date);
        return (
          <div className="grid-cell" key={`${show.id}-${date}`}>
            {episode ? (
              <>
                <div className="show-cell" style={{ position: "static", padding: 0, marginBottom: 8 }}>
                  <strong>{episode.title}</strong>
                </div>
                <div className="slot-stack">
                  {(["pre", "mid", "post"] as SlotType[]).map((slot) => {
                    const booking = bookingFor(state.bookings, episode.id, slot);
                    const conflict = booking ? hasConflict(state, booking) : false;
                    return (
                      <button
                        key={slot}
                        className={`slot ${booking ? booking.status === "Held" ? "held" : "booked" : "open"} ${conflict ? "conflict" : ""}`}
                        type="button"
                        onClick={() => openSlot(episode.id, slot)}
                      >
                        <small>{slotLabels[slot]}</small>
                        <strong>{booking ? booking.sponsor : "Open"}</strong>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : <span>No episode</span>}
          </div>
        );
      })}
    </>
  );
}

function PipelineView({ state, setBookingDraft }: { state: AppState; setBookingDraft: (booking: Booking) => void }) {
  return (
    <>
      <div className="view-head">
        <div>
          <h2>Production pipeline</h2>
          <p>Track every sold read from brief to invoice without needing a full ad server.</p>
        </div>
      </div>
      <div className="board">
        {statuses.slice(0, 5).map((status) => (
          <section className="lane" key={status}>
            <h3>{status}</h3>
            {state.bookings.filter((booking) => booking.status === status).map((booking) => (
              <DealCard key={booking.id} state={state} booking={booking} onClick={() => setBookingDraft(booking)} />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

function DealCard({ state, booking, onClick }: { state: AppState; booking: Booking; onClick: () => void }) {
  const episode = state.episodes.find((item) => item.id === booking.episodeId);
  const show = state.shows.find((item) => item.id === episode?.showId);
  return (
    <button className="deal-card" type="button" onClick={onClick}>
      <span className={`badge ${statusClass(booking.status)}`}>{booking.status}</span>
      <strong>{booking.sponsor}</strong>
      <p>{show?.name} - {episode ? niceDate(episode.publishDate) : ""} - {slotLabels[booking.slot]}</p>
      <p>{currency(booking.value)} - {booking.owner || "Unassigned"}</p>
    </button>
  );
}

function SponsorsView({ state }: { state: AppState }) {
  const sponsors = Array.from(new Set(state.bookings.map((booking) => booking.sponsor))).filter(Boolean);
  return (
    <>
      <div className="view-head">
        <div>
          <h2>Sponsor commitments</h2>
          <p>Category exclusivity, upcoming reads, and commercial status in one table.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Sponsor</th><th>Category</th><th>Reads</th><th>Value</th><th>Risk</th></tr></thead>
          <tbody>
            {sponsors.map((sponsor) => {
              const bookings = state.bookings.filter((booking) => booking.sponsor === sponsor);
              const risk = bookings.some((booking) => hasConflict(state, booking));
              return (
                <tr key={sponsor}>
                  <td><strong>{sponsor}</strong></td>
                  <td>{bookings[0]?.category}</td>
                  <td>{bookings.length}</td>
                  <td>{currency(bookings.reduce((sum, booking) => sum + booking.value, 0))}</td>
                  <td><span className={`badge ${risk ? "red" : "green"}`}>{risk ? "Conflict" : "Clear"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReportView({ state }: { state: AppState }) {
  const sponsor = state.bookings[0]?.sponsor ?? "";
  const bookings = state.bookings.filter((booking) => booking.sponsor === sponsor);
  return (
    <>
      <div className="view-head">
        <div>
          <h2>Advertiser report</h2>
          <p>A simple delivery summary that can be shared after spots are recorded or published.</p>
        </div>
      </div>
      <section className="report">
        <div className="report-head">
          <div>
            <h3>{sponsor || "Sponsor"} delivery summary</h3>
            <p>{bookings.length} booked reads across {new Set(bookings.map((booking) => state.episodes.find((episode) => episode.id === booking.episodeId)?.showId)).size} shows.</p>
          </div>
          <span className="badge blue">Draft report</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Show</th><th>Episode</th><th>Date</th><th>Placement</th><th>Status</th></tr></thead>
            <tbody>
              {bookings.map((booking) => {
                const episode = state.episodes.find((item) => item.id === booking.episodeId);
                const show = state.shows.find((item) => item.id === episode?.showId);
                return <tr key={booking.id}><td>{show?.name}</td><td>{episode?.title}</td><td>{episode ? niceDate(episode.publishDate) : ""}</td><td>{slotLabels[booking.slot]}</td><td>{booking.status}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BookingModal({ booking, state, onChange, onClose, onSave, onDelete }: {
  booking: Booking;
  state: AppState;
  onChange: (booking: Booking) => void;
  onClose: () => void;
  onSave: (booking: Booking) => void;
  onDelete: (id: string) => void;
}) {
  const episode = state.episodes.find((item) => item.id === booking.episodeId);
  const show = state.shows.find((item) => item.id === episode?.showId);
  const conflict = booking.sponsor && booking.category ? findConflict(state, booking) : null;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <div className="modal-head">
          <div>
            <h2 id="booking-title">{slotLabels[booking.slot]} booking</h2>
            <p>{show?.name} - {episode?.title} - {episode ? niceDate(episode.publishDate) : ""}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="form-grid">
          {conflict && <div className="warning">{conflict}</div>}
          <div className="field-row">
            <label>Sponsor<input value={booking.sponsor} onChange={(event) => onChange({ ...booking, sponsor: event.target.value })} /></label>
            <label>Category<input value={booking.category} onChange={(event) => onChange({ ...booking, category: event.target.value })} placeholder="SaaS, Finance, Health" /></label>
          </div>
          <div className="field-row">
            <label>Status<select value={booking.status} onChange={(event) => onChange({ ...booking, status: event.target.value as BookingStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>Value<input type="number" min="0" value={booking.value || ""} onChange={(event) => onChange({ ...booking, value: Number(event.target.value) })} /></label>
          </div>
          <div className="field-row">
            <label>Owner<input value={booking.owner} onChange={(event) => onChange({ ...booking, owner: event.target.value })} /></label>
            <label>Due date<input type="date" value={booking.dueDate} onChange={(event) => onChange({ ...booking, dueDate: event.target.value })} /></label>
          </div>
          <label>Notes<textarea value={booking.notes} onChange={(event) => onChange({ ...booking, notes: event.target.value })} /></label>
          <div className="modal-actions">
            {state.bookings.some((item) => item.id === booking.id) && <button className="button danger" type="button" onClick={() => onDelete(booking.id)}>Clear slot</button>}
            <button className="button" type="button" onClick={onClose}>Cancel</button>
            <button className="button primary" type="button" onClick={() => onSave(booking)}>Save booking</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function findConflict(state: AppState, booking: Booking): string | null {
  const episode = state.episodes.find((item) => item.id === booking.episodeId);
  if (!episode) return null;
  const matches = state.bookings.filter((item) => {
    if (item.id === booking.id || item.category.toLowerCase() !== booking.category.toLowerCase()) return false;
    const otherEpisode = state.episodes.find((candidate) => candidate.id === item.episodeId);
    if (!otherEpisode || otherEpisode.showId !== episode.showId) return false;
    const days = Math.abs((new Date(otherEpisode.publishDate).getTime() - new Date(episode.publishDate).getTime()) / 86400000);
    return days <= 14;
  });
  if (!matches.length) return null;
  return `Category conflict: ${matches[0].sponsor} already has a ${booking.category} read near this episode on the same show.`;
}

function hasConflict(state: AppState, booking: Booking): boolean {
  return Boolean(findConflict(state, booking));
}

export function countConflicts(state: AppState): number {
  return state.bookings.filter((booking) => hasConflict(state, booking)).length;
}

function attentionItems(state: AppState): { title: string; detail: string }[] {
  const conflicts = state.bookings.filter((booking) => hasConflict(state, booking));
  const due = state.bookings.filter((booking) => booking.dueDate && booking.status !== "Paid").slice(0, 2);
  return [
    ...conflicts.slice(0, 2).map((booking) => ({ title: "Category conflict", detail: `${booking.sponsor} - ${booking.category}` })),
    ...due.map((booking) => ({ title: `${booking.status} due`, detail: `${booking.sponsor} by ${niceDate(booking.dueDate)}` }))
  ].slice(0, 4);
}
