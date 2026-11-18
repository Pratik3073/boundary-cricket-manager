
import { useEffect, useState } from 'react';
import {
  Link, Navigate, Route, Routes, useNavigate, useParams
} from 'react-router-dom';
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Check,
  CircleHelp, ClipboardList, LogOut, Plus, Radio,
  RefreshCw, ShieldCheck, Trash2, Trophy, Users, Menu, X, Search
} from 'lucide-react';

import { isSupabaseConfigured, supabase } from './services/supabase';
import {
  createMatch, deleteMatch, deletePlayer, finishMatch, getMatchBundle,
  getMatches, getPlayers, getPlayerRecords, recordDelivery, savePlayer,
  startInnings, undoDelivery
} from './services/data';
import { calculateInnings, getEndChange } from './utils/scoringEngine';

// AUTH
function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => setSession(next)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

// LAYOUT
function Shell({ children }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/');
  }

  function closeMenu() { setMenuOpen(false); }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark"><Trophy size={19} /></span>
          <span>BOUNDARY<span className="brand-sub">CRICKET MANAGER</span></span>
        </Link>

        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>

        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'}>
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/matches" onClick={closeMenu}>Matches</Link>
          <Link to="/players" onClick={closeMenu}>Players</Link>
          {session && <Link to="/admin" onClick={closeMenu}>Admin</Link>}
          {session && <button className="mobile-signout" onClick={signOut}><LogOut size={15} /> Sign out</button>}
        </nav>

        <div className="top-actions">
          {session ? (
            <button className="button button-ghost small" onClick={signOut}>
              <LogOut size={15} /> Sign out
            </button>
          ) : (
            <Link className="button button-dark small" to="/login" onClick={closeMenu}>
              Admin login
            </Link>
          )}
        </div>
      </header>

      <main className="page-wrap">{children}</main>
      <footer>BOUNDARY <span>·</span> Built for the love of cricket</footer>
    </div>
  );
}

function Notice({ children, type = 'error' }) {
  return children ? <div className={`notice ${type}`}>{children}</div> : null;
}

function ConfigNotice() {
  return (
    <div className="config-screen">
      <div className="config-card">
        <span className="brand-mark large"><Trophy /></span>
        <h1>Connect your cricket database</h1>
        <p>
          Your project files are ready. Add your Supabase project URL and
          publishable key to <code>.env.local</code>, then restart the
          development server.
        </p>
        <ol>
          <li>Create a project in Supabase.</li>
          <li>Run <code>supabase/schema.sql</code> in SQL Editor.</li>
          <li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in the credentials.</li>
        </ol>
        <p className="muted">
          Never put a Supabase secret/service-role key in frontend code.
        </p>
        <a
          className="button button-dark"
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
        >
          Open Supabase <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}

// HOME
function HomePage() {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getMatches().then(setMatches).catch(e => setError(e.message));
  }, []);

  const live = matches.filter(m => m.status === 'live');

  return (
    <Shell>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> YOUR LOCAL CRICKET, LIVE
          </div>

          <h1>Every run.<br /><em>Every moment.</em></h1>

          <p>
            Simple match management and live scoring for your cricket ground.
            Set up teams, score every delivery and share the live match with everyone.
          </p>

          <div className="hero-buttons">
            <Link to="/matches" className="button button-lime">
              View live matches <ArrowRight size={17} />
            </Link>
            <Link to="/login" className="button button-outline">
              Scorer login
            </Link>
          </div>
        </div>

        <div className="hero-score">
          <div className="score-card-top">
            <span>FEATURED MATCH</span>
            <span className="live-pill">● LIVE</span>
          </div>

          <div className="versus">
            <div><span className="team-avatar">A</span><b>TEAM A</b></div>
            <span className="versus-text">VS</span>
            <div><span className="team-avatar alt">B</span><b>TEAM B</b></div>
          </div>

          <div className="hero-score-number">--/--</div>
          <div className="hero-overs">0.0 OVERS <span>·</span> MATCH AWAITING</div>

          <div className="score-card-bottom">
            <span>BOUNDARY CRICKET</span>
            <Activity size={17} />
          </div>
        </div>

        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark-eyebrow">MATCH CENTRE</div>
            <h2>Live from the ground</h2>
          </div>
          <Link to="/matches" className="text-link">
            All matches <ArrowRight size={15} />
          </Link>
        </div>

        <Notice>
          {error && !error.includes('not configured') ? error : ''}
        </Notice>

        {live.length ? (
          <div className="match-grid">
            {live.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        ) : (
          <div className="empty-state">
            <Radio size={26} />
            <b>No live matches right now</b>
            <span>When the scorer starts a match, it will appear here.</span>
          </div>
        )}
      </section>

      <section className="feature-row">
        <Feature icon={<Users />} title="Manage players"
          text="Keep a reusable player list and select teams for every match." />
        <Feature icon={<Activity />} title="Score ball by ball"
          text="Runs, extras, wickets, strike changes and overs in one place." />
        <Feature icon={<Radio />} title="Share live scores"
          text="A public link lets everyone follow the match on their phone." />
      </section>
    </Shell>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <span>{icon}</span>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

function MatchCard({ match }) {
  return (
    <Link to={`/live/${match.id}`} className="match-card">
      <div className="match-card-head">
        <span className="live-pill">● LIVE</span>
        <span>{match.overs_limit} OVERS</span>
      </div>
      <div className="match-teams">
        <b>{match.team_a_name}</b><span>VS</span><b>{match.team_b_name}</b>
      </div>
      <div className="match-card-foot">
        View live score <ArrowRight size={15} />
      </div>
    </Link>
  );
}

// LOGIN
function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email, password
      });
      if (authError) throw authError;
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="form-page">
        <div className="form-intro">
          <div className="eyebrow dark-eyebrow">SCORER ACCESS</div>
          <h1>Welcome back,<br /><em>match official.</em></h1>
          <p>Sign in to manage players, create fixtures and operate the live scoring desk.</p>
          <div className="secure-note">
            <ShieldCheck size={18} /> Only the authorized scorer should have an account.
          </div>
        </div>

        <form className="panel form-card" onSubmit={submit}>
          <div className="panel-title">
            <h2>Admin login</h2>
            <span className="panel-icon"><ShieldCheck /></span>
          </div>

          <Notice>{error}</Notice>

          <label>
            Email address
            <input type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required />
          </label>

          <label>
            Password
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password" required />
          </label>

          <button className="button button-lime full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} />
          </button>

          <p className="form-foot">
            Create your first admin user in Supabase Authentication → Users.
          </p>
        </form>
      </div>
    </Shell>
  );
}

