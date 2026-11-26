-- Apply once through Supabase's migration runner. Keep medjed_ranking_private out of the Data API.
CREATE SCHEMA medjed_ranking_private;
CREATE ROLE medjed_ranking_executor NOLOGIN NOINHERIT NOBYPASSRLS;
GRANT medjed_ranking_executor TO postgres;
REVOKE ALL ON SCHEMA medjed_ranking_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE, CREATE ON SCHEMA medjed_ranking_private TO medjed_ranking_executor;

CREATE TABLE medjed_ranking_private.starts (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  total bigint NOT NULL DEFAULT 0,
  rate_minute timestamptz,
  recent integer NOT NULL DEFAULT 0 CHECK (recent BETWEEN 0 AND 600)
);
INSERT INTO medjed_ranking_private.starts DEFAULT VALUES;

CREATE TABLE medjed_ranking_private.runs (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL,
  display_name text CHECK (pg_catalog.char_length(display_name) BETWEEN 1 AND 20),
  client_version text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  score integer CHECK (score >= 0),
  wave integer CHECK (wave BETWEEN 1 AND 40),
  cleared boolean,
  CHECK ((score IS NULL) = (wave IS NULL) AND (score IS NULL) = (cleared IS NULL)),
  CHECK (cleared IS NOT TRUE OR wave = 40)
);
CREATE INDEX medjed_runs_by_player ON medjed_ranking_private.runs (player_id, started_at DESC);

CREATE TABLE medjed_ranking_private.bests (
  player_id uuid PRIMARY KEY,
  display_name text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  wave integer NOT NULL CHECK (wave BETWEEN 1 AND 40),
  achieved_at timestamptz NOT NULL
);
CREATE INDEX medjed_bests_order ON medjed_ranking_private.bests (score DESC, achieved_at, player_id);

ALTER TABLE medjed_ranking_private.starts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medjed_ranking_private.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medjed_ranking_private.bests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA medjed_ranking_private FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE (total, rate_minute, recent) ON medjed_ranking_private.starts TO medjed_ranking_executor;
GRANT SELECT, INSERT (id, player_id, display_name, client_version), UPDATE (score, wave, cleared)
  ON medjed_ranking_private.runs TO medjed_ranking_executor;
GRANT SELECT, INSERT, UPDATE (display_name, score, wave, achieved_at)
  ON medjed_ranking_private.bests TO medjed_ranking_executor;
CREATE POLICY medjed_read ON medjed_ranking_private.starts FOR SELECT TO medjed_ranking_executor USING (true);
CREATE POLICY medjed_count ON medjed_ranking_private.starts FOR UPDATE TO medjed_ranking_executor USING (true);
CREATE POLICY medjed_read ON medjed_ranking_private.runs FOR SELECT TO medjed_ranking_executor USING (true);
CREATE POLICY medjed_start ON medjed_ranking_private.runs FOR INSERT TO medjed_ranking_executor WITH CHECK (score IS NULL);
CREATE POLICY medjed_finish ON medjed_ranking_private.runs FOR UPDATE TO medjed_ranking_executor
  USING (score IS NULL AND display_name IS NOT NULL) WITH CHECK (score IS NOT NULL);
CREATE POLICY medjed_read ON medjed_ranking_private.bests FOR SELECT TO medjed_ranking_executor USING (true);
CREATE POLICY medjed_best_insert ON medjed_ranking_private.bests FOR INSERT TO medjed_ranking_executor WITH CHECK (true);
CREATE POLICY medjed_best_update ON medjed_ranking_private.bests FOR UPDATE TO medjed_ranking_executor USING (true);

