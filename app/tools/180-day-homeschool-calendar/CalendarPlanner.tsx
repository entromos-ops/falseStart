"use client";

import { useMemo, useState } from "react";

type BreakRange = {
  id: number;
  start: string;
  end: string;
};

type MonthTotal = {
  key: string;
  label: string;
  days: number;
};

type CalendarResult =
  | { state: "empty" }
  | { state: "error"; message: string }
  | {
      state: "ready";
      finishDate: Date;
      monthTotals: MonthTotal[];
      spanDays: number;
    };

const TARGET_DAYS = 180;
const DAY_OPTIONS = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" }
] as const;

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day, 12);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function addOneDay(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function dayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function calculateCalendar(
  startValue: string,
  selectedDays: Set<number>,
  breaks: BreakRange[]
): CalendarResult {
  if (!startValue) return { state: "empty" };
  const startDate = parseDate(startValue);
  if (!startDate) return { state: "error", message: "Choose a valid start date." };
  if (selectedDays.size === 0) {
    return { state: "error", message: "Choose at least one learning day each week." };
  }

  const parsedBreaks: Array<{ start: Date; end: Date }> = [];
  for (const range of breaks) {
    if (!range.start && !range.end) continue;
    if (!range.start || !range.end) {
      return {
        state: "error",
        message: "Complete both dates for each break, or remove the unfinished break."
      };
    }

    const breakStart = parseDate(range.start);
    const breakEnd = parseDate(range.end);
    if (!breakStart || !breakEnd || breakStart > breakEnd) {
      return {
        state: "error",
        message: "Each break must end on or after the day it begins."
      };
    }

    parsedBreaks.push({ start: breakStart, end: breakEnd });
  }

  const monthMap = new Map<string, MonthTotal>();
  let current = startDate;
  let countedDays = 0;
  let iterations = 0;
  let finishDate = startDate;

  while (countedDays < TARGET_DAYS && iterations < 3_660) {
    const fallsInBreak = parsedBreaks.some(
      (range) => current >= range.start && current <= range.end
    );

    if (selectedDays.has(current.getDay()) && !fallsInBreak) {
      countedDays += 1;
      finishDate = current;
      const key =
        String(current.getFullYear()) +
        "-" +
        String(current.getMonth() + 1).padStart(2, "0");
      const existing = monthMap.get(key);

      if (existing) {
        existing.days += 1;
      } else {
        monthMap.set(key, {
          key,
          label: monthFormatter.format(current),
          days: 1
        });
      }
    }

    current = addOneDay(current);
    iterations += 1;
  }

  if (countedDays < TARGET_DAYS) {
    return {
      state: "error",
      message: "This schedule could not reach 180 days. Check the selected weekdays and breaks."
    };
  }

  return {
    state: "ready",
    finishDate,
    monthTotals: Array.from(monthMap.values()),
    spanDays: dayNumber(finishDate) - dayNumber(startDate) + 1
  };
}

export default function CalendarPlanner() {
  const [startDate, setStartDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    () => new Set([1, 2, 3, 4, 5])
  );
  const [breaks, setBreaks] = useState<BreakRange[]>([]);
  const [nextBreakId, setNextBreakId] = useState(1);

  const result = useMemo(
    () => calculateCalendar(startDate, selectedDays, breaks),
    [startDate, selectedDays, breaks]
  );

  const selectedDayNames = DAY_OPTIONS.filter((day) =>
    selectedDays.has(day.value)
  ).map((day) => day.long);

  function toggleDay(value: number) {
    setSelectedDays((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function addBreak() {
    setBreaks((current) => [
      ...current,
      { id: nextBreakId, start: "", end: "" }
    ]);
    setNextBreakId((current) => current + 1);
  }

  function updateBreak(id: number, field: "start" | "end", value: string) {
    setBreaks((current) =>
      current.map((range) =>
        range.id === id ? { ...range, [field]: value } : range
      )
    );
  }

  function removeBreak(id: number) {
    setBreaks((current) => current.filter((range) => range.id !== id));
  }

  return (
    <main className="calendar-tool-page">
      <nav className="calendar-tool-nav" aria-label="Main navigation">
        <a href="/" className="brand brand--compact">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>Hearthfolio</span>
        </a>
        <a href="/" className="calendar-tool-nav-link">Open Hearthfolio <span aria-hidden="true">→</span></a>
      </nav>

      <header className="calendar-tool-hero">
        <div>
          <p className="eyebrow">Free homeschool planning tool</p>
          <h1>Map 180 learning days—without counting the breaks.</h1>
          <p className="calendar-tool-lede">
            Pick the days your family learns, add vacations or time off, and
            see your projected finish date instantly.
          </p>
          <div className="calendar-tool-trust" aria-label="Tool benefits">
            <span><i aria-hidden="true">✓</i> Nothing uploaded</span>
            <span><i aria-hidden="true">✓</i> No sign-up</span>
            <span><i aria-hidden="true">✓</i> Print-ready</span>
          </div>
        </div>
        <aside className="calendar-tool-hero-note">
          <span>180</span>
          <p>planned learning days</p>
          <small>Weekends and your breaks are skipped automatically.</small>
        </aside>
      </header>

      <section className="calendar-builder" aria-label="180-day calendar calculator">
        <div className="calendar-planner-panel">
          <div className="calendar-panel-heading">
            <p className="eyebrow">Build your year</p>
            <h2>Your real schedule, not a generic school calendar.</h2>
          </div>

          <div className="calendar-field-block">
            <div className="calendar-step">
              <span>1</span>
              <div>
                <h3>Choose your first day</h3>
                <p>This day counts if it matches a selected weekday.</p>
              </div>
            </div>
            <label className="calendar-date-field">
              <span>School-year start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
          </div>

          <fieldset className="calendar-field-block">
            <legend className="calendar-sr-only">Learning days each week</legend>
            <div className="calendar-step">
              <span>2</span>
              <div>
                <h3>Select your learning days</h3>
                <p>Monday through Friday is selected to start.</p>
              </div>
            </div>
            <div className="calendar-weekdays">
              {DAY_OPTIONS.map((day) => (
                <label
                  key={day.value}
                  className={selectedDays.has(day.value) ? "is-selected" : ""}
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.has(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  <span>{day.short}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="calendar-field-block">
            <legend className="calendar-sr-only">Planned breaks</legend>
            <div className="calendar-step">
              <span>3</span>
              <div>
                <h3>Add planned breaks</h3>
                <p>Break ranges are inclusive. Add as many as you need.</p>
              </div>
            </div>

            {breaks.length > 0 && (
              <div className="calendar-break-list">
                {breaks.map((range, index) => (
                  <div className="calendar-break-row" key={range.id}>
                    <span className="calendar-break-label">Break {index + 1}</span>
                    <label>
                      <span>From</span>
                      <input
                        type="date"
                        value={range.start}
                        onChange={(event) =>
                          updateBreak(range.id, "start", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Through</span>
                      <input
                        type="date"
                        value={range.end}
                        onChange={(event) =>
                          updateBreak(range.id, "end", event.target.value)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeBreak(range.id)}
                      aria-label={"Remove break " + (index + 1)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button className="calendar-add-break" type="button" onClick={addBreak}>
              <span aria-hidden="true">＋</span> Add a break
            </button>
          </fieldset>
        </div>

        <section className="calendar-print-sheet" aria-live="polite">
          <div className="calendar-result-top">
            <div>
              <div className="calendar-result-brand">
                <span aria-hidden="true">H</span>
                <strong>HEARTHFOLIO</strong>
              </div>
              <p>180-DAY HOMESCHOOL PLAN</p>
            </div>
            {result.state === "ready" && (
              <button
                type="button"
                className="calendar-print-button"
                onClick={() => window.print()}
                data-no-print
              >
                Print plan
              </button>
            )}
          </div>

          {result.state === "empty" && (
            <div className="calendar-result-empty">
              <div aria-hidden="true"><i /><i /><i /></div>
              <p className="eyebrow">Your plan will appear here</p>
              <h2>Start with your first learning day.</h2>
              <p>
                We will count forward to day 180 using the week and breaks you choose.
              </p>
            </div>
          )}

          {result.state === "error" && (
            <div className="calendar-result-error">
              <span aria-hidden="true">!</span>
              <div>
                <strong>One quick fix</strong>
                <p>{result.message}</p>
              </div>
            </div>
          )}

          {result.state === "ready" && (
            <div className="calendar-result-ready">
              <div className="calendar-finish">
                <p>Projected day 180</p>
                <h2>{longDateFormatter.format(result.finishDate)}</h2>
                <span>
                  Based on {selectedDays.size} learning {selectedDays.size === 1 ? "day" : "days"} per week
                  {breaks.some((range) => range.start && range.end)
                    ? " and your planned breaks"
                    : ""}
                  .
                </span>
              </div>

              <div className="calendar-result-stats">
                <div>
                  <strong>180</strong>
                  <span>learning days</span>
                </div>
                <div>
                  <strong>{Math.ceil(result.spanDays / 7)}</strong>
                  <span>calendar weeks</span>
                </div>
                <div>
                  <strong>{result.monthTotals.length}</strong>
                  <span>calendar months</span>
                </div>
              </div>

              <div className="calendar-month-section">
                <div className="calendar-month-heading">
                  <h3>Learning days by month</h3>
                  <span>{result.monthTotals.reduce((sum, month) => sum + month.days, 0)} total</span>
                </div>
                <div className="calendar-month-list">
                  {result.monthTotals.map((month) => (
                    <div key={month.key}>
                      <span>{month.label}</span>
                      <i aria-hidden="true">
                        <b style={{ width: (month.days / 31) * 100 + "%" }} />
                      </i>
                      <strong>{month.days}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="calendar-plan-summary">
                <div>
                  <span>Starts</span>
                  <strong>{shortDateFormatter.format(parseDate(startDate) as Date)}</strong>
                </div>
                <div>
                  <span>Learning days</span>
                  <strong>{selectedDayNames.join(", ")}</strong>
                </div>
                <div>
                  <span>Planned breaks</span>
                  <strong>
                    {breaks.filter((range) => range.start && range.end).length || "None added"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <p className="calendar-legal-note">
            Planning aid only—not legal advice. Attendance and instruction
            requirements vary by location. Confirm the rules that apply to your family.
          </p>
        </section>
      </section>

      <section className="calendar-tool-explainer">
        <div className="calendar-explainer-heading">
          <p className="eyebrow">Simple on purpose</p>
          <h2>A useful estimate in under a minute.</h2>
        </div>
        <div className="calendar-explainer-grid">
          <article>
            <span>01</span>
            <h3>Use the week you actually keep</h3>
            <p>
              Four-day week? Saturday projects? Select only the weekdays that
              normally count for your family.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Plan around real life</h3>
            <p>
              Add holiday, travel, co-op, or recovery breaks. Overlapping
              breaks are handled without double-counting.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Print a clean starting plan</h3>
            <p>
              Keep the finish date and monthly totals with your planning
              materials, then adjust as your year unfolds.
            </p>
          </article>
        </div>
      </section>

      <section className="calendar-tool-cta">
        <div>
          <p className="eyebrow">A calendar is the plan. Hearthfolio keeps the record.</p>
          <h2>Turn ordinary learning days into a portfolio you can actually use.</h2>
        </div>
        <a href="/" className="primary-button primary-button--large">
          See how Hearthfolio works <span aria-hidden="true">→</span>
        </a>
      </section>

      <footer className="calendar-tool-footer">
        <a href="/" className="brand brand--compact">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span>Hearthfolio</span>
        </a>
        <p>Private homeschool records, without the paperwork.</p>
        <nav aria-label="Legal">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </footer>
    </main>
  );
}
