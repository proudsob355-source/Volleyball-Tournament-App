import { useEffect, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc,
  where,
  limit
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Tournament, Player, Match, RoundInfo, BracketState } from '../types';
import {
  Trophy,
  Sliders,
  UserPlus,
  Users,
  GitFork,
  Zap,
  Trash2,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Lock,
  UserCheck,
  LogOut,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Mail,
  Key,
  Shield,
  Upload,
  FileText,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

// === HELPER FOR INDIVIDUAL SCORING NOTIFICATIONS ===
interface CustomNotification {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function OrganizerView() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setCheckingAuth(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(null);
      setCheckingAdmin(false);
      return;
    }

    const checkOrganizerStatus = async () => {
      setCheckingAdmin(true);
      setAuthError(null);
      try {
        const currentUserEmail = user.email ? user.email.toLowerCase().trim() : '';
        if (!currentUserEmail) {
          setIsAdmin(false);
          setCheckingAdmin(false);
          return;
        }

        // Try the highly-reliable server API checking route first
        const response = await fetch(`/api/organizers/check?email=${encodeURIComponent(currentUserEmail)}`);
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(!!data.isAdmin);
        } else {
          throw new Error('API server returned error configuration');
        }
      } catch (err: any) {
        console.warn('Failed to verify registry status via server API, executing client-side fallback:', err);
        try {
          const currentUserEmail = user.email ? user.email.toLowerCase().trim() : '';
          const docRef = doc(db, 'organizers', currentUserEmail);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setIsAdmin(true);
          } else {
            // Check if there are any organizers registered at all
            const organizersRef = collection(db, 'organizers');
            const qLimit = query(organizersRef, limit(1));
            const qSnapshot = await getDocs(qLimit);

            if (qSnapshot.empty) {
              await setDoc(docRef, {
                email: currentUserEmail,
                createdAt: new Date().toISOString(),
                addedBy: 'client-offline-fallback'
              });
              setIsAdmin(true);
            } else {
              const emailQuery = query(organizersRef, where('email', '==', currentUserEmail), limit(1));
              const querySnap = await getDocs(emailQuery);
              if (!querySnap.empty) {
                setIsAdmin(true);
              } else {
                setIsAdmin(false);
              }
            }
          }
        } catch (clientErr: any) {
          console.error('Client-side fallback also failed:', clientErr);
          setAuthError(clientErr.message || 'Verification failed');
          setIsAdmin(false);
        }
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkOrganizerStatus();
  }, [user]);

  if (checkingAuth || checkingAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 bg-[radial-gradient(120%_120%_at_50%_0%,_#241a0f_0%,_#030a12_100%)]">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-brand-500 animate-spin"></div>
        <p className="text-xs text-indigo-400 font-mono mt-4 font-bold">Verifying Administrator Registry...</p>
      </div>
    );
  }

  if (!user) {
    return <OrganizerLoginGate />;
  }

  if (isAdmin === false) {
    return <AccessDeniedScreen />;
  }

  return <OrganizerCabinet user={user} />;
}