CREATE FUNCTION medjed_ranking_private.start_run(p_run_id uuid, p_player_id uuid, p_display_name text, p_client_version text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_name text := nullif(pg_catalog.btrim(p_display_name), '');
  v_run medjed_ranking_private.runs%rowtype;
  v_counter medjed_ranking_private.starts%rowtype;
  v_now timestamptz;
  v_minute timestamptz;
  v_recent integer;
BEGIN
  IF p_run_id IS NULL OR p_player_id IS NULL OR p_client_version IS NULL
    OR p_client_version !~ '^medjedshin_ha_mamotteru-[0-9]{8}-[0-9]{2}$'
    OR pg_catalog.char_length(v_name) > 20
    OR v_name ~ U&'[[:cntrl:]\061C\200B\200E\200F\202A-\202E\2060\2066-\2069]'
    OR v_name ~ U&'^[\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+$'
  THEN RETURN 'invalid'; END IF;

  SELECT * INTO STRICT v_counter FROM medjed_ranking_private.starts WHERE singleton FOR UPDATE;
  SELECT * INTO v_run FROM medjed_ranking_private.runs WHERE id = p_run_id;
  IF FOUND THEN
    IF v_run.player_id = p_player_id AND v_run.display_name IS NOT DISTINCT FROM v_name
      AND v_run.client_version = p_client_version THEN RETURN 'duplicate'; END IF;
    RETURN 'invalid';
  END IF;

  v_now := pg_catalog.clock_timestamp();
  v_minute := pg_catalog.date_trunc('minute', v_now, 'UTC');
  v_recent := CASE WHEN v_counter.rate_minute = v_minute THEN v_counter.recent ELSE 0 END;
  IF v_recent >= 600 OR (
    SELECT pg_catalog.count(*) FROM medjed_ranking_private.runs
    WHERE player_id = p_player_id AND started_at >= v_now - interval '1 minute'
  ) >= 30 THEN RETURN 'limited'; END IF;

  INSERT INTO medjed_ranking_private.runs (id, player_id, display_name, client_version)
    VALUES (p_run_id, p_player_id, v_name, p_client_version);
  UPDATE medjed_ranking_private.starts
    SET total = total + 1, rate_minute = v_minute, recent = v_recent + 1 WHERE singleton;
  RETURN 'accepted';
END;
$$;

CREATE FUNCTION medjed_ranking_private.finish_run(p_run_id uuid, p_player_id uuid, p_score integer, p_wave integer, p_cleared boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_run medjed_ranking_private.runs%rowtype;
BEGIN
  IF p_score IS NULL OR p_score < 0 OR p_wave IS NULL OR p_wave NOT BETWEEN 1 AND 40
    OR p_cleared IS NULL OR (p_cleared AND p_wave <> 40) THEN RETURN false; END IF;

  -- An atomic update serializes concurrent finishes; an equal retry succeeds.
  UPDATE medjed_ranking_private.runs
    SET score = p_score, wave = p_wave, cleared = p_cleared
    WHERE id = p_run_id AND player_id = p_player_id AND display_name IS NOT NULL AND score IS NULL
    RETURNING * INTO v_run;
  IF NOT FOUND THEN
    SELECT * INTO v_run FROM medjed_ranking_private.runs
      WHERE id = p_run_id AND player_id = p_player_id AND display_name IS NOT NULL;
    RETURN FOUND AND v_run.score IS NOT DISTINCT FROM p_score
      AND v_run.wave IS NOT DISTINCT FROM p_wave AND v_run.cleared IS NOT DISTINCT FROM p_cleared;
  END IF;

  INSERT INTO medjed_ranking_private.bests AS b (player_id, display_name, score, wave, achieved_at)
    VALUES (v_run.player_id, v_run.display_name, p_score, p_wave, pg_catalog.clock_timestamp())
    ON CONFLICT (player_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      score = EXCLUDED.score,
      wave = EXCLUDED.wave,
      achieved_at = EXCLUDED.achieved_at
    WHERE EXCLUDED.score > b.score;
  RETURN true;
END;
$$;

CREATE FUNCTION medjed_ranking_private.stats()
RETURNS TABLE (total_play_count bigint, player_count bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
BEGIN ATOMIC
  SELECT s.total, (SELECT pg_catalog.count(*) FROM medjed_ranking_private.bests)
  FROM medjed_ranking_private.starts AS s WHERE s.singleton;
END;

CREATE FUNCTION medjed_ranking_private.board(p_offset integer, p_limit integer)
RETURNS TABLE (rank bigint, display_name text, score integer, wave integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
BEGIN ATOMIC
  SELECT pg_catalog.rank() OVER (ORDER BY b.score DESC), b.display_name, b.score, b.wave
  FROM medjed_ranking_private.bests AS b
  ORDER BY b.score DESC, b.achieved_at, b.player_id
  OFFSET greatest(p_offset, 0) LIMIT least(greatest(p_limit, 1), 501);
END;

ALTER FUNCTION medjed_ranking_private.start_run(uuid, uuid, text, text) OWNER TO medjed_ranking_executor;
ALTER FUNCTION medjed_ranking_private.finish_run(uuid, uuid, integer, integer, boolean) OWNER TO medjed_ranking_executor;
ALTER FUNCTION medjed_ranking_private.stats() OWNER TO medjed_ranking_executor;
ALTER FUNCTION medjed_ranking_private.board(integer, integer) OWNER TO medjed_ranking_executor;
REVOKE CREATE ON SCHEMA medjed_ranking_private FROM medjed_ranking_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA medjed_ranking_private FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA medjed_ranking_private TO anon, authenticated;

CREATE FUNCTION public.medjed_start_v1(p_run_id uuid, p_player_id uuid, p_display_name text, p_client_version text)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = ''
RETURN medjed_ranking_private.start_run(p_run_id, p_player_id, p_display_name, p_client_version);

CREATE FUNCTION public.medjed_finish_v1(p_run_id uuid, p_player_id uuid, p_score integer, p_wave integer, p_cleared boolean)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = ''
RETURN medjed_ranking_private.finish_run(p_run_id, p_player_id, p_score, p_wave, p_cleared);

CREATE FUNCTION public.medjed_stats_v1()
RETURNS TABLE (total_play_count bigint, player_count bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
BEGIN ATOMIC
  SELECT * FROM medjed_ranking_private.stats();
END;

CREATE FUNCTION public.medjed_board_v1(p_offset integer, p_limit integer)
RETURNS TABLE (rank bigint, display_name text, score integer, wave integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
BEGIN ATOMIC
  SELECT * FROM medjed_ranking_private.board(p_offset, p_limit);
END;

REVOKE ALL ON FUNCTION public.medjed_start_v1(uuid, uuid, text, text),
  public.medjed_finish_v1(uuid, uuid, integer, integer, boolean), public.medjed_stats_v1(),
  public.medjed_board_v1(integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.medjed_start_v1(uuid, uuid, text, text),
  public.medjed_finish_v1(uuid, uuid, integer, integer, boolean), public.medjed_stats_v1(),
  public.medjed_board_v1(integer, integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
