import type {
  ActivityDraft,
  DateScope,
  HearthfolioBackup,
  HearthfolioState,
  Id,
  LearningActivity,
  LocalDate,
  SchoolYear,
  Subject
} from "./types";

export const STORAGE_KEY = "hearthfolio:household:v1";
export const FREE_ENTRY_LIMIT = 30;

export const SUBJECT_PALETTE = [
  "#315a45",
  "#b56f49",
  "#54738f",
  "#9a6f3c",
  "#82658a",
  "#567a70",
  "#9c5b55",
  "#6f7651",
  "#7f6b5d"
];

export const DEFAULT_SUBJECTS = [
  "Math",
  "Language Arts",
  "Science",
  "Social Studies",
  "Art",
  "Music",
  "PE & Health",
  "Life Skills",
  "Field Trips"
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function makeId(prefix: string): Id {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}

export function todayLocal(date = new Date()): LocalDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const test = new Date(Date.UTC(year, month - 1, day));
  return (
    test.getUTCFullYear() === year &&
    test.getUTCMonth() === month - 1 &&
    test.getUTCDate() === day
  );
}

export function formatLocalDate(
  value: LocalDate,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric"
  }
): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", options).format(
    new Date(year, month - 1, day, 12)
  );
}

function defaultYear(now: Date): Pick<SchoolYear, "label" | "startDate" | "endDate"> {
  const year = now.getFullYear();
  const startsThisYear = now.getMonth() >= 6;
  const startYear = startsThisYear ? year : year - 1;
  return {
    label: `${startYear}–${startYear + 1}`,
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`
  };
}

export function createHousehold(
  learnerName: string,
  gradeLabel: string,
  now = new Date()
): HearthfolioState {
  const instant = now.toISOString();
  const schoolYearId = makeId("year");
  const year = defaultYear(now);
  const learnerId = makeId("learner");
  const subjects: Subject[] = DEFAULT_SUBJECTS.map((name, index) => ({
    id: makeId("subject"),
    name,
    color: SUBJECT_PALETTE[index % SUBJECT_PALETTE.length],
    createdAt: instant,
    updatedAt: instant
  }));

  return {
    schemaVersion: 1,
    household: {
      id: makeId("household"),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      weekStartsOn: 0,
      createdAt: instant
    },
    activeSchoolYearId: schoolYearId,
    learners: [
      {
        id: learnerId,
        name: learnerName.trim(),
        gradeLabel: gradeLabel.trim(),
        color: "#315a45",
        createdAt: instant,
        updatedAt: instant
      }
    ],
    subjects,
    schoolYears: [
      {
        id: schoolYearId,
        ...year,
        targetDays: 180,
        createdAt: instant,
        updatedAt: instant
      }
    ],
    activities: [],
    attendance: [],
    createdAt: instant,
    updatedAt: instant
  };
}

export function addActivity(
  state: HearthfolioState,
  draft: ActivityDraft,
  now = new Date()
): HearthfolioState {
  const instant = now.toISOString();
  const activity: LearningActivity = {
    id: makeId("activity"),
    schoolYearId: state.activeSchoolYearId,
    date: draft.date,
    subjectId: draft.subjectId,
    title: draft.title.trim(),
    notes: draft.notes?.trim() ?? "",
    kind: draft.kind,
    credits: draft.credits.map((credit) => ({ ...credit })),
    createdAt: instant,
    updatedAt: instant
  };

  const attendance = [...state.attendance];
  if (draft.countsAsLearningDay) {
    for (const credit of draft.credits) {
      const existingIndex = attendance.findIndex(
        (entry) =>
          entry.schoolYearId === state.activeSchoolYearId &&
          entry.learnerId === credit.learnerId &&
          entry.date === draft.date
      );
      if (existingIndex >= 0) {
        attendance[existingIndex] = {
          ...attendance[existingIndex],
          status: "present",
          updatedAt: instant
        };
      } else {
        attendance.push({
          id: makeId("attendance"),
          schoolYearId: state.activeSchoolYearId,
          learnerId: credit.learnerId,
          date: draft.date,
          status: "present",
          note: "",
          createdAt: instant,
          updatedAt: instant
        });
      }
    }
  }

  return {
    ...state,
    activities: [activity, ...state.activities],
    attendance,
    updatedAt: instant
  };
}

export function removeActivity(
  state: HearthfolioState,
  activityId: Id,
  now = new Date()
): HearthfolioState {
  return {
    ...state,
    activities: state.activities.filter((activity) => activity.id !== activityId),
    updatedAt: now.toISOString()
  };
}

export function upsertAttendance(
  state: HearthfolioState,
  learnerId: Id,
  date: LocalDate,
  present: boolean,
  now = new Date()
): HearthfolioState {
  const instant = now.toISOString();
  const existing = state.attendance.find(
    (entry) =>
      entry.schoolYearId === state.activeSchoolYearId &&
      entry.learnerId === learnerId &&
      entry.date === date
  );
  const next = existing
    ? state.attendance.map((entry) =>
        entry.id === existing.id
          ? { ...entry, status: present ? ("present" as const) : ("absent" as const), updatedAt: instant }
          : entry
      )
    : [
        ...state.attendance,
        {
          id: makeId("attendance"),
          schoolYearId: state.activeSchoolYearId,
          learnerId,
          date,
          status: present ? ("present" as const) : ("absent" as const),
          note: "",
          createdAt: instant,
          updatedAt: instant
        }
      ];
  return { ...state, attendance: next, updatedAt: instant };
}

function inScope(date: LocalDate, scope: DateScope, year: SchoolYear): boolean {
  const from = scope.from ?? year.startDate;
  const through = scope.through ?? year.endDate;
  return date >= from && date <= through;
}

export function scopedActivities(
  state: HearthfolioState,
  scope: DateScope
): LearningActivity[] {
  const year = state.schoolYears.find((item) => item.id === scope.schoolYearId);
  if (!year) return [];
  const learners = scope.learnerIds ? new Set(scope.learnerIds) : null;
  const subjects = scope.subjectIds ? new Set(scope.subjectIds) : null;
  return state.activities.filter(
    (activity) =>
      activity.schoolYearId === scope.schoolYearId &&
      inScope(activity.date, scope, year) &&
      (!subjects || subjects.has(activity.subjectId)) &&
      (!learners || activity.credits.some((credit) => learners.has(credit.learnerId)))
  );
}

export function learningDayDates(
  state: HearthfolioState,
  learnerId: Id,
  scope: DateScope
): LocalDate[] {
  const year = state.schoolYears.find((item) => item.id === scope.schoolYearId);
  if (!year) return [];
  return [
    ...new Set(
      state.attendance
        .filter(
          (entry) =>
            entry.schoolYearId === scope.schoolYearId &&
            entry.learnerId === learnerId &&
            (entry.status === "present" || entry.status === "partial") &&
            inScope(entry.date, scope, year)
        )
        .map((entry) => entry.date)
    )
  ].sort();
}

export function minutesForLearner(
  state: HearthfolioState,
  learnerId: Id,
  scope: DateScope
): number {
  return scopedActivities(state, { ...scope, learnerIds: [learnerId] }).reduce(
    (total, activity) =>
      total +
      (activity.credits.find((credit) => credit.learnerId === learnerId)?.minutes ?? 0),
    0
  );
}

export function minutesBySubject(
  state: HearthfolioState,
  learnerId: Id,
  scope: DateScope
): Array<{ subjectId: Id; minutes: number; entries: number }> {
  const totals = new Map<Id, { minutes: number; entries: number }>();
  for (const activity of scopedActivities(state, { ...scope, learnerIds: [learnerId] })) {
    const minutes =
      activity.credits.find((credit) => credit.learnerId === learnerId)?.minutes ?? 0;
    const current = totals.get(activity.subjectId) ?? { minutes: 0, entries: 0 };
    totals.set(activity.subjectId, {
      minutes: current.minutes + minutes,
      entries: current.entries + 1
    });
  }
  return [...totals.entries()]
    .map(([subjectId, value]) => ({ subjectId, ...value }))
    .sort((a, b) => b.minutes - a.minutes || b.entries - a.entries);
}

function csvCell(value: unknown): string {
  let cell = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}

export function activitiesCsv(state: HearthfolioState, scope: DateScope): string {
  const headers = ["Date", "Learner", "Subject", "Activity", "Type", "Minutes", "Notes"];
  const learners = new Map(state.learners.map((learner) => [learner.id, learner.name]));
  const subjects = new Map(state.subjects.map((subject) => [subject.id, subject.name]));
  const rows = scopedActivities(state, scope)
    .flatMap((activity) =>
      activity.credits.map((credit) => [
        activity.date,
        learners.get(credit.learnerId) ?? "Unknown learner",
        subjects.get(activity.subjectId) ?? "Archived subject",
        activity.title,
        activity.kind,
        credit.minutes,
        activity.notes
      ])
    )
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function createBackup(state: HearthfolioState, now = new Date()): string {
  const backup: HearthfolioBackup = {
    format: "hearthfolio-backup",
    exportedAt: now.toISOString(),
    data: state
  };
  return JSON.stringify(backup, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoInstant(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function hasUniqueIds(items: Array<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function parseState(value: unknown): HearthfolioState | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (
    !isRecord(value.household) ||
    typeof value.household.id !== "string" ||
    typeof value.household.timeZone !== "string" ||
    (value.household.weekStartsOn !== 0 && value.household.weekStartsOn !== 1) ||
    !isIsoInstant(value.household.createdAt) ||
    typeof value.activeSchoolYearId !== "string" ||
    !Array.isArray(value.learners) ||
    !Array.isArray(value.subjects) ||
    !Array.isArray(value.schoolYears) ||
    !Array.isArray(value.activities) ||
    !Array.isArray(value.attendance) ||
    !isIsoInstant(value.createdAt) ||
    !isIsoInstant(value.updatedAt)
  ) return null;

  const learners = value.learners.filter((item): item is HearthfolioState["learners"][number] =>
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.name === "string" && item.name.trim().length > 0 &&
    typeof item.gradeLabel === "string" &&
    typeof item.color === "string" &&
    isIsoInstant(item.createdAt) &&
    isIsoInstant(item.updatedAt) &&
    (item.archivedAt === undefined || isIsoInstant(item.archivedAt))
  );
  const subjects = value.subjects.filter((item): item is HearthfolioState["subjects"][number] =>
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.name === "string" && item.name.trim().length > 0 &&
    typeof item.color === "string" &&
    isIsoInstant(item.createdAt) &&
    isIsoInstant(item.updatedAt) &&
    (item.archivedAt === undefined || isIsoInstant(item.archivedAt))
  );
  const schoolYears = value.schoolYears.filter((item): item is HearthfolioState["schoolYears"][number] =>
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.label === "string" && item.label.trim().length > 0 &&
    isLocalDate(item.startDate) &&
    isLocalDate(item.endDate) &&
    item.startDate <= item.endDate &&
    Number.isSafeInteger(item.targetDays) && Number(item.targetDays) > 0 && Number(item.targetDays) <= 366 &&
    isIsoInstant(item.createdAt) &&
    isIsoInstant(item.updatedAt)
  );
  if (
    learners.length !== value.learners.length ||
    subjects.length !== value.subjects.length ||
    schoolYears.length !== value.schoolYears.length ||
    learners.length === 0 || subjects.length === 0 || schoolYears.length === 0 ||
    !hasUniqueIds(learners) || !hasUniqueIds(subjects) || !hasUniqueIds(schoolYears)
  ) return null;

  const learnerIds = new Set(learners.map((item) => item.id));
  const subjectIds = new Set(subjects.map((item) => item.id));
  const yearIds = new Set(schoolYears.map((item) => item.id));
  if (!yearIds.has(value.activeSchoolYearId)) return null;

  const yearMap = new Map(schoolYears.map((item) => [item.id, item]));
  const kinds = new Set(["lesson", "reading", "project", "field-trip", "life-skill"]);
  const activities = value.activities.filter((item): item is HearthfolioState["activities"][number] => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.schoolYearId !== "string" || !yearIds.has(item.schoolYearId) ||
      !isLocalDate(item.date) ||
      typeof item.subjectId !== "string" || !subjectIds.has(item.subjectId) ||
      typeof item.title !== "string" || !item.title.trim() ||
      typeof item.notes !== "string" ||
      typeof item.kind !== "string" || !kinds.has(item.kind) ||
      !Array.isArray(item.credits) || item.credits.length === 0 ||
      !isIsoInstant(item.createdAt) || !isIsoInstant(item.updatedAt)
    ) return false;
    const year = yearMap.get(item.schoolYearId);
    if (!year || item.date < year.startDate || item.date > year.endDate) return false;
    const credits = item.credits.filter((credit) =>
      isRecord(credit) &&
      typeof credit.learnerId === "string" && learnerIds.has(credit.learnerId) &&
      Number.isSafeInteger(credit.minutes) && Number(credit.minutes) > 0 && Number(credit.minutes) <= 1_440
    );
    return credits.length === item.credits.length &&
      new Set(credits.map((credit) => credit.learnerId)).size === credits.length;
  });
  if (activities.length !== value.activities.length || !hasUniqueIds(activities)) return null;

  const attendanceKeys = new Set<string>();
  const statuses = new Set(["present", "partial", "absent", "excused"]);
  const attendance = value.attendance.filter((item): item is HearthfolioState["attendance"][number] => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.schoolYearId !== "string" || !yearIds.has(item.schoolYearId) ||
      typeof item.learnerId !== "string" || !learnerIds.has(item.learnerId) ||
      !isLocalDate(item.date) ||
      typeof item.status !== "string" || !statuses.has(item.status) ||
      typeof item.note !== "string" ||
      !isIsoInstant(item.createdAt) || !isIsoInstant(item.updatedAt)
    ) return false;
    const year = yearMap.get(item.schoolYearId);
    const key = `${item.schoolYearId}:${item.learnerId}:${item.date}`;
    if (!year || item.date < year.startDate || item.date > year.endDate || attendanceKeys.has(key)) return false;
    attendanceKeys.add(key);
    return true;
  });
  if (attendance.length !== value.attendance.length || !hasUniqueIds(attendance)) return null;

  return value as HearthfolioState;
}

export function parseBackup(json: string): HearthfolioState {
  if (json.length > 5_000_000) throw new Error("That backup is larger than 5 MB.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!isRecord(parsed) || parsed.format !== "hearthfolio-backup") {
    throw new Error("That is not a Yearkeep backup.");
  }
  const state = parseState(parsed.data);
  if (!state) throw new Error("That backup is missing required Yearkeep data.");
  return state;
}

export function activeYear(state: HearthfolioState): SchoolYear {
  return state.schoolYears.find((year) => year.id === state.activeSchoolYearId) ?? state.schoolYears[0];
}

export function activeSubjects(state: HearthfolioState): Subject[] {
  return state.subjects.filter((subject) => !subject.archivedAt);
}

export function startNextSchoolYear(
  state: HearthfolioState,
  now = new Date()
): HearthfolioState {
  const current = activeYear(state);
  const startYear = Number(current.endDate.slice(0, 4));
  const instant = now.toISOString();
  const next: SchoolYear = {
    id: makeId("year"),
    label: `${startYear}–${startYear + 1}`,
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`,
    targetDays: current.targetDays,
    createdAt: instant,
    updatedAt: instant
  };
  return {
    ...state,
    activeSchoolYearId: next.id,
    schoolYears: [...state.schoolYears, next],
    updatedAt: instant
  };
}
