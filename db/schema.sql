CREATE TABLE IF NOT EXISTS employees (
  id integer PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL
);

CREATE TABLE IF NOT EXISTS shift_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  start_time time(0) NOT NULL,
  end_time time(0) NOT NULL,
  position integer NOT NULL UNIQUE,
  CHECK (start_time <> end_time)
);

CREATE TABLE IF NOT EXISTS shifts (
  employee_id integer NOT NULL REFERENCES employees(id),
  date date NOT NULL,
  template_id text REFERENCES shift_templates(id),
  start_time time(0) NOT NULL,
  end_time time(0) NOT NULL,
  PRIMARY KEY (employee_id, date),
  CHECK (start_time <> end_time)
);

CREATE INDEX IF NOT EXISTS shifts_date_idx ON shifts (date);

CREATE TABLE IF NOT EXISTS schedule_version (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision integer NOT NULL DEFAULT 0
);

INSERT INTO schedule_version (singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS schedule_publication (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision integer NOT NULL,
  shifts jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);