// ADMIN DASHBOARD
function AdminPage() {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    try {
      setMatches(await getMatches());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDeleteMatch(match) {
    const confirmed = window.confirm(
      `Delete the match \"${match.team_a_name} vs ${match.team_b_name}\"?\n\nThis permanently deletes its innings, deliveries, and team selections. This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(match.id);
    setError('');
    try {
      await deleteMatch(match.id);
      setMatches(current => current.filter(item => item.id !== match.id));
    } catch (e) {
      setError(`Could not delete match: ${e.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="SCORER WORKSPACE"
        title="Match dashboard"
        subtitle="Your ground. Your players. Your scoreboard."
        action={
          <Link className="button button-lime" to="/admin/match-setup">
            <Plus size={17} /> Create match
          </Link>
        }
      />

      <Notice>{error}</Notice>

      <div className="stat-grid">
        <Stat icon={<Trophy />} label="Total matches" value={matches.length} />
        <Stat icon={<Radio />} label="Live now"
          value={matches.filter(m => m.status === 'live').length} />
        <Stat icon={<Check />} label="Completed"
          value={matches.filter(m => m.status === 'completed').length} />
      </div>

      <div className="section-heading compact">
        <h2>Recent matches</h2>
        <button className="button button-ghost small" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Loading matches…</div>
      ) : matches.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Match</th><th>Overs</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.id}>
                  <td>
                    <b>{m.team_a_name} vs {m.team_b_name}</b>
                    <small>{new Date(m.created_at).toLocaleDateString()}</small>
                  </td>
                  <td>{m.overs_limit}</td>
                  <td><Status status={m.status} /></td>
                  <td>
                    <div className="admin-match-actions">
                      <Link className="table-link"
                        to={m.status === 'live' ? `/admin/scoring/${m.id}` : `/live/${m.id}`}>
                        {m.status === 'live' ? 'Open scorer' : 'View match'}
                        <ArrowRight size={14} />
                      </Link>
                      <button
                        type="button"
                        className="button button-danger small"
                        onClick={() => handleDeleteMatch(m)}
                        disabled={deletingId === m.id}
                        aria-label={`Delete ${m.team_a_name} vs ${m.team_b_name}`}
                      >
                        <Trash2 size={14} />
                        {deletingId === m.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <ClipboardList size={26} />
          <b>No matches created yet</b>
          <span>Create your first match to get started.</span>
          <Link className="button button-lime" to="/admin/match-setup">Create first match</Link>
        </div>
      )}

      <div className="admin-links">
        <Link to="/admin/players"><Users /> Manage players <ArrowRight size={15} /></Link>
        <Link to="/matches"><Radio /> Public match centre <ArrowRight size={15} /></Link>
      </div>
    </Shell>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  );
}

function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow dark-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Status({ status }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

// PLAYERS
function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setPlayers(await getPlayers());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      await savePlayer({ name, phone });
      setName('');
      setPhone('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this player? Players used in matches cannot be deleted.')) return;

    try {
      await deletePlayer(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="PLAYER REGISTER"
        title="Manage players"
        subtitle="Add players once and reuse them across your matches."
        action={
          <Link className="button button-ghost" to="/admin">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        }
      />

      <Notice>{error}</Notice>

      <div className="split-layout">
        <form className="panel add-player" onSubmit={add}>
          <div className="panel-title">
            <h2>Add a player</h2><span className="panel-icon"><Plus /></span>
          </div>

          <label>
            Player name
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Pratik Kadam" maxLength="80" required />
          </label>

          <label>
            Phone (optional)
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Contact number" />
          </label>

          <button className="button button-lime full" disabled={busy}>
            {busy ? 'Saving…' : 'Add player'} <Plus size={16} />
          </button>
          <p className="muted tiny">
            A new player can also be added here whenever someone arrives at the ground.
          </p>
        </form>

        <div className="panel roster-panel">
          <div className="panel-title">
            <div><h2>Player directory</h2><p>{players.length} registered players</p></div>
            <Users />
          </div>

          {players.length ? players.map(p => (
            <div className="player-row" key={p.id}>
              <span className="player-avatar">{p.name.slice(0, 1).toUpperCase()}</span>
              <b>{p.name}</b>
              <span className="player-phone">{p.phone || '—'}</span>
              <button className="icon-button danger" onClick={() => remove(p.id)}
                aria-label="Delete player">
                <Trash2 size={16} />
              </button>
            </div>
          )) : <div className="empty-mini">No players added yet.</div>}
        </div>
      </div>
    </Shell>
  );
}

