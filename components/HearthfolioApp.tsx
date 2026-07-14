"use client";

import { track } from "@vercel/analytics";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState
} from "react";
import {
  FREE_ENTRY_LIMIT,
  STORAGE_KEY,
  activeSubjects,
  activeYear,
  activitiesCsv,
  addActivity,
  createBackup,
  createHousehold,
  formatLocalDate,
  learningDayDates,
  makeId,
  minutesBySubject,
  minutesForLearner,
  parseBackup,
  parseState,
  removeActivity,
  startNextSchoolYear,
  todayLocal
} from "@/lib/hearthfolio/engine";
import {
  LICENSE_STORAGE_KEY,
  activateLicense,
  checkoutUrl,
  deactivateLicense,
  licenseSalesConfigured,
  parseEntitlement,
  validateLicense
} from "@/lib/hearthfolio/license";
import type {
  ActivityKind,
  HearthfolioState,
  Id,
  LearningActivity,
  LicenseEntitlement,
  LocalDate
} from "@/lib/hearthfolio/types";

type AppTab = "today" | "journal" | "reports" | "settings";

const KIND_LABELS: Record<ActivityKind, string> = {
  lesson: "Lesson",
  reading: "Reading",
  project: "Project",
  "field-trip": "Field trip",
  "life-skill": "Life skill"
};

const KIND_OPTIONS = Object.entries(KIND_LABELS) as Array<[ActivityKind, string]>;

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function hoursLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function monthRange(start: LocalDate, end: LocalDate): Array<{ year: number; month: number }> {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const result: Array<{ year: number; month: number }> = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push({ year, month });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand brand--compact" : "brand"}>
      <span className="brand-mark" aria-hidden="true"><i /></span>
      <span>Yearkeep</span>
    </span>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  const scrollToSample = () => {
    document.getElementById("sample-report")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="landing">
      <header className="landing-nav">
        <Brand />
        <button className="text-button" onClick={onStart}>Open your log</button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Private homeschool records</p>
          <h1>Keep the year.<br />Lose the paperwork.</h1>
          <p className="hero-lede">
            Log learning in about 20 seconds. Yearkeep turns ordinary days
            into a clear learning record and a warm end-of-year portfolio.
          </p>
          <div className="hero-actions">
            <button className="primary-button primary-button--large" onClick={onStart}>
              Start a private log
            </button>
            <button className="secondary-button secondary-button--large" onClick={scrollToSample}>
              See a sample report
            </button>
          </div>
          <div className="trust-row" aria-label="Product benefits">
            <span><i>✓</i> No account</span>
            <span><i>✓</i> Notes stay in this browser</span>
            <span><i>✓</i> Free backup</span>
          </div>
        </div>

        <div className="hero-product" aria-label="Yearkeep product preview">
          <div className="preview-window">
            <div className="preview-topbar">
              <Brand compact />
              <span className="preview-avatar">M</span>
            </div>
            <div className="preview-greeting">
              <span>Monday, September 14</span>
              <strong>What was worth keeping today?</strong>
            </div>
            <div className="quick-entry-card">
              <span className="quick-label">LEARNING NOTE</span>
              <p>Built a pulley and tested different loads</p>
              <div className="preview-chips">
                <span>Science</span><span>Project</span><span>45 min</span>
              </div>
              <button tabIndex={-1}>Save to Maya’s journal <b>→</b></button>
            </div>
            <div className="preview-progress">
              <div><span>Learning days</span><strong>38</strong><small>of 180</small></div>
              <div><span>Time logged</span><strong>74h</strong><small>this year</small></div>
              <div><span>Subjects</span><strong>8</strong><small>represented</small></div>
            </div>
          </div>
          <span className="preview-note preview-note--one">The day, remembered.</span>
          <span className="preview-note preview-note--two">No spreadsheet required.</span>
        </div>
      </section>

      <section className="proof-strip">
        <p>For families who already know <em>how</em> they teach—and just need a clean record of what happened.</p>
      </section>

      <section className="value-section">
        <div className="section-heading">
          <p className="eyebrow">Small on purpose</p>
          <h2>A record keeper, not another curriculum.</h2>
          <p>Yearkeep stays out of the school day and quietly does the paperwork afterward.</p>
        </div>
        <div className="value-grid">
          <article>
            <span className="value-number">01</span>
            <h3>Capture the real day</h3>
            <p>One sentence, one subject, an optional duration. Field trips and life skills count too.</p>
          </article>
          <article>
            <span className="value-number">02</span>
            <h3>Know where the year stands</h3>
            <p>See learning days, time logged, and subject coverage without rebuilding a spreadsheet.</p>
          </article>
          <article>
            <span className="value-number">03</span>
            <h3>Turn notes into a record</h3>
            <p>Preview a polished learning calendar and portfolio all year, then print when it matters.</p>
          </article>
        </div>
      </section>

      <section className="sample-section" id="sample-report">
        <div className="sample-copy">
          <p className="eyebrow">A year that reads like yours</p>
          <h2>You already did the teaching. The record should be the easy part.</h2>
          <p>
            Your entries become a learning-day calendar, subject summary, and chronological journal.
            No generated grades. No claims about mastery. Just a useful record of the work.
          </p>
          <button className="primary-button" onClick={onStart}>Start with one learner</button>
        </div>
        <div className="sample-paper" aria-label="Sample learning report">
          <div className="paper-brand"><span>Y</span> YEARKEEP</div>
          <p className="paper-kicker">2026–2027 LEARNING RECORD</p>
          <h3>Maya’s year<br />at a glance</h3>
          <p className="paper-summary">Maya logged learning across eight subject areas. Science and Language Arts appeared most often, with hands-on projects woven throughout the year.</p>
          <div className="paper-stats">
            <div><strong>142</strong><span>learning days</span></div>
            <div><strong>318h</strong><span>time logged</span></div>
            <div><strong>412</strong><span>journal entries</span></div>
          </div>
          <div className="paper-rule" />
          <div className="paper-subjects">
            <span>Science <i style={{ width: "88%" }} /></span>
            <span>Language Arts <i style={{ width: "75%" }} /></span>
            <span>Math <i style={{ width: "62%" }} /></span>
            <span>Life Skills <i style={{ width: "45%" }} /></span>
          </div>
          <small>Sample data · Yearkeep organizes records; it does not determine legal compliance.</small>
        </div>
      </section>

      <section className="pricing-section">
        <div>
          <p className="eyebrow">A fair little product</p>
          <h2>Free to begin.<br />$12 for the whole year.</h2>
          <p>No ads. No monthly billing. No child account. Your existing records stay readable if you stop paying.</p>
        </div>
        <div className="pricing-card">
          <p>YEARKEEP PRO</p>
          <div className="price"><strong>$12</strong><span>per household<br />billed yearly</span></div>
          <ul>
            <li>Unlimited journal entries</li>
            <li>Up to six learners</li>
            <li>Print or save polished reports</li>
            <li>Keep and revisit each school year</li>
          </ul>
          <button className="primary-button primary-button--full" onClick={onStart}>Start free first</button>
          <small>Free includes one learner, 30 entries, report preview, and backups.</small>
        </div>
      </section>

      <footer className="landing-footer">
        <Brand />
        <p>Quiet records for real learning.</p>
        <nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
      </footer>
    </main>
  );
}

