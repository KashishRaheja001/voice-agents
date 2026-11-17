// Maps what the agent gathered on a call to a lead status. Pure function, no I/O.

export type Classification = { status: string; interest_level: string };

// Calls shorter than this with nothing gathered are treated as unanswered.
export const NO_ANSWER_MAX_SECONDS = 8;

export function classify(
  interest: string | null,
  visitSlot: string | null,
  doNotCall: boolean,
  durationSeconds: number | null = null
): Classification {
  if (doNotCall) return { status: "Not Interested", interest_level: "Low" };
  if (visitSlot) return { status: "Site Visit", interest_level: "High" };

  const i = (interest ?? "").toLowerCase();
  if (/\b(not|uninterested|no|nahi|nahin)\b/.test(i)) return { status: "Not Interested", interest_level: "Low" };
  if (/\b(follow|callback|busy|later)\b/.test(i)) return { status: "Follow Up", interest_level: "Medium" };
  if (/\b(interested|interest|yes|high|hot)\b/.test(i)) return { status: "Interested", interest_level: "High" };

  if (!i && durationSeconds !== null && durationSeconds < NO_ANSWER_MAX_SECONDS) {
    return { status: "No Answer", interest_level: "Pending" };
  }
  return { status: "Contacted", interest_level: "Pending Review" };
}