// === ACCESS DENIED SCREEN ===
function AccessDeniedScreen() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      navigate('/');
    }
  }, [countdown, navigate]);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 bg-[radial-gradient(120%_120%_at_50%_0%,_#241a0f_0%,_#030a12_100%)]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900/90 border border-rose-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden backdrop-blur text-center"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>

        <div className="flex justify-center mb-6">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400">
            <Lock className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-xl font-bold font-sans tracking-tight mb-2 text-rose-300">
          Access Denied
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-6 font-mono">
          Access Denied: You are not a registered organizer.
        </p>

        <p className="text-xs text-slate-400 mb-6">
          Redirecting to public scoreboard in <span className="text-amber-400 font-bold">{countdown}</span> seconds...
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-2.5 px-4 rounded-xl text-xs transition duration-200 border border-slate-700 cursor-pointer"
          >
            Go Now
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 font-semibold py-2 px-4 rounded-xl text-2xs transition duration-200 border border-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// === ORGANIZER LOGIN SCREEN ===
function OrganizerLoginGate() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [offendingProvider, setOffendingProvider] = useState<'Email/Password' | 'Google' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginOrSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setErrorMsg('');
    setIsOperationNotAllowed(false);
    setOffendingProvider(null);
    setIsLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setIsOperationNotAllowed(true);
        setOffendingProvider('Email/Password');
      }
      setErrorMsg(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsOperationNotAllowed(false);
    setOffendingProvider(null);
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setIsOperationNotAllowed(true);
        setOffendingProvider('Google');
      }
      setErrorMsg(err.message || 'Google Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 bg-[radial-gradient(120%_120%_at_50%_0%,_#241a0f_0%,_#030a12_100%)]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900/90 border border-indigo-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden backdrop-blur"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-brand-500"></div>

        <div className="flex flex-col items-center text-center gap-4 mb-6">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/15">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-white uppercase tracking-tight">Organizer Portal</h2>
            <p className="text-xs text-indigo-300 mt-1 max-w-xs leading-relaxed">
              Authenticate via verified administrative key to access scoring tables, roster adjustments, and tournament generation configs.
            </p>
          </div>
        </div>

        {isOperationNotAllowed && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-4 text-amber-200 text-xs leading-relaxed flex flex-col gap-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-300 uppercase text-[10px] tracking-wider">
              ⚠️ Authentication Method Disabled
            </div>
            <p className="text-[11px] text-amber-200/90">
              The <strong>{offendingProvider}</strong> sign-in method is currently disabled in your Firebase console. Let's enable it:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-amber-200/80 space-y-1 my-1">
              <li>Open your Firebase Console:</li>
              <li className="list-none pl-2">
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border border-amber-500/30 py-1 px-2.5 rounded-lg text-[10px] font-mono hover:underline font-bold mt-1"
                >
                  Auth Providers Console ↗
                </a>
              </li>
              <li>Go to <strong>Build &gt; Authentication &gt; Sign-in method</strong>.</li>
              <li>Click <strong>Add new provider</strong>:
                <ul className="list-disc list-inside pl-4 mt-0.5 space-y-0.5 text-[10px] text-amber-200/70">
                  <li>For email/passcode: Enable the <strong>Email/Password</strong> toggle and click Save.</li>
                  <li>For Google Admin: Enable the <strong>Google</strong> toggle, choose a support email, and click Save.</li>
                </ul>
              </li>
            </ol>
            <div className="text-[10px] mt-1 pt-1.5 border-t border-amber-500/10 text-amber-300/80 font-mono">
              Project ID: <span className="font-bold">{firebaseConfig.projectId}</span>
            </div>
          </div>
        )}

        {errorMsg && !isOperationNotAllowed && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl mb-4 text-rose-300 text-3xs font-mono leading-relaxed truncate whitespace-normal">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLoginOrSignup} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400/50 w-4 h-4" />
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold block mb-1">Passcode Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400/50 w-4 h-4" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/15 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer mt-2"
          >
            {isRegistering ? 'Register Creator Account' : 'Authenticate Credentials ⚡'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-3 py-4">
          <div className="h-px bg-indigo-500/10 flex-grow"></div>
          <span className="text-[9px] font-mono text-indigo-400">OR</span>
          <div className="h-px bg-indigo-500/10 flex-grow"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          type="button"
          className="w-full bg-slate-950 hover:bg-slate-900 border border-indigo-500/20 py-2.5 rounded-xl text-xs text-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer font-semibold"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google Logo" />
          Continue with Google Admin
        </button>

        <div className="mt-6 text-center border-t border-indigo-500/5 pt-4 space-y-3.5">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-indigo-400 hover:text-indigo-200 text-xs font-semibold cursor-pointer select-none block w-full text-center"
          >
            {isRegistering ? 'Already hold admin status? Log In' : 'Need administrative status? Support Sign Up'}
          </button>
          
          <button
            onClick={() => navigate('/')}
            type="button"
            className="text-indigo-400/70 hover:text-indigo-300 text-2xs font-bold uppercase tracking-wider font-mono cursor-pointer flex items-center justify-center gap-1.5 w-full text-center border-t border-indigo-500/5 pt-3.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit to Tournaments
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// === MAIN CABINET WRAPPER (DIRECTORIES & TOURNAMENT FOCUS ROUTING) ===
function OrganizerCabinet({ user }: { user: User }) {
  const { id: activeTournamentId } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Control panel navigation bar */}
      <nav className="bg-slate-900 border-b border-indigo-500/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-brand-600 to-indigo-500 p-2 rounded-xl text-white shadow-lg shrink-0">
            <Sliders className="w-5 h-5 text-indigo-150" />
          </div>
          <div>
            <h1 className="text-sm font-display font-black tracking-tight uppercase bg-gradient-to-r from-white via-slate-50 to-indigo-100 bg-clip-text text-transparent">
              {activeTournamentId ? 'Organizer Desk' : 'Championship Cabinet'}
            </h1>
            <p className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
              ADMIN MODE • {user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTournamentId ? (
            <>
              <Link
                to={`/tournament/${activeTournamentId}`}
                className="bg-indigo-550/15 hover:bg-indigo-500/25 text-indigo-305 border border-indigo-505/25 py-1.5 px-3.5 rounded-lg text-2xs uppercase tracking-wide font-mono transition-all flex items-center gap-1.5 cursor-pointer max-sm:hidden"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Participant View
              </Link>
              <Link
                to="/"
                className="bg-slate-950/40 hover:bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 py-1.5 px-3.5 rounded-lg text-2xs uppercase tracking-wide font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Exit to Tournaments
              </Link>
            </>
          ) : (
            <Link
              to="/"
              className="bg-indigo-550/15 hover:bg-indigo-500/25 text-indigo-305 border border-indigo-505/25 py-1.5 px-3.5 rounded-lg text-2xs uppercase tracking-wide font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Exit to Tournaments
            </Link>
          )}

          <button
            onClick={() => signOut(auth)}
            className="p-2 bg-slate-950 hover:bg-rose-955 border border-indigo-500/15 hover:border-rose-500/30 text-indigo-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
            title="Sign Out Creator Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {activeTournamentId ? <OrganizerTournamentDesk tournamentId={activeTournamentId} /> : <OrganizerLobbyDirectory />}
    </div>
  );
}

// === LOBBY DIRECTORY (LIST & DISCOVERY OF EVENTS) ===
function OrganizerLobbyDirectory() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Tournament Fields
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newFormat, setNewFormat] = useState<'2s' | '4s'>('2s');
  const [newRounds, setNewRounds] = useState(3);
  const [newMaxCourts, setNewMaxCourts] = useState<number | ''>('');
  const [newPlayMode, setNewPlayMode] = useState<'matches' | 'individual'>('matches');
  const [newSplitWomen, setNewSplitWomen] = useState(true);
  const [newTournamentType, setNewTournamentType] = useState<'scramble' | 'fixed_teams'>('scramble');
  const [newMatchingStyle, setNewMatchingStyle] = useState<'random_pool_play' | 'set_pools_round_robin'>('random_pool_play');
  const [newNumPools, setNewNumPools] = useState<number>(2);

  // Organizer Fields & Registry States
  const [organizersList, setOrganizersList] = useState<{ id: string; email: string; createdAt?: string; addedBy?: string }[]>([]);
  const [newOrganizerEmail, setNewOrganizerEmail] = useState('');
  const [isAddingOrganizer, setIsAddingOrganizer] = useState(false);
  const [organizerError, setOrganizerError] = useState('');
  const [organizerSuccess, setOrganizerSuccess] = useState('');

  // Inline confirmations & Directory Notifications
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOrgEmail, setConfirmDeleteOrgEmail] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState('');
  const [directorySuccess, setDirectorySuccess] = useState('');

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
      console.error(err);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'organizers'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by email
      list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setOrganizersList(list);
    }, (err) => {
      console.error('Error listening to organizers:', err);
    });
    return unsub;
  }, []);

  const handleCreateTournament = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    setIsLoading(true);
    setDirectoryError('');
    setDirectorySuccess('');

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle,
          date: newDate,
          format: newFormat,
          totalRounds: newRounds,
          maxCourts: newMaxCourts,
          playMode: newTournamentType === 'fixed_teams' ? 'matches' : newPlayMode,
          splitWomenEvenly: newTournamentType === 'fixed_teams' ? false : newSplitWomen,
          tournamentType: newTournamentType,
          matchingStyle: newMatchingStyle,
          numPools: newNumPools
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      setNewTitle('');
      setNewDate('');
      setDirectorySuccess('Tournament created successfully!');
      setTimeout(() => setDirectorySuccess(''), 5500);
    } catch (err: any) {
      console.error(err);
      setDirectoryError(`Failed to initialize tournament: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTournament = async (tid: string) => {
    if (!tid) return;
    setIsLoading(true);
    setDirectoryError('');
    setDirectorySuccess('');

    try {
      const response = await fetch(`/api/tournaments/${tid}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }
      setDirectorySuccess('Tournament successfully deleted.');
      setTimeout(() => setDirectorySuccess(''), 5500);
    } catch (err: any) {
      console.error(err);
      setDirectoryError(`Failed to delete tournament: ${err.message || err}`);
      setTimeout(() => setDirectoryError(''), 5500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOrganizer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newOrganizerEmail.trim()) return;
    setIsAddingOrganizer(true);
    setOrganizerError('');
    setOrganizerSuccess('');

    const targetEmail = newOrganizerEmail.trim().toLowerCase();

    try {
      const orgDocRef = doc(db, 'organizers', targetEmail);
      await setDoc(orgDocRef, {
        email: targetEmail,
        createdAt: new Date().toISOString(),
        addedBy: auth.currentUser?.email || 'unknown_admin'
      });
      setNewOrganizerEmail('');
      setOrganizerSuccess(`Organizer "${targetEmail}" added successfully.`);
      setTimeout(() => setOrganizerSuccess(''), 4000);
    } catch (err: any) {
      console.error(err);
      setOrganizerError(err.message || 'Failed to add organizer.');
    } finally {
      setIsAddingOrganizer(false);
    }
  };

  const handleDeleteOrganizer = async (email: string) => {
    if (!email) return;
    if (email.toLowerCase() === auth.currentUser?.email?.toLowerCase()) {
      setOrganizerError("Error: You cannot remove your own administrator account to prevent lockout!");
      setTimeout(() => setOrganizerError(''), 5500);
      return;
    }

    try {
      await deleteDoc(doc(db, 'organizers', email.toLowerCase()));
      setOrganizerSuccess(`Successfully removed organizer "${email}"`);
      setTimeout(() => setOrganizerSuccess(''), 5500);
    } catch (err: any) {
      console.error(err);
      setOrganizerError(`Failed to remove organizer: ${err.message}`);
      setTimeout(() => setOrganizerError(''), 5500);
    }
  };

  return (
    <main className="max-w-7xl w-full mx-auto p-6 md:p-8 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Alert Banners */}
      {(directoryError || directorySuccess) && (
        <div className="lg:col-span-3 space-y-2">
          {directoryError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center justify-between">
              <span>{directoryError}</span>
              <button onClick={() => setDirectoryError('')} className="text-rose-455 hover:text-rose-200 text-xs font-bold font-mono">Dismiss</button>
            </div>
          )}
          {directorySuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-4 text-xs font-medium flex items-center justify-between animate-pulse">
              <span>{directorySuccess}</span>
              <button onClick={() => setDirectorySuccess('')} className="text-emerald-450 hover:text-emerald-200 text-xs font-bold font-mono">Dismiss</button>
            </div>
          )}
        </div>
      )}
      {/* Configure Launch form left column */}
      <div className="flex flex-col gap-6 lg:col-span-1">
        <div className="bg-slate-900/50 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-brand-500 to-indigo-350"></div>
          
          <div className="flex items-center gap-3 border-b border-indigo-500/10 pb-4 mb-5">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">Create Tournament</h3>
              <p className="text-3xs text-indigo-400/80">Launch a customized sandboxed pool play event</p>
            </div>
          </div>

          <form onSubmit={handleCreateTournament} className="flex flex-col gap-3.5">
            <div>
              <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Tournament Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Hermosa Masters Cup"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/15 rounded-xl py-2 px-3.5 text-xs text-white placeholder-indigo-500/30 focus:outline-none focus:border-brand-500 transition-all font-medium mt-1.5"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Scheduled Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/15 rounded-xl py-2 px-3.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-all mt-1.5"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Match Roster Size</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setNewFormat('2s')}
                  className={`py-2 px-3 rounded-xl font-display text-[11px] uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                    newFormat === '2s' ? 'bg-indigo-500/10 border-indigo-500 text-white font-bold' : 'bg-slate-950 border-indigo-500/5 text-indigo-350/60'
                  }`}
                >
                  2s Double (2v2)
                </button>
                <button
                  type="button"
                  onClick={() => setNewFormat('4s')}
                  className={`py-2 px-3 rounded-xl font-display text-[11px] uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                    newFormat === '4s' ? 'bg-indigo-500/10 border-indigo-500 text-white font-bold' : 'bg-slate-950 border-indigo-555/5 text-indigo-350/60'
                  }`}
                >
                  4s Quad (4v4)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Total Rounds</label>
                <input
                  type="number"
                  min="1"
                  value={newRounds}
                  onChange={(e) => setNewRounds(parseInt(e.target.value, 10) || 3)}
                  className="w-full bg-slate-950 border border-indigo-500/15 rounded-xl py-2 px-3 mt-1.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Max Courts Cap</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Uncapped"
                  value={newMaxCourts}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewMaxCourts(v === '' ? '' : parseInt(v, 10));
                  }}
                  className="w-full bg-slate-950 border border-indigo-500/15 rounded-xl py-2 px-3 mt-1.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Tournament Formula</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5 font-sans">
                <button
                  type="button"
                  onClick={() => setNewTournamentType('scramble')}
                  className={`py-2 px-2 text-[10px] uppercase font-bold tracking-wider font-display border rounded-xl transition-all cursor-pointer ${
                    newTournamentType === 'scramble' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-305/50'
                  }`}
                >
                  Individual Scramble 🔀
                </button>
                <button
                  type="button"
                  onClick={() => setNewTournamentType('fixed_teams')}
                  className={`py-2 px-2 text-[10px] uppercase font-bold tracking-wider font-display border rounded-xl transition-all cursor-pointer ${
                    newTournamentType === 'fixed_teams' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-305/50'
                  }`}
                >
                  Standard Team Style 🛡️
                </button>
              </div>
            </div>

            {newTournamentType === 'scramble' && (
              <>
                <div>
                  <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Scoring Play Style</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setNewPlayMode('matches')}
                      className={`py-2 px-2 text-[10px] uppercase font-bold tracking-wider font-display border rounded-xl transition-all cursor-pointer ${
                        newPlayMode === 'matches' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-305/50'
                      }`}
                    >
                      Team Match wins
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPlayMode('individual')}
                      className={`py-2 px-2 text-[10px] uppercase font-bold tracking-wider font-display border rounded-xl transition-all cursor-pointer ${
                        newPlayMode === 'individual' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-305/50'
                      }`}
                    >
                      King of Court
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-indigo-500/10 pt-4 mt-2">
                  <input
                    type="checkbox"
                    id="creation-split-women"
                    checked={newSplitWomen}
                    onChange={(e) => setNewSplitWomen(e.target.checked)}
                    className="w-4 h-4 rounded border-indigo-500/20 bg-slate-950 text-indigo-650 focus:ring-brand-500 cursor-pointer accent-indigo-550"
                  />
                  <label htmlFor="creation-split-women" className="text-xs text-indigo-300 font-medium select-none cursor-pointer">
                    Always Split Females Evenly ♀
                  </label>
                </div>
              </>
            )}

            {newTournamentType === 'fixed_teams' && (
              <>
                <div>
                  <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Standard Team Matching Style</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5 font-sans">
                    <button
                      type="button"
                      onClick={() => setNewMatchingStyle('random_pool_play')}
                      className={`py-2 px-2 text-[10px] uppercase font-bold tracking-wider font-display border rounded-xl transition-all cursor-pointer ${
                        newMatchingStyle === 'random_pool_play' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-305/50'
                      }`}
                    >
                      Random Pool Play
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMatchingStyle('set_pools_round_robin')}
                      className={`py-2 px-2 text-[10px] uppercase font-bold tracking-wider font-display border rounded-xl transition-all cursor-pointer ${
                        newMatchingStyle === 'set_pools_round_robin' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-305/50'
                      }`}
                    >
                      Set Pools Round Robin
                    </button>
                  </div>
                </div>

                {newMatchingStyle === 'set_pools_round_robin' && (
                  <div>
                    <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Number of Pools</label>
                    <select
                      value={newNumPools}
                      onChange={(e) => setNewNumPools(parseInt(e.target.value, 10))}
                      className="w-full mt-1.5 bg-slate-950 border border-indigo-500/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-indigo-400/40 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-display font-medium"
                    >
                      <option value={2}>2 Pools (Pool A & B)</option>
                      <option value={3}>3 Pools (Pool A, B, C)</option>
                      <option value={4}>4 Pools (Pool A, B, C, D)</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-brand-650 hover:from-indigo-550 hover:to-brand-550 py-3 rounded-xl font-display font-medium text-[11px] uppercase tracking-wider text-white shadow shadow-indigo-600/10 cursor-pointer text-center"
            >
              🚀 Launch New Tournament
            </button>
          </form>
        </div>

        {/* Organizer Administration Panel */}
        <div className="bg-slate-900/50 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-indigo-350"></div>
          
          <div className="flex items-center gap-3 border-b border-indigo-500/10 pb-4 mb-5">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">Organizer Registry</h3>
              <p className="text-3xs text-indigo-400/80">Manage administrative access privileges</p>
            </div>
          </div>

          <form onSubmit={handleAddOrganizer} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Add Organizer Email</label>
              <div className="flex gap-2 mt-1.5 font-sans">
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={newOrganizerEmail}
                  onChange={(e) => setNewOrganizerEmail(e.target.value)}
                  className="flex-grow bg-slate-950 border border-indigo-500/15 rounded-xl py-2 px-3.5 text-xs text-white placeholder-indigo-500/30 focus:outline-none focus:border-brand-500 transition-all font-medium font-mono"
                />
                <button
                  type="submit"
                  disabled={isAddingOrganizer}
                  className="bg-indigo-600 hover:bg-indigo-550 disabled:bg-indigo-800 text-white font-semibold px-4 rounded-xl text-xs transition duration-200 cursor-pointer text-center flex items-center justify-center shrink-0"
                >
                  {isAddingOrganizer ? '...' : <UserPlus className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {organizerError && (
              <p className="text-3xs text-rose-400 font-mono mt-1">⚠️ {organizerError}</p>
            )}
            {organizerSuccess && (
              <p className="text-3xs text-emerald-400 font-mono mt-1">✓ {organizerSuccess}</p>
            )}
          </form>

          {/* Current Organizers list */}
          <div className="mt-5 pt-4 border-t border-indigo-500/10">
            <h4 className="text-[10px] font-mono uppercase text-indigo-350 font-bold tracking-wider mb-2.5">
              Active Privilege List ({organizersList.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-indigo-500/20">
              {organizersList.map((organizer) => (
                <div key={organizer.id} className="flex items-center justify-between bg-slate-950/40 hover:bg-slate-950 px-3 py-2 rounded-xl border border-indigo-500/5 transition">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-mono font-medium text-slate-100 truncate">
                      {organizer.email}
                    </span>
                    {organizer.addedBy && (
                      <span className="text-[8px] text-slate-500 font-mono tracking-tight font-bold">
                        ADDED BY {organizer.addedBy}
                      </span>
                    )}
                  </div>
                  {organizer.email !== auth.currentUser?.email?.toLowerCase() && (
                    confirmDeleteOrgEmail === organizer.email ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            handleDeleteOrganizer(organizer.email);
                            setConfirmDeleteOrgEmail(null);
                          }}
                          className="text-[9px] uppercase font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/30 px-2 py-1 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                        >
                          Revoke Access
                        </button>
                        <button
                          onClick={() => setConfirmDeleteOrgEmail(null)}
                          className="text-[9px] uppercase font-bold text-slate-400 hover:text-white px-2 py-1 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteOrgEmail(organizer.email)}
                        className="text-slate-500 hover:text-rose-450 p-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="Revoke Admin Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Roster database directories panels */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Administrative Tournament Directory
          </h2>
          <span className="text-xs text-indigo-400/80 font-mono">{tournaments.length} lobbies synced</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/15 border-t-indigo-500 animate-spin"></div>
            <p className="text-3xs text-indigo-400 font-mono uppercase tracking-widest font-bold">Syncing event registers...</p>
          </div>
        ) : tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900/40 border border-indigo-500/10 rounded-3xl p-6 flex flex-col justify-between shadow-lg relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-3">
                    <span className="text-3xs font-mono font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-1.5 uppercase">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      {t.date}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border shrink-0 ${
                        t.status === 'configuring'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                          : t.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20 animate-pulse'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                      }`}>
                        {t.status}
                      </span>
                      
                      {confirmDeleteId === t.id ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteTournament(t.id!);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 text-[9px] rounded-lg border border-rose-500/30 bg-rose-600 hover:bg-rose-500 text-white font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
                          >
                            Sure Erase? ⚠️
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[9px] rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold uppercase tracking-wide transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(t.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer shrink-0"
                          title="Erase Tournament"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-[15px] font-display font-bold text-white tracking-tight mb-2 truncate">
                    {t.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-indigo-500/5 mb-6 text-2xs text-indigo-300 font-sans">
                    <div>
                      <span className="text-[8px] text-indigo-550 uppercase block font-mono">Format</span>
                      <span className="font-semibold text-indigo-200">{t.format === '2s' ? '2v2 Pool' : '4v4 Pool'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-indigo-550 uppercase block font-mono">Style</span>
                      <span className="font-semibold text-indigo-200 capitalize">{t.playMode || 'Matches'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-indigo-550 uppercase block font-mono">Round progression</span>
                      <span className="font-semibold text-indigo-200">Round {t.currentRound} / {t.totalRounds}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-indigo-550 uppercase block font-mono">Females Balancing</span>
                      <span className="font-semibold text-indigo-200">{t.splitWomenEvenly ? 'Split balanced' : 'Random seed'}</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/organizer/tournament/${t.id}`}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 hover:shadow-lg hover:shadow-indigo-600/10 text-center py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white transition-all block"
                >
                  Manage Tournament Deck ⚙️
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/10 border border-indigo-500/10 rounded-3xl p-6">
            <Trophy className="w-12 h-12 text-indigo-500/10 mx-auto mb-3" />
            <p className="text-sm font-medium">No tournament sessions initialized yet.</p>
            <p className="text-xs text-indigo-400/40 mt-1 max-w-sm mx-auto">
              Utilize the Creator Registry panel on the left to configure formats and launch your very first matchmaking session!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

// === TOURNAMENT SPECIFIC MAIN CONTROL PANEL (CONTROLLER & PROGRESSION) ===
function OrganizerTournamentDesk({ tournamentId }: { tournamentId: string }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [bracketState, setBracketState] = useState<BracketState | null>(null);
  
  // UI Tabs inside Admin desk
  const [adminTab, setAdminTab] = useState<'pool_play' | 'roster' | 'playoffs' | 'settings'>('roster');

  // Selected Pool Round state for viewing/editing previous rounds
  const [selectedPoolRound, setSelectedPoolRound] = useState<number | null>(null);

  // Input states in Admin desk
  const [setupFormat, setSetupFormat] = useState<'2s' | '4s'>('2s');
  const [setupRounds, setSetupRounds] = useState(3);
  const [setupMaxCourts, setSetupMaxCourts] = useState<number | ''>('');
  const [setupPlayMode, setSetupPlayMode] = useState<'matches' | 'individual'>('matches');
  const [setupSplitWomenEvenly, setSetupSplitWomenEvenly] = useState(true);
  const [setupTournamentType, setSetupTournamentType] = useState<'scramble' | 'fixed_teams'>('scramble');
  const [setupMatchingStyle, setSetupMatchingStyle] = useState<'random_pool_play' | 'set_pools_round_robin'>('random_pool_play');
  const [setupNumPools, setSetupNumPools] = useState<number>(2);

  // Player Form inputs
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGender, setNewPlayerGender] = useState<'female' | 'male'>('female');
  const [managePlayersQuery, setManagePlayersQuery] = useState('');
  
  // CSV Import States
  const [csvIsDragOver, setCsvIsDragOver] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  // Settle Score inputs
  const [scoreInputs, setScoreInputs] = useState<Record<string, { teamA: string; teamB: string }>>({});
  const [bracketScoreInputs, setBracketScoreInputs] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [activeDivisionFilter, setActiveDivisionFilter] = useState<'higher' | 'lower'>('higher');
  const [bracketModeType, setBracketModeType] = useState<'single' | 'double'>('single');
  const [hasLowerBracketCheckbox, setHasLowerBracketCheckbox] = useState(false);
  const [selectedDraftPlayerId, setSelectedDraftPlayerId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notify, setNotify] = useState<CustomNotification | null>(null);
  const [confirmResetPlayoffs, setConfirmResetPlayoffs] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotify({ message, type });
    setTimeout(() => setNotify(null), 4000);
  };

  // Reusable API proxy
  const apiFetch = (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'x-tournament-id': tournamentId
      }
    });
  };

  useEffect(() => {
    if (!tournamentId) return;

    const unsubT = onSnapshot(doc(db, 'rounds', `tournament_${tournamentId}`), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Tournament;
        setTournament({ id: snap.id, ...data } as Tournament);
        setSetupFormat(data.format);
        setSetupRounds(data.totalRounds);
        setSetupMaxCourts(data.maxCourts || '');
        setSetupPlayMode(data.playMode || 'matches');
        setSetupSplitWomenEvenly(data.splitWomenEvenly !== false);
        setSetupTournamentType((data as any).tournamentType || 'scramble');
        setSetupMatchingStyle((data as any).matchingStyle || 'random_pool_play');
        setSetupNumPools((data as any).numPools || 2);
      }
      setIsLoading(false);
    });

    const unsubP = onSnapshot(query(collection(db, 'players'), where('tournamentId', '==', tournamentId), orderBy('points', 'desc')), (snap) => {
      const list: Player[] = [];
      snap.forEach(d => list.push(d.data() as Player));
      setPlayers(list);
    });

    const unsubM = onSnapshot(
      query(collection(db, 'rounds'), where('tournamentId', '==', tournamentId), where('type', '==', 'match')),
      (snap) => {
        const list: Match[] = [];
        snap.forEach(d => list.push(d.data() as Match));
        setMatches(list);

        // Populate local score state
        const initialScores: Record<string, { teamA: string; teamB: string }> = {};
        list.forEach(m => {
          initialScores[m.id] = {
            teamA: m.teamAScore !== null && m.teamAScore !== undefined ? m.teamAScore.toString() : '',
            teamB: m.teamBScore !== null && m.teamBScore !== undefined ? m.teamBScore.toString() : ''
          };
        });
        setScoreInputs(prev => ({ ...initialScores, ...prev }));
      }
    );

    const unsubR = onSnapshot(
      query(collection(db, 'rounds'), where('tournamentId', '==', tournamentId), where('type', '==', 'round')),
      (snap) => {
        const list: RoundInfo[] = [];
        snap.forEach(d => list.push(d.data() as RoundInfo));
        setRounds(list);
      }
    );

    const unsubB = onSnapshot(doc(db, 'rounds', `bracket_${tournamentId}`), (snap) => {
      if (snap.exists()) {
        const bs = snap.data() as BracketState;
        setBracketState(bs);
        
        // Populate bracket scores
        const initialBracketScores: Record<string, { scoreA: string; scoreB: string }> = {};
        if (bs.matches) {
          bs.matches.forEach(m => {
            initialBracketScores[m.id] = {
              scoreA: m.scoreA !== null && m.scoreA !== undefined ? m.scoreA.toString() : '',
              scoreB: m.scoreB !== null && m.scoreB !== undefined ? m.scoreB.toString() : ''
            };
          });
        }
        setBracketScoreInputs(prev => ({ ...initialBracketScores, ...prev }));
      } else {
        setBracketState(null);
      }
    });

    return () => {
      unsubT();
      unsubP();
      unsubM();
      unsubR();
      unsubB();
    };
  }, [tournamentId]);

  if (isLoading || !tournament) {
    return (
      <div className="flex-grow flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-indigo-400 font-mono uppercase font-bold tracking-wider">Syncing Admin Terminal state...</p>
        </div>
      </div>
    );
  }

  // Action methods
  const handleTournamentSetup = async () => {
    setIsLoading(true);
    try {
      const isFixedTeams = setupTournamentType === 'fixed_teams';
      const res = await apiFetch('/api/setup', {
        method: 'POST',
        body: JSON.stringify({
          format: setupFormat,
          totalRounds: setupRounds,
          maxCourts: setupMaxCourts === '' ? null : setupMaxCourts,
          playMode: isFixedTeams ? 'matches' : setupPlayMode,
          splitWomenEvenly: isFixedTeams ? false : setupSplitWomenEvenly,
          tournamentType: setupTournamentType,
          matchingStyle: setupMatchingStyle,
          numPools: setupNumPools
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed configuration overwrite');
      showNotification("Tournament configurations applied and active rounds set cleared!", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlayer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setIsLoading(true);
    try {
      const isFixedTeams = tournament?.tournamentType === 'fixed_teams';
      const genderValue = isFixedTeams ? 'male' : newPlayerGender;
      const res = await apiFetch('/api/player', {
        method: 'POST',
        body: JSON.stringify({ name: newPlayerName, gender: genderValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed registration');
      setNewPlayerName('');
      showNotification(
        isFixedTeams
          ? `Successfully added team "${newPlayerName}" to rosters registry.`
          : `Successfully added ${newPlayerName} to rosters registry.`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlayer = async (pid: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/player/${pid}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed roster removal');
      showNotification("Player registration removed and registry synced.", "success");
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const isFixedTeams = tournament?.tournamentType === 'fixed_teams';
    let headers = '';
    let rows = '';
    
    if (isFixedTeams) {
      headers = 'Team Name\n';
      rows = 'Sand Stormers\nSpike Force\nDig & Deliver\nNet Ninjas\nVolley Vipers\nCourt Kings\nBeach Bums\nSet For Life';
    } else {
      headers = 'Name,Gender\n';
      rows = 'Jack Johnson,male\nSarah Connor,female\nMarcus Wright,male\nEllen Ripley,female\nJohn Doe,male\nJane Doe,female\nBob Smith,male\nAlice Smith,female';
    }

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', isFixedTeams ? 'sample_teams_setup.csv' : 'sample_participants_setup.csv');
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (file: File) => {
    setCsvError(null);
    setCsvSuccess(null);
    setIsLoading(true);

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setCsvError('Please upload a valid CSV file.');
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Could not read file contents.');
        }

        const lines = text.split(/\r?\n/);
        if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
          throw new Error('This CSV file appears to be empty.');
        }

        const firstLine = lines[0].toLowerCase();
        const headers = firstLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        const hasHeaders = headers.includes('name') || headers.includes('gender') || headers.includes('team') || headers.includes('team name');
        const startIndex = hasHeaders ? 1 : 0;
        const mappedPlayers: { name: string; gender: 'male' | 'female' }[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^["']|["']$/g, ''));
          if (parts.length === 0 || !parts[0]) continue;

          let name = '';
          let gender: 'male' | 'female' = 'male';

          if (hasHeaders) {
            const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('team'));
            if (nameIdx !== -1 && parts[nameIdx]) {
              name = parts[nameIdx];
            } else {
              name = parts[0];
            }

            const genderIdx = headers.indexOf('gender');
            if (genderIdx !== -1 && parts[genderIdx]) {
              const gVal = parts[genderIdx].toLowerCase().trim();
              if (gVal === 'female' || gVal === 'f' || gVal === 'woman' || gVal === 'female group' || gVal === 'w') {
                gender = 'female';
              }
            }
          } else {
            name = parts[0];
            if (parts[1]) {
              const gVal = parts[1].toLowerCase().trim();
              if (gVal === 'female' || gVal === 'f' || gVal === 'woman' || gVal === 'female group' || gVal === 'w') {
                gender = 'female';
              }
            }
          }

          if (name.trim()) {
            mappedPlayers.push({
              name: name.trim(),
              gender
            });
          }
        }

        if (mappedPlayers.length === 0) {
          throw new Error('No valid participant records found in the CSV. Make sure you have at least a Name or Team column.');
        }

        const res = await apiFetch('/api/players/bulk', {
          method: 'POST',
          body: JSON.stringify({ players: mappedPlayers })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to bulk import registrants.');
        }

        const isFixedTeams = tournament?.tournamentType === 'fixed_teams';
        const msg = isFixedTeams 
          ? `Successfully imported ${data.count} team nodes from CSV!`
          : `Successfully imported ${data.count} participants from CSV!`;
        
        setCsvSuccess(msg);
        showNotification(msg, 'success');
      } catch (err: any) {
        setCsvError(err.message || 'Error parsing CSV file.');
        showNotification(err.message || 'Error parsing CSV file.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setCsvError('Failed to read files.');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const handleGenerateRound = async () => {
    setIsLoading(true);
    try {
      const nextRound = (tournament?.currentRound || 0) + 1;
      const res = await apiFetch('/api/generate-round', { 
        method: 'POST',
        body: JSON.stringify({ roundNumber: nextRound })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed round generation');
      showNotification(`Successfully calculated pairings for Round ${nextRound}!`, "success");
      setSelectedPoolRound(nextRound);
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitScore = async (matchId: string) => {
    const scores = scoreInputs[matchId];
    if (!scores) return;

    const teamAScore = parseInt(scores.teamA, 10);
    const teamBScore = parseInt(scores.teamB, 10);
    const isInd = tournament.playMode === 'individual';
    const validationCheck = isInd ? isNaN(teamAScore) : (isNaN(teamAScore) || isNaN(teamBScore));

    if (validationCheck || teamAScore < 0 || (teamBScore < 0 && !isInd)) {
      showNotification("Scorecards require valid integer indexes.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/submit-score', {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          teamAScore,
          teamBScore: isInd ? 0 : teamBScore
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Log failed');
      showNotification("Successcard synchronized successfully.", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDirectBrackets = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/bracket/setup-direct', {
        method: 'POST',
        body: JSON.stringify({
          settingType: bracketModeType,
          hasLowerBracket: hasLowerBracketCheckbox
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Direct brackets setup failed');
      showNotification("Direct championship playoff brackets generated and matches prepared!", "success");
      setAdminTab('playoffs');
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDraft = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/bracket/setup-draft', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Roster draft failed');
      showNotification("Roster snake drafting page populated with Captains!", "success");
      setAdminTab('playoffs');
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftPlayer = async (playerId: string) => {
    if (!bracketState) return;
    const pickerTeam = bracketState.teams.find(t => t.captainId === bracketState.currentPickerId);
    if (!pickerTeam) return;

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/bracket/draft-player', {
        method: 'POST',
        body: JSON.stringify({ playerId, teamId: pickerTeam.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Member sync error');
      setSelectedDraftPlayerId(null);
      showNotification(`Successfully allocated selection and shifted turn-wheels.`, 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoDraftPick = async () => {
    if (!bracketState || bracketState.draftPool.length === 0) return;
    const contestant = bracketState.draftPool[0];
    await handleDraftPlayer(contestant.playerId);
  };

  const handleCompleteDraftAndCreateBrackets = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/bracket/create-bracket', {
        method: 'POST',
        body: JSON.stringify({
          settingType: bracketModeType,
          hasLowerBracket: hasLowerBracketCheckbox
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Plan trigger failed');
      showNotification("Elimination tournament bracket trees compiled successfully!", "success");
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBracketScore = async (matchId: string) => {
    const inputs = bracketScoreInputs[matchId];
    if (!inputs) return;

    const scoreA = parseInt(inputs.scoreA, 10);
    const scoreB = parseInt(inputs.scoreB, 10);
    const parsedA = isNaN(scoreA) ? 0 : scoreA;
    const parsedB = isNaN(scoreB) ? 0 : scoreB;

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/bracket/submit-score', {
        method: 'POST',
        body: JSON.stringify({ matchId, scoreA: parsedA, scoreB: parsedB })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync error');
      showNotification("Placements updated and progression seed automated!", "success");
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetBracketAndDraft = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/bracket/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clear failed');
      showNotification("Draft schedules and bracket records purged.", "success");
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const activeRound = selectedPoolRound !== null ? selectedPoolRound : (tournament?.currentRound || 0);

  const activeRoundMatches = matches.filter(m => m.round === activeRound);
  const activeRoundByes = rounds.find(r => r.roundNumber === activeRound)?.byes || [];

  const currentRoundMatches = matches.filter(m => m.round === tournament.currentRound);

  const manageFilteredPlayers = players.filter(p => {
    return p.name.toLowerCase().includes(managePlayersQuery.toLowerCase());
  });

  const isTournamentFinished = tournament.currentRound > 0 && 
    tournament.currentRound >= tournament.totalRounds && 
    currentRoundMatches.length > 0 && 
    currentRoundMatches.every(m => m.status === 'completed');

  return (
    <div className="max-w-7xl w-full mx-auto p-4 md:p-8 flex-grow flex flex-col gap-6 relative">
      
      {/* Toast announcement wrapper */}
      <AnimatePresence>
        {notify && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -55, opacity: 0 }}
            className={`fixed top-6 right-6 z-50 py-3 px-5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 backdrop-blur font-mono ${
              notify.type === 'success' 
                ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/15 border-rose-500/20 text-rose-400'
            }`}
          >
            {notify.type === 'success' ? '✅' : '⚠️'}
            {notify.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lobby Title banner */}
      <div className="bg-slate-900/50 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <Link
            to="/organizer"
            className="flex items-center gap-1.5 text-2xs text-indigo-400 hover:text-indigo-200 transition-all font-mono tracking-wider mb-2 shrink-0 outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to cabinet directory
          </Link>
          <h2 className="text-lg font-display font-black text-white uppercase tracking-tight">
            {tournament.title}
          </h2>
          <p className="text-3xs font-mono text-indigo-455 uppercase tracking-widest mt-0.5">
            Event format: {tournament.format === '2s' ? '2v2 Dual' : '4v4 Quad'} Play • Style: {tournament.playMode || 'Matches'}
          </p>
        </div>

        {/* Dashboard inner tabs */}
        <div className="flex bg-slate-950 p-1 border border-indigo-500/10 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setAdminTab('roster')}
            className={`py-1.5 px-3 rounded-lg text-2xs font-bold uppercase transition-all whitespace-nowrap outline-none ${
              adminTab === 'roster' ? 'bg-indigo-505/15 border border-indigo-500/15 text-white' : 'text-indigo-400/55 hover:text-white'
            }`}
          >
            Rosters 👥
          </button>
          <button
            onClick={() => setAdminTab('pool_play')}
            className={`py-1.5 px-3 rounded-lg text-2xs font-bold uppercase transition-all whitespace-nowrap outline-none ${
              adminTab === 'pool_play' ? 'bg-indigo-505/15 border border-indigo-500/15 text-white' : 'text-indigo-400/55 hover:text-white'
            }`}
          >
            Pool Play Record ⚾
          </button>
          <button
            onClick={() => setAdminTab('playoffs')}
            className={`py-1.5 px-3 rounded-lg text-2xs font-bold uppercase transition-all whitespace-nowrap outline-none ${
              adminTab === 'playoffs' ? 'bg-indigo-505/15 border border-indigo-500/15 text-white' : 'text-indigo-400/55 hover:text-white'
            }`}
          >
            Bracket Playoffs 🏆
          </button>
          <button
            onClick={() => setAdminTab('settings')}
            className={`py-1.5 px-3 rounded-lg text-2xs font-bold uppercase transition-all whitespace-nowrap outline-none ${
              adminTab === 'settings' ? 'bg-indigo-505/15 border border-indigo-500/15 text-white' : 'text-indigo-400/55 hover:text-white'
            }`}
          >
            Settings ⚙️
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TABS */}

      {/* A. POOL PLAY MATCH SCORINGS TAB */}
      {adminTab === 'pool_play' && (
        <div className="flex flex-col gap-6">
          
          {/* Progression banner controller */}
          <div className="bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider block font-bold">Round advancement module</span>
                <h3 className="text-sm font-display font-bold text-white mt-0.5">
                  {tournament.currentRound === 0 ? "Unlock and generate matches for Round 1" : `Active Matches playing for Round ${tournament.currentRound}`}
                </h3>
              </div>
            </div>

            {tournament.currentRound < tournament.totalRounds && (
              <button
                type="button"
                onClick={handleGenerateRound}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/10 hover:shadow-lg hover:shadow-indigo-650/10 py-2.5 px-5 rounded-xl font-display font-bold text-2xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Generate Round {tournament.currentRound + 1} Matchups
                <ChevronRight className="w-3.5 h-3.5 animate-bounce" style={{ animationDuration: '2.5s' }} />
              </button>
            )}
          </div>

          {/* Round Selector Bar */}
          {tournament.currentRound > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/40 border border-indigo-500/15 p-4 rounded-3xl gap-3 backdrop-blur shadow-md animate-fade-in">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold tracking-wider">Select Pool Round:</span>
                <div className="flex flex-wrap gap-1 bg-slate-950 p-1 border border-indigo-500/15 rounded-xl">
                  {Array.from({ length: tournament.currentRound }).map((_, idx) => {
                    const rNum = idx + 1;
                    const isActive = activeRound === rNum;
                    return (
                      <button
                        key={rNum}
                        type="button"
                        onClick={() => setSelectedPoolRound(rNum)}
                        className={`py-1.5 px-3 rounded-lg text-2xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/10 font-black' 
                            : 'text-indigo-400/75 hover:text-white hover:bg-indigo-500/10'
                        }`}
                      >
                        Round {rNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeRound !== tournament.currentRound && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 py-1.5 px-3.5 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-wider leading-none shrink-0 w-fit">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Viewing & Editing Archives
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeRoundMatches.length > 0 ? (
              activeRoundMatches.map((match, mIdx) => {
                const isInd = tournament.playMode === 'individual';
                const completed = match.status === 'completed';

                if (isInd) {
                  const inputs = scoreInputs[match.id] || { teamA: '', teamB: '' };
                  return (
                    <div key={match.id} className={`bg-slate-900/60 border rounded-3xl p-5 shadow-lg flex flex-col gap-4 transition-all ${completed ? 'border-emerald-500/25 bg-slate-900/30' : 'border-indigo-500/15'}`}>
                      <div className="flex justify-between items-center text-xs font-bold border-b border-indigo-500/5 pb-2.5">
                        <span className="text-indigo-200">Team Number {match.teamNumber || (mIdx + 1)} <span className="text-[10px] font-mono text-indigo-400 font-normal ml-1">(Court Solo)</span></span>
                        <span className={`py-1 px-2.5 rounded-full text-3xs font-mono font-bold uppercase tracking-wider ${completed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-indigo-500/10 text-indigo-300'}`}>
                          {completed ? 'Recorded' : 'Awaiting Score'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 p-3 bg-slate-950/45 rounded-2xl border border-indigo-500/5">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-450 block">Roster Pool</span>
                          <div className="text-xs font-semibold text-indigo-200">{match.teamANames?.join(', ')}</div>
                        </div>

                        <div className="border-t border-indigo-500/5 pt-2.5 flex justify-between items-center gap-4">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-300">Enter Points Scored</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="pts"
                            value={inputs.teamA}
                            onChange={(e) => setScoreInputs(prev => ({
                              ...prev,
                              [match.id]: { ...prev[match.id], teamA: e.target.value }
                            }))}
                            className="w-24 bg-slate-950 border border-indigo-500/10 rounded-xl py-1.5 px-3 font-mono text-xs text-center text-white font-bold"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleSubmitScore(match.id)}
                        disabled={isLoading}
                        className={`w-full mt-2 py-2.5 px-4 rounded-xl font-display font-bold text-2xs uppercase tracking-wider text-white shadow transition-all cursor-pointer ${
                          completed ? 'bg-emerald-650 hover:bg-emerald-600 border border-emerald-500/15' : 'bg-indigo-600 hover:bg-indigo-550'
                        }`}
                      >
                        {completed ? 'Adjust Scorecard Record' : 'Record Scorecard Data ✅'}
                      </button>
                    </div>
                  );
                }

                // Standard team games format
                const inputs = scoreInputs[match.id] || { teamA: '', teamB: '' };
                return (
                  <div key={match.id} className={`bg-slate-900/60 border rounded-3xl p-5 shadow-lg flex flex-col gap-4 transition-all ${completed ? 'border-emerald-500/25 bg-slate-900/30' : 'border-indigo-500/15'}`}>
                    <div className="flex justify-between items-center text-xs font-bold border-b border-indigo-500/5 pb-2.5">
                      <span className="text-indigo-200 font-display">Court Assignment {match.court} Matchup</span>
                      <span className={`py-1 px-2.5 rounded-full text-3xs font-mono font-bold uppercase tracking-wider ${completed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-indigo-500/10 text-indigo-300'}`}>
                        {completed ? 'Settled' : 'In play'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-indigo-500/5">
                        <span className={`truncate ${
                          tournament?.tournamentType === 'fixed_teams' 
                            ? 'text-sm font-bold text-white uppercase' 
                            : 'text-xs font-semibold text-indigo-200'
                        }`}>
                          {match.teamANames.join(', ')}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Team A Score"
                          value={inputs.teamA}
                          onChange={(e) => setScoreInputs(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], teamA: e.target.value }
                          }))}
                          className="w-16 bg-slate-950 border border-indigo-500/10 rounded-lg py-1 px-2 font-mono text-xs text-center text-white font-bold"
                        />
                      </div>

                      <div className="text-center text-3xs font-mono text-indigo-400 italic">vs</div>

                      <div className="flex justify-between items-center gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-indigo-500/5">
                        <span className={`truncate ${
                          tournament?.tournamentType === 'fixed_teams' 
                            ? 'text-sm font-bold text-white uppercase' 
                            : 'text-xs font-semibold text-indigo-200'
                        }`}>
                          {match.teamBNames.join(', ')}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Team B Score"
                          value={inputs.teamB}
                          onChange={(e) => setScoreInputs(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], teamB: e.target.value }
                          }))}
                          className="w-16 bg-slate-950 border border-indigo-500/10 rounded-lg py-1 px-2 font-mono text-xs text-center text-white font-bold"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleSubmitScore(match.id)}
                      disabled={isLoading}
                      className={`w-full mt-2 py-2.5 px-4 rounded-xl font-display font-semibold text-2xs uppercase tracking-wider text-white shadow-md active:scale-95 transition-all text-center cursor-pointer ${
                        completed ? 'bg-emerald-650 hover:bg-emerald-600 border border-emerald-500/15' : 'bg-indigo-600 hover:bg-indigo-550'
                      }`}
                    >
                      {completed ? 'Adjust Scorecard Record 🤝' : 'Submit Match Scorecard ✅'}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 py-20 bg-slate-900/20 border border-slate-800/80 rounded-3xl text-center p-6 text-indigo-300/40 text-sm">
                {tournament.currentRound === 0 
                  ? "Tournament settings setup in progress. Create roster additions under 'Rosters' or generate Round 1 pool games on settings!"
                  : "No court matches generated yet for progression stage."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. STAFF ROSTER REGISTRIES TAB */}
      {adminTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Registry configuration forms */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col gap-5 shadow-xl h-fit">
            <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-4">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-display font-medium text-white tracking-tight uppercase">
                {tournament?.tournamentType === 'fixed_teams' ? 'Team Registration' : 'Roster Registrations'}
              </h3>
            </div>

            <form onSubmit={handleAddPlayer} className="flex flex-col gap-4">
              <div>
                <label className="text-2xs font-mono uppercase text-indigo-400 tracking-wider font-bold">
                  {tournament?.tournamentType === 'fixed_teams' ? 'Standard Team Name' : 'Participant Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={tournament?.tournamentType === 'fixed_teams' ? "e.g. Spike Force" : "e.g. Jack Johnson"}
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full mt-1.5 bg-slate-950 border border-indigo-500/10 rounded-xl py-2 px-3.5 text-xs text-white placeholder-indigo-400/40 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {tournament?.tournamentType !== 'fixed_teams' && (
                <div>
                  <label className="text-2xs font-mono uppercase text-indigo-400 tracking-wider font-bold block">Assigned Gender</label>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setNewPlayerGender('female')}
                      className={`py-2 rounded-xl font-display font-bold text-[10px] uppercase tracking-wider border transition-all cursor-pointer ${
                        newPlayerGender === 'female'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                          : 'bg-slate-950 border-indigo-500/5 text-indigo-300'
                      }`}
                    >
                      ♀ Female Group
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPlayerGender('male')}
                      className={`py-2 rounded-xl font-display font-bold text-[10px] uppercase tracking-wider border transition-all cursor-pointer ${
                        newPlayerGender === 'male'
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 font-bold'
                          : 'bg-slate-950 border-indigo-500/5 text-indigo-300'
                      }`}
                    >
                      ♂ Male Group
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-slate-950 hover:bg-slate-900 border border-indigo-500/15 hover:border-brand-500/40 text-indigo-200 rounded-xl font-display font-semibold text-2xs uppercase tracking-wider transition-all select-none cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-brand-400" />
                {tournament?.tournamentType === 'fixed_teams' ? 'Register Team Node' : 'Register Active Player'}
              </button>
            </form>

            {/* CSV Import Section */}
            <div className="border-t border-indigo-500/10 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-450" />
                  <span className="text-2xs font-mono uppercase text-indigo-300 font-bold tracking-wider">
                    Batch Import CSV
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="text-[9px] font-mono tracking-wider font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/15 py-1 px-2.5 rounded-lg border border-emerald-500/15 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3" /> Sample Template
                </button>
              </div>

              <p className="text-[10px] text-indigo-350 mb-3.5 leading-relaxed">
                {tournament?.tournamentType === 'fixed_teams'
                  ? "Upload a .csv file structured with a 'Team Name' header column to register multiple teams in bulk."
                  : "Upload a .csv file formatted with 'Name' and 'Gender' columns. Accepted genders are 'male' or 'female'."}
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setCsvIsDragOver(true);
                }}
                onDragLeave={() => setCsvIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCsvIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleCsvImport(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none ${
                  csvIsDragOver
                    ? 'border-brand-500 bg-brand-500/5 scale-[0.99]'
                    : 'border-indigo-500/15 hover:border-indigo-500/35 bg-slate-950/40 hover:bg-slate-950/80'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      handleCsvImport(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className={`w-6 h-6 mb-2 transition-transform duration-200 ${csvIsDragOver ? 'translate-y-[-2px] text-brand-400' : 'text-indigo-400'}`} />
                <span className="text-xs font-semibold text-white">
                  Click to browse or drop CSV
                </span>
                <span className="text-3xs font-mono text-indigo-455 mt-1">
                  Accepted suffix: .csv
                </span>
              </div>

              {csvError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2 items-start text-[11px] text-red-300 leading-relaxed font-sans">
                  <AlertTriangle className="w-4 h-4 text-red-405 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Parsing Error:</span> {csvError}
                  </div>
                </div>
              )}

              {csvSuccess && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-2 items-start text-[11px] text-emerald-300 leading-relaxed font-sans">
                  <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Success:</span> {csvSuccess}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Registries data list */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-tight">Active Registrants List</h3>
              </div>
              <span className="text-3xs font-mono text-indigo-455 uppercase tracking-widest">{players.length} registered</span>
            </div>

            <input
              type="text"
              placeholder="Filter names..."
              value={managePlayersQuery}
              onChange={(e) => setManagePlayersQuery(e.target.value)}
              className="w-full bg-slate-950 border border-indigo-500/15 rounded-xl py-2 px-3.5 text-xs text-white focus:outline-none"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {manageFilteredPlayers.length > 0 ? (
                manageFilteredPlayers.map((player) => (
                  <div key={player.id} className="flex justify-between items-center p-3.5 bg-slate-950/60 border border-indigo-500/5 rounded-2xl hover:border-indigo-505/15 transition-all">
                    <div className="flex flex-col">
                      <span className={`text-white tracking-tight ${tournament?.tournamentType === 'fixed_teams' ? 'text-sm font-bold uppercase' : 'text-xs font-semibold'}`}>
                        {player.name}
                      </span>
                      {tournament?.tournamentType === 'fixed_teams' ? (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-4xs font-mono font-bold uppercase rounded py-0.5 px-1.5 text-left w-fit select-none bg-emerald-500/10 text-emerald-300">
                            Team Entry • {player.points || 0} pts
                          </span>
                          {tournament?.matchingStyle === 'set_pools_round_robin' && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-4xs text-indigo-400 font-mono font-medium">Pool:</span>
                              <select
                                value={(player as any).pool || 'A'}
                                onChange={async (e) => {
                                  const poolVal = e.target.value;
                                  try {
                                    setIsLoading(true);
                                    await apiFetch('/api/player/update-pool', {
                                      method: 'POST',
                                      body: JSON.stringify({ playerId: player.id, pool: poolVal })
                                    });
                                    showNotification(`Assigned ${player.name} to Pool ${poolVal}`, 'success');
                                  } catch (err: any) {
                                    showNotification(err.message, 'error');
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }}
                                className="bg-slate-950 border border-indigo-500/20 text-3xs px-1 py-0.5 rounded font-mono font-bold text-white uppercase focus:ring-1 focus:ring-brand-500 focus:outline-none"
                              >
                                {Array.from({ length: tournament.numPools || 2 }, (_, i) => String.fromCharCode(65 + i)).map(pName => (
                                  <option key={pName} value={pName}>Pool {pName}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={`text-4xs font-mono font-bold uppercase rounded py-0.2 px-1 text-left w-fit mt-1 select-none ${
                          player.gender === 'female' ? 'bg-rose-500/10 text-rose-300' : 'bg-blue-500/10 text-blue-300'
                        }`}>
                          {player.gender || 'male'} player
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePlayer(player.id)}
                      disabled={isLoading}
                      className="p-1.5 hover:bg-rose-500/15 text-rose-450 hover:text-rose-300 rounded-lg transition-all outline-none cursor-pointer shrink-0"
                      title="Expel Player"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-center text-xs text-indigo-300/40 py-8">No matching entries are registered.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* C. PLAYOFFS MATCHES TREE BRACKETS TAB */}
      {adminTab === 'playoffs' && (
        <div className="flex flex-col gap-6">
          
          {/* Setup draft trigger if idle */}
          {(!bracketState || bracketState.status === 'idle') && (
            <div className="bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-8 backdrop-blur text-center flex flex-col items-center gap-6 max-w-2xl mx-auto shadow-xl">
              <div className="p-4 bg-indigo-505/10 border border-indigo-500/20 text-indigo-400 rounded-full text-lg">
                🏆
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white uppercase">Championship Playoffs Tree</h3>
                <p className="text-xs text-indigo-300/70 max-w-md mt-2 leading-relaxed">
                  {tournament?.tournamentType === 'fixed_teams'
                    ? 'Generate play-off brackets with actual teams loaded directly. Seeding is automatically based on tournament points standing.'
                    : 'Generate play-off brackets utilizing drafting style. High-scoring females are preferred as team Captains, with top-scoring males automatically assigned as Captains if there are not enough females to form equal teams.'}
                </p>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-left border-t border-b border-indigo-500/10 py-5">
                <div>
                  <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Bracket Style</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button
                      onClick={() => setBracketModeType('single')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border uppercase font-mono tracking-wider transition-all cursor-pointer ${
                        bracketModeType === 'single' ? 'bg-indigo-505/10 border-indigo-505 text-white' : 'bg-slate-950/80 border-indigo-505/5 text-indigo-400/50'
                      }`}
                    >
                      Single Elim
                    </button>
                    <button
                      onClick={() => setBracketModeType('double')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border uppercase font-mono tracking-wider transition-all cursor-pointer ${
                        bracketModeType === 'double' ? 'bg-indigo-505/10 border-indigo-555 text-white' : 'bg-slate-950/80 border-indigo-505/5 text-indigo-400/50'
                      }`}
                    >
                      Double Elim
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Divisional Bracket Split</label>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="desk-split-checkbox"
                      checked={hasLowerBracketCheckbox}
                      onChange={(e) => setHasLowerBracketCheckbox(e.target.checked)}
                      className="w-4 h-4 rounded border-indigo-500/20 bg-slate-950 text-indigo-600 cursor-pointer accent-indigo-500"
                    />
                    <label htmlFor="desk-split-checkbox" className="text-xs text-indigo-300 font-medium select-none cursor-pointer">
                      Split into Higher & Lower Division lists
                    </label>
                  </div>
                </div>
              </div>

              {tournament?.tournamentType === 'fixed_teams' ? (
                <button
                  type="button"
                  onClick={handleStartDirectBrackets}
                  disabled={isLoading || players.length === 0}
                  className="w-full bg-gradient-to-r from-indigo-600 to-brand-650 py-3.5 px-6 rounded-xl font-display font-bold text-xs tracking-wider uppercase text-white shadow shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  Generate Championship Playoff Brackets 🏆
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartDraft}
                  disabled={isLoading || players.length === 0}
                  className="w-full bg-gradient-to-r from-indigo-600 to-brand-650 py-3.5 px-6 rounded-xl font-display font-bold text-xs tracking-wider uppercase text-white shadow shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  Launch Playoff Drafting Workspace 🚀
                </button>
              )}
            </div>
          )}

          {/* Snake choosing state screen */}
          {bracketState && bracketState.status === 'drafting' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* Draft teams */}
              <div className="bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col gap-4 shadow-xl h-fit">
                <div className="border-b border-indigo-500/10 pb-3">
                  <h3 className="text-sm font-display font-medium text-white uppercase tracking-tight">Rosters Status Board</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {bracketState.teams.map((t, idx) => {
                    const isPickTerm = t.captainId === bracketState.currentPickerId;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isPickTerm ? 'bg-indigo-950/40 border-brand-500 ring-2 ring-brand-500/10' : 'bg-slate-950/60 border-indigo-500/5'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">{t.name}</span>
                          {isPickTerm && (
                            <span className="animate-pulse bg-brand-500 text-slate-950 font-bold text-4xs font-mono px-2 py-0.5 rounded uppercase">
                              Selecting Team Member...
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 border-t border-indigo-500/5 pt-2 flex flex-col gap-1 text-2xs">
                          <span className="text-indigo-300">Captain (F): <strong className="text-white">{t.captainName}</strong></span>
                          <span className="text-indigo-400 mt-1">Selections: {t.memberNames?.join(', ') || <span className="italic text-indigo-455">None picked</span>}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {confirmResetPlayoffs ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-rose-500/25 text-center space-y-3.5">
                    <p className="text-2xs font-mono text-rose-300 font-bold uppercase tracking-wider">Warning: This hard-resets playoffs back to base configurations, purging ALL brackets and completed snake drafts! Continue?</p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleResetBracketAndDraft();
                          setConfirmResetPlayoffs(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-2xs font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Yes, Reset everything ⚠️
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetPlayoffs(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-200 text-2xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetPlayoffs(true)}
                    disabled={isLoading}
                    className="w-full mt-4 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/20 text-rose-350 hover:text-rose-300 py-2.5 rounded-xl font-display font-semibold text-2xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel / Purge Draft Board ⚠️
                  </button>
                )}
              </div>

              {/* Pool elements */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                <div className="bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div>
                    <span className="text-3xs font-mono uppercase text-indigo-400 tracking-wider">Draft Action controller</span>
                    <h3 className="text-sm font-display font-bold text-white mt-0.5">
                      {(() => {
                        const activeTeam = bracketState.teams.find(t => t.captainId === bracketState.currentPickerId);
                        return activeTeam ? `Captain ${activeTeam.captainName} picks next member` : 'Awaiting turn wheels...';
                      })()}
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAutoDraftPick}
                      disabled={isLoading || bracketState.draftPool.length === 0}
                      className="bg-slate-950 hover:bg-slate-900 border border-indigo-500/20 py-2 px-3.5 rounded-xl text-3xs font-mono font-bold uppercase tracking-wider text-indigo-300 transition-all cursor-pointer"
                    >
                      Auto Draft Best
                    </button>

                    {bracketState.draftPool.length === 0 && (
                      <button
                        type="button"
                        onClick={handleCompleteDraftAndCreateBrackets}
                        disabled={isLoading}
                        className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-4 rounded-xl text-3xs uppercase tracking-wider transition-all cursor-pointer shadow"
                      >
                        Launch brackets drawing 🚀
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col gap-4 shadow-xl">
                  <h4 className="font-display font-bold text-xs text-indigo-100 uppercase tracking-tight">Available draft candidates pool</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {bracketState.draftPool.map((male) => {
                      const selected = selectedDraftPlayerId === male.playerId;
                      return (
                        <div
                          key={male.playerId}
                          onClick={() => setSelectedDraftPlayerId(male.playerId)}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                            selected ? 'bg-indigo-950 border-brand-500 shadow-md scale-[1.01]' : 'bg-slate-950/60 border-indigo-500/5'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-white">{male.name}</p>
                            <span className="text-3xs font-mono font-medium text-blue-300 mt-1 block">Roster Score: {male.score} pts</span>
                          </div>

                          {selected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDraftPlayer(male.playerId);
                              }}
                              disabled={isLoading}
                              className="w-full mt-3 py-1 bg-brand-500 text-slate-950 text-4xs font-mono font-bold uppercase rounded cursor-pointer transition-all"
                            >
                              Draft Player 🤝
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Playoff match tree visual node mappings */}
          {bracketState && (bracketState.status === 'active' || bracketState.status === 'completed') && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block font-bold">Playoffs Status Desk</span>
                  <h3 className="text-sm font-display font-medium text-white truncate max-w-sm mt-0.5">
                    {bracketState.settingType === 'double' ? 'Double Elimination playoffs' : 'Single Elimination playoffs'}
                  </h3>
                </div>

                <div className="flex gap-2.5">
                  {bracketState.hasLowerBracket && (
                    <div className="flex bg-slate-950 p-1 border border-indigo-500/10 rounded-xl gap-1 shrink-0">
                      <button
                        onClick={() => setActiveDivisionFilter('higher')}
                        className={`py-1.5 px-3 rounded-lg text-3xs font-bold uppercase transition-all whitespace-nowrap outline-none ${
                          activeDivisionFilter === 'higher' ? 'bg-indigo-505/15 border border-indigo-505/15 text-indigo-100' : 'text-indigo-455 hover:text-white'
                        }`}
                      >
                        Gold bracket
                      </button>
                      <button
                        onClick={() => setActiveDivisionFilter('lower')}
                        className={`py-1.5 px-3 rounded-lg text-3xs font-bold uppercase transition-all whitespace-nowrap outline-none ${
                          activeDivisionFilter === 'lower' ? 'bg-indigo-505/15 border border-indigo-505/15 text-indigo-100' : 'text-indigo-455 hover:text-white'
                        }`}
                      >
                        Silver bracket
                      </button>
                    </div>
                  )}

                  {confirmResetPlayoffs ? (
                    <div className="flex items-center gap-2.5 bg-slate-950/80 border border-rose-500/25 px-4 py-2 rounded-2xl shrink-0">
                      <span className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-tight">Erase all Brackets/Drafts?</span>
                      <button
                        onClick={() => {
                          handleResetBracketAndDraft();
                          setConfirmResetPlayoffs(false);
                        }}
                        className="bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-2.5 py-1 text-3xs font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Sure Reset
                      </button>
                      <button
                        onClick={() => setConfirmResetPlayoffs(false)}
                        className="text-slate-400 hover:text-slate-200 text-3xs font-bold uppercase transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmResetPlayoffs(true)}
                      disabled={isLoading}
                      type="button"
                      className="bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/15 text-rose-350 py-1.5 px-3.5 rounded-xl font-mono text-xs uppercase tracking-wide transition-all select-none hover:shadow cursor-pointer font-bold shrink-0 flex items-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Reset Playoffs
                    </button>
                  )}
                </div>
              </div>

              {/* DRAW NODES GRID */}
              {(() => {
                const filteredMatches = bracketState.matches.filter(m => !bracketState.hasLowerBracket || m.division === activeDivisionFilter);
                const roundsList = Array.from(new Set(filteredMatches.map(m => m.round))).sort((a,b)=>(a as number)-(b as number));

                return (
                  <div className="overflow-x-auto pb-4 flex gap-6 items-stretch">
                    {roundsList.map((rNum) => {
                      const roundMatches = filteredMatches.filter(m => m.round === rNum);
                      let heading = `Round ${rNum}`;
                      if (rNum === roundsList.length) {
                        heading = "Championship Finals 🏆";
                      } else if (rNum === roundsList.length - 1) {
                        heading = "Semi-Finals";
                      }

                      return (
                        <div key={rNum} className="flex-1 min-w-[280px] bg-slate-900/20 border border-indigo-500/5 p-4 rounded-3xl flex flex-col gap-4">
                          <div className="pb-2 text-center border-b border-indigo-500/5">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-450">Round {rNum}</span>
                            <h4 className="text-xs font-display font-medium text-white truncate mt-0.5">{heading}</h4>
                          </div>

                          <div className="flex flex-col gap-4 justify-around flex-grow mt-2">
                            {roundMatches.map((mNode) => {
                              const matchInputs = bracketScoreInputs[mNode.id] || { scoreA: '', scoreB: '' };
                              const settled = mNode.status === 'completed';
                              const teamAWon = settled && (mNode.scoreA || 0) > (mNode.scoreB || 0);
                              const teamBWon = settled && (mNode.scoreB || 0) > (mNode.scoreA || 0);

                              return (
                                <div key={mNode.id} className={`bg-slate-950/70 border rounded-2xl p-4 flex flex-col gap-3 shadow transition-all ${
                                  settled ? 'border-emerald-500/25 bg-slate-900/15' : 'border-indigo-500/10'
                                }`}>
                                  <div className="flex justify-between items-center text-[9px] font-mono uppercase">
                                    <span className="text-indigo-450 font-bold">{mNode.bracketType} matching</span>
                                    <span className={`px-1 rounded ${settled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-brand-500/10 text-brand-300'}`}>
                                      {settled ? 'Scored' : 'Unscored'}
                                    </span>
                                  </div>

                                  <div className="flex flex-col gap-2 border-t border-b border-indigo-500/5 py-2">
                                    {/* Team A view / edit */}
                                    <div className={`p-1.5 rounded-xl flex justify-between items-center bg-slate-900/55 ${teamAWon ? 'ring-1 ring-emerald-500/20' : ''}`}>
                                      <span className="text-xs font-semibold truncate max-w-[130px] text-indigo-100 block">
                                        {mNode.teamAName || <span className="text-indigo-455 italic font-mono text-3xs uppercase">TBD roster</span>}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        disabled={!mNode.teamAId || !mNode.teamBId}
                                        value={matchInputs.scoreA}
                                        onChange={(e) => setBracketScoreInputs(prev => ({
                                          ...prev,
                                          [mNode.id]: { ...prev[mNode.id], scoreA: e.target.value }
                                        }))}
                                        className="w-10 bg-slate-950 border border-indigo-500/15 rounded text-center text-xs font-mono font-bold pr-0.5"
                                      />
                                    </div>

                                    {/* Team B view / edit */}
                                    <div className={`p-1.5 rounded-xl flex justify-between items-center bg-slate-900/55 ${teamBWon ? 'ring-1 ring-emerald-500/20' : ''}`}>
                                      <span className="text-xs font-semibold truncate max-w-[130px] text-indigo-100 block">
                                        {mNode.teamBName || <span className="text-indigo-455 italic font-mono text-3xs uppercase">TBD roster</span>}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        disabled={!mNode.teamAId || !mNode.teamBId}
                                        value={matchInputs.scoreB}
                                        onChange={(e) => setBracketScoreInputs(prev => ({
                                          ...prev,
                                          [mNode.id]: { ...prev[mNode.id], scoreB: e.target.value }
                                        }))}
                                        className="w-10 bg-slate-950 border border-indigo-500/15 rounded text-center text-xs font-mono font-bold pr-0.5"
                                      />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={!mNode.teamAId || !mNode.teamBId || isLoading}
                                    onClick={() => handleSubmitBracketScore(mNode.id)}
                                    className={`w-full py-1.5 rounded-xl font-mono text-4xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                      settled ? 'bg-emerald-650 hover:bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-550'
                                    } disabled:opacity-40`}
                                  >
                                    {settled ? 'Modify placements scorecard' : 'Confirm placement score'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}

        </div>
      )}

      {/* D. GENERAL SETTINGS AND OVERWRITES TAB */}
      {adminTab === 'settings' && (
        <div className="max-w-xl mx-auto w-full">
          <div className="bg-slate-900/60 border border-indigo-500/15 rounded-3xl p-6 backdrop-blur flex flex-col gap-5 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-indigo-500/10 pb-4">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-display font-bold text-white uppercase">Reset & Config Desk</h3>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Roster format size</label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    onClick={() => setSetupFormat('2s')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      setupFormat === '2s' ? 'bg-indigo-505/10 border-indigo-501 text-white' : 'bg-slate-950 border-indigo-505/5 text-indigo-350'
                    }`}
                  >
                    2v2 Pool Matches (2s)
                  </button>
                  <button
                    onClick={() => setSetupFormat('4s')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      setupFormat === '4s' ? 'bg-indigo-505/10 border-indigo-501 text-white' : 'bg-slate-950 border-indigo-505/5 text-indigo-355'
                    }`}
                  >
                    4v4 Pool Matches (4s)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Total rounds</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="3"
                    value={setupRounds}
                    onChange={(e) => setSetupRounds(parseInt(e.target.value, 10) || 3)}
                    className="w-full mt-1.5 bg-slate-950 border border-indigo-500/10 rounded-xl py-2 px-3 font-mono text-xs text-white placeholder-indigo-400/30"
                  />
                </div>

                <div>
                  <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Max court cap count</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="No Cap Limit"
                    value={setupMaxCourts}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSetupMaxCourts(v === '' ? '' : parseInt(v, 10));
                    }}
                    className="w-full mt-1.5 bg-slate-950 border border-indigo-500/10 rounded-xl py-2 px-3 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Tournament Formula</label>
                <div className="grid grid-cols-2 gap-3 mt-1.5 font-sans">
                  <button
                    onClick={() => setSetupTournamentType('scramble')}
                    type="button"
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      setupTournamentType === 'scramble' ? 'bg-indigo-505/10 border-indigo-501 text-white' : 'bg-slate-950 border-indigo-505/5 text-indigo-350'
                    }`}
                  >
                    Individual Scramble 🔀
                  </button>
                  <button
                    onClick={() => setSetupTournamentType('fixed_teams')}
                    type="button"
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      setupTournamentType === 'fixed_teams' ? 'bg-indigo-505/10 border-indigo-501 text-white' : 'bg-slate-950 border-indigo-505/5 text-indigo-350'
                    }`}
                  >
                    Standard Team Style 🛡️
                  </button>
                </div>
              </div>

              {setupTournamentType === 'scramble' && (
                <>
                  <div>
                    <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Scoring points system</label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <button
                        onClick={() => setSetupPlayMode('matches')}
                        style={{ cursor: 'pointer' }}
                        className={`py-2.5 rounded-xl text-[10px] tracking-wider uppercase font-bold font-display border transition-all ${
                          setupPlayMode === 'matches' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-350'
                        }`}
                      >
                        Team game wins
                      </button>
                      <button
                        onClick={() => setSetupPlayMode('individual')}
                        style={{ cursor: 'pointer' }}
                        className={`py-2.5 rounded-xl text-[10px] tracking-wider uppercase font-bold font-display border transition-all ${
                          setupPlayMode === 'individual' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-350'
                        }`}
                      >
                        King of Court
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-indigo-500/5 pt-4 mt-2">
                    <input
                      type="checkbox"
                      id="desk-split-women"
                      checked={setupSplitWomenEvenly}
                      onChange={(e) => setSetupSplitWomenEvenly(e.target.checked)}
                      className="w-4 h-4 rounded border-indigo-504 bg-slate-950 text-indigo-600 accent-indigo-505"
                    />
                    <label htmlFor="desk-split-women" className="text-xs text-indigo-300 font-semibold select-none">
                      Always Split Females Evenly ♀
                    </label>
                  </div>
                </>
              )}

              {setupTournamentType === 'fixed_teams' && (
                <>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-indigo-400 tracking-wider font-bold">Standard Team Matching Style</label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5 font-sans">
                      <button
                        onClick={() => setSetupMatchingStyle('random_pool_play')}
                        type="button"
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          setupMatchingStyle === 'random_pool_play' ? 'bg-indigo-501/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-350'
                        }`}
                      >
                        Random Pool Play
                      </button>
                      <button
                        onClick={() => setSetupMatchingStyle('set_pools_round_robin')}
                        type="button"
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          setupMatchingStyle === 'set_pools_round_robin' ? 'bg-indigo-501/10 border-indigo-500 text-white' : 'bg-slate-950 border-indigo-500/5 text-indigo-350'
                        }`}
                      >
                        Set Pools Round Robin
                      </button>
                    </div>
                  </div>

                  {setupMatchingStyle === 'set_pools_round_robin' && (
                    <div>
                      <label className="text-3xs font-mono uppercase text-indigo-400 tracking-wider font-bold">Number of Pools</label>
                      <select
                        value={setupNumPools}
                        onChange={(e) => setSetupNumPools(parseInt(e.target.value, 10))}
                        className="w-full mt-1.5 bg-slate-950 border border-indigo-500/10 rounded-xl py-2 px-3 text-xs text-white placeholder-indigo-400/30 font-medium focus:outline-none"
                      >
                        <option value={2}>2 Pools (Pool A & B)</option>
                        <option value={3}>3 Pools (Pool A, B, C)</option>
                        <option value={4}>4 Pools (Pool A, B, C, D)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleTournamentSetup}
                className="w-full mt-3 py-3 bg-indigo-650 hover:bg-indigo-600 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white shadow shadow-indigo-600/10 transition-all cursor-pointer"
              >
                Reset & Apply Overwrites ⚡
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
