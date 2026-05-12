-- =============================================
-- Fix: Infinite recursion in group_members RLS
-- Alle alten Policies droppen und neu anlegen
-- mit einer SECURITY DEFINER Hilfsfunktion
-- =============================================

-- Hilfsfunktion: gibt alle group_ids des eingeloggten Nutzers zurück
-- SECURITY DEFINER = läuft als postgres-User, umgeht RLS → kein Rekursionsproblem
CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid();
$$;

-- =============================================
-- Alte Policies droppen
-- =============================================
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_insert" ON group_members;
DROP POLICY IF EXISTS "groups_select"        ON groups;
DROP POLICY IF EXISTS "groups_insert"        ON groups;
DROP POLICY IF EXISTS "events_select"        ON events;
DROP POLICY IF EXISTS "events_insert"        ON events;
DROP POLICY IF EXISTS "suggestions_select"   ON game_suggestions;
DROP POLICY IF EXISTS "suggestions_insert"   ON game_suggestions;
DROP POLICY IF EXISTS "votes_select"         ON votes;
DROP POLICY IF EXISTS "votes_insert"         ON votes;
DROP POLICY IF EXISTS "votes_delete"         ON votes;
DROP POLICY IF EXISTS "ratings_select"       ON ratings;
DROP POLICY IF EXISTS "ratings_insert"       ON ratings;
DROP POLICY IF EXISTS "messages_select"      ON messages;
DROP POLICY IF EXISTS "messages_insert"      ON messages;
DROP POLICY IF EXISTS "food_orders_select"   ON food_orders;
DROP POLICY IF EXISTS "food_orders_insert"   ON food_orders;
DROP POLICY IF EXISTS "food_orders_update"   ON food_orders;

-- =============================================
-- Neue Policies mit Hilfsfunktion
-- =============================================

-- group_members
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- groups
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (id IN (SELECT get_my_group_ids()));

CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- events
CREATE POLICY "events_select" ON events FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "events_insert" ON events FOR INSERT
  WITH CHECK (group_id IN (SELECT get_my_group_ids()));

-- game_suggestions
CREATE POLICY "suggestions_select" ON game_suggestions FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE group_id IN (SELECT get_my_group_ids())
  ));

CREATE POLICY "suggestions_insert" ON game_suggestions FOR INSERT
  WITH CHECK (auth.uid() = suggested_by);

-- votes
CREATE POLICY "votes_select" ON votes FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE group_id IN (SELECT get_my_group_ids())
  ));

CREATE POLICY "votes_insert" ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_delete" ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- ratings
CREATE POLICY "ratings_select" ON ratings FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE group_id IN (SELECT get_my_group_ids())
  ));

CREATE POLICY "ratings_insert" ON ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- messages
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    group_id IN (SELECT get_my_group_ids())
  );

-- food_orders
CREATE POLICY "food_orders_select" ON food_orders FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE group_id IN (SELECT get_my_group_ids())
  ));

CREATE POLICY "food_orders_insert" ON food_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "food_orders_update" ON food_orders FOR UPDATE
  USING (auth.uid() = user_id);
