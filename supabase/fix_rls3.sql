-- Fix: Gruppen per Einladungscode auffindbar machen
-- + Gruppe verlassen / löschen ermöglichen

-- Groups SELECT: eingeloggte User dürfen alle Gruppen sehen
-- (nötig damit der Join-per-Code funktioniert)
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Groups DELETE: nur der Ersteller darf die Gruppe löschen
DROP POLICY IF EXISTS "groups_delete" ON groups;
CREATE POLICY "groups_delete" ON groups FOR DELETE
  USING (auth.uid() = created_by);

-- group_members DELETE: User darf sich selbst aus einer Gruppe entfernen
DROP POLICY IF EXISTS "group_members_delete" ON group_members;
CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (auth.uid() = user_id);