function Onboarding({ onClose, onComplete }: {
  onClose: () => void;
  onComplete: (state: HearthfolioState) => void;
}) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onComplete(createHousehold(name, grade));
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        <Brand />
        <p className="step-label">A 30-second setup</p>
        <h2 id="setup-title">Who are you keeping records for?</h2>
        <p>Use a first name, initials, or a nickname. Yearkeep does not need identifying details.</p>
        <form onSubmit={submit}>
          <label>
            <span>First name or nickname</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Maya" maxLength={40} />
          </label>
          <label>
            <span>Grade or age band <em>optional</em></span>
            <input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="Grade 4" maxLength={40} />
          </label>
          <div className="setup-note"><i>✓</i><span><strong>Your learning notes stay in this browser.</strong> You can download a backup whenever you like.</span></div>
          <button className="primary-button primary-button--full" disabled={!name.trim()}>Create the private log</button>
        </form>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail, progress }: {
  label: string;
  value: string;
  detail: string;
  progress?: number;
}) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {typeof progress === "number" && <i><b style={{ width: `${Math.min(progress, 100)}%` }} /></i>}
    </article>
  );
}

function EntryCard({ activity, state, learnerId, onDelete }: {
  activity: LearningActivity;
  state: HearthfolioState;
  learnerId: Id;
  onDelete: (id: Id) => void;
}) {
  const subject = state.subjects.find((item) => item.id === activity.subjectId);
  const minutes = activity.credits.find((credit) => credit.learnerId === learnerId)?.minutes;
  return (
    <article className="entry-card">
      <i className="subject-pin" style={{ background: subject?.color ?? "#777" }} />
      <div className="entry-main">
        <div className="entry-meta">
          <span>{subject?.name ?? "Archived subject"}</span>
          <span>{KIND_LABELS[activity.kind]}</span>
          {minutes ? <span>{minutes} min</span> : null}
        </div>
        <h3>{activity.title}</h3>
        {activity.notes && <p>{activity.notes}</p>}
      </div>
      <button className="entry-delete" onClick={() => onDelete(activity.id)} aria-label={`Delete ${activity.title}`}>×</button>
    </article>
  );
}

