import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Tournament, Player, Match, RoundInfo, BracketState } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sofa,
  Award,
  Search,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  QrCode,
  X
} from 'lucide-react';

// === PARTICIPANT HUB (LIST OF ALL ACTIVE TOURNAMENTS) ===
export function ParticipantHub() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQrTournament, setSelectedQrTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'rounds'), where('type', '==', 'tournament')), (snapshot) => {
      const list: Tournament[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.data().id || docSnap.id, ...docSnap.data() } as Tournament);
      });
      list.sort((a, b) => ((b as any).createdAt || '').localeCompare((a as any).createdAt || ''));
      setTournaments(list);
      setIsLoading(false);
    }, (err) => {
      console.error("Database connection error:", err);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-white">
      {/* Header bar */}
      <nav id="public-navbar" className="bg-slate-900 border-b border-indigo-500/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-brand-600 to-indigo-500 p-2 rounded-xl text-white shadow-lg shrink-0">
            <Trophy className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight bg-gradient-to-r from-white via-slate-50 to-indigo-100 bg-clip-text text-transparent w-full">
              North Beach LI Tournaments
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
              Viewer & Placements Portal
            </p>
          </div>
        </div>

        <Link
          to="/organizer"
          className="bg-indigo-600 hover:bg-indigo-550 text-white border border-indigo-500/20 py-2 px-4 rounded-xl font-display font-bold text-2xs uppercase tracking-wider transition-all cursor-pointer text-center"
        >
          Organizer Sign In ⚡
        </Link>
      </nav>

      <main className="max-w-4xl w-full mx-auto p-6 md:p-8 flex-grow">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-black text-white mb-2 uppercase tracking-tight">Active Tournaments Directory</h2>
          <p className="text-sm text-indigo-300/80 max-w-md mx-auto">
            Select a live tournament below to track scorecards, view active court rosters, and inspect standings in real-time.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-brand-500 animate-spin"></div>
            <p className="text-xs text-indigo-400 font-mono">Syncing active lobby list...</p>
          </div>
        ) : tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900/50 border border-indigo-500/15 hover:border-indigo-400/30 rounded-3xl p-6 backdrop-blur shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-4 border-b border-indigo-500/5 pb-3">
                    <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1.5 font-bold uppercase">
                      <Calendar className="w-3.5 h-3.5" />
                      {t.date}
                    </span>
                    <span className={`text-[8px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border shrink-0 ${
                      t.status === 'configuring'
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                        : t.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <h3 className="text-base font-display font-bold text-white tracking-tight mb-2 truncate">
                    {t.title || "Arena Tournament Championship"}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-indigo-500/5">
                      <span className="text-[8px] font-mono text-indigo-400/70 block uppercase">Bracket Split</span>
                      <span className="text-xs font-semibold text-indigo-200 mt-0.5 font-mono block">
                        {t.format === '2s' ? '2 vs 2 Duos' : '4 vs 4 Quads'}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-indigo-500/5">
                      <span className="text-[8px] font-mono text-indigo-400/70 block uppercase">Play Mode</span>
                      <span className="text-xs font-semibold text-indigo-200 mt-0.5 font-mono block capitalize">
                        {t.playMode || 'Matches'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/tournament/${t.id}`}
                    className="flex-grow bg-slate-950 hover:bg-slate-900 border border-indigo-500/20 hover:border-indigo-400 text-center py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-indigo-200 transition-all block"
                  >
                    Join Tournament Area 🏆
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedQrTournament(t)}
                    className="aspect-square bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-400 p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer group"
                    title="Scan Match Schedules QR"
                  >
                    <QrCode className="w-5 h-5 text-indigo-100 group-hover:scale-105 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/30 border border-indigo-500/10 rounded-3xl p-6">
            <Trophy className="w-12 h-12 text-indigo-500/20 mx-auto mb-4" />
            <p className="text-sm font-medium">No live tournament sessions schedules.</p>
            <p className="text-xs text-indigo-350/40 mt-1 max-w-sm mx-auto">
              Check back soon once the event creator has configured up an active arena lobby schedule!
            </p>
          </div>
        )}
      </main>

      {/* QR Code Scan Modal */}
      <AnimatePresence>
        {selectedQrTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedQrTournament(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-indigo-500/25 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedQrTournament(null)}
                className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-200 p-1.5 rounded-xl hover:bg-indigo-500/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mt-2 flex flex-col items-center">
                <div className="bg-gradient-to-tr from-indigo-600 to-indigo-550 p-2.5 rounded-2xl text-white mb-4 shadow">
                  <QrCode className="w-6 h-6 text-indigo-100 animate-pulse" />
                </div>
                
                <h3 className="font-display font-black text-lg text-white uppercase tracking-tight leading-snug">
                  {selectedQrTournament.title || "Arena Tournament Championship"}
                </h3>
                <p className="text-2xs font-mono uppercase tracking-widest text-indigo-400 font-bold mt-1.5">
                  Schedules Quick-Scan Key
                </p>

                <div className="bg-white p-4 rounded-3xl my-6 shadow-xl border border-indigo-500/10 flex items-center justify-center">
                  <QRCodeSVG
                    value={`${window.location.origin}/tournament/${selectedQrTournament.id}`}
                    size={180}
                    level="Q"
                    includeMargin={false}
                  />
                </div>

                <p className="text-xs text-indigo-200/80 max-w-xs leading-relaxed">
                  Point your phone's camera at this QR code to instantly track scorecards, view active court rosters, and inspect standings in real-time.
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedQrTournament(null)}
                  className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Dismiss Scan Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// === PUBLIC READ-ONLY TOURNAMENT PLACEMENTS SCREEN ===
