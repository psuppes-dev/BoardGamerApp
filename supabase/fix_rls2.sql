-- =============================================
-- Fix 2: Groups INSERT + SELECT nach Erstellung
-- =============================================

-- Groups INSERT: jeder eingeloggte User darf eine Gruppe erstellen
DROP POLICY IF EXISTS "groups_insert" ON groups;
CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Groups SELECT: eigene Gruppen (als Mitglied) ODER gerade erstellt (created_by)
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (
    id IN (SELECT get_my_group_ids())
    OR created_by = auth.uid()
  );

-- group_members INSERT: jeder eingeloggte User darf sich selbst eintragen
DROP POLICY IF EXISTS "group_members_insert" ON group_members;
CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