function TodayView({ state, learnerId, onLog, onDelete, onTab }: {
  state: HearthfolioState;
  learnerId: Id;
  onLog: () => void;
  onDelete: (id: Id) => void;
  onTab: (tab: AppTab) => void;
}) {
  const year = activeYear(state);
  const scope = { schoolYearId: year.id };
  const days = learningDayDates(state, learnerId, scope);
  const minutes = minutesForLearner(state, learnerId, scope);
  const learner = state.learners.find((item) => item.id === learnerId) ?? state.learners[0];
  const activities = state.activities.filter((activity) => activity.schoolYearId === year.id && activity.credits.some((credit) => credit.learnerId === learnerId));
  const today = todayLocal();
  const todaysEntries = activities.filter((activity) => activity.date === today);
  const recent = activities.filter((activity) => activity.date !== today).slice(0, 4);
  const subjects = new Set(activities.map((activity) => activity.subjectId)).size;
  const target = year.targetDays || 180;

  return (
    <div className="view-stack">
      <header className="view-heading view-heading--today">
        <div>
          <p>{formatLocalDate(today, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1>{todaysEntries.length ? `${learner.name}’s day, so far.` : "What was worth keeping today?"}</h1>
        </div>
        <button className="primary-button desktop-action" onClick={onLog}>+ Log learning</button>
      </header>

      <section className="stats-grid">
        <StatCard label="Learning days" value={String(days.length)} detail={`of ${target} day target`} progress={(days.length / target) * 100} />
        <StatCard label="Time logged" value={hoursLabel(minutes)} detail="recorded, not estimated" />
        <StatCard label="Subjects" value={String(subjects)} detail="represented this year" />
      </section>

      {todaysEntries.length === 0 ? (
        <section className="empty-today">
          <div className="empty-lines" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow">Today’s journal is open</p>
          <h2>Ready when the day gives you something worth keeping.</h2>
          <p>Most days, one sentence is enough.</p>
          <button className="primary-button" onClick={onLog}>Log today’s learning</button>
        </section>
      ) : (
        <section className="content-section">
          <div className="content-heading"><div><p className="eyebrow">Today</p><h2>{todaysEntries.length} {todaysEntries.length === 1 ? "entry" : "entries"}</h2></div></div>
          <div className="entry-list">
            {todaysEntries.map((activity) => <EntryCard key={activity.id} activity={activity} state={state} learnerId={learnerId} onDelete={onDelete} />)}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="content-section">
          <div className="content-heading"><div><p className="eyebrow">From the journal</p><h2>Recently kept</h2></div><button className="text-button" onClick={() => onTab("journal")}>View all →</button></div>
          <div className="dated-list">
            {recent.map((activity) => (
              <div key={activity.id}>
                <time>{formatLocalDate(activity.date, { month: "short", day: "numeric" })}</time>
                <EntryCard activity={activity} state={state} learnerId={learnerId} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function JournalView({ state, learnerId, onDelete }: {
  state: HearthfolioState;
  learnerId: Id;
  onDelete: (id: Id) => void;
}) {
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState("all");
  const year = activeYear(state);
  const items = state.activities.filter((activity) => {
    if (activity.schoolYearId !== year.id) return false;
    if (!activity.credits.some((credit) => credit.learnerId === learnerId)) return false;
    if (subjectId !== "all" && activity.subjectId !== subjectId) return false;
    const haystack = `${activity.title} ${activity.notes}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const groups = items.reduce<Record<string, LearningActivity[]>>((result, activity) => {
    (result[activity.date] ??= []).push(activity);
    return result;
  }, {});

  return (
    <div className="view-stack">
      <header className="view-heading">
        <div><p>Your private record</p><h1>Journal</h1></div>
      </header>
      <div className="filter-bar">
        <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the journal" aria-label="Search the journal" /></label>
        <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} aria-label="Filter by subject">
          <option value="all">All subjects</option>
          {activeSubjects(state).map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}
        </select>
      </div>
      {items.length === 0 ? (
        <section className="simple-empty"><h2>{state.activities.length ? "No entries match those filters." : "The first page is yours."}</h2><p>{state.activities.length ? "Try a different word or subject." : "Use the + button to keep the first learning note."}</p></section>
      ) : (
        <div className="journal-groups">
          {Object.entries(groups).map(([date, activities]) => (
            <section key={date}>
              <div className="journal-date"><strong>{formatLocalDate(date, { weekday: "long", month: "long", day: "numeric" })}</strong><span>{activities.reduce((sum, activity) => sum + (activity.credits.find((credit) => credit.learnerId === learnerId)?.minutes ?? 0), 0)} min logged</span></div>
              <div className="entry-list">{activities.map((activity) => <EntryCard key={activity.id} activity={activity} state={state} learnerId={learnerId} onDelete={onDelete} />)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AttendanceCalendar({ start, end, activeDates }: {
  start: LocalDate;
  end: LocalDate;
  activeDates: Set<LocalDate>;
}) {
  return (
    <div className="calendar-grid">
      {monthRange(start, end).map(({ year, month }) => {
        const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
        const firstDay = new Date(year, month - 1, 1).getDay();
        const days = new Date(year, month, 0).getDate();
        return (
          <div className="mini-month" key={`${year}-${month}`}>
            <strong>{label}</strong>
            <div className="mini-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
            <div className="mini-days">
              {Array.from({ length: firstDay }, (_, index) => <i key={`blank-${index}`} />)}
              {Array.from({ length: days }, (_, index) => {
                const day = index + 1;
                const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as LocalDate;
                const inYear = date >= start && date <= end;
                return <i key={date} className={`${activeDates.has(date) ? "is-active" : ""} ${inYear ? "" : "is-outside"}`} title={date}>{day}</i>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportView({ state, learnerId, isPro, onUpgrade }: {
  state: HearthfolioState;
  learnerId: Id;
  isPro: boolean;
  onUpgrade: () => void;
}) {
  const year = activeYear(state);
  const learner = state.learners.find((item) => item.id === learnerId) ?? state.learners[0];
  const scope = { schoolYearId: year.id };
  const dates = learningDayDates(state, learnerId, scope);
  const totalMinutes = minutesForLearner(state, learnerId, scope);
  const subjectTotals = minutesBySubject(state, learnerId, scope);
  const activities = state.activities.filter((activity) => activity.schoolYearId === year.id && activity.credits.some((credit) => credit.learnerId === learnerId));
  const topSubject = state.subjects.find((subject) => subject.id === subjectTotals[0]?.subjectId)?.name;
  const secondSubject = state.subjects.find((subject) => subject.id === subjectTotals[1]?.subjectId)?.name;
  const maxMinutes = Math.max(...subjectTotals.map((item) => item.minutes), 1);
  const print = () => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    track("Report printed");
    window.print();
  };

  return (
    <div className="view-stack report-view">
      <header className="view-heading">
        <div><p>Built from the journal</p><h1>Learning record</h1></div>
        <button className="primary-button desktop-action" onClick={print}>{isPro ? "Print / save PDF" : "Unlock print — $12/year"}</button>
      </header>
      <div className="report-note"><span>Live preview</span><p>This report updates as you log. Yearkeep describes your records; it does not assess mastery or determine legal compliance.</p></div>
      <article className="report-paper">
        <header className="report-cover">
          <div className="report-brand"><span>Y</span> YEARKEEP</div>
          <p>{year.label} · LEARNING RECORD</p>
          <h2>{learner.name}’s learning year</h2>
          {learner.gradeLabel && <h3>{learner.gradeLabel}</h3>}
          <div className="report-overview">
            <div><strong>{dates.length}</strong><span>learning days</span></div>
            <div><strong>{hoursLabel(totalMinutes)}</strong><span>time logged</span></div>
            <div><strong>{activities.length}</strong><span>journal entries</span></div>
          </div>
          <p className="report-narrative">
            {activities.length
              ? `${learner.name} logged learning across ${subjectTotals.length} subject ${subjectTotals.length === 1 ? "area" : "areas"}.${topSubject ? ` ${topSubject}${secondSubject ? ` and ${secondSubject}` : ""} appeared most often in the record.` : ""}`
              : `This record is ready for ${learner.name}’s first learning note.`}
          </p>
        </header>

        <section className="report-section">
          <div className="report-section-heading"><span>01</span><div><p>LEARNING DAYS</p><h3>Year at a glance</h3></div></div>
          <AttendanceCalendar start={year.startDate} end={year.endDate} activeDates={new Set(dates)} />
          <p className="report-caption">A filled date means it was explicitly counted as a learning day in Yearkeep.</p>
        </section>

        <section className="report-section">
          <div className="report-section-heading"><span>02</span><div><p>SUBJECT SUMMARY</p><h3>Where time was recorded</h3></div></div>
          {subjectTotals.length ? (
            <div className="subject-bars">
              {subjectTotals.map((item) => {
                const subject = state.subjects.find((entry) => entry.id === item.subjectId);
                return <div key={item.subjectId}><div><strong>{subject?.name ?? "Archived subject"}</strong><span>{hoursLabel(item.minutes)} · {item.entries} {item.entries === 1 ? "entry" : "entries"}</span></div><i><b style={{ width: `${(item.minutes / maxMinutes) * 100}%`, background: subject?.color }} /></i></div>;
              })}
            </div>
          ) : <p className="report-placeholder">Subject totals will appear after the first entry.</p>}
        </section>

        <section className="report-section report-journal">
          <div className="report-section-heading"><span>03</span><div><p>JOURNAL</p><h3>Learning, in your own words</h3></div></div>
          {activities.map((activity) => {
            const subject = state.subjects.find((item) => item.id === activity.subjectId);
            return <div className="report-entry" key={activity.id}><time>{formatLocalDate(activity.date, { month: "short", day: "numeric" })}</time><div><strong>{activity.title}</strong><span>{subject?.name} · {KIND_LABELS[activity.kind]}</span>{activity.notes && <p>{activity.notes}</p>}</div></div>;
          })}
          {!activities.length && <p className="report-placeholder">Journal entries will collect here throughout the year.</p>}
        </section>
        <footer className="report-footer">Generated from records kept in Yearkeep · Private homeschool records</footer>
      </article>
      <div className="mobile-report-action"><button className="primary-button primary-button--full" onClick={print}>{isPro ? "Print / save PDF" : "Unlock reports — $12/year"}</button></div>
    </div>
  );
}

function SettingsView({ state, setState, isPro, entitlement, onUpgrade, onDeactivate, onRestore }: {
  state: HearthfolioState;
  setState: (state: HearthfolioState) => void;
  isPro: boolean;
  entitlement: LicenseEntitlement | null;
  onUpgrade: () => void;
  onDeactivate: () => void;
  onRestore: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const year = activeYear(state);
  const [newLearner, setNewLearner] = useState("");

  const updateYear = (field: "label" | "startDate" | "endDate" | "targetDays", value: string) => {
    setState({
      ...state,
      schoolYears: state.schoolYears.map((item) => item.id === year.id ? { ...item, [field]: field === "targetDays" ? Math.max(1, Number(value) || 1) : value, updatedAt: new Date().toISOString() } : item),
      updatedAt: new Date().toISOString()
    });
  };

  const addLearner = () => {
    if (!newLearner.trim()) return;
    if (!isPro) {
      onUpgrade();
      return;
    }
    const now = new Date().toISOString();
    setState({
      ...state,
      learners: [...state.learners, { id: makeId("learner"), name: newLearner.trim(), gradeLabel: "", color: "#b56f49", createdAt: now, updatedAt: now }],
      updatedAt: now
    });
    setNewLearner("");
  };

  const newSchoolYear = () => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    if (!window.confirm("Start a new school year? Your current year will remain available in the archive.")) return;
    setState(startNextSchoolYear(state));
  };

  const backup = () => {
    downloadText(`yearkeep-backup-${todayLocal()}.json`, createBackup(state), "application/json");
    track("Backup downloaded");
  };
  const exportCsv = () => {
    downloadText(`yearkeep-journal-${todayLocal()}.csv`, activitiesCsv(state, { schoolYearId: year.id }), "text/csv;charset=utf-8");
    track("CSV exported");
  };

  return (
    <div className="view-stack settings-view">
      <header className="view-heading"><div><p>Your household</p><h1>Settings</h1></div></header>

      <section className="settings-card">
        <div className="settings-heading"><div><p className="eyebrow">Learners</p><h2>Who you keep records for</h2></div><span>{state.learners.length} of {isPro ? 6 : 1}</span></div>
        <div className="learner-list">{state.learners.map((learner) => <div key={learner.id}><span style={{ background: learner.color }}>{learner.name.slice(0, 1).toUpperCase()}</span><div><strong>{learner.name}</strong><small>{learner.gradeLabel || "No grade set"}</small></div></div>)}</div>
        <div className="inline-add"><input value={newLearner} onChange={(event) => setNewLearner(event.target.value)} placeholder="Add another learner" aria-label="New learner name" /><button onClick={addLearner}>{isPro ? "Add" : "Pro"}</button></div>
      </section>

      <section className="settings-card">
        <div className="settings-heading"><div><p className="eyebrow">School year</p><h2>Progress targets</h2></div>{state.schoolYears.length > 1 && <select className="year-select" aria-label="Choose school year" value={state.activeSchoolYearId} onChange={(event) => setState({ ...state, activeSchoolYearId: event.target.value })}>{state.schoolYears.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>}</div>
        <div className="form-grid">
          <label><span>Year label</span><input value={year.label} onChange={(event) => updateYear("label", event.target.value)} /></label>
          <label><span>Learning-day target</span><input type="number" min="1" max="366" value={year.targetDays} onChange={(event) => updateYear("targetDays", event.target.value)} /></label>
          <label><span>Starts</span><input type="date" value={year.startDate} onChange={(event) => updateYear("startDate", event.target.value)} /></label>
          <label><span>Ends</span><input type="date" value={year.endDate} onChange={(event) => updateYear("endDate", event.target.value)} /></label>
        </div>
        <p className="legal-helper">Set the target that fits your household. Yearkeep does not interpret state or local requirements.</p>
        <button className="secondary-button new-year-button" onClick={newSchoolYear}>{isPro ? "Start another school year" : "Yearly archives · Pro"}</button>
      </section>

      <section className="settings-card">
        <div className="settings-heading"><div><p className="eyebrow">Your records</p><h2>Backup and export</h2></div></div>
        <div className="action-list">
          <button onClick={backup}><span><strong>Download a full backup</strong><small>JSON · always free</small></span><b>↓</b></button>
          <button onClick={exportCsv}><span><strong>Export the journal</strong><small>CSV · always free</small></span><b>↓</b></button>
          <button onClick={() => fileRef.current?.click()}><span><strong>Restore from a backup</strong><small>Replaces the records in this browser</small></span><b>↑</b></button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onRestore} hidden />
        </div>
        <div className="privacy-warning"><strong>Keep a backup somewhere safe.</strong><p>Clearing browser data, losing this device, or switching browsers can erase local records. Yearkeep does not provide cloud sync.</p></div>
      </section>

      <section className="settings-card plan-card">
        <div className="settings-heading"><div><p className="eyebrow">Plan</p><h2>{isPro ? "Yearkeep Pro" : "Yearkeep Free"}</h2></div><span className={isPro ? "plan-pill plan-pill--pro" : "plan-pill"}>{isPro ? "Active" : `${state.activities.length}/${FREE_ENTRY_LIMIT} entries`}</span></div>
        {isPro ? (
          <><p>This browser is licensed for unlimited entries, up to six learners, school-year archives, and printable reports.</p><button className="secondary-button" onClick={onDeactivate}>Deactivate this browser</button></>
        ) : (
          <><p>Keep the record without rationing entries. One household, one simple annual price, no ads.</p><button className="primary-button" onClick={onUpgrade}>See Pro — $12/year</button></>
        )}
        {entitlement && <small>Last license check: {new Date(entitlement.lastValidatedAt).toLocaleDateString()}</small>}
      </section>

      <section className="settings-card privacy-card">
        <div className="settings-heading"><div><p className="eyebrow">Privacy, plainly</p><h2>Learning records stay local</h2></div></div>
        <p>Learner names, notes, subjects, and report contents are stored in this browser and are not uploaded to Yearkeep. We may collect anonymous page and feature usage. License checks send the key and a device label—not learning records.</p>
        <div><a href="/privacy">Read privacy details</a><a href="/terms">Terms of use</a></div>
      </section>
    </div>
  );
}

function LogSheet({ state, selectedLearnerId, onClose, onSave }: {
  state: HearthfolioState;
  selectedLearnerId: Id;
  onClose: () => void;
  onSave: (state: HearthfolioState) => void;
}) {
  const subjects = activeSubjects(state);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [kind, setKind] = useState<ActivityKind>("lesson");
  const [date, setDate] = useState<LocalDate>(todayLocal());
  const [minutes, setMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [countsAsDay, setCountsAsDay] = useState(true);
  const [learnerIds, setLearnerIds] = useState<Id[]>([selectedLearnerId]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const toggleLearner = (id: Id) => {
    setLearnerIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !subjectId || learnerIds.length === 0) return;
    onSave(addActivity(state, {
      date,
      subjectId,
      title,
      notes,
      kind,
      credits: learnerIds.map((learnerId) => ({ learnerId, minutes })),
      countsAsLearningDay: countsAsDay
    }));
  };

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="log-sheet" role="dialog" aria-modal="true" aria-labelledby="log-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <header><div><p className="eyebrow">Quick capture</p><h2 id="log-title">What did you learn or do?</h2></div><button className="close-button" onClick={onClose} aria-label="Close">×</button></header>
        <form onSubmit={submit}>
          <label className="main-note-field"><span>One sentence is enough</span><textarea autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Built a pulley and tested different loads" maxLength={180} rows={3} /></label>

          {state.learners.length > 1 && <fieldset className="learner-picks"><legend>Who was there?</legend>{state.learners.filter((learner) => !learner.archivedAt).map((learner) => <button type="button" className={learnerIds.includes(learner.id) ? "is-selected" : ""} onClick={() => toggleLearner(learner.id)} key={learner.id}>{learner.name}</button>)}</fieldset>}

          <fieldset className="subject-picks"><legend>Where did it fit?</legend><div>{subjects.map((subject) => <button type="button" key={subject.id} className={subjectId === subject.id ? "is-selected" : ""} onClick={() => setSubjectId(subject.id)}><i style={{ background: subject.color }} />{subject.name}</button>)}</div></fieldset>

          <div className="duration-row"><span>Time logged</span><div>{[15, 30, 45, 60].map((value) => <button type="button" className={minutes === value ? "is-selected" : ""} onClick={() => setMinutes(value)} key={value}>{value === 60 ? "1h" : `${value}m`}</button>)}</div></div>

          <button className="details-toggle" type="button" onClick={() => setDetailsOpen((open) => !open)}>Add details <span>{detailsOpen ? "−" : "+"}</span></button>
          {detailsOpen && <div className="details-panel">
            <label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <fieldset><legend>Activity type</legend><div className="kind-picks">{KIND_OPTIONS.map(([value, label]) => <button type="button" key={value} className={kind === value ? "is-selected" : ""} onClick={() => setKind(value)}>{label}</button>)}</div></fieldset>
            <label><span>Longer note <em>optional</em></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What stood out, what you used, or what comes next" rows={3} maxLength={600} /></label>
          </div>}

          <label className="day-check"><input type="checkbox" checked={countsAsDay} onChange={(event) => setCountsAsDay(event.target.checked)} /><span><strong>Count this date as a learning day</strong><small>You control what counts toward your target.</small></span></label>
          <button className="primary-button primary-button--full sticky-save" disabled={!title.trim() || !subjectId || learnerIds.length === 0}>Save to journal</button>
        </form>
      </section>
    </div>
  );
}

function UpgradeModal({ onClose, entitlement, onActivated }: {
  onClose: () => void;
  entitlement: LicenseEntitlement | null;
  onActivated: (entitlement: LicenseEntitlement) => void;
}) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const configured = licenseSalesConfigured();
  const purchaseUrl = checkoutUrl();

  const buy = () => {
    if (!purchaseUrl) return;
    track("Checkout opened");
    window.open(purchaseUrl, "_blank", "noopener,noreferrer");
  };
  const activate = async (event: FormEvent) => {
    event.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    setError("");
    try {
      const deviceName = `Yearkeep on ${navigator.platform || "this browser"}`;
      const result = await activateLicense(key, deviceName);
      onActivated(result);
      track("License activated");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That license could not be activated.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow">Yearkeep Pro</p>
        <h2 id="upgrade-title">Keep the record without rationing entries.</h2>
        <p>One household. One simple annual price. No ads, surprise tiers, or monthly billing.</p>
        <div className="upgrade-price"><strong>$12</strong><span>per year<br />for the household</span></div>
        <ul>
          <li><i>✓</i> Unlimited journal entries</li>
          <li><i>✓</i> Up to six learners</li>
          <li><i>✓</i> Print or save polished reports</li>
          <li><i>✓</i> Keep and revisit each school year</li>
        </ul>
        {configured ? <button className="primary-button primary-button--full" onClick={buy}>Get Yearkeep Pro — $12/year</button> : <button className="primary-button primary-button--full" disabled>Founding access opens shortly</button>}
        {!configured && <p className="sales-note">The free product is ready now. Checkout will appear here when the founding plan opens.</p>}
        {!entitlement && <form className="license-form" onSubmit={activate}><label><span>Already have a license key?</span><div><input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Paste your license key" autoComplete="off" disabled={!configured} /><button disabled={busy || !key.trim() || !configured}>{busy ? "Checking…" : "Activate"}</button></div></label>{error && <p role="alert">{error}</p>}</form>}
        <small>Your learning records remain in this browser. A license unlocks features; it does not add cloud storage.</small>
      </section>
    </div>
  );
}

function AppShell({ initialState }: { initialState: HearthfolioState }) {
  const [state, setState] = useState(initialState);
  const [tab, setTab] = useState<AppTab>("today");
  const [learnerId, setLearnerId] = useState(initialState.learners[0]?.id ?? "");
  const [logOpen, setLogOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [entitlement, setEntitlement] = useState<LicenseEntitlement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = parseEntitlement(JSON.parse(stored));
      if (!parsed) return;
      setEntitlement(parsed);
      void validateLicense(parsed).then((validated) => {
        setEntitlement(validated);
        if (validated) localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(validated));
        else localStorage.removeItem(LICENSE_STORAGE_KEY);
      });
    } catch {
      localStorage.removeItem(LICENSE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const isPro = Boolean(entitlement);
  const openLog = () => {
    if (!isPro && state.activities.length >= FREE_ENTRY_LIMIT) {
      setUpgradeOpen(true);
      track("Free limit reached");
      return;
    }
    setLogOpen(true);
  };
  const saveLog = (nextState: HearthfolioState) => {
    setState(nextState);
    setLogOpen(false);
    setToast("Logged to the journal.");
    track("Learning logged", { entry_count: nextState.activities.length });
  };
  const deleteEntry = (id: Id) => {
    if (!window.confirm("Delete this journal entry? The marked learning day will remain unless you change it separately.")) return;
    setState(removeActivity(state, id));
    setToast("Entry deleted.");
  };
  const activate = (next: LicenseEntitlement) => {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(next));
    setEntitlement(next);
    setUpgradeOpen(false);
    setToast("Yearkeep Pro is active.");
  };
  const deactivate = async () => {
    if (!entitlement || !window.confirm("Deactivate Pro on this browser? Your records will remain.")) return;
    try {
      await deactivateLicense(entitlement);
      localStorage.removeItem(LICENSE_STORAGE_KEY);
      setEntitlement(null);
      setToast("This browser was deactivated.");
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "Could not deactivate this browser.");
    }
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const restored = parseBackup(text);
      if (!window.confirm("Replace this browser’s Yearkeep records with the selected backup?")) return;
      localStorage.setItem("hearthfolio:pre-restore-backup", createBackup(state));
      setState(restored);
      setLearnerId(restored.learners[0]?.id ?? "");
      setToast("Backup restored.");
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "That backup could not be restored.");
    } finally {
      event.target.value = "";
    }
  };

  const navItems: Array<{ id: AppTab; label: string; icon: string }> = [
    { id: "today", label: "Today", icon: "⌂" },
    { id: "journal", label: "Journal", icon: "≡" },
    { id: "reports", label: "Reports", icon: "▤" },
    { id: "settings", label: "Settings", icon: "○" }
  ];

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <Brand compact />
        <nav>{navItems.map((item) => <button key={item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
        <div className="rail-bottom">
          <button className="rail-plan" onClick={() => setUpgradeOpen(true)}><span>{isPro ? "PRO" : "FREE"}</span><small>{isPro ? "Household plan" : `${state.activities.length}/${FREE_ENTRY_LIMIT} entries`}</small></button>
          <p>Records stay on this device.</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-topbar"><Brand compact /><select aria-label="Choose learner" value={learnerId} onChange={(event) => setLearnerId(event.target.value)}>{state.learners.filter((learner) => !learner.archivedAt).map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}</select></header>
        <div className="desktop-learner"><label><span>Viewing</span><select value={learnerId} onChange={(event) => setLearnerId(event.target.value)}>{state.learners.filter((learner) => !learner.archivedAt).map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}</select></label></div>
        <main className="view-wrap">
          {tab === "today" && <TodayView state={state} learnerId={learnerId} onLog={openLog} onDelete={deleteEntry} onTab={setTab} />}
          {tab === "journal" && <JournalView state={state} learnerId={learnerId} onDelete={deleteEntry} />}
          {tab === "reports" && <ReportView state={state} learnerId={learnerId} isPro={isPro} onUpgrade={() => setUpgradeOpen(true)} />}
          {tab === "settings" && <SettingsView state={state} setState={setState} isPro={isPro} entitlement={entitlement} onUpgrade={() => setUpgradeOpen(true)} onDeactivate={deactivate} onRestore={restore} />}
        </main>
      </div>

      <button className="floating-log" onClick={openLog} aria-label="Log learning">+</button>
      <nav className="bottom-nav">{navItems.map((item) => <button key={item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>

      {logOpen && <LogSheet state={state} selectedLearnerId={learnerId} onClose={() => setLogOpen(false)} onSave={saveLog} />}
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} entitlement={entitlement} onActivated={activate} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function YearkeepApp() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<HearthfolioState | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [startWithLog, setStartWithLog] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setState(raw ? parseState(JSON.parse(raw)) : null);
    } catch {
      setState(null);
    } finally {
      setHydrated(true);
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const complete = (next: HearthfolioState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
    setOnboarding(false);
    setStartWithLog(true);
    track("Private log started");
  };

  if (!hydrated) return <Landing onStart={() => undefined} />;
  if (!state) return <><Landing onStart={() => setOnboarding(true)} />{onboarding && <Onboarding onClose={() => setOnboarding(false)} onComplete={complete} />}</>;
  return <><AppShell initialState={state} />{startWithLog && <FirstLogLauncher onDone={() => setStartWithLog(false)} />}</>;
}

function FirstLogLauncher({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const button = document.querySelector<HTMLButtonElement>(".floating-log");
    const timer = window.setTimeout(() => {
      button?.click();
      onDone();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return null;
}
