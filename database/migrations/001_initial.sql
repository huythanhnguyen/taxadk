-- HTKK AI Database Schema
-- Initial migration for Cloudflare D1

-- Form drafts table
CREATE TABLE IF NOT EXISTS form_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT NOT NULL,
  form_code TEXT NOT NULL,
  template_version TEXT NOT NULL,
  form_data TEXT NOT NULL,
  privacy_tier TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata TEXT NOT NULL DEFAULT '{}'
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  privacy_tier TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_activity TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  privacy_tier TEXT NOT NULL,
  data_type TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'info'
);

-- Template cache table
CREATE TABLE IF NOT EXISTS template_cache (
  form_code TEXT NOT NULL,
  version TEXT NOT NULL,
  template TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TEXT NOT NULL,
  PRIMARY KEY (form_code, version)
);

-- Assessment cache table
CREATE TABLE IF NOT EXISTS assessment_cache (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT NOT NULL,
  assessment TEXT NOT NULL,
  consultation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Processing jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  privacy_tier TEXT NOT NULL,
  input_files TEXT NOT NULL,
  output_data TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  metadata TEXT NOT NULL DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_drafts_session ON form_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_user ON form_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_expires ON form_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_template_expires ON template_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_session ON processing_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
