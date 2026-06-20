-- Adaptus DMS - Interactions Table Migration
-- Date: 2024-01-02
-- Purpose: Store SMS and other communication interactions with leads

CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('sms', 'email', 'call', 'note')),
    direction VARCHAR(50) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX idx_interactions_created_at ON interactions(created_at);
CREATE INDEX idx_interactions_type ON interactions(type);

-- Enable RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all interactions
CREATE POLICY "Staff can view all interactions"
  ON interactions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert interactions
CREATE POLICY "Staff can insert interactions"
  ON interactions FOR INSERT
  TO authenticated
  WITH CHECK (true);