// MATCH SETUP
function MatchSetupPage() {
  const [players, setPlayers] = useState([]);
  const [title, setTitle] = useState('Weekend Cricket Match');
  const [teamA, setTeamA] = useState('Team A');
  const [teamB, setTeamB] = useState('Team B');
  const [overs, setOvers] = useState(8);
  const [a, setA] = useState([]);
  const [b, setB] = useState([]);
  const [capA, setCapA] = useState('');
  const [capB, setCapB] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getPlayers().then(setPlayers).catch(e => setError(e.message));
  }, []);

  function toggle(id, team) {
    const setter = team === 'A' ? setA : setB;
    const other = team === 'A' ? b : a;

    setter(old => old.includes(id)
      ? old.filter(x => x !== id)
      : other.includes(id) ? old : [...old, id]);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!a.length || !b.length) return setError('Select at least one player for each team.');
    if (!capA || !capB) return setError('Select a captain for both teams.');

    setBusy(true);

    try {
      const match = await createMatch({
        title, teamA, teamB, overs: Number(overs),
        teamAPlayers: a, teamBPlayers: b,
        captainA: capA, captainB: capB
      });
      navigate(`/admin/match-setup/${match.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="NEW FIXTURE"
        title="Set up a match"
        subtitle="Choose your teams, captains and match format."
        action={
          <Link className="button button-ghost" to="/admin">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        }
      />

      <Notice>{error}</Notice>

      {players.length === 0 ? (
        <div className="empty-state">
          <Users size={26} />
          <b>Add players before creating a match</b>
          <span>Your player directory is currently empty.</span>
          <Link className="button button-lime" to="/admin/players">Add players</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="setup-form">
          <div className="panel">
            <div className="panel-title">
              <h2>Match details</h2><span className="step-tag">01 / DETAILS</span>
            </div>

            <label>Match name
              <input value={title} onChange={e => setTitle(e.target.value)} required />
            </label>

            <div className="two-col">
              <label>Team A name
                <input value={teamA} onChange={e => setTeamA(e.target.value)} required />
              </label>
              <label>Team B name
                <input value={teamB} onChange={e => setTeamB(e.target.value)} required />
              </label>
            </div>

            <label>Overs per innings
              <input type="number" min="1" max="100" value={overs}
                onChange={e => setOvers(e.target.value)} required />
            </label>
          </div>

          <div className="team-select-grid">
            <TeamPicker label="TEAM A" name={teamA} players={players}
              selected={a} captain={capA} setCaptain={setCapA}
              onToggle={id => toggle(id, 'A')} />
            <TeamPicker label="TEAM B" name={teamB} players={players}
              selected={b} captain={capB} setCaptain={setCapB}
              onToggle={id => toggle(id, 'B')} />
          </div>

          <div className="setup-footer">
            <span>{a.length} players in {teamA} · {b.length} players in {teamB}</span>
            <button className="button button-lime" disabled={busy}>
              {busy ? 'Creating match…' : 'Continue to toss'}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
    </Shell>
  );
}

function TeamPicker({ label, name, players, selected, captain, setCaptain, onToggle }) {
  return (
    <div className="panel team-picker">
      <div className="panel-title">
        <div>
          <span className="eyebrow dark-eyebrow">{label}</span>
          <h2>{name}</h2>
          <p>{selected.length} selected</p>
        </div>
        <Users />
      </div>

      <div className="picker-list">
        {players.map(p => (
          <label className="picker-row" key={p.id}>
            <input type="checkbox" checked={selected.includes(p.id)}
              onChange={() => onToggle(p.id)} />
            <span>{p.name}</span>
          </label>
        ))}
      </div>

      <label>Captain
        <select value={captain} onChange={e => setCaptain(e.target.value)} required>
          <option value="">Select captain</option>
          {players.filter(p => selected.includes(p.id)).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

// TOSS
function TossPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [winner, setWinner] = useState('A');
  const [decision, setDecision] = useState('bat');
  const [batting, setBatting] = useState('A');
  const [striker, setStriker] = useState('');
  const [non, setNon] = useState('');
  const [bowler, setBowler] = useState('');
  const [keeper, setKeeper] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMatchBundle(id).then(setBundle).catch(e => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (bundle) {
      const initial = winner === 'A'
        ? (decision === 'bat' ? 'A' : 'B')
        : (decision === 'bat' ? 'B' : 'A');
      setBatting(initial);
    }
  }, [winner, decision, bundle]);

  if (!bundle) return <Shell><Notice>{error || 'Loading match…'}</Notice></Shell>;

  const batPlayers = bundle.roster.filter(p => p.team === batting);
  const bowlPlayers = bundle.roster.filter(p => p.team !== batting);

  async function start(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      await startInnings(id, 1, batting, striker, non, bowler, keeper, winner, decision);
      navigate(`/admin/scoring/${id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <PageHeader eyebrow="MATCH SETUP · TOSS" title="Ready for the toss?"
        subtitle={`${bundle.match.team_a_name} vs ${bundle.match.team_b_name} · ${bundle.match.overs_limit} overs`} />
      <Notice>{error}</Notice>

      <form className="panel toss-form" onSubmit={start}>
        <div className="two-col">
          <label>Toss winner
            <select value={winner} onChange={e => setWinner(e.target.value)}>
              <option value="A">{bundle.match.team_a_name}</option>
              <option value="B">{bundle.match.team_b_name}</option>
            </select>
          </label>

          <label>Decision
            <select value={decision} onChange={e => setDecision(e.target.value)}>
              <option value="bat">Bat first</option>
              <option value="bowl">Bowl first</option>
            </select>
          </label>
        </div>

        <div className="notice info">
          {winner === 'A' ? bundle.match.team_a_name : bundle.match.team_b_name}
          {' '}won the toss and chose to {decision}.
        </div>

        <div className="two-col">
          <label>Opening striker
            <select required value={striker} onChange={e => setStriker(e.target.value)}>
              <option value="">Select batter</option>
              {batPlayers.map(p => (
                <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
              ))}
            </select>
          </label>

          <label>Non-striker
            <select required value={non} onChange={e => setNon(e.target.value)}>
              <option value="">Select batter</option>
              {batPlayers.filter(p => p.player_id !== striker).map(p => (
                <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label>Opening bowler
          <select required value={bowler} onChange={e => {
            const selectedBowler = e.target.value;
            setBowler(selectedBowler);
            if (keeper === selectedBowler) setKeeper('');
          }}>
            <option value="">Select bowler</option>
            {bowlPlayers.map(p => (
              <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
            ))}
          </select>
        </label>

        <label>Wicketkeeper
          <select required value={keeper} onChange={e => setKeeper(e.target.value)}>
            <option value="">Select wicketkeeper</option>
            {bowlPlayers.filter(p => p.player_id !== bowler).map(p => (
              <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
            ))}
          </select>
        </label>

        <button className="button button-lime full" disabled={busy}>
          {busy ? 'Starting…' : 'Start first innings'} <ArrowRight size={16} />
        </button>
      </form>
    </Shell>
  );
}

// SCORING
function ScoringPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newBatter, setNewBatter] = useState('');
  const [newBowler, setNewBowler] = useState('');
  const [newKeeper, setNewKeeper] = useState('');
  const [wicketOpen, setWicketOpen] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [dismissed, setDismissed] = useState('striker');
  const [fielderId, setFielderId] = useState('');
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraType, setExtraType] = useState('wide');
  const [extraRuns, setExtraRuns] = useState(1);
  const [notice, setNotice] = useState('');
  const [secondStriker, setSecondStriker] = useState('');
  const [secondNon, setSecondNon] = useState('');
  const [secondBowler, setSecondBowler] = useState('');
  const [secondKeeper, setSecondKeeper] = useState('');

  async function load() {
    try {
      setBundle(await getMatchBundle(id));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (!bundle) return <Shell><Notice>{error || 'Loading scorer…'}</Notice></Shell>;

  const match = bundle.match;
  const innings = bundle.innings.find(i => i.status === 'live') ||
    bundle.innings[bundle.innings.length - 1];

  if (!innings) return <TossPage />;

  const deliveries = [...(innings.deliveries || [])].sort(
    (x, y) => new Date(x.created_at) - new Date(y.created_at)
  );

  const calc = calculateInnings(deliveries);
  const roster = bundle.roster;
  const striker = innings.striker_id;
  const non = innings.non_striker_id;
  const bowler = innings.current_bowler_id;
  const wicketkeeper = innings.wicketkeeper_id;

  const playerName = playerId =>
    roster.find(p => p.player_id === playerId)?.players?.name || '—';

  const batting = roster.filter(p => p.team === innings.batting_team);
  const bowling = roster.filter(p => p.team !== innings.batting_team);
  const used = new Set(deliveries.flatMap(d => [d.striker_id, d.non_striker_id]));
  const nextBatters = batting.filter(p => !used.has(p.player_id));

  const currentOver = deliveries.filter(d => d.is_legal).length;
  const lastLegalDelivery = [...deliveries].reverse().find(d => d.is_legal);

  // Allow the scorer to select the next bowler after the previous over.
  const overDone = currentOver > 0 &&
    currentOver % 6 === 0 &&
    lastLegalDelivery?.bowler_id === bowler;

  const firstInnings = bundle.innings.find(i => i.innings_number === 1);
  const firstRuns = firstInnings
    ? calculateInnings(firstInnings.deliveries || []).runs
    : 0;

  const target = firstRuns + 1;

  const inningsDone =
    calc.legalBalls >= match.overs_limit * 6 ||
    calc.wickets >= batting.length - 1 ||
    (innings.innings_number === 2 && calc.runs >= target);

  const opponentTeam = innings.batting_team === 'A' ? 'B' : 'A';
  const secondBatters = roster.filter(p => p.team === opponentTeam);
  const secondBowlers = roster.filter(p => p.team === innings.batting_team);

  async function addBall(runs = 0, extra = null, extras = 0, wicket = null, offender = null, fielder = null) {
    if (busy || inningsDone || overDone) return;

    setBusy(true);
    setError('');

    try {
      const delivery = {
        striker_id: striker,
        non_striker_id: non,
        bowler_id: bowler,
        batter_runs: runs,
        extra_type: extra,
        extra_runs: extras,
        is_legal: !['wide', 'no_ball'].includes(extra),
        wicket_type: wicket,
        dismissed_player_id: offender,
        fielder_id: ['caught', 'run_out'].includes(wicket) ? (fielder || null) : null,
        wicketkeeper_id: wicket === 'stumped' ? (wicketkeeper || null) : null
      };

      const legal = calc.legalBalls + (delivery.is_legal ? 1 : 0);

      let nextStriker = striker;
      let nextNon = non;

      if (getEndChange(delivery)) {
        [nextStriker, nextNon] = [nextNon, nextStriker];
      }

      if (delivery.is_legal && legal % 6 === 0) {
        [nextStriker, nextNon] = [nextNon, nextStriker];
      }

      if (wicket && offender === nextStriker) nextStriker = null;
      else if (wicket && offender === nextNon) nextNon = null;

      await recordDelivery(innings, delivery, {
        striker_id: nextStriker,
        non_striker_id: nextNon
      });

      await load();
      setNotice(`${wicket ? 'Wicket' : extra ? extra.replace('_', ' ') : `${runs} run(s)`} recorded`);
      setWicketOpen(false);
      setExtraOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeBatter(which) {
    if (!newBatter || busy) return;

    setBusy(true);
    try {
      const patch = which === 'striker'
        ? { striker_id: newBatter }
        : { non_striker_id: newBatter };

      const { error: updateError } = await supabase
        .from('innings').update(patch).eq('id', innings.id);

      if (updateError) throw updateError;
      setNewBatter('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeBowler() {
    if (!newBowler || busy || newBowler === bowler) return;

    setBusy(true);
    try {
      const { error: updateError } = await supabase
        .from('innings')
        .update({ current_bowler_id: newBowler })
        .eq('id', innings.id);

      if (updateError) throw updateError;
      setNewBowler('');
      await load();
      setNotice('Next bowler updated successfully');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeWicketkeeper() {
    if (!newKeeper || busy || newKeeper === wicketkeeper) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const { data, error: updateError } = await supabase
        .from('innings')
        .update({ wicketkeeper_id: newKeeper })
        .eq('id', innings.id)
        .select('id, wicketkeeper_id')
        .single();

      if (updateError) throw updateError;

      if (!data || data.wicketkeeper_id !== newKeeper) {
        throw new Error('Wicketkeeper update was not confirmed.');
      }

      setNewKeeper('');
      await load();
      setNotice(`Wicketkeeper changed to ${playerName(newKeeper)}`);
    } catch (e) {
      setError(`Wicketkeeper update failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!deliveries.length || busy) return;
    if (!confirm('Undo the last delivery?')) return;

    setBusy(true);
    try {
      const last = deliveries[deliveries.length - 1];
      await undoDelivery(innings, {
        striker_id: last.striker_id,
        non_striker_id: last.non_striker_id
      });
      await load();
      setNotice('Last delivery undone');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function endInnings() {
    if (!confirm('Finish this innings?')) return;

    try {
      const { error: updateError } = await supabase
        .from('innings').update({ status: 'completed' }).eq('id', innings.id);
      if (updateError) throw updateError;
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function finish() {
    try {
      await finishMatch(id);
      navigate('/admin');
    } catch (e) {
      setError(e.message);
    }
  }

  async function startSecond(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      await startInnings(
        id, 2, opponentTeam, secondStriker, secondNon,
        secondBowler, secondKeeper, match.toss_winner, match.toss_decision
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (innings.status === 'completed' && innings.innings_number === 1) {
    return (
      <Shell>
        <PageHeader eyebrow="INNINGS BREAK" title="Start second innings"
          subtitle={`${match.team_a_name} vs ${match.team_b_name} · First innings completed`} />
        <Notice>{error}</Notice>

        <form className="panel toss-form" onSubmit={startSecond}>
          <div className="notice info">
            Target: {firstRuns + 1} runs for{' '}
            {opponentTeam === 'A' ? match.team_a_name : match.team_b_name}.
          </div>

          <div className="two-col">
            <label>Opening striker
              <select required value={secondStriker} onChange={e => setSecondStriker(e.target.value)}>
                <option value="">Select batter</option>
                {secondBatters.map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
                ))}
              </select>
            </label>

            <label>Non-striker
              <select required value={secondNon} onChange={e => setSecondNon(e.target.value)}>
                <option value="">Select batter</option>
                {secondBatters.filter(p => p.player_id !== secondStriker).map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label>Opening bowler
            <select required value={secondBowler} onChange={e => {
              const selectedBowler = e.target.value;
              setSecondBowler(selectedBowler);
              if (secondKeeper === selectedBowler) setSecondKeeper('');
            }}>
              <option value="">Select bowler</option>
              {secondBowlers.map(p => (
                <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
              ))}
            </select>
          </label>

          <label>Wicketkeeper
            <select required value={secondKeeper} onChange={e => setSecondKeeper(e.target.value)}>
              <option value="">Select wicketkeeper</option>
              {secondBowlers.filter(p => p.player_id !== secondBowler).map(p => (
                <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
              ))}
            </select>
          </label>

          <button className="button button-lime full" disabled={busy}>
            Start second innings <ArrowRight size={16} />
          </button>
        </form>
      </Shell>
    );
  }

  if (innings.status === 'completed' && innings.innings_number === 2) {
    return (
      <Shell>
        <div className="empty-state">
          <Trophy size={30} />
          <b>Both innings completed</b>
          <span>First innings: {firstRuns} · Second innings: {calc.runs}/{calc.wickets}</span>
          <button className="button button-lime" onClick={finish}>Complete match</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="scorer-top">
        <div>
          <div className="eyebrow dark-eyebrow">LIVE SCORING DESK</div>
          <h1>{match.team_a_name} <span>vs</span> {match.team_b_name}</h1>
          <p>{match.overs_limit} overs · Innings {innings.innings_number} · <Status status="live" /></p>
        </div>
        <Link className="button button-ghost small" to={`/live/${id}`} target="_blank">
          <Radio size={15} /> Public view
        </Link>
      </div>

      <Notice>{error}</Notice>
      {notice && <Notice type="success">{notice}</Notice>}

      <div className="scoring-layout">
        <div className="scoring-main">
          <div className="scoreboard panel dark-scoreboard">
            <div className="scoreboard-label">
              <span>{innings.batting_team === 'A' ? match.team_a_name : match.team_b_name} BATTING</span>
              <span className="live-pill">● LIVE</span>
            </div>

            <div className="score-big">{calc.runs}<small>/{calc.wickets}</small></div>

            <div className="score-meta">
              <span>{calc.overs} <small>OVERS</small></span>
              <span>CRR {calc.runRate}</span>
              <span>{match.overs_limit} OVERS</span>
            </div>

            <div className="score-bottom">
              <div><small>STRIKER</small><b>{playerName(striker)} <i>★</i></b></div>
              <div><small>NON-STRIKER</small><b>{playerName(non)}</b></div>
              <div><small>BOWLER</small><b>{playerName(bowler)}</b></div>
              <div><small>WICKETKEEPER</small><b>{playerName(wicketkeeper)}</b></div>
            </div>
          </div>

          <div className="panel scoring-pad">
            <div className="panel-title">
              <div><h2>Runs</h2><p>Tap the outcome of the delivery</p></div>
              <span className="step-tag">BALL BY BALL</span>
            </div>

            <div className="run-buttons">
              {[0, 1, 2, 3, 4, 6].map(n => (
                <button key={n}
                  disabled={busy || inningsDone || overDone || !striker || !bowler}
                  className={n === 4 || n === 6 ? 'run-special' : ''}
                  onClick={() => addBall(n)}>
                  {n === 0 ? 'Dot' : n}
                </button>
              ))}
            </div>

            <div className="scoring-actions">
              <button disabled={busy || inningsDone || overDone}
                onClick={() => { setExtraType('wide'); setExtraRuns(1); setExtraOpen(true); }}>Wide</button>
              <button disabled={busy || inningsDone || overDone}
                onClick={() => { setExtraType('no_ball'); setExtraRuns(1); setExtraOpen(true); }}>No ball</button>
              <button disabled={busy || inningsDone || overDone}
                onClick={() => { setExtraType('bye'); setExtraRuns(1); setExtraOpen(true); }}>Bye</button>
              <button disabled={busy || inningsDone || overDone}
                onClick={() => { setExtraType('leg_bye'); setExtraRuns(1); setExtraOpen(true); }}>Leg bye</button>
              <button className="wicket-button" disabled={busy || inningsDone || overDone}
                onClick={() => setWicketOpen(true)}>Wicket</button>
            </div>

            {extraOpen && (
              <div className="inline-editor">
                <b>{extraType.replace('_', ' ').toUpperCase()}</b>
                <label>Extra runs
                  <input type="number" min="1" max="10" value={extraRuns}
                    onChange={e => setExtraRuns(Number(e.target.value))} />
                </label>
                <div className="button-row">
                  <button className="button button-lime"
                    onClick={() => addBall(0, extraType, extraRuns)}>Record extra</button>
                  <button className="button button-ghost" onClick={() => setExtraOpen(false)}>Cancel</button>
                </div>
              </div>
            )}

            {wicketOpen && (
              <div className="inline-editor">
                <b>RECORD WICKET</b>
                <div className="two-col">
                  <label>Dismissal
                    <select value={wicketType} onChange={e => { setWicketType(e.target.value); setFielderId(""); }}>
                      {['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_hurt'].map(w => (
                        <option key={w} value={w}>{w.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </label>
                  <label>Dismissed player
                    <select value={dismissed} onChange={e => setDismissed(e.target.value)}>
                      <option value="striker">{playerName(striker)} (striker)</option>
                      <option value="non_striker">{playerName(non)} (non-striker)</option>
                    </select>
                  </label>
                </div>
                {['caught', 'run_out'].includes(wicketType) && (
                  <label>
                    {wicketType === 'caught' ? 'Caught by' : 'Run out by'}
                    <select
                      value={fielderId}
                      onChange={e => setFielderId(e.target.value)}
                      required
                    >
                      <option value="">
                        {wicketType === 'caught'
                          ? 'Select fielder who took the catch'
                          : 'Select fielder who effected the run out'}
                      </option>
                      {bowling.map(p => (
                        <option key={p.player_id} value={p.player_id}>
                          {p.players?.name || 'Unknown player'}
                        </option>
                      ))}
                    </select>
                    <small>
                      {wicketType === 'caught'
                        ? 'Select the fielder who took the catch.'
                        : 'Select the fielder who broke the stumps or completed the run out.'}
                    </small>
                  </label>
                )}
                <div className="button-row">
                  <button className="button button-danger"
                    disabled={['caught', 'run_out'].includes(wicketType) && !fielderId}
                    onClick={() => addBall(
                      0,
                      null,
                      0,
                      wicketType,
                      dismissed === 'striker' ? striker : non,
                      ['caught', 'run_out'].includes(wicketType) ? fielderId : null
                    )}>
                    Confirm wicket
                  </button>
                  <button className="button button-ghost" onClick={() => setWicketOpen(false)}>Cancel</button>
                </div>
              </div>
            )}

            {!inningsDone && (
              <div className="inline-editor">
                <b>WICKETKEEPER</b>
                <p className="muted">You can change the wicketkeeper at any time during the innings.</p>
                <label>Current wicketkeeper
                  <select value={newKeeper} onChange={e => setNewKeeper(e.target.value)}>
                    <option value="">{wicketkeeper ? `Current: ${playerName(wicketkeeper)}` : 'Select wicketkeeper'}</option>
                    {bowling.filter(p => p.player_id !== bowler).map(p => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.players?.name || 'Unknown player'}{p.player_id === wicketkeeper ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-dark"
                  disabled={busy || !newKeeper || newKeeper === wicketkeeper}
                  onClick={changeWicketkeeper}>
                  Update wicketkeeper
                </button>
              </div>
            )}

            {(overDone || !striker || !non || !bowler) && !inningsDone && (
              <div className="inline-editor">
                <b>{overDone ? 'OVER COMPLETE — UPDATE BOWLER / BATTERS' : 'SELECT NEXT PLAYER'}</b>

                {(!striker || !non) && (
                  <label>Next batter
                    <select value={newBatter} onChange={e => setNewBatter(e.target.value)}>
                      <option value="">Select batter</option>
                      {nextBatters.map(p => (
                        <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
                      ))}
                    </select>
                    <button className="button button-dark"
                      disabled={busy || !newBatter}
                      onClick={() => changeBatter(!striker ? 'striker' : 'non_striker')}>
                      Add batter
                    </button>
                  </label>
                )}

                {(overDone || !bowler) && (
                  <label>Next bowler
                    <select value={newBowler} onChange={e => setNewBowler(e.target.value)}>
                      <option value="">Select bowler</option>
                      {bowling.filter(p => p.player_id !== bowler).map(p => (
                        <option key={p.player_id} value={p.player_id}>{p.players.name}</option>
                      ))}
                    </select>
                    <button className="button button-dark"
                      disabled={busy || !newBowler} onClick={changeBowler}>
                      Set bowler
                    </button>
                  </label>
                )}
              </div>
            )}

            <div className="scoring-bottom-actions">
              <button className="button button-ghost" onClick={undo}
                disabled={!deliveries.length || busy}>
                <RefreshCw size={15} /> Undo last ball
              </button>
              <button className="button button-ghost" onClick={endInnings}
                disabled={!deliveries.length || busy}>End innings</button>
              {inningsDone && (
                <button className="button button-lime" onClick={endInnings} disabled={busy}>
                  {innings.innings_number === 1 ? 'Complete first innings' : 'Complete second innings'}
                </button>
              )}
            </div>
          </div>

          <div className="panel recent-panel">
            <div className="panel-title">
              <h2>Recent deliveries</h2><span className="muted tiny">LATEST FIRST</span>
            </div>
            <div className="recent-balls">
              {calc.recent.slice().reverse().map((v, i) => (
                <span key={i} className={v === 'W' ? 'ball-wicket' : v === '4' || v === '6' ? 'ball-boundary' : ''}>{v}</span>
              ))}
              {!deliveries.length && <span className="muted">No deliveries yet</span>}
            </div>
          </div>
        </div>

        <aside className="scoring-side">
          <div className="panel innings-panel">
            <div className="panel-title"><h2>Batting</h2><BarChart3 /></div>
            {[striker, non].filter(Boolean).map(pid => {
              const stat = calc.batters[pid] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
              return (
                <div className="score-person" key={pid}>
                  <b>{playerName(pid)} {pid === striker && <i>★</i>}</b>
                  <strong>{stat.runs}<small> ({stat.balls})</small></strong>
                  <span>{stat.fours}×4 · {stat.sixes}×6</span>
                </div>
              );
            })}
            <div className="innings-divider" />
            <div className="mini-stat"><span>Extras</span><b>{calc.extras}</b></div>
            <div className="mini-stat"><span>Run rate</span><b>{calc.runRate}</b></div>
          </div>

          <div className="panel innings-panel">
            <div className="panel-title"><h2>Bowling</h2><Activity /></div>
            <div className="score-person">
              <b>{playerName(bowler)}</b>
              <strong>{calc.bowlers[bowler]?.wickets || 0}/{calc.bowlers[bowler]?.runs || 0}</strong>
              <span>
                {Math.floor((calc.bowlers[bowler]?.balls || 0) / 6)}.
                {(calc.bowlers[bowler]?.balls || 0) % 6} overs
              </span>
            </div>
          </div>

          <div className="panel share-panel">
            <b>Share live score</b>
            <p>Send this link to anyone watching the match.</p>
            <button className="button button-dark full"
              onClick={() => navigator.clipboard.writeText(`${location.origin}/live/${id}`)}>
              Copy public link
            </button>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

// PLAYER PERFORMANCE CARDS
function TeamScorecard({ title, battingStats, bowlingStats }) {
  return (
    <div className="team-performance-section">
      <div className="panel public-card performance-card">
        <div className="panel-title">
          <div>
            <h2>{title} — Batting</h2>
            <p>Batting scorecard and dismissal details</p>
          </div>
          <Users />
        </div>

        <div className="table-wrap">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Batter</th>
                <th>Dismissal</th>
                <th>Runs</th>
                <th>Balls</th>
                <th>4s</th>
                <th>6s</th>
                <th>Strike rate</th>
              </tr>
            </thead>
            <tbody>
              {battingStats.map(player => (
                <tr key={player.id}>
                  <td><b>{player.name}</b></td>
                  <td>{player.dismissal || (player.batted ? 'Not out' : 'Did not bat')}</td>
                  <td><strong>{player.batted ? player.runs : '—'}</strong></td>
                  <td>{player.batted ? player.balls : '—'}</td>
                  <td>{player.batted ? player.fours : '—'}</td>
                  <td>{player.batted ? player.sixes : '—'}</td>
                  <td>
                    {player.batted
                      ? player.balls > 0
                        ? ((player.runs / player.balls) * 100).toFixed(2)
                        : '0.00'
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel public-card performance-card">
        <div className="panel-title">
          <div>
            <h2>{title} — Bowling</h2>
            <p>Bowling figures and economy rate</p>
          </div>
          <Activity />
        </div>

        <div className="table-wrap">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Bowler</th>
                <th>Overs</th>
                <th>Runs conceded</th>
                <th>Wickets</th>
                <th>Economy</th>
              </tr>
            </thead>
            <tbody>
              {bowlingStats.map(player => (
                <tr key={player.id}>
                  <td><b>{player.name}</b></td>
                  <td>
                    {player.bowled
                      ? `${Math.floor(player.bowlingBalls / 6)}.${player.bowlingBalls % 6}`
                      : '—'}
                  </td>
                  <td>{player.bowled ? player.bowlingRuns : '—'}</td>
                  <td><strong>{player.bowled ? player.wickets : '—'}</strong></td>
                  <td>
                    {player.bowled
                      ? player.bowlingBalls > 0
                        ? (player.bowlingRuns / (player.bowlingBalls / 6)).toFixed(2)
                        : '0.00'
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// PUBLIC MATCH CENTRE
function LivePage() {
  const { id } = useParams();
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getMatchBundle(id);
        if (active) setBundle(data);
      } catch (e) {
        if (active) setError(e.message);
      }
    }

    load();

    if (!supabase) return () => { active = false; };

    const channel = supabase.channel(`public-live-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'innings' }, load)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'matches',
        filter: `id=eq.${id}`
      }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (!bundle) {
    return (
      <Shell>
        <div className="empty-state">
          <Radio size={28} />
          <b>{error || 'Loading live score…'}</b>
        </div>
      </Shell>
    );
  }

  const m = bundle.match;
  const inns = bundle.innings || [];
  const roster = bundle.roster || [];

  const current = inns.find(i => i.status === 'live') || inns[inns.length - 1];
  // Use the actual number of players selected for the chasing team.
  // A team can lose at most one fewer wicket than its player count.
  const battingTeamPlayers = roster.filter(
    p => p.team === current?.batting_team
  );
  const maxWickets = Math.max(0, battingTeamPlayers.length - 1);
  const first = inns.find(i => i.innings_number === 1);

  const currentCalc = current
    ? calculateInnings(current.deliveries || [])
    : null;

  const firstCalc = first
    ? calculateInnings(first.deliveries || [])
    : null;

  const names = Object.fromEntries(
    roster.map(p => [p.player_id, p.players?.name || 'Unknown'])
  );

  const battingName = current?.batting_team === 'A'
    ? m.team_a_name
    : m.team_b_name;

  // CHASE CALCULATIONS
  const isChasing = current?.innings_number === 2 && !!firstCalc;
  const target = firstCalc ? firstCalc.runs + 1 : 0;

  const runsRequired = isChasing
    ? Math.max(0, target - currentCalc.runs)
    : 0;

  const totalBalls = Number(m.overs_limit) * 6;

  const ballsRemaining = isChasing
    ? Math.max(0, totalBalls - currentCalc.legalBalls)
    : 0;

  const oversRemaining =
    `${Math.floor(ballsRemaining / 6)}.${ballsRemaining % 6}`;

  const requiredRunRate = ballsRemaining > 0
    ? (runsRequired / ballsRemaining) * 6
    : 0;

  const chaseComplete = isChasing && runsRequired === 0;

  // The second innings ends when the target is reached, all overs are used,
  // all available wickets are lost, or the scorer marks the match completed.
  const chaseLost =
    isChasing &&
    !chaseComplete &&
    (ballsRemaining === 0 || currentCalc.wickets >= maxWickets);

  const firstTeamName = first?.batting_team === 'A'
    ? m.team_a_name
    : m.team_b_name;

  const secondTeamName = current?.batting_team === 'A'
    ? m.team_a_name
    : m.team_b_name;

  const secondInningsFinished =
    isChasing &&
    (current?.status === 'completed' ||
      m.status === 'completed' ||
      chaseComplete ||
      chaseLost);

  let matchResult = '';

  if (secondInningsFinished) {
    if (currentCalc.runs > firstCalc.runs) {
      const wicketsRemaining = Math.max(0, maxWickets - currentCalc.wickets);
      matchResult = `${secondTeamName} won by ${wicketsRemaining} wickets`;
    } else if (currentCalc.runs < firstCalc.runs) {
      const runMargin = firstCalc.runs - currentCalc.runs;
      matchResult = `${firstTeamName} won by ${runMargin} runs`;
    } else {
      matchResult = 'Match tied';
    }
  }

  // TEAM-WISE BATTING AND BOWLING PERFORMANCE
  function getTeamPerformance(team) {
    const teamPlayers = roster.filter(p => p.team === team);

    const battingStats = teamPlayers.map(player => {
      const playerId = player.player_id;
      const stats = {
        id: playerId,
        name: player.players?.name || 'Unknown',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        batted: false,
        dismissal: ''
      };

      inns.forEach(inn => {
        if (inn.batting_team !== team) return;

        const deliveries = inn.deliveries || [];
        const calc = calculateInnings(deliveries);
        const batting = calc.batters?.[playerId];

        if (batting) {
          stats.batted = true;
          stats.runs += batting.runs || 0;
          stats.balls += batting.balls || 0;
          stats.fours += batting.fours || 0;
          stats.sixes += batting.sixes || 0;
        }

        const wicket = deliveries.find(delivery =>
          delivery.dismissed_player_id === playerId && delivery.wicket_type
        );

        if (wicket) {
          const bowlerName = names[wicket.bowler_id] || 'Unknown bowler';
          const dismissalDescriptions = {
            bowled: `b ${bowlerName}`,
            caught: `c ${names[wicket.fielder_id] || 'fielder not recorded'} b ${bowlerName}`,
            lbw: `lbw b ${bowlerName}`,
            stumped: `st ${names[wicket.wicketkeeper_id || inn.wicketkeeper_id] || 'wicketkeeper not recorded'} b ${bowlerName}`,
            run_out: `run out (${names[wicket.fielder_id] || 'fielder not recorded'})`,
            hit_wicket: `hit wicket b ${bowlerName}`,
            retired_hurt: 'retired hurt',
            obstructing_the_field: 'obstructing the field'
          };

          stats.dismissal = dismissalDescriptions[wicket.wicket_type] ||
            wicket.wicket_type.replaceAll('_', ' ');
        }
      });

      return stats;
    });

    const bowlingStats = teamPlayers.map(player => {
      const playerId = player.player_id;
      const stats = {
        id: playerId,
        name: player.players?.name || 'Unknown',
        wickets: 0,
        bowlingRuns: 0,
        bowlingBalls: 0,
        bowled: false
      };

      inns.forEach(inn => {
        if (inn.batting_team === team) return;

        const calc = calculateInnings(inn.deliveries || []);
        const bowling = calc.bowlers?.[playerId];

        if (bowling) {
          stats.bowled = true;
          stats.wickets += bowling.wickets || 0;
          stats.bowlingRuns += bowling.runs || 0;
          stats.bowlingBalls += bowling.balls || 0;
        }
      });

      return stats;
    });

    return { battingStats, bowlingStats };
  }

  const teamAStats = getTeamPerformance('A');
  const teamBStats = getTeamPerformance('B');

  return (
    <Shell>
      <div className="live-header">
        <div>
          <div className="eyebrow dark-eyebrow">BOUNDARY MATCH CENTRE</div>
          <h1>{m.team_a_name} <span>vs</span> {m.team_b_name}</h1>
          <p>{m.overs_limit} overs · {new Date(m.created_at).toLocaleDateString()}</p>
        </div>
        <Status status={m.status} />
      </div>

      {/* LIVE SCORE */}
      <div className="public-score panel dark-scoreboard">
        <div className="scoreboard-label">
          <span>{current ? `${battingName} BATTING` : 'MATCH CENTRE'}</span>
          {m.status === 'live'
            ? <span className="live-pill">● LIVE</span>
            : <Status status={m.status} />}
        </div>

        <div className="score-big">
          {currentCalc ? currentCalc.runs : '—'}
          <small>/{currentCalc ? currentCalc.wickets : '—'}</small>
        </div>

        <div className="score-meta">
          <span>{currentCalc?.overs || '0.0'} <small>OVERS</small></span>
          <span>CRR {currentCalc?.runRate || '0.00'}</span>
          <span>{m.overs_limit} OVERS</span>
        </div>

        {current && (
          <div className="score-bottom">
            <div><small>STRIKER</small><b>{names[current.striker_id] || '—'}</b></div>
            <div><small>NON-STRIKER</small><b>{names[current.non_striker_id] || '—'}</b></div>
            <div><small>BOWLER</small><b>{names[current.current_bowler_id] || '—'}</b></div>
            <div><small>WICKETKEEPER</small><b>{names[current.wicketkeeper_id] || '—'}</b></div>
          </div>
        )}
      </div>

      {/* LIVE CHASE TRACKER */}
      {isChasing && (
        <div className="chase-tracker panel">
          <div className="eyebrow dark-eyebrow">SECOND INNINGS · RUN CHASE</div>

          <h2>
            {battingName} need {runsRequired} runs to win
          </h2>

          <div className="chase-stats">
            <div><small>TARGET</small><strong>{target}</strong></div>
            <div><small>RUNS REQUIRED</small><strong>{runsRequired}</strong></div>
            <div><small>OVERS LEFT</small><strong>{oversRemaining}</strong></div>
            <div><small>BALLS LEFT</small><strong>{ballsRemaining}</strong></div>
            <div><small>REQUIRED RUN RATE</small><strong>{requiredRunRate.toFixed(2)}</strong></div>
          </div>

          {secondInningsFinished && (
            <div className={`chase-message ${matchResult.includes('won') ? 'success' : ''}`}>
              <Trophy size={20} />
              <strong>{matchResult}</strong>
            </div>
          )}

          {!secondInningsFinished && (
            <p className="chase-footer">
              {runsRequired} runs needed from {ballsRemaining} balls.
            </p>
          )}
        </div>
      )}

      {/* INNINGS SUMMARY */}
      <div className="public-lower">
        <div className="panel public-card">
          <div className="panel-title"><h2>Innings summary</h2><ClipboardList /></div>

          {inns.map(i => {
            const c = calculateInnings(i.deliveries || []);
            return (
              <div className="innings-summary" key={i.id}>
                <div>
                  <b>{i.batting_team === 'A' ? m.team_a_name : m.team_b_name}</b>
                  <span>Innings {i.innings_number}</span>
                </div>
                <strong>{c.runs}/{c.wickets}<small> ({c.overs} ov)</small></strong>
              </div>
            );
          })}

          {!inns.length && <p className="muted">Match setup is not complete yet.</p>}
        </div>

        <div className="panel public-card">
          <div className="panel-title"><h2>Recent balls</h2><Activity /></div>
          <div className="recent-balls">
            {(currentCalc?.recent || []).slice().reverse().map((v, i) => (
              <span key={i}
                className={v === 'W' ? 'ball-wicket' : v === '4' || v === '6' ? 'ball-boundary' : ''}>
                {v}
              </span>
            ))}
            {!currentCalc?.recent?.length && <span className="muted">Waiting for first ball</span>}
          </div>
          <p className="muted tiny">
            Score refreshes automatically when the scorer records a delivery.
          </p>
        </div>
      </div>

      {/* TEAM A AND TEAM B PERFORMANCE */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark-eyebrow">MATCH STATISTICS</div>
            <h2>Player performance</h2>
          </div>
        </div>

        <TeamScorecard
          title={m.team_a_name}
          battingStats={teamAStats.battingStats}
          bowlingStats={teamAStats.bowlingStats}
        />
        <TeamScorecard
          title={m.team_b_name}
          battingStats={teamBStats.battingStats}
          bowlingStats={teamBStats.bowlingStats}
        />
      </section>
    </Shell>
  );
}

// PUBLIC PLAYER RECORDS
function PlayerRecordsPage() {
  const [players, setPlayers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPlayerRecords()
      .then(data => { if (active) setPlayers(data); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = players.filter(player =>
    player.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Shell>
      <PageHeader
        eyebrow="PLAYER DATABASE"
        title="Player records"
        subtitle="Career statistics calculated from the matches recorded in Boundary."
      />

      <div className="player-records-toolbar">
        <div className="player-records-search">
          <Search size={17} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search players by name" />
        </div>
        <span className="muted">{players.length} registered players</span>
      </div>

      <Notice>{error}</Notice>

      {loading ? <div className="empty-state">Loading player records…</div> :
        filtered.length ? (
          <div className="player-records-grid">
            {filtered.map(player => (
              <article className="panel player-record-card" key={player.id}>
                <div className="player-record-heading">
                  <span className="player-record-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
                  <div><h2>{player.name}</h2><span>{player.matches} match appearances</span></div>
                </div>
                <div className="player-record-stats">
                  <div><small>RUNS</small><strong>{player.runs}</strong></div>
                  <div><small>WICKETS</small><strong>{player.wickets}</strong></div>
                  <div><small>BEST</small><strong>{player.highestScore}</strong></div>
                  <div><small>AVERAGE</small><strong>{player.battingAverage}</strong></div>
                  <div><small>STRIKE RATE</small><strong>{player.strikeRate}</strong></div>
                  <div><small>ECONOMY</small><strong>{player.economy}</strong></div>
                </div>
                <div className="player-record-footer">
                  <span>{player.fours} fours · {player.sixes} sixes</span>
                  <span>{player.ballsFaced} balls faced · {player.bowlingOvers} overs bowled</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Users size={26} /><b>No player records found</b><span>{query ? 'Try another player name.' : 'Add players and record matches to build the player database.'}</span></div>
        )}
    </Shell>
  );
}

// MATCHES
function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getMatches().then(setMatches).catch(e => setError(e.message));
  }, []);

  return (
    <Shell>
      <PageHeader eyebrow="FIXTURES & RESULTS"
        title="Match centre"
        subtitle="Follow live games and revisit completed matches." />

      <Notice>{error}</Notice>

      {matches.length ? (
        <div className="match-grid">
          {matches.map(m => (
            <Link to={`/live/${m.id}`} className="match-card" key={m.id}>
              <div className="match-card-head">
                <Status status={m.status} />
                <span>{m.overs_limit} OVERS</span>
              </div>
              <div className="match-teams">
                <b>{m.team_a_name}</b><span>VS</span><b>{m.team_b_name}</b>
              </div>
              <div className="match-card-foot">
                {m.status === 'live' ? 'Follow live score' : 'View match'}
                <ArrowRight size={15} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Trophy size={28} />
          <b>No matches yet</b>
          <span>Check back when your scorer creates a fixture.</span>
        </div>
      )}
    </Shell>
  );
}

// NOT FOUND
function NotFound() {
  return (
    <Shell>
      <div className="empty-state">
        <CircleHelp size={28} />
        <b>Page not found</b>
        <Link to="/" className="button button-lime">Go home</Link>
      </div>
    </Shell>
  );
}

// MAIN APP
export default function App() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) return <ConfigNotice />;
  if (loading) return <div className="loading-screen">Loading Boundary…</div>;

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/matches" element={<MatchesPage />} />
      <Route path="/players" element={<PlayerRecordsPage />} />
      <Route path="/live/:id" element={<LivePage />} />

      <Route path="/login"
        element={session ? <Navigate to="/admin" /> : <LoginPage />} />

      <Route path="/admin"
        element={session ? <AdminPage /> : <Navigate to="/login" />} />

      <Route path="/admin/players"
        element={session ? <PlayersPage /> : <Navigate to="/login" />} />

      <Route path="/admin/match-setup"
        element={session ? <MatchSetupPage /> : <Navigate to="/login" />} />

      <Route path="/admin/match-setup/:id"
        element={session ? <TossPage /> : <Navigate to="/login" />} />

      <Route path="/admin/scoring/:id"
        element={session ? <ScoringPage /> : <Navigate to="/login" />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
