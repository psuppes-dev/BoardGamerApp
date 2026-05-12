-- =============================================
-- Board-Gamer-App – Supabase Datenbankschema
-- Ausführen im Supabase SQL Editor
-- =============================================

-- Profile (erweitert Supabase Auth users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  food_pref   TEXT CHECK (food_pref IN ('italian','greek','turkish','asian','other')),
  expo_token  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Gruppen
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Gruppen-Mitgliedschaften
CREATE TABLE group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  host_order  INT NOT NULL DEFAULT 0,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Spieltermine
CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID REFERENCES groups(id) ON DELETE CASCADE,
  host_id           UUID REFERENCES profiles(id),
  date              TIMESTAMPTZ NOT NULL,
  location          TEXT NOT NULL,
  status            TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','voting','past')),
  voting_open       BOOLEAN DEFAULT TRUE,
  food_pref_result  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Spielvorschläge
CREATE TABLE game_suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,
  suggested_by  UUID REFERENCES profiles(id),
  game_name     TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Abstimmungen (eine Stimme pro Person pro Event)
CREATE TABLE votes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID REFERENCES events(id) ON DELETE CASCADE,
  suggestion_id  UUID REFERENCES game_suggestions(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Bewertungen (eine Bewertung pro Person pro Event)
CREATE TABLE ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  host_rating     INT CHECK (host_rating BETWEEN 1 AND 5),
  food_rating     INT CHECK (food_rating BETWEEN 1 AND 5),
  evening_rating  INT CHECK (evening_rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Nachrichten / Broadcasts
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES profiles(id),
  text        TEXT NOT NULL,
  type        TEXT DEFAULT 'broadcast' CHECK (type IN ('broadcast','late-notice')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Essensbestellungen (Optional)
CREATE TABLE food_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  food_pref   TEXT,
  order_text  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- =============================================
-- Profil automatisch anlegen nach Registrierung
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Row Level Security (RLS) aktivieren
-- =============================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_orders    ENABLE ROW LEVEL SECURITY;

-- Profiles: jeder kann sein eigenes Profil lesen & schreiben
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Groups: Mitglieder können ihre Gruppe sehen
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group members: Mitglieder sehen andere Mitglieder ihrer Gruppe
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "group_members_insert" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events: nur Gruppenmitglieder
CREATE POLICY "events_select" ON events FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "events_insert" ON events FOR INSERT
  WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

-- Game Suggestions: nur Gruppenmitglieder
CREATE POLICY "suggestions_select" ON game_suggestions FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE group_id IN
    (SELECT group_id FROM group_members WHERE user_id = auth.uid())));
CREATE POLICY "suggestions_insert" ON game_suggestions FOR INSERT
  WITH CHECK (auth.uid() = suggested_by);

-- Votes: nur Gruppenmitglieder
CREATE POLICY "votes_select" ON votes FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE group_id IN
    (SELECT group_id FROM group_members WHERE user_id = auth.uid())));
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON votes FOR DELETE USING (auth.uid() = user_id);

-- Ratings: nur Gruppenmitglieder
CREATE POLICY "ratings_select" ON ratings FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE group_id IN
    (SELECT group_id FROM group_members WHERE user_id = auth.uid())));
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages: nur Gruppenmitglieder
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

-- Food Orders: nur Gruppenmitglieder
CREATE POLICY "food_orders_select" ON food_orders FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE group_id IN
    (SELECT group_id FROM group_members WHERE user_id = auth.uid())));
CREATE POLICY "food_orders_insert" ON food_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "food_orders_update" ON food_orders FOR UPDATE USING (auth.uid() = user_id);