export function ParticipantTournamentView() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [bracketState, setBracketState] = useState<BracketState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderRankFilter, setGenderRankFilter] = useState<'all' | 'male' | 'female'>('all');
  const [activeDivisionFilter, setActiveDivisionFilter] = useState<'higher' | 'lower'>('higher');
  const [isLoading, setIsLoading] = useState(true);
  const [showLargeQr, setShowLargeQr] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;

    // Sync selected tournament configuration
    const unsubTournament = onSnapshot(doc(db, 'rounds', `tournament_${tournamentId}`), (snapshot) => {
      if (snapshot.exists()) {
        setTournament({ id: snapshot.id, ...snapshot.data() } as Tournament);
      } else {
        setTournament(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Tournament stream error:", error);
      setIsLoading(false);
    });

    // Sync sorted players
    const unsubPlayers = onSnapshot(
      query(collection(db, 'players'), where('tournamentId', '==', tournamentId), orderBy('points', 'desc')),
      (snapshot) => {
        const list: Player[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Player);
        });
        setPlayers(list);
      },
      (error) => console.error("Players list error:", error)
    );

    // Sync matches
    const unsubMatches = onSnapshot(
      query(collection(db, 'rounds'), where('tournamentId', '==', tournamentId), where('type', '==', 'match')),
      (snapshot) => {
        const list: Match[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Match);
        });
        setMatches(list);
      },
      (error) => console.error("Matches stream error:", error)
    );

    // Sync round metadata
    const unsubRounds = onSnapshot(
      query(collection(db, 'rounds'), where('tournamentId', '==', tournamentId), where('type', '==', 'round')),
      (snapshot) => {
        const list: RoundInfo[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as RoundInfo);
        });
        setRounds(list);
      },
      (error) => console.error("Rounds lookup error:", error)
    );

    // Sync bracket state
    const unsubBrackets = onSnapshot(doc(db, 'rounds', `bracket_${tournamentId}`), (snapshot) => {
      if (snapshot.exists()) {
        setBracketState(snapshot.data() as BracketState);
      } else {
        setBracketState(null);
      }
    }, (error) => console.error("Bracket status error:", error));

    return () => {
      unsubTournament();
      unsubPlayers();
      unsubMatches();
      unsubRounds();
      unsubBrackets();
    };
  }, [tournamentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 bg-[radial-gradient(120%_120%_at_50%_0%,_#241a0f_0%,_#030a12_100%)]">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-brand-500 animate-spin"></div>
        <p className="text-xs text-indigo-400 font-mono mt-4">Connecting to active placement terminal...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <Trophy className="w-16 h-16 text-rose-500/30 mb-4" />
        <h3 className="text-xl font-display font-bold text-white">Tournament Lobby Not Found</h3>
        <p className="text-xs text-indigo-300/60 mt-2 max-w-sm mb-6">
          The requested event may have been deleted, or the URL address key is invalid.
        </p>
        <Link to="/" className="bg-indigo-600 hover:bg-indigo-550 text-white font-semibold py-2 px-6 rounded-xl text-xs transition-all">
          Return to directory
        </Link>
      </div>
    );
  }

  // Derived Match lists for active round
  const activeRoundMatches = matches.filter(m => m.round === tournament.currentRound);
  const activeRoundByes = rounds.find(r => r.roundNumber === tournament.currentRound)?.byes || [];

  // Standings filtering
  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isFixedTeams = tournament?.tournamentType === 'fixed_teams';
    const matchesGender = isFixedTeams || genderRankFilter === 'all' || p.gender === genderRankFilter;
    return matchesSearch && matchesGender;
  });

  // Name Lookup helper for players to locate which court/seat they are in
  const searchQueryClean = searchQuery.trim().toLowerCase();
  const foundInMatches = searchQueryClean.length >= 2
    ? activeRoundMatches.find(m =>
        m.teamANames.some(n => n.toLowerCase().includes(searchQueryClean)) ||
        m.teamBNames.some(n => n.toLowerCase().includes(searchQueryClean))
      )
    : null;

  const foundAsByeIdx = searchQueryClean.length >= 2
    ? activeRoundByes.findIndex(b => b.name.toLowerCase().includes(searchQueryClean))
    : -1;

  // Render Bracket view if configured/active
  const hasBracketPlay = bracketState && bracketState.status !== 'idle';
  const showBracketTab = hasBracketPlay && tournament.status === 'completed';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-white pb-12">
      {/* Active Tournament header */}
      <div className="bg-slate-900 border-b border-indigo-500/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-2xs text-indigo-400 bg-slate-950 hover:bg-slate-900 border border-indigo-500/15 py-1.5 px-3 rounded-lg font-mono tracking-wide transition-all outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Lobby Directory
          </Link>
          <div className="h-4 w-px bg-indigo-500/10 hidden sm:block"></div>
          <div>
            <span className="text-3xs uppercase tracking-widest text-indigo-400 font-bold block">PUBLIC VIEWING AREA</span>
            <h2 className="text-sm font-display font-medium text-white tracking-tight truncate max-w-xs sm:max-w-md">
              {tournament.title || "Arena Tournament Championship"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono select-none px-3 py-1 bg-indigo-500/5 text-indigo-300 rounded-full border border-indigo-500/10">
            🔮 Real-Time Participant View
          </span>
          <span className="text-[8px] font-mono tracking-wider font-extrabold uppercase px-2 py-0.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 animate-pulse">
            Live Synced
          </span>
        </div>
      </div>

      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 flex-grow flex flex-col gap-8">
        
        {/* Name Finder lookup state bar widget */}
        <div className="bg-slate-900/50 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-indigo-500"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <h3 className="text-lg font-display font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400 animate-pulse" />
                Find My Placement Desk
              </h3>
              <p className="text-xs text-indigo-200/80 mt-1">
                Enter your name below to instantly highlight your scheduled Court assignment, game roster status, or round-byes index.
              </p>
            </div>

            <div className="w-full md:max-w-xs relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Type your name to lookup..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/20 focus:border-indigo-400 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-indigo-350 focus:outline-none transition-all"
              />
            </div>
          </div>

          <AnimatePresence>
            {searchQueryClean.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                {foundInMatches ? (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-300 font-mono text-sm shrink-0">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-xs font-display font-medium text-white uppercase">Assignment Locked Inside!</h4>
                        <p className="text-3xs text-indigo-200 mt-0.5">
                          You are allocated to <strong className="text-white">Court {foundInMatches.court}</strong> for Active Round {tournament.currentRound}!
                        </p>
                      </div>
                    </div>
                    <div className="text-2xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 py-1 px-3 rounded-full">
                      Court {foundInMatches.court} Active
                    </div>
                  </div>
                ) : foundAsByeIdx !== -1 ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500/15 rounded-lg text-amber-300 font-mono text-sm shrink-0 animate-bounce">
                        🍹
                      </div>
                      <div>
                        <h4 className="text-xs font-display font-medium text-white uppercase">Sitting Out (Bye)</h4>
                        <p className="text-3xs text-indigo-200 mt-0.5">
                          You have a bye for Round {tournament.currentRound}. Enjoy some rest and keep hydrated!
                        </p>
                      </div>
                    </div>
                    <div className="text-2xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/15 py-1 px-3 rounded-full">
                      Round Bye
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/60 border border-indigo-500/10 rounded-2xl flex items-center gap-2.5 text-3xs text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400/60" />
                    No active assignment matches found for "{searchQuery}". Try typing your full name as listed in the standings below.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic section tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LOBBY / COURT ASSIGNMENTS GRID */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center justify-between bg-slate-900/40 p-4 border border-indigo-500/10 rounded-2xl mb-2">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-400"></span>
                </span>
                <h2 className="text-base font-display font-bold text-white tracking-tight">Active Round Court Assignments</h2>
              </div>
              <div className="text-xs font-mono bg-indigo-500/10 px-2.5 py-1 text-indigo-300 rounded-md border border-indigo-500/15 font-semibold">
                Round {tournament.currentRound}
              </div>
            </div>

            {tournament.status === 'completed' && !showBracketTab && (
              <div className="bg-slate-900/40 border border-indigo-500/10 rounded-3xl p-6 text-center">
                <Award className="w-12 h-12 text-indigo-400/20 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white">Championship Completed</h4>
                <p className="text-xs text-indigo-300/60 mt-1 max-w-sm mx-auto">
                  All pool rounds have been officially scored. Wait for the organizers to launch the playoff brackets structure!
                </p>
              </div>
            )}

            {/* Brackets Play Tab embedded inside Participant View if active / finished */}
            {showBracketTab && bracketState && (
              <div className="flex flex-col gap-4 bg-slate-900/30 border border-indigo-500/10 rounded-3xl p-6 mt-2">
                <div className="flex items-center justify-between border-b border-indigo-505/5 pb-3">
                  <h4 className="text-sm font-display font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-brand-400" />
                    Playoffs Elimination Bracket
                  </h4>
                  <div className="flex bg-slate-950 p-1 border border-indigo-500/10 rounded-xl gap-1">
                    <button
                      onClick={() => setActiveDivisionFilter('higher')}
                      className={`py-1 px-3 rounded-lg text-[9px] font-bold uppercase transition-all ${
                        activeDivisionFilter === 'higher' ? 'bg-indigo-500/15 text-white border border-indigo-500/15' : 'text-indigo-400/50 hover:text-indigo-200'
                      }`}
                    >
                      Higher Division (Gold)
                    </button>
                    {bracketState.hasLowerBracket && (
                      <button
                        onClick={() => setActiveDivisionFilter('lower')}
                        className={`py-1 px-3 rounded-lg text-[9px] font-bold uppercase transition-all ${
                          activeDivisionFilter === 'lower' ? 'bg-indigo-500/15 text-white border border-indigo-500/15' : 'text-indigo-400/50 hover:text-indigo-200'
                        }`}
                      >
                        Lower Division (Silver)
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {bracketState.matches && bracketState.matches.filter(m => m.division === activeDivisionFilter).map((bm) => {
                    const isCompleted = bm.status === 'completed';
                    const teamAWon = isCompleted && bm.winnerId === bm.teamAId;
                    const teamBWon = isCompleted && bm.winnerId === bm.teamBId;

                    return (
                      <div
                        key={bm.id}
                        className={`bg-slate-950/70 border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                          isCompleted ? 'border-emerald-500/20 bg-slate-900/10' : 'border-indigo-500/10'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] uppercase font-mono text-indigo-400/60">
                          <span>{bm.bracketType} Round {bm.round}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                            isCompleted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-brand-500/10 text-brand-300'
                          }`}>
                            {isCompleted ? 'Completed' : 'Pending'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className={`p-2 rounded-xl flex justify-between items-center ${
                            teamAWon ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-900/60'
                          }`}>
                            <span className="text-xs font-semibold truncate max-w-[140px] block">
                              {bm.teamAName || 'TBD Seed Team'}
                            </span>
                            <span className="text-xs font-mono font-bold text-indigo-300">
                              {isCompleted ? bm.scoreA : '-'}
                            </span>
                          </div>

                          <div className={`p-2 rounded-xl flex justify-between items-center ${
                            teamBWon ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-900/60'
                          }`}>
                            <span className="text-xs font-semibold truncate max-w-[140px] block">
                              {bm.teamBName || 'TBD Seed Team'}
                            </span>
                            <span className="text-xs font-mono font-bold text-indigo-300">
                              {isCompleted ? bm.scoreB : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STANDARD ACTIVE ROUND COURT MATCHES PLAYING GRID */}
            {!showBracketTab && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeRoundMatches.length > 0 ? (
                  activeRoundMatches.map((match, idx) => {
                    const isCompleted = match.status === 'completed';
                    const isIndividual = tournament.playMode === 'individual';

                    // Name highlighting toggle
                    const userNeedsHighlight = searchQueryClean.length >= 2 && (
                      match.teamANames.some(n => n.toLowerCase().includes(searchQueryClean)) ||
                      match.teamBNames.some(n => n.toLowerCase().includes(searchQueryClean))
                    );

                    if (isIndividual) {
                      return (
                        <div
                          key={match.id}
                          className={`bg-slate-900/60 border rounded-3xl overflow-hidden shadow-lg flex flex-col transition-all ${
                            userNeedsHighlight ? 'ring-2 ring-brand-500 border-brand-500 scale-[1.01]' : ''
                          } ${isCompleted ? 'border-emerald-500/20 bg-slate-900/30' : 'border-indigo-500/10'}`}
                        >
                          <div className={`p-4 font-display font-bold text-sm tracking-wide flex items-center justify-between border-b ${
                            isCompleted ? 'bg-emerald-950/30 border-emerald-500/10 text-emerald-300' : 'bg-slate-950 border-indigo-500/5 text-indigo-200'
                          }`}>
                            <span>Team {match.teamNumber || (idx + 1)} <span className="text-[10px] font-mono text-indigo-400 font-normal ml-1.5">(King)</span></span>
                            <span className="flex items-center gap-1">
                              {isCompleted ? (
                                <span className="text-emerald-400 font-mono text-2xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Scored</span>
                              ) : (
                                <span className="text-indigo-400 font-mono text-2xs flex items-center gap-1 animate-pulse"><Clock className="w-3.5 h-3.5"/> In Progress</span>
                              )}
                            </span>
                          </div>

                          <div className="p-5 flex flex-col gap-3">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-450 block">Roster Pool</span>
                            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/40 rounded-xl border border-indigo-500/5">
                              {match.teamANames.map((name, i) => {
                                const isTargetPlayer = searchQueryClean.length >= 2 && name.toLowerCase().includes(searchQueryClean);
                                return (
                                  <span key={i} className={`text-2xs font-medium py-1 px-2.5 rounded-full flex items-center gap-1 border ${
                                    isTargetPlayer 
                                      ? 'bg-brand-500/25 text-white border-brand-500 animate-pulse' 
                                      : 'bg-indigo-500/10 text-indigo-200 border-indigo-500/15'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isTargetPlayer ? 'bg-white' : 'bg-brand-500'}`}></span>
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {isCompleted && (
                            <div className="bg-emerald-950/20 border-t border-emerald-500/10 p-3.5 text-center font-mono font-bold text-sm text-emerald-300">
                              Points Accrued: {match.teamAScore} pts
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Standard Double Matches
                    const teamAWon = isCompleted && (match.teamAScore || 0) > (match.teamBScore || 0);
                    const teamBWon = isCompleted && (match.teamBScore || 0) > (match.teamAScore || 0);

                    return (
                      <div
                        key={match.id}
                        className={`bg-slate-900/60 border rounded-3xl overflow-hidden shadow-lg flex flex-col transition-all ${
                          userNeedsHighlight ? 'ring-2 ring-brand-500 border-brand-400 scale-[1.01]' : ''
                        } ${isCompleted ? 'border-emerald-500/20 bg-slate-900/30' : 'border-indigo-500/10'}`}
                      >
                        <div className={`p-4 font-display font-medium text-xs tracking-wide flex items-center justify-between border-b ${
                          isCompleted ? 'bg-emerald-950/30 border-emerald-500/10 text-emerald-300' : 'bg-slate-950 border-indigo-500/5 text-indigo-200'
                        }`}>
                          <span className="font-bold">Court Assignment {match.court}</span>
                          <span className="flex items-center gap-1">
                            {isCompleted ? (
                              <span className="text-emerald-400 font-mono text-2xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Completed</span>
                            ) : (
                              <span className="text-indigo-400 font-mono text-2xs flex items-center gap-1 animate-pulse"><Clock className="w-3.5 h-3.5"/> Court Active</span>
                            )}
                          </span>
                        </div>

                        <div className="p-5 flex flex-col gap-4">
                          {/* Team A */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-indigo-400">
                              <span>TEAM A</span>
                              {teamAWon && <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 py-0.5 px-1.5 rounded text-[8px]">Winner 🏆</span>}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {match.teamANames.map((name, i) => {
                                const isTargetPlayer = searchQueryClean.length >= 2 && name.toLowerCase().includes(searchQueryClean);
                                if (tournament?.tournamentType === 'fixed_teams') {
                                  return (
                                    <span key={i} className={`text-sm md:text-base font-extrabold tracking-tight uppercase ${isTargetPlayer ? 'text-brand-400' : 'text-white'}`}>
                                      {name}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={i} className={`text-2xs font-medium py-1 px-2.5 rounded-full flex items-center gap-1 border ${
                                    isTargetPlayer 
                                      ? 'bg-brand-500/25 text-white border-brand-550' 
                                      : 'bg-indigo-500/10 text-indigo-200 border-indigo-500/15'
                                  }`}>
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-3 py-1">
                            <div className="h-px bg-indigo-500/5 flex-grow"></div>
                            <span className="text-[9px] font-mono text-indigo-450 font-bold">VS</span>
                            <div className="h-px bg-indigo-500/5 flex-grow"></div>
                          </div>

                          {/* Team B */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-indigo-400">
                              <span>TEAM B</span>
                              {teamBWon && <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 py-0.5 px-1.5 rounded text-[8px]">Winner 🏆</span>}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {match.teamBNames.map((name, i) => {
                                const isTargetPlayer = searchQueryClean.length >= 2 && name.toLowerCase().includes(searchQueryClean);
                                if (tournament?.tournamentType === 'fixed_teams') {
                                  return (
                                    <span key={i} className={`text-sm md:text-base font-extrabold tracking-tight uppercase ${isTargetPlayer ? 'text-brand-400' : 'text-white'}`}>
                                      {name}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={i} className={`text-2xs font-medium py-1 px-2.5 rounded-full flex items-center gap-1 border ${
                                    isTargetPlayer 
                                      ? 'bg-brand-500/25 text-white border-brand-550' 
                                      : 'bg-indigo-500/10 text-indigo-200 border-indigo-500/15'
                                  }`}>
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {isCompleted && (
                          <div className="bg-emerald-950/20 border-t border-emerald-500/10 py-3 px-5 text-center font-mono font-bold text-sm text-emerald-300 flex justify-center gap-4">
                            <span>{match.teamAScore}</span>
                            <span className="text-3xs text-indigo-455 font-normal">pts ratio</span>
                            <span>{match.teamBScore}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-16 bg-slate-900/30 border border-indigo-500/10 rounded-3xl p-6">
                    <p className="text-indigo-300/55 text-sm font-medium">
                      {tournament.currentRound === 0 
                        ? "Tournament successfully configured initially. Wait for the game organizers to pair up and broadcast matches for Round 1!"
                        : `No matchup rosters set or submitted yet for Round ${tournament.currentRound}.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* BYES FOOTER BAR */}
            {tournament.currentRound > 0 && !showBracketTab && (
              <div className="bg-slate-900/40 border border-indigo-500/10 rounded-2xl p-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/15 rounded-xl border border-amber-500/20 text-amber-300">
                    <Sofa className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-white">Round Sitting Byes</h4>
                    <p className="text-xs text-indigo-200 mt-1">
                      {activeRoundByes.length > 0 
                        ? activeRoundByes.map(b => b.name).join(', ')
                        : "All registered players successfully allocated to court active games!"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PUBLIC LADDER STANDINGS LEADERBOARD */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* MOBILE SYNC QR CODE WIDGET */}
            <div className="bg-slate-900/50 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col gap-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-brand-500"></div>
              
              <div className="flex items-center gap-2.5">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-display font-bold text-white uppercase tracking-tight">Access on Phone</h3>
              </div>
              
              <p className="text-xs text-indigo-200/80 leading-relaxed font-sans">
                Scan this code to load this tournament directly onto your mobile device. Perfect for tracking court assignments on-the-go!
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-indigo-500/5">
                <button
                  type="button"
                  onClick={() => setShowLargeQr(true)}
                  className="bg-white p-2.5 rounded-2xl shadow-lg border border-indigo-500/10 flex items-center justify-center shrink-0 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all"
                  title="Click to Magnify"
                >
                  <QRCodeSVG
                    value={window.location.href}
                    size={100}
                    level="Q"
                    includeMargin={false}
                  />
                </button>
                <div className="flex flex-col text-center sm:text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">Live Companion</span>
                  <span className="text-xs font-semibold text-white mt-1 leading-snug">Real-Time Sync Ready</span>
                  <p className="text-[10px] text-indigo-300/60 mt-1 max-w-[170px] mx-auto sm:mx-0 font-display">
                    Schedules, scores, and standings will automatically update.
                  </p>
                </div>
              </div>
            </div>

            <div id="standings-leaderboard" className="bg-slate-900/50 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col gap-5 h-fit shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-brand-500 to-indigo-300"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h3 className="text-[17px] font-display font-bold text-white tracking-tight">Arena Leaderboard</h3>
                </div>
                <span className="text-[8px] font-mono tracking-wider bg-indigo-500/10 text-indigo-300 py-1 px-2 border border-indigo-500/15 rounded-md uppercase font-bold">Sum Points</span>
              </div>

              {/* Gender Filter for Standing lists */}
              {tournament?.tournamentType !== 'fixed_teams' ? (
                <div className="flex bg-slate-950 p-1 border border-indigo-500/10 rounded-xl gap-1">
                <button
                  onClick={() => setGenderRankFilter('all')}
                  type="button"
                  className={`flex-grow md:flex-initial py-1 px-3 rounded-lg text-[9px] font-bold uppercase transition-all outline-none ${
                    genderRankFilter === 'all'
                      ? 'bg-indigo-500/15 border border-indigo-500/20 text-white'
                      : 'text-indigo-400/50 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setGenderRankFilter('female')}
                  type="button"
                  className={`flex-grow md:flex-initial py-1 px-3 rounded-lg text-[9px] font-bold uppercase transition-all outline-none ${
                    genderRankFilter === 'female'
                      ? 'bg-rose-500/15 border border-rose-500/20 text-rose-300'
                      : 'text-indigo-400/50 hover:text-white'
                  }`}
                >
                  Women
                </button>
                <button
                  onClick={() => setGenderRankFilter('male')}
                  type="button"
                  className={`flex-grow md:flex-initial py-1 px-3 rounded-lg text-[9px] font-bold uppercase transition-all outline-none ${
                    genderRankFilter === 'male'
                      ? 'bg-blue-500/15 border border-blue-500/20 text-blue-300'
                      : 'text-indigo-400/50 hover:text-white'
                  }`}
                >
                  Men
                </button>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider bg-slate-950/40 p-2.5 rounded-xl border border-indigo-500/5 text-center select-none">
                  ⚔️ Registered Teams Standings
                </div>
              )}

              {/* Roster ladder list */}
              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player, idx) => {
                    const cleanNameStr = searchQueryClean;
                    const highlightThisRow = cleanNameStr.length >= 2 && player.name.toLowerCase().includes(cleanNameStr);
                    const positionIdx = players.findIndex(p => p.id === player.id) + 1;

                    return (
                      <div
                        key={player.id}
                        className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                          highlightThisRow 
                            ? 'bg-brand-500/20 border-brand-500 ring-1 ring-brand-500/30' 
                            : 'bg-slate-950/60 border-indigo-500/5 hover:border-indigo-500/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg text-2xs font-mono font-bold flex items-center justify-center border ${
                            positionIdx === 1 
                              ? 'bg-yellow-500/25 border-yellow-500/30 text-yellow-400 text-xs' 
                              : positionIdx === 2 
                              ? 'bg-slate-300/25 border-slate-300/30 text-slate-300' 
                              : positionIdx === 3 
                              ? 'bg-amber-750/25 border-amber-700/35 text-amber-500'
                              : 'bg-slate-900 border-indigo-500/10 text-indigo-400'
                          }`}>
                            {positionIdx}
                          </span>
                          <div>
                            <span className={`text-white tracking-tight flex items-center gap-1.5 ${
                              tournament?.tournamentType === 'fixed_teams' ? 'text-sm font-bold uppercase' : 'text-xs font-semibold'
                            }`}>
                              {player.name}
                              {tournament?.tournamentType !== 'fixed_teams' && (
                                <span className={`text-[8px] px-1 rounded-sm uppercase ${player.gender === 'male' ? 'bg-blue-500/15 text-blue-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                  {player.gender === 'male' ? 'M' : 'F'}
                                </span>
                              )}
                            </span>
                            {tournament?.tournamentType === 'fixed_teams' ? (
                              tournament?.matchingStyle === 'set_pools_round_robin' && (
                                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                  Pool Assigned: <strong className="text-emerald-400 uppercase">{(player as any).pool || 'A'}</strong>
                                </span>
                              )
                            ) : (
                              <span className="text-[9px] text-indigo-400/70 font-mono block mt-0.5">
                                Byes: {player.byesCount} • Sat Sat: {player.satOutRounds?.length || 0}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[13px] font-mono font-bold text-white block">
                            {player.points}
                          </span>
                          <span className="text-[8px] text-indigo-400 font-mono block uppercase">accumulated</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <p className="text-3xs text-indigo-400/55 font-mono">No placements registered matching search query.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Magnified QR Code Scan Modal */}
      <AnimatePresence>
        {showLargeQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowLargeQr(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-indigo-500/25 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setShowLargeQr(false)}
                className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-200 p-1.5 rounded-xl hover:bg-indigo-500/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mt-2 flex flex-col items-center">
                <div className="bg-gradient-to-tr from-indigo-650 to-indigo-550 p-2.5 rounded-2xl text-white mb-4 shadow">
                  <QrCode className="w-6 h-6 text-indigo-100 animate-pulse" />
                </div>
                
                <h3 className="font-display font-black text-lg text-white uppercase tracking-tight leading-snug">
                  {tournament.title || "Arena Tournament Championship"}
                </h3>
                <p className="text-2xs font-mono uppercase tracking-widest text-indigo-400 font-bold mt-1.5">
                  Mobile Companion Code
                </p>

                <div className="bg-white p-4 rounded-3xl my-6 shadow-xl border border-indigo-500/10 flex items-center justify-center">
                  <QRCodeSVG
                    value={window.location.href}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <p className="text-xs text-indigo-200/80 max-w-xs leading-relaxed">
                  Scan this QR code with your phone's camera to instantly open the match schedules, standings leaderboard, and active court roster live!
                </p>

                <button
                  type="button"
                  onClick={() => setShowLargeQr(false)}
                  className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Dismiss Scan Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
