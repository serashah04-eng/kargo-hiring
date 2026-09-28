export type Role = "PM" | "SPM";

export const STATUSES = [
  "new",
  "evaluated",
  "shortlisted",
  "interview_invited",
  "declined",
  "rejection_sent",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  evaluated: "AI Evaluated",
  shortlisted: "Shortlisted",
  interview_invited: "Interview Invited",
  declined: "Not Moving Forward",
  rejection_sent: "Rejection Sent",
};

export type Evidence = { quote: string; verified: boolean };

export type CriterionResult = {
  id: string;
  name: string;
  weight: number;
  rating: number;
  weighted: number;
  evidence: Evidence[];
  rationale: string;
};

export type InterviewQuestion = { criterion_id: string; question: string; listen_for: string };

export type Profile = {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  total_years_experience: number | null;
  pm_years_experience: number | null;
  summary: string;
  experience: { title: string; company: string; period: string }[];
  education: string[];
  skills: string[];
};

export type Evaluation = {
  id: string;
  overall_score: number;
  band: string;
  criteria: CriterionResult[];
  strengths: string[];
  gaps: string[];
  reasoning: string;
  jd_fit_notes: string | null;
  interview_questions: InterviewQuestion[];
  model: string;
  rubric_version: string;
  created_at: string;
};

export type CandidateRow = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  status: Status;
  created_at: string;
  last_error: string | null;
  overall_score: number | null;
  band: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
};

export type EmailRecord = {
  id: string;
  type: "invite" | "rejection";
  to_email: string | null;
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed";
  provider_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
};

export type ActionRecord = {
  id: string;
  actor: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};
