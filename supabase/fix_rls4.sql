-- Phase 3: Event-Host darf voting_open schließen
CREATE POLICY "events_update" ON events FOR UPDATE
  USING (host_id = auth.uid());
