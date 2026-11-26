(() => {
  'use strict';

  const endpoint = 'https://mlpnjgezrnhdxsxolyzj.supabase.co/rest/v1/rpc/';
  const apiKey = 'sb_publishable_drzcy0v97knU6FgjqSgBHw_0A9XPdFM';
  const clientVersion = 'medjedshin_ha_mamotteru-20261126-01';
  const nameKey = 'medjed_player_name_v1';
  const playerKey = 'medjed_player_id_v1';
  const pendingPrefix = 'medjed_ranking_pending_v1:';
  const lifetime = 14 * 24 * 60 * 60 * 1000;
  const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const forbiddenNameCharacters = /[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u202a-\u202e\u2060\u2066-\u2069]/u;
  const starting = new Map();
  const finishing = new Map();

  function get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function forget(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  function validName(name) {
    return typeof name === 'string' && [...name].length <= 20 && !forbiddenNameCharacters.test(name);
  }

  let playerId = get(playerKey);
  function start(name) {
    if (!uuidPattern.test(playerId || '')) {
      const existing = get(playerKey);
      playerId = uuidPattern.test(existing || '') ? existing : crypto.randomUUID();
      set(playerKey, playerId);
    }
    set(nameKey, name);
    const run = {
      id: crypto.randomUUID(), playerId, name, clientVersion, createdAt: Date.now(), started: false,
    };
    storePending(run);
    return run;
  }

  function finish(run, score, wave, cleared) {
    run.result = { score, wave, cleared };
    storePending(run);
  }

  function storePending(run) {
    set(pendingPrefix + run.id, JSON.stringify(run));
  }

  function readPending(key) {
    try { return JSON.parse(get(key)); } catch { return null; }
  }

  async function rpc(route, data = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint + route, {
        method: 'POST',
        headers: { apikey: apiKey, 'Content-Type': 'application/json' },
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw Object.assign(new Error('Ranking request failed'), {
        retryable: response.status >= 500 || [404, 408, 425, 429].includes(response.status),
      });
      return await response.json();
    } catch (error) {
      if (typeof error.retryable !== 'boolean') error.retryable = true;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function once(inFlight, id, action) {
    if (!inFlight.has(id)) {
      inFlight.set(id, action().finally(() => inFlight.delete(id)));
    }
    return inFlight.get(id);
  }

  async function send(run) {
    const key = pendingPrefix + run.id;
    try {
      if (!run.started) {
        const state = await once(starting, run.id, () => rpc('medjed_start_v1', {
          p_run_id: run.id, p_player_id: run.playerId, p_display_name: run.name || null, p_client_version: run.clientVersion,
        }));
        if (state !== 'accepted' && state !== 'duplicate') {
          throw Object.assign(new Error('Start was not accepted'), { retryable: state === 'limited' });
        }
        run.started = true;
      }
      if (run.result && run.name) {
        storePending(run);
        const { score, wave, cleared } = run.result;
        const accepted = await once(finishing, run.id, () => rpc('medjed_finish_v1', {
          p_run_id: run.id, p_player_id: run.playerId, p_score: score, p_wave: wave, p_cleared: cleared,
        }));
        if (accepted !== true) throw Object.assign(new Error('Result was not accepted'), { retryable: false });
        forget(key);
      } else if (!readPending(key)?.result) {
        forget(key);
      }
    } catch (error) {
      if (!error.retryable) forget(key);
      throw error;
    }
  }

  async function flush() {
    let keys;
    try { keys = Object.keys(localStorage).filter(key => key.startsWith(pendingPrefix)); } catch { return; }
    for (const key of keys) {
      const run = readPending(key);
      if (!run || key !== pendingPrefix + run.id || !uuidPattern.test(run.id) ||
        !uuidPattern.test(run.playerId) || !validName(run.name) ||
        !Number.isFinite(run.createdAt) || Date.now() - run.createdAt > lifetime) {
        forget(key);
        continue;
      }
      try { await send(run); } catch (error) { if (error.retryable) break; }
    }
  }

  async function playCount() {
    const [stats] = await rpc('medjed_stats_v1');
    const count = stats?.total_play_count;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid play count');
    return count;
  }

  window.MedjedRanking = {
    start, finish, send, flush, playCount, validName,
    hasPlayed() { return uuidPattern.test(get(playerKey) || ''); },
    savedName() { const name = get(nameKey) || ''; return validName(name) ? name : ''; },
  };
})();
