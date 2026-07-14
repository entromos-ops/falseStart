export type Id = string;
export type LocalDate = string;
export type IsoInstant = string;

export type Learner = {
  id: Id;
  name: string;
  gradeLabel: string;
  color: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  archivedAt?: IsoInstant;
};

export type Subject = {
  id: Id;
  name: string;
  color: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  archivedAt?: IsoInstant;
};

export type SchoolYear = {
  id: Id;
  label: string;
  startDate: LocalDate;
  endDate: LocalDate;
  targetDays: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
};

export type ActivityKind =
  | "lesson"
  | "reading"
  | "project"
  | "field-trip"
  | "life-skill";

export type ActivityCredit = {
  learnerId: Id;
  minutes: number;
};

export type LearningActivity = {
  id: Id;
  schoolYearId: Id;
  date: LocalDate;
  subjectId: Id;
  title: string;
  notes: string;
  kind: ActivityKind;
  credits: ActivityCredit[];
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
};

export type AttendanceStatus = "present" | "partial" | "absent" | "excused";

export type AttendanceEntry = {
  id: Id;
  schoolYearId: Id;
  learnerId: Id;
  date: LocalDate;
  status: AttendanceStatus;
  note: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
};

export type HearthfolioState = {
  schemaVersion: 1;
  household: {
    id: Id;
    timeZone: string;
    weekStartsOn: 0 | 1;
    createdAt: IsoInstant;
  };
  activeSchoolYearId: Id;
  learners: Learner[];
  subjects: Subject[];
  schoolYears: SchoolYear[];
  activities: LearningActivity[];
  attendance: AttendanceEntry[];
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
};

export type HearthfolioBackup = {
  format: "hearthfolio-backup";
  exportedAt: IsoInstant;
  data: HearthfolioState;
};

export type DateScope = {
  schoolYearId: Id;
  from?: LocalDate;
  through?: LocalDate;
  learnerIds?: Id[];
  subjectIds?: Id[];
};

export type ActivityDraft = {
  date: LocalDate;
  subjectId: Id;
  title: string;
  notes?: string;
  kind: ActivityKind;
  credits: ActivityCredit[];
  countsAsLearningDay: boolean;
};

export type LicenseEntitlement = {
  key: string;
  instanceId: string;
  instanceName: string;
  lastValidatedAt: IsoInstant;
  productId: number;
  variantId: number;
  storeId: number;
};
