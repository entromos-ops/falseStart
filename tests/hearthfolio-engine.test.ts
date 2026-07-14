import { describe, expect, it } from "vitest";
import {
  FREE_ENTRY_LIMIT,
  STORAGE_KEY,
  activitiesCsv,
  activeYear,
  addActivity,
  createBackup,
  createHousehold,
  isLocalDate,
  learningDayDates,
  minutesBySubject,
  minutesForLearner,
  parseBackup,
  startNextSchoolYear,
  upsertAttendance
} from "@/lib/hearthfolio/engine";
import {
  LICENSE_GRACE_MS,
  LICENSE_STORAGE_KEY,
  entitlementWithinGrace,
  parseEntitlement
} from "@/lib/hearthfolio/license";
import { calculateCalendar } from "@/app/tools/180-day-homeschool-calendar/CalendarPlanner";

function seeded() {
  return createHousehold("Maya", "Grade 4", new Date("2026-09-01T16:00:00.000Z"));
}

describe("Yearkeep record engine", () => {
  it("keeps legacy browser keys so existing records survive the rebrand", () => {
    expect(STORAGE_KEY).toBe("hearthfolio:household:v1");
    expect(LICENSE_STORAGE_KEY).toBe("hearthfolio:license:v1");
  });

  it("creates a private school year with useful defaults", () => {
    const state = seeded();
    const year = activeYear(state);

    expect(state.schemaVersion).toBe(1);
    expect(state.learners[0]).toMatchObject({ name: "Maya", gradeLabel: "Grade 4" });
    expect(state.subjects.map((subject) => subject.name)).toContain("Life Skills");
    expect(year).toMatchObject({
      label: "2026–2027",
      startDate: "2026-07-01",
      endDate: "2027-06-30",
      targetDays: 180
    });
    expect(FREE_ENTRY_LIMIT).toBe(30);
  });

  it("validates real local calendar dates without timezone parsing", () => {
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2024-02-29")).toBe(true);
    expect(isLocalDate("09/01/2026")).toBe(false);
  });

  it("counts multiple activities on one date as one explicit learning day", () => {
    let state = seeded();
    const learnerId = state.learners[0].id;
    const subjectId = state.subjects[0].id;
    for (const title of ["Fractions with recipes", "Measured the garden bed"]) {
      state = addActivity(
        state,
        {
          date: "2026-09-03",
          subjectId,
          title,
          kind: "lesson",
          credits: [{ learnerId, minutes: 30 }],
          countsAsLearningDay: true
        },
        new Date("2026-09-03T18:00:00.000Z")
      );
    }

    const scope = { schoolYearId: state.activeSchoolYearId };
    expect(learningDayDates(state, learnerId, scope)).toEqual(["2026-09-03"]);
    expect(minutesForLearner(state, learnerId, scope)).toBe(60);
  });

  it("credits a group activity independently to each learner", () => {
    let state = seeded();
    const now = "2026-09-01T17:00:00.000Z";
    const secondId = "learner_second";
    state = {
      ...state,
      learners: [
        ...state.learners,
        {
          id: secondId,
          name: "Leo",
          gradeLabel: "Grade 2",
          color: "#b56f49",
          createdAt: now,
          updatedAt: now
        }
      ]
    };
    state = addActivity(state, {
      date: "2026-09-04",
      subjectId: state.subjects[2].id,
      title: "Tested water samples",
      kind: "project",
      credits: [
        { learnerId: state.learners[0].id, minutes: 45 },
        { learnerId: secondId, minutes: 25 }
      ],
      countsAsLearningDay: true
    });

    const scope = { schoolYearId: state.activeSchoolYearId };
    expect(minutesForLearner(state, state.learners[0].id, scope)).toBe(45);
    expect(minutesForLearner(state, secondId, scope)).toBe(25);
    expect(learningDayDates(state, secondId, scope)).toEqual(["2026-09-04"]);
  });

  it("lets the parent explicitly remove a date from the learning-day count", () => {
    let state = seeded();
    const learnerId = state.learners[0].id;
    state = addActivity(state, {
      date: "2026-09-05",
      subjectId: state.subjects[1].id,
      title: "Read a biography",
      kind: "reading",
      credits: [{ learnerId, minutes: 40 }],
      countsAsLearningDay: true
    });
    state = upsertAttendance(state, learnerId, "2026-09-05", false);

    expect(learningDayDates(state, learnerId, { schoolYearId: state.activeSchoolYearId })).toEqual([]);
    expect(minutesForLearner(state, learnerId, { schoolYearId: state.activeSchoolYearId })).toBe(40);
  });

  it("summarizes subject minutes and preserves the original total", () => {
    let state = seeded();
    const learnerId = state.learners[0].id;
    state = addActivity(state, {
      date: "2026-09-06",
      subjectId: state.subjects[0].id,
      title: "Long division",
      kind: "lesson",
      credits: [{ learnerId, minutes: 35 }],
      countsAsLearningDay: true
    });
    state = addActivity(state, {
      date: "2026-09-07",
      subjectId: state.subjects[2].id,
      title: "Observed moon phases",
      kind: "project",
      credits: [{ learnerId, minutes: 50 }],
      countsAsLearningDay: true
    });

    expect(minutesBySubject(state, learnerId, { schoolYearId: state.activeSchoolYearId })).toEqual([
      { subjectId: state.subjects[2].id, minutes: 50, entries: 1 },
      { subjectId: state.subjects[0].id, minutes: 35, entries: 1 }
    ]);
  });

  it("escapes spreadsheet formulas, commas, quotes, and new lines", () => {
    let state = seeded();
    const learnerId = state.learners[0].id;
    state = addActivity(state, {
      date: "2026-09-08",
      subjectId: state.subjects[0].id,
      title: "=2+2, then \"explain\"",
      notes: "First line\nSecond line",
      kind: "lesson",
      credits: [{ learnerId, minutes: 20 }],
      countsAsLearningDay: true
    });
    const csv = activitiesCsv(state, { schoolYearId: state.activeSchoolYearId });

    expect(csv).toContain("\"'=2+2, then \"\"explain\"\"\"");
    expect(csv).toContain("\"First line\nSecond line\"");
    expect(csv).toContain("\r\n");
  });

  it("round-trips a complete backup and rejects unrelated JSON", () => {
    const state = seeded();
    const backup = createBackup(state, new Date("2026-09-10T12:00:00.000Z"));

    expect(parseBackup(backup)).toEqual(state);
    expect(() => parseBackup('{"hello":"world"}')).toThrow("not a Yearkeep backup");
    expect(() => parseBackup("not json")).toThrow("not valid JSON");
  });

  it("rejects backups with dangling references or impossible dates", () => {
    const state = seeded();
    const invalidReference = {
      format: "hearthfolio-backup",
      exportedAt: new Date().toISOString(),
      data: {
        ...state,
        activities: [{
          id: "activity_bad",
          schoolYearId: state.activeSchoolYearId,
          date: "2026-09-31",
          subjectId: "missing-subject",
          title: "Bad record",
          notes: "",
          kind: "lesson",
          credits: [{ learnerId: state.learners[0].id, minutes: 30 }],
          createdAt: state.createdAt,
          updatedAt: state.updatedAt
        }]
      }
    };
    expect(() => parseBackup(JSON.stringify(invalidReference))).toThrow("missing required Yearkeep data");
  });

  it("archives the current record when a new school year starts", () => {
    const state = seeded();
    const next = startNextSchoolYear(state, new Date("2027-06-15T12:00:00.000Z"));

    expect(next.schoolYears).toHaveLength(2);
    expect(activeYear(next)).toMatchObject({
      label: "2027–2028",
      startDate: "2027-07-01",
      endDate: "2028-06-30",
      targetDays: 180
    });
    expect(next.schoolYears[0]).toEqual(state.schoolYears[0]);
  });
});

