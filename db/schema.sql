-- Kargo hiring dashboard schema (Neon / Postgres). Applied automatically on first request.
CREATE TABLE IF NOT EXISTS candidates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  email        text,
  phone        text,
  role         text NOT NULL CHECK (role IN ('PM','SPM')),
  status       text NOT NULL DEFAULT 'new',
  cv_filename  text,
  cv_text      text NOT NULL,
  profile      jsonb,          -- Gemini-extracted CV info
  last_error   text,           -- last evaluation error, if any
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id        uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role                text NOT NULL,
  rubric_version      text NOT NULL,
  overall_score       numeric(5,1) NOT NULL,
  band                text NOT NULL,
  criteria            jsonb NOT NULL,   -- [{id,name,weight,rating,weighted,evidence[{quote,verified}],rationale}]
  strengths           jsonb NOT NULL,
  gaps                jsonb NOT NULL,
  reasoning           text NOT NULL,
  jd_fit_notes        text,
  interview_questions jsonb NOT NULL,
  model               text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evaluations_candidate_idx ON evaluations(candidate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS emails (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('invite','rejection')),
  to_email     text,
  subject      text NOT NULL,
  body         text NOT NULL,
  status       text NOT NULL DEFAULT 'draft',  -- draft | sent | failed
  provider_id  text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emails_candidate_idx ON emails(candidate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS actions (
  id           bigserial PRIMARY KEY,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  actor        text NOT NULL,   -- arjun | ai | system
  action       text NOT NULL,
  details      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS actions_candidate_idx ON actions(candidate_id, created_at DESC);
