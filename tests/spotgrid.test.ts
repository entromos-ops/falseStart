import { describe, expect, it } from "vitest";
import { countConflicts, findConflict, initialState, type Booking } from "@/components/SpotGridApp";

describe("SpotGrid conflict checks", () => {
  it("flags category exclusivity conflicts on the same show within fourteen days", () => {
    const conflict = findConflict(initialState, initialState.bookings.find((booking) => booking.id === "b-5") as Booking);
    expect(conflict).toContain("Northstar CRM");
    expect(countConflicts(initialState)).toBeGreaterThan(0);
  });

  it("does not flag the same category on a different show", () => {
    const booking: Booking = {
      id: "test-booking",
      episodeId: "ep-m-1",
      slot: "mid",
      sponsor: "FinanceStack",
      category: "SaaS",
      status: "Booked",
      value: 1000,
      owner: "Ops",
      dueDate: "2026-08-01",
      notes: ""
    };

    expect(findConflict(initialState, booking)).toBeNull();
  });
});