describe("Yearkeep license state", () => {
  const entitlement = {
    key: "example-key",
    instanceId: "instance-1",
    instanceName: "Browser",
    lastValidatedAt: "2026-07-13T12:00:00.000Z",
    productId: 12,
    variantId: 34,
    storeId: 56
  };

  it("parses only complete local entitlements", () => {
    expect(parseEntitlement(entitlement)).toEqual(entitlement);
    expect(parseEntitlement({ key: "incomplete" })).toBeNull();
  });

  it("honors a seven-day offline validation grace window", () => {
    const validatedAt = Date.parse(entitlement.lastValidatedAt);
    expect(entitlementWithinGrace(entitlement, validatedAt + LICENSE_GRACE_MS)).toBe(true);
    expect(entitlementWithinGrace(entitlement, validatedAt + LICENSE_GRACE_MS + 1)).toBe(false);
  });
});

describe("180-day calendar calculator", () => {
  it("counts exactly 180 selected weekdays", () => {
    const result = calculateCalendar("2026-09-01", new Set([1, 2, 3, 4, 5]), []);
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.monthTotals.reduce((sum, month) => sum + month.days, 0)).toBe(180);
    expect(result.finishDate.getDay()).toBe(1);
  });

  it("skips inclusive breaks and rejects incomplete ranges", () => {
    const withoutBreak = calculateCalendar("2026-09-01", new Set([1, 2, 3, 4, 5]), []);
    const withBreak = calculateCalendar("2026-09-01", new Set([1, 2, 3, 4, 5]), [
      { id: 1, start: "2026-12-21", end: "2026-12-25" }
    ]);
    expect(withoutBreak.state).toBe("ready");
    expect(withBreak.state).toBe("ready");
    if (withoutBreak.state === "ready" && withBreak.state === "ready") {
      expect(withBreak.finishDate.getTime()).toBeGreaterThan(withoutBreak.finishDate.getTime());
    }
    expect(calculateCalendar("2026-09-01", new Set([1]), [
      { id: 1, start: "2026-12-21", end: "" }
    ])).toMatchObject({ state: "error" });
  });
});
