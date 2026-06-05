import express from 'express';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  collection, 
  query, 
  where, 
  increment, 
  arrayUnion,
  limit
} from 'firebase/firestore';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = express();
const PORT = 3000;

app.use(express.json());

const resolvedFirebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
  firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

// Initialize Firebase JS SDK with the client credentials or environment fallback
const firebaseApp = initializeApp(resolvedFirebaseConfig);
const db = getFirestore(firebaseApp, resolvedFirebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Subcollection path resolver to easily isolate different tournaments
function getPaths(tournamentId: string) {
  const tId = tournamentId || 'current';
  return {
    tournament: doc(db, 'rounds', `tournament_${tId}`),
    playersCol: collection(db, 'players'),
    players: query(collection(db, 'players'), where('tournamentId', '==', tId)),
    player: (id: string) => doc(db, 'players', id),
    matchesCol: collection(db, 'rounds'),
    matches: query(collection(db, 'rounds'), where('tournamentId', '==', tId), where('type', '==', 'match')),
    match: (id: string) => doc(db, 'rounds', `match_${id}`),
    roundsCol: collection(db, 'rounds'),
    rounds: query(collection(db, 'rounds'), where('tournamentId', '==', tId), where('type', '==', 'round')),
    round: (id: string) => doc(db, 'rounds', `round_${id}`),
    bracket: doc(db, 'rounds', `bracket_${tId}`)
  };
}

// Helper to extract tournamentId from request
function getTournamentId(req: express.Request): string {
  const tid = req.headers['x-tournament-id'] || req.query.tournamentId || req.body.tournamentId;
  return typeof tid === 'string' && tid.trim().length > 0 ? tid.trim() : 'current';
}

// ==========================================
// TOURNAMENT COLLECTION ENDPOINTS
// ==========================================

// Check if user is an organizer (administrator)
app.get('/api/organizers/check', async (req, res) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : '';
    if (!email) {
      return res.json({ isAdmin: false });
    }

    const docRef = doc(db, 'organizers', email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return res.json({ isAdmin: true });
    }

    // Check if there are any organizers registered at all
    const organizersRef = collection(db, 'organizers');
    const qSnapshot = await getDocs(query(organizersRef, limit(1)));

    if (qSnapshot.empty) {
      // First run! Self-register this user as the first administrator
      await setDoc(docRef, {
        email,
        createdAt: new Date().toISOString(),
        addedBy: 'system-api-first-run'
      });
      console.log(`[API] Registered initial system organizer: ${email}`);
      return res.json({ isAdmin: true });
    }

    // Fallback search by query field if document id isn't exact
    const emailQuery = query(organizersRef, where('email', '==', email), limit(1));
    const querySnap = await getDocs(emailQuery);
    if (!querySnap.empty) {
      return res.json({ isAdmin: true });
    }

    return res.json({ isAdmin: false });
  } catch (err: any) {
    console.error('Error verifying organizer status on backend:', err);
    return res.status(500).json({ error: err.message || 'Verification error' });
  }
});

// List all tournaments
app.get('/api/tournaments', async (req, res) => {
  try {
    const querySnapshot = await getDocs(query(collection(db, 'rounds'), where('type', '==', 'tournament')));
    const list: any[] = [];
    querySnapshot.forEach(docSnap => {
      // Use the settings and preserve document id if needed
      list.push({ id: docSnap.data().id || docSnap.id, ...docSnap.data() });
    });
    // Sort by createdAt descending, default to empty
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.json(list);
  } catch (err: any) {
    console.error('Error listing tournaments:', err);
    res.status(500).json({ error: err.message || 'Failed to list tournaments.' });
  }
});

// Create a new tournament
app.post('/api/tournaments', async (req, res) => {
  const { title, date, format, totalRounds, maxCourts, playMode, splitWomenEvenly, tournamentType, matchingStyle, numPools } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Tournament title is required.' });
  }
  const cleanTitle = title.trim();
  const cleanDate = typeof date === 'string' ? date.trim() : new Date().toISOString().split('T')[0];
  const parsedFormat = format === '4s' ? '4s' : '2s';
  const parsedRounds = parseInt(totalRounds, 10);
  const finalRounds = isNaN(parsedRounds) || parsedRounds <= 0 ? 3 : parsedRounds;
  const parsedPlayMode = playMode === 'individual' ? 'individual' : 'matches';
  const evenWomen = splitWomenEvenly !== false;
  const parsedTournamentType = tournamentType === 'fixed_teams' ? 'fixed_teams' : 'scramble';

  const tournamentId = 'tourney_' + Math.random().toString(36).substr(2, 9);
  const paths = getPaths(tournamentId);

  let parsedMaxCourts: number | null = null;
  if (maxCourts !== undefined && maxCourts !== null && maxCourts !== '') {
    const temp = parseInt(maxCourts, 10);
    if (!isNaN(temp) && temp > 0) {
      parsedMaxCourts = temp;
    }
  }

  const newConfig = {
    id: tournamentId,
    title: cleanTitle,
    date: cleanDate,
    format: parsedFormat,
    totalRounds: finalRounds,
    currentRound: 0,
    status: 'configuring',
    playMode: parsedPlayMode,
    tournamentType: parsedTournamentType,
    splitWomenEvenly: evenWomen,
    maxCourts: parsedMaxCourts,
    matchingStyle: matchingStyle || 'random_pool_play',
    numPools: parseInt(numPools, 10) || 2,
    createdAt: new Date().toISOString(),
    type: 'tournament',
    tournamentId
  };

  try {
    await setDoc(paths.tournament, newConfig);
    return res.json(newConfig);
  } catch (err: any) {
    console.error('Error creating tournament:', err);
    res.status(500).json({ error: err.message || 'Failed to create tournament.' });
  }
});

// Delete a tournament and all its child data
app.delete('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Tournament ID is required.' });
  }
  const paths = getPaths(id);
  try {
    const batch = writeBatch(db);
    
    // Fetch and delete players subcollection
    const playersSnap = await getDocs(paths.players);
    playersSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Fetch and delete matches subcollection
    const matchesSnap = await getDocs(paths.matches);
    matchesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Fetch and delete rounds subcollection
    const roundsSnap = await getDocs(paths.rounds);
    roundsSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete single bracket config document
    batch.delete(paths.bracket);
    
    // Delete main tournament document
    batch.delete(paths.tournament);

    await batch.commit();
    return res.json({ success: true, message: 'Tournament successfully deleted.' });
  } catch (err: any) {
    console.error('Error deleting tournament:', err);
    res.status(500).json({ error: err.message || 'Failed to delete tournament.' });
  }
});

// Get individual tournament details
app.get('/api/tournament', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);
  try {
    let snapshot;
    try {
      snapshot = await getDoc(paths.tournament);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}`);
    }
    
    if (!snapshot.exists()) {
      // Default initial layout for fallback
      const defaultState = {
        id: tournamentId,
        title: 'Arena Tournament',
        date: new Date().toISOString().split('T')[0],
        format: '2s',
        totalRounds: 3,
        currentRound: 0,
        status: 'configuring',
        playMode: 'matches',
        splitWomenEvenly: true,
        type: 'tournament',
        tournamentId
      };
      try {
        await setDoc(paths.tournament, defaultState);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}`);
      }
      return res.json(defaultState);
    }
    
    return res.json(snapshot.data());
  } catch (error: any) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tournament state.' });
  }
});

// Configure existing Tournament Setup
app.post('/api/setup', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  const { format, totalRounds, maxCourts, playMode, splitWomenEvenly, tournamentType, matchingStyle, numPools } = req.body;
  
  if (format !== '2s' && format !== '4s') {
    return res.status(400).json({ error: "Format must be either '2s' or '4s'." });
  }
  
  const parsedRounds = parseInt(totalRounds, 10);
  if (isNaN(parsedRounds) || parsedRounds <= 0) {
    return res.status(400).json({ error: "totalRounds must be a positive integer." });
  }

  const parsedTournamentType = tournamentType === 'fixed_teams' ? 'fixed_teams' : 'scramble';

  let parsedMaxCourts: number | null = null;
  if (maxCourts !== undefined && maxCourts !== null && maxCourts !== '') {
    const temp = parseInt(maxCourts, 10);
    if (!isNaN(temp)) {
      if (temp <= 0) {
        return res.status(400).json({ error: "Max courts cap must be a positive integer." });
      }
      parsedMaxCourts = temp;
    }
  }

  const parsedPlayMode = playMode === 'individual' ? 'individual' : 'matches';
  
  try {
    const batch = writeBatch(db);
    
    // Clear all existing matches
    let matchesSnapshot;
    try {
      matchesSnapshot = await getDocs(paths.matches);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/matches`);
    }
    matchesSnapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    // Clear all existing rounds
    let roundsSnapshot;
    try {
      roundsSnapshot = await getDocs(paths.rounds);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/rounds`);
    }
    roundsSnapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    // Reset players: points = 0, byesCount = 0, satOutRounds = []
    let playersSnapshot;
    try {
      playersSnapshot = await getDocs(paths.players);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/players`);
    }
    playersSnapshot.forEach(docSnap => {
      batch.update(docSnap.ref, {
        points: 0,
        byesCount: 0,
        satOutRounds: []
      });
    });
    
    // Get existing tournament metadata first to preserve title, date
    let existingSnap = await getDoc(paths.tournament);
    const existingData = existingSnap.exists() ? existingSnap.data() : {};

    // Set active tournament settings
    const newConfig: any = {
      ...existingData,
      id: tournamentId,
      format,
      totalRounds: parsedRounds,
      currentRound: 0,
      status: 'active',
      playMode: parsedPlayMode,
      tournamentType: parsedTournamentType,
      splitWomenEvenly: splitWomenEvenly === true,
      maxCourts: parsedMaxCourts,
      matchingStyle: matchingStyle || 'random_pool_play',
      numPools: parseInt(numPools, 10) || 2
    };
    batch.set(paths.tournament, newConfig);
    batch.delete(paths.bracket);
    
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `batch/setup/${tournamentId}`);
    }
    res.json({ message: 'Tournament configured successfully', tournament: newConfig });
  } catch (error: any) {
    console.error('Error configuring tournament:', error);
    res.status(500).json({ error: error.message || 'Failed to setup tournament.' });
  }
});

// ==========================================
// PLAYERS MANAGEMENT ENDPOINTS
// ==========================================

// Add Player
app.post(['/api/players', '/api/player'], async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  const { name, gender } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Player name is required.' });
  }
  if (gender !== 'male' && gender !== 'female') {
    return res.status(400).json({ error: "Gender is required and must be either 'male' or 'female'." });
  }
  
  try {
    const cleanName = name.trim();
    const playerRef = doc(paths.playersCol);
    const newPlayer = {
      id: playerRef.id,
      name: cleanName,
      points: 0,
      byesCount: 0,
      satOutRounds: [],
      gender: gender as 'male' | 'female',
      tournamentId
    };
    
    try {
      await setDoc(playerRef, newPlayer);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournamentId}/players/${playerRef.id}`);
    }
    res.json(newPlayer);
  } catch (error: any) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: error.message || 'Failed to create player.' });
  }
});

// Bulk Add Players (Import CSV)
app.post('/api/players/bulk', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  const { players } = req.body;
  if (!players || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'Players array is required and must not be empty.' });
  }

  try {
    const addedPlayers = [];
    
    for (const p of players) {
      const { name, gender } = p;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        continue;
      }
      const cleanName = name.trim();
      const cleanGender = (gender === 'female' || gender === 'male') ? gender : 'male';
      const playerRef = doc(paths.playersCol);
      const newPlayer = {
        id: playerRef.id,
        name: cleanName,
        points: 0,
        byesCount: 0,
        satOutRounds: [],
        gender: cleanGender,
        tournamentId
      };
      await setDoc(playerRef, newPlayer);
      addedPlayers.push(newPlayer);
    }

    res.json({ success: true, count: addedPlayers.length, players: addedPlayers });
  } catch (error: any) {
    console.error('Error batch adding players:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk import players.' });
  }
});

// Delete Player
app.delete(['/api/players/:id', '/api/player/:id'], async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);
  const { id } = req.params;

  try {
    try {
      await deleteDoc(paths.player(id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tournaments/${tournamentId}/players/${id}`);
    }
    res.json({ success: true, message: 'Player deleted' });
  } catch (error: any) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: error.message || 'Failed to delete player.' });
  }
});

// ==========================================
// MATCHMAKER POOL LOGIC
// ==========================================

// Circle Method for Round Robin matchmaking
function getRoundRobinMatchups(teams: any[], roundNumber: number): { teamA: any, teamB: any }[] {
  const n = teams.length;
  if (n < 2) return [];

  // If odd, append a bye dummy
  let list = [...teams];
  const hasDummy = n % 2 !== 0;
  if (hasDummy) {
    list.push({ id: 'bye_dummy_node', name: 'Bye', isDummy: true });
  }

  const totalTeams = list.length;
  const numRounds = totalTeams - 1;
  const r = (roundNumber - 1) % numRounds;

  const matchups: { teamA: any, teamB: any }[] = [];
  for (let i = 0; i < totalTeams / 2; i++) {
    const aIndex = i;
    const bIndex = totalTeams - 1 - i;

    const getRotatedIndex = (idx: number) => {
      if (idx === 0) return 0;
      return 1 + ((idx - 1 + r) % (totalTeams - 1));
    };

    const teamA = list[getRotatedIndex(aIndex)];
    const teamB = list[getRotatedIndex(bIndex)];

    if (teamA.isDummy || teamB.isDummy) {
      continue; // Skip any matches against the dummy/bye team
    }

    matchups.push({ teamA, teamB });
  }

  return matchups;
}

// Generate Round X
app.post('/api/generate-round', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);
  
  try {
    // 1. Fetch tournament setup
    let tournamentSnap;
    try {
      tournamentSnap = await getDoc(paths.tournament);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}`);
    }
    if (!tournamentSnap.exists()) {
      return res.status(400).json({ error: 'No tournament has been configured yet.' });
    }
    
    const tournament = tournamentSnap.data()!;
    const format = tournament.format; // '2s' or '4s'
    let blockSize = format === '2s' ? 4 : 8;

    const { roundNumber } = req.body || {};
    const parsedRound = roundNumber !== undefined ? parseInt(roundNumber, 10) : (tournament.currentRound || 0) + 1;
    
    if (isNaN(parsedRound) || parsedRound <= 0) {
      return res.status(400).json({ error: 'roundNumber must be a positive integer.' });
    }
    
    // Check if generating beyond final round
    if (parsedRound > tournament.totalRounds) {
      return res.status(400).json({ error: `Cannot generate round ${parsedRound}. Tournament max rounds is ${tournament.totalRounds}.` });
    }

    // Check if there are matches in previous rounds that are still pending
    if (parsedRound > 1) {
      let prevRoundMatches;
      try {
        prevRoundMatches = await getDocs(
          query(paths.matches, where('round', '==', parsedRound - 1))
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/matches(r${parsedRound - 1})`);
      }
      
      let allCompleted = true;
      prevRoundMatches.forEach(docSnap => {
        if (docSnap.data().status !== 'completed') {
          allCompleted = false;
        }
      });
      
      if (!allCompleted) {
        return res.status(400).json({ error: `Cannot generate Round ${parsedRound} until all matches of Round ${parsedRound - 1} are scored!` });
      }
    }
    
    // Delete existing matches for this round if regenerated
    let existingMatches;
    try {
      existingMatches = await getDocs(
        query(paths.matches, where('round', '==', parsedRound))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/matches(r${parsedRound})`);
    }
    
    const delBatch = writeBatch(db);
    existingMatches.forEach(docSnap => {
      delBatch.delete(docSnap.ref);
    });
    try {
      await delBatch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `batch_delete_matches_r${parsedRound}`);
    }
    
    // 2. Fetch players
    let playersSnap;
    try {
      playersSnap = await getDocs(paths.players);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/players`);
    }
    const players: any[] = [];
    playersSnap.forEach(docSnap => {
      players.push(docSnap.data());
    });
    
    const playMode = tournament.playMode || 'matches';
    const tournamentType = tournament.tournamentType || 'scramble';

    if (tournamentType === 'fixed_teams') {
      if (players.length < 2) {
        return res.status(400).json({ 
          error: `Not enough teams registered! You need at least 2 teams to generate round matchups of Team Style.` 
        });
      }

      let byeTeams: any[] = [];
      let computedMatchups: { teamA: any, teamB: any, pool: string }[] = [];

      const numPools = tournament.numPools || 2;
      const poolNames = Array.from({ length: numPools }, (_, i) => String.fromCharCode(65 + i)); // ['A', 'B', ...]

      // Distribute any players who do not have an assigned pool
      const updatedPlayersBatch = writeBatch(db);
      let didUpdatePools = false;

      // Find sizes of current pools for players who do have a pool
      const poolCounts: Record<string, number> = {};
      poolNames.forEach(p => { poolCounts[p] = 0; });
      players.forEach(p => {
        if (p.pool && poolNames.includes(p.pool)) {
          poolCounts[p.pool]++;
        }
      });

      players.forEach(p => {
        if (!p.pool || !poolNames.includes(p.pool)) {
          // Find pool with minimum size
          let minPool = poolNames[0];
          let minSize = poolCounts[minPool];
          poolNames.forEach(pn => {
            if (poolCounts[pn] < minSize) {
              minPool = pn;
              minSize = poolCounts[pn];
            }
          });
          p.pool = minPool;
          poolCounts[minPool]++;
          
          updatedPlayersBatch.update(paths.player(p.id), { pool: minPool });
          didUpdatePools = true;
        }
      });

      if (didUpdatePools) {
        try {
          await updatedPlayersBatch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `batch_players_repool_${tournamentId}`);
        }
      }

      const matchingStyle = tournament.matchingStyle || 'random_pool_play';

      if (matchingStyle === 'set_pools_round_robin') {
        // Round Robin within pools
        poolNames.forEach(poolName => {
          const poolTeams = players.filter(p => p.pool === poolName);
          if (poolTeams.length < 2) return;

          const poolMatchups = getRoundRobinMatchups(poolTeams, parsedRound);

          // Find bye team for this pool (if odd number of teams)
          if (poolTeams.length % 2 !== 0) {
            const pairedIds = new Set([
              ...poolMatchups.map(m => m.teamA.id),
              ...poolMatchups.map(m => m.teamB.id)
            ]);
            const byeTeam = poolTeams.find(t => !pairedIds.has(t.id));
            if (byeTeam) {
              byeTeams.push(byeTeam);
            }
          }

          poolMatchups.forEach(m => {
            computedMatchups.push({
              teamA: m.teamA,
              teamB: m.teamB,
              pool: poolName
            });
          });
        });
      } else {
        // Standard Randomized Pool play (shuffles and pairs teams within maxCourts cap)
        const shuffledTeams = [...players];
        for (let i = shuffledTeams.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffledTeams[i];
          shuffledTeams[i] = shuffledTeams[j];
          shuffledTeams[j] = temp;
        }

        const maxCourts = tournament.maxCourts;
        let numMatches = Math.floor(shuffledTeams.length / 2);
        if (maxCourts && maxCourts > 0) {
          numMatches = Math.min(numMatches, maxCourts);
        }

        const numActivePlaying = numMatches * 2;
        const numByes = shuffledTeams.length - numActivePlaying;

        let activeTeams: any[] = [];

        if (numByes > 0) {
          const sortedForByes = [...shuffledTeams].sort((a, b) => (a.byesCount || 0) - (b.byesCount || 0));
          byeTeams = sortedForByes.slice(0, numByes);
          const byeIds = new Set(byeTeams.map(t => t.id));
          activeTeams = shuffledTeams.filter(t => !byeIds.has(t.id));
        } else {
          activeTeams = shuffledTeams;
        }

        for (let i = 0; i < numMatches; i++) {
          computedMatchups.push({
            teamA: activeTeams[2 * i],
            teamB: activeTeams[2 * i + 1],
            pool: 'General'
          });
        }
      }

      const writeBatchVar = writeBatch(db);

      for (let i = 0; i < computedMatchups.length; i++) {
        const { teamA, teamB, pool } = computedMatchups[i];
        const matchId = `match_r${parsedRound}_c${i + 1}`;
        const matchDocRef = paths.match(matchId);

        writeBatchVar.set(matchDocRef, {
          id: matchId,
          round: parsedRound,
          court: i + 1,
          teamA: [teamA.id],
          teamANames: [teamA.name],
          teamB: [teamB.id],
          teamBNames: [teamB.name],
          teamAScore: null,
          teamBScore: null,
          status: 'pending',
          type: 'match',
          pool,
          tournamentId
        });
      }

      for (const team of byeTeams) {
        const teamRef = paths.player(team.id);
        writeBatchVar.update(teamRef, {
          byesCount: increment(1),
          satOutRounds: arrayUnion(parsedRound)
        });
      }

      const roundDocRef = paths.round(`round_${parsedRound}`);
      writeBatchVar.set(roundDocRef, {
        roundNumber: parsedRound,
        byes: byeTeams.map(t => ({ id: t.id, name: t.name })),
        type: 'round',
        tournamentId
      });

      const tournamentRef = paths.tournament;
      writeBatchVar.update(tournamentRef, {
        currentRound: parsedRound
      });

      try {
        await writeBatchVar.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `batch_generate_round_r${parsedRound}/${tournamentId}`);
      }

      return res.json({ 
        success: true, 
        roundNumber: parsedRound, 
        byes: byeTeams.map(t => ({ id: t.id, name: t.name }))
      });
    }

    const isIndividualScoring = playMode === 'individual';
    const teamSize = format === '2s' ? 2 : 4;
    blockSize = isIndividualScoring ? teamSize : (format === '2s' ? 4 : 8);

    if (players.length < blockSize) {
      return res.status(400).json({ 
        error: `Not enough active players! You need at least ${blockSize} players to generate a game in ${format} format. Current player count is ${players.length}.` 
      });
    }
    
    // Shuffle and Sort Stably by byesCount ascending
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    
    const maxCourts = tournament.maxCourts;
    const totalPlayersCount = shuffled.length;
    let numMatchesOrTeams = Math.floor(totalPlayersCount / blockSize);
    if (!isIndividualScoring && maxCourts && maxCourts > 0) {
      numMatchesOrTeams = Math.min(numMatchesOrTeams, maxCourts);
    }
    
    if (numMatchesOrTeams <= 0) {
      return res.status(400).json({ 
        error: `Cannot generate round! Court or team limit restrictions resulted in 0 active teams.` 
      });
    }

    const numActivePlaying = numMatchesOrTeams * blockSize;
    const numByes = totalPlayersCount - numActivePlaying;
    
    let byePlayers: any[] = [];
    let activePlayers: any[] = [];
    
    if (numByes > 0) {
      const sortedForByes = [...shuffled].sort((a, b) => (a.byesCount || 0) - (b.byesCount || 0));
      byePlayers = sortedForByes.slice(0, numByes);
      const byeIds = new Set(byePlayers.map(p => p.id));
      activePlayers = shuffled.filter(p => !byeIds.has(p.id));
    } else {
      activePlayers = shuffled;
    }
    
    // Create matches/teams
    const writeBatchVar = writeBatch(db);
    const splitWomenEvenly = tournament.splitWomenEvenly === true;
    
    if (splitWomenEvenly) {
      const N_teams = isIndividualScoring ? numMatchesOrTeams : (2 * numMatchesOrTeams);
      
      const activeFemales = activePlayers.filter(p => p.gender === 'female');
      const activeMales = activePlayers.filter(p => !p.gender || p.gender === 'male');
      
      const teamBuckets: any[][] = Array.from({ length: N_teams }, () => []);
      const teamIndices = Array.from({ length: N_teams }, (_, idx) => idx);
      
      for (let i = teamIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = teamIndices[i];
        teamIndices[i] = teamIndices[j];
        teamIndices[j] = temp;
      }
      
      let indexPtr = 0;
      for (const female of activeFemales) {
        const targetTeamIdx = teamIndices[indexPtr % N_teams];
        teamBuckets[targetTeamIdx].push(female);
        indexPtr++;
      }
      
      let malePtr = 0;
      for (let tIdx = 0; tIdx < N_teams; tIdx++) {
        while (teamBuckets[tIdx].length < teamSize && malePtr < activeMales.length) {
          teamBuckets[tIdx].push(activeMales[malePtr]);
          malePtr++;
        }
      }
      
      if (isIndividualScoring) {
        for (let i = 0; i < numMatchesOrTeams; i++) {
          const teamA = teamBuckets[i];
          const matchId = `match_r${parsedRound}_t${i + 1}`;
          const matchDocRef = paths.match(matchId);
          
          writeBatchVar.set(matchDocRef, {
            id: matchId,
            round: parsedRound,
            court: null,
            teamNumber: i + 1,
            teamA: teamA.map(p => p.id),
            teamANames: teamA.map(p => p.name),
            teamB: [],
            teamBNames: [],
            teamAScore: null,
            teamBScore: null,
            status: 'pending',
            type: 'match',
            tournamentId
          });
        }
      } else {
        for (let i = 0; i < numMatchesOrTeams; i++) {
          const teamA = teamBuckets[2 * i];
          const teamB = teamBuckets[2 * i + 1];
          const matchId = `match_r${parsedRound}_c${i + 1}`;
          const matchDocRef = paths.match(matchId);
          
          writeBatchVar.set(matchDocRef, {
            id: matchId,
            round: parsedRound,
            court: i + 1,
            teamA: teamA.map(p => p.id),
            teamANames: teamA.map(p => p.name),
            teamB: teamB.map(p => p.id),
            teamBNames: teamB.map(p => p.name),
            teamAScore: null,
            teamBScore: null,
            status: 'pending',
            type: 'match',
            tournamentId
          });
        }
      }
    } else {
      if (isIndividualScoring) {
        for (let i = 0; i < numMatchesOrTeams; i++) {
          const startIndex = i * teamSize;
          const teamA = activePlayers.slice(startIndex, startIndex + teamSize);
          const matchId = `match_r${parsedRound}_t${i + 1}`;
          const matchDocRef = paths.match(matchId);
          
          writeBatchVar.set(matchDocRef, {
            id: matchId,
            round: parsedRound,
            court: null,
            teamNumber: i + 1,
            teamA: teamA.map(p => p.id),
            teamANames: teamA.map(p => p.name),
            teamB: [],
            teamBNames: [],
            teamAScore: null,
            teamBScore: null,
            status: 'pending',
            type: 'match',
            tournamentId
          });
        }
      } else {
        for (let i = 0; i < numMatchesOrTeams; i++) {
          const startIndex = i * blockSize;
          const matchPlayers = activePlayers.slice(startIndex, startIndex + blockSize);
          const teamA = matchPlayers.slice(0, format === '2s' ? 2 : 4);
          const teamB = matchPlayers.slice(format === '2s' ? 2 : 4);
          
          const matchId = `match_r${parsedRound}_c${i + 1}`;
          const matchDocRef = paths.match(matchId);
          
          writeBatchVar.set(matchDocRef, {
            id: matchId,
            round: parsedRound,
            court: i + 1,
            teamA: teamA.map(p => p.id),
            teamANames: teamA.map(p => p.name),
            teamB: teamB.map(p => p.id),
            teamBNames: teamB.map(p => p.name),
            teamAScore: null,
            teamBScore: null,
            status: 'pending',
            type: 'match',
            tournamentId
          });
        }
      }
    }
    
    // Update bye count and record sit-out rounds for Bye players
    for (const player of byePlayers) {
      const playerRef = paths.player(player.id);
      writeBatchVar.update(playerRef, {
        byesCount: increment(1),
        satOutRounds: arrayUnion(parsedRound)
      });
    }
    
    // Store metadata for the round
    const roundDocRef = paths.round(`round_${parsedRound}`);
    writeBatchVar.set(roundDocRef, {
      roundNumber: parsedRound,
      byes: byePlayers.map(p => ({ id: p.id, name: p.name })),
      type: 'round',
      tournamentId
    });
    
    // Update tournament settings progress
    const tournamentRef = paths.tournament;
    writeBatchVar.update(tournamentRef, {
      currentRound: parsedRound
    });
    
    try {
      await writeBatchVar.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `batch_generate_round_r${parsedRound}/${tournamentId}`);
    }
    res.json({ 
      success: true, 
      roundNumber: parsedRound, 
      byes: byePlayers.map(p => ({ id: p.id, name: p.name }))
    });
  } catch (error: any) {
    console.error('Error generating round matchmaking:', error);
    res.status(500).json({ error: error.message || 'Failed to generate round.' });
  }
});

// Score propagation handler
app.post('/api/submit-score', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  const { matchId, teamAScore, teamBScore } = req.body;
  
  const scoreA = parseInt(teamAScore, 10);
  const scoreB = parseInt(teamBScore, 10);
  
  if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
    return res.status(400).json({ error: 'Scores must be non-negative integers.' });
  }
  
  try {
    const matchRef = paths.match(matchId);
    let matchSnap;
    try {
      matchSnap = await getDoc(matchRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/matches/${matchId}`);
    }
    
    if (!matchSnap.exists()) {
      return res.status(404).json({ error: 'Match document not found.' });
    }
    
    const match = matchSnap.data()!;
    const isAlreadyCompleted = match.status === 'completed';
    const oldScoreA = match.teamAScore || 0;
    const oldScoreB = match.teamBScore || 0;
    
    const teamAPlayers: string[] = match.teamA;
    const teamBPlayers: string[] = match.teamB;
    
    const scoreBatch = writeBatch(db);
    
    // Submitting or Overwriting scores
    if (isAlreadyCompleted) {
      const diffA = scoreA - oldScoreA;
      const diffB = scoreB - oldScoreB;
      
      for (const playerId of teamAPlayers) {
        scoreBatch.update(paths.player(playerId), {
          points: increment(diffA)
        });
      }
      for (const playerId of teamBPlayers) {
        scoreBatch.update(paths.player(playerId), {
          points: increment(diffB)
        });
      }
    } else {
      for (const playerId of teamAPlayers) {
        scoreBatch.update(paths.player(playerId), {
          points: increment(scoreA)
        });
      }
      for (const playerId of teamBPlayers) {
        scoreBatch.update(paths.player(playerId), {
          points: increment(scoreB)
        });
      }
    }
    
    scoreBatch.update(matchRef, {
      teamAScore: scoreA,
      teamBScore: scoreB,
      status: 'completed'
    });
    
    try {
      await scoreBatch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `batch_submit_score_m${matchId}/${tournamentId}`);
    }
    return res.json({ success: true, matchId, teamAScore: scoreA, teamBScore: scoreB });
  } catch (error: any) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: error.message || 'Failed to submit score.' });
  }
});

// ==========================================
// BRACKET PLAY & SNAKE DRAFT ENDPOINTS
// ==========================================

function getBracketSeeds(n: number): number[] {
  let order = [1];
  while (order.length < n) {
    const nextOrder: number[] = [];
    const target = order.length * 2 + 1;
    for (const seed of order) {
      nextOrder.push(seed);
      nextOrder.push(target - seed);
    }
    order = nextOrder;
  }
  return order;
}

function generateMatchesForDivision(
  teams: any[],
  division: 'higher' | 'lower',
  settingType: 'single' | 'double'
): any[] {
  const K = teams.length;
  if (K === 0) return [];

  const P = Math.pow(2, Math.ceil(Math.log2(K)));
  const seeds = getBracketSeeds(P);
  
  const seedTeams: (any | null)[] = [];
  for (let i = 0; i < P; i++) {
    const s = seeds[i];
    if (s <= K) {
      seedTeams.push(teams[s - 1]);
    } else {
      seedTeams.push(null);
    }
  }

  const matches: any[] = [];

  if (settingType === 'single') {
    const numRounds = Math.log2(P);
    
    for (let r = 1; r <= numRounds; r++) {
      const numMatches = P / Math.pow(2, r);
      for (let m = 0; m < numMatches; m++) {
        const matchId = `${division}_single_r${r}_m${m}`;
        const nextWinnerMatchId = r < numRounds ? `${division}_single_r${r + 1}_m${Math.floor(m / 2)}` : null;
        const nextWinnersSlot = r < numRounds ? (m % 2 === 0 ? 'teamA' : 'teamB') : null;

        matches.push({
          id: matchId,
          division,
          bracketType: 'winners',
          round: r,
          matchIndex: m,
          teamAId: null,
          teamBId: null,
          teamAName: 'TBD',
          teamBName: 'TBD',
          scoreA: null,
          scoreB: null,
          status: 'pending',
          winnerId: null,
          loserId: null,
          nextWinnerMatchId,
          nextWinnersSlot,
          nextLoserMatchId: null,
          nextLosersSlot: null,
        });
      }
    }

    const r1Matches = matches.filter((m) => m.round === 1);
    for (let m = 0; m < r1Matches.length; m++) {
      const match = r1Matches[m];
      const teamA = seedTeams[2 * m];
      const teamB = seedTeams[2 * m + 1];

      if (teamA) {
        match.teamAId = teamA.id;
        match.teamAName = teamA.name;
      }
      if (teamB) {
        match.teamBId = teamB.id;
        match.teamBName = teamB.name;
      }

      if (teamA && !teamB) {
        match.winnerId = teamA.id;
        match.scoreA = 1;
        match.scoreB = 0;
        match.status = 'completed';
      } else if (!teamA && teamB) {
        match.winnerId = teamB.id;
        match.scoreA = 0;
        match.scoreB = 1;
        match.status = 'completed';
      } else if (!teamA && !teamB) {
        match.status = 'completed';
      }
    }

    for (let r = 1; r < numRounds; r++) {
      const curMatches = matches.filter((m) => m.round === r);
      for (const m of curMatches) {
        if (m.status === 'completed' && m.winnerId) {
          const nextMatch = matches.find((nm) => nm.id === m.nextWinnerMatchId);
          if (nextMatch) {
            if (m.nextWinnersSlot === 'teamA') {
              nextMatch.teamAId = m.winnerId;
              nextMatch.teamAName = m.teamAName;
            } else {
              nextMatch.teamBId = m.winnerId;
              nextMatch.teamBName = m.teamBName;
            }
          }
        }
      }
    }
  } else {
    const numWinnerRounds = Math.log2(P);
    
    for (let r = 1; r <= numWinnerRounds; r++) {
      const numMatches = P / Math.pow(2, r);
      for (let m = 0; m < numMatches; m++) {
        const nextWinnerMatchId = r < numWinnerRounds ? `${division}_wb_r${r + 1}_m${Math.floor(m / 2)}` : `${division}_gf_0`;
        const nextWinnersSlot = r < numWinnerRounds ? (m % 2 === 0 ? 'teamA' : 'teamB') : 'teamA';
        const nextLoserMatchId = `${division}_lb_r${r * 2 - 1}_m${r === 1 ? Math.floor(m / 2) : m}`;
        const nextLosersSlot = r === 1 ? (m % 2 === 0 ? 'teamA' : 'teamB') : 'teamB';

        matches.push({
          id: `${division}_wb_r${r}_m${m}`,
          division,
          bracketType: 'winners',
          round: r,
          matchIndex: m,
          teamAId: null,
          teamBId: null,
          teamAName: 'TBD',
          teamBName: 'TBD',
          scoreA: null,
          scoreB: null,
          status: 'pending',
          winnerId: null,
          loserId: null,
          nextWinnerMatchId,
          nextWinnersSlot,
          nextLoserMatchId,
          nextLosersSlot,
        });
      }
    }

    matches.push({
      id: `${division}_gf_0`,
      division,
      bracketType: 'grand_final',
      round: numWinnerRounds + 1,
      matchIndex: 0,
      teamAId: null,
      teamBId: null,
      teamAName: 'TBD',
      teamBName: 'TBD',
      scoreA: null,
      scoreB: null,
      status: 'pending',
      winnerId: null,
      loserId: null,
      nextWinnerMatchId: null,
      nextWinnersSlot: null,
      nextLoserMatchId: null,
      nextLosersSlot: null,
    });

    const numLoserRounds = 2 * numWinnerRounds - 2;
    for (let r = 1; r <= numLoserRounds; r++) {
      const isOdd = r % 2 === 1;
      const kFactor = isOdd ? Math.floor(r / 2) + 2 : Math.floor(r / 2) + 1;
      const numMatches = P / Math.pow(2, kFactor);
      
      for (let m = 0; m < numMatches; m++) {
        const nextWinnerMatchId = r < numLoserRounds ? `${division}_lb_r${r + 1}_m${isOdd ? m : Math.floor(m / 2)}` : `${division}_gf_0`;
        const nextWinnersSlot = r < numLoserRounds ? (isOdd ? 'teamA' : (m % 2 === 0 ? 'teamA' : 'teamB')) : 'teamB';
        
        matches.push({
          id: `${division}_lb_r${r}_m${m}`,
          division,
          bracketType: 'losers',
          round: r,
          matchIndex: m,
          teamAId: null,
          teamBId: null,
          teamAName: 'TBD',
          teamBName: 'TBD',
          scoreA: null,
          scoreB: null,
          status: 'pending',
          winnerId: null,
          loserId: null,
          nextWinnerMatchId,
          nextWinnersSlot,
          nextLoserMatchId: null,
          nextLosersSlot: null,
        });
      }
    }

    const wbR1Matches = matches.filter((m) => m.id.startsWith(`${division}_wb_r1_`));
    for (let m = 0; m < wbR1Matches.length; m++) {
      const match = wbR1Matches[m];
      const teamA = seedTeams[2 * m];
      const teamB = seedTeams[2 * m + 1];

      if (teamA) {
        match.teamAId = teamA.id;
        match.teamAName = teamA.name;
      }
      if (teamB) {
        match.teamBId = teamB.id;
        match.teamBName = teamB.name;
      }

      if (teamA && !teamB) {
        match.winnerId = teamA.id;
        match.scoreA = 1;
        match.scoreB = 0;
        match.status = 'completed';
      } else if (!teamA && teamB) {
        match.winnerId = teamB.id;
        match.scoreA = 0;
        match.scoreB = 1;
        match.status = 'completed';
      } else if (!teamA && !teamB) {
        match.status = 'completed';
      }
    }

    for (const m of matches) {
      if (m.status === 'completed' && m.winnerId) {
        if (m.nextWinnerMatchId) {
          const nextMatch = matches.find((nm) => nm.id === m.nextWinnerMatchId);
          if (nextMatch) {
            if (m.nextWinnersSlot === 'teamA') {
              nextMatch.teamAId = m.winnerId;
              nextMatch.teamAName = m.teamAName;
            } else {
              nextMatch.teamBId = m.winnerId;
              nextMatch.teamBName = m.teamBName;
            }
          }
        }
      }
    }
  }

  return matches;
}

// 1. Get current bracket state
app.get('/api/bracket', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  try {
    const snapshot = await getDoc(paths.bracket);
    if (!snapshot.exists()) {
      return res.json({
        id: 'current',
        status: 'idle',
        settingType: 'single',
        hasLowerBracket: false,
        draftStep: 0,
        draftOrder: [],
        captains: [],
        draftPool: [],
        teams: [],
        currentPickerId: null,
        matches: []
      });
    }
    return res.json(snapshot.data());
  } catch (error: any) {
    console.error('Error fetching bracket:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch bracket state.' });
  }
});

// Update Team/Player Pool Assignment
app.post('/api/player/update-pool', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);
  const { playerId, pool } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID is required.' });
  }
  try {
    const playerRef = paths.player(playerId);
    await updateDoc(playerRef, { pool: pool || null });
    res.json({ success: true, playerId, pool });
  } catch (err: any) {
    console.error('Error updating player pool:', err);
    res.status(500).json({ error: err.message || 'Failed to update player pool.' });
  }
});

// Setup Direct Playoffs Brackets (skipping Draft workspace) for standard Fixed Teams
app.post('/api/bracket/setup-direct', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);
  const { settingType, hasLowerBracket } = req.body;

  try {
    let tournamentSnap = await getDoc(paths.tournament);
    if (!tournamentSnap.exists()) {
      return res.status(400).json({ error: 'No tournament has been configured yet.' });
    }
    const tournament = tournamentSnap.data()!;
    if (tournament.tournamentType !== 'fixed_teams') {
      return res.status(400).json({ error: 'Direct brackets are only supported for Standard Team Style tournaments.' });
    }

    let playersSnap = await getDocs(paths.players);
    const players: any[] = [];
    playersSnap.forEach(docSnap => {
      players.push(docSnap.data());
    });

    if (players.length < 2) {
      return res.status(400).json({ error: 'At least 2 registered teams are required to generate playoff brackets!' });
    }

    // Rank teams by standing points (desc) as seeding order
    const sortedTeams = [...players].sort((a, b) => b.points - a.points);

    const bracketTeams = sortedTeams.map(p => ({
      id: p.id,
      name: p.name,
      captainId: p.id,
      captainName: p.name,
      memberIds: [],
      memberNames: []
    }));

    let generatedMatches: any[] = [];
    const chosenSettingType = settingType || 'single';
    const chosenHasLowerBracket = !!hasLowerBracket;

    if (chosenHasLowerBracket) {
      const mid = Math.ceil(bracketTeams.length / 2);
      const higherTeams = bracketTeams.slice(0, mid);
      const lowerTeams = bracketTeams.slice(mid);

      const highMatches = generateMatchesForDivision(higherTeams, 'higher', chosenSettingType);
      const lowMatches = generateMatchesForDivision(lowerTeams, 'lower', chosenSettingType);
      generatedMatches = [...highMatches, ...lowMatches];
    } else {
      generatedMatches = generateMatchesForDivision(bracketTeams, 'higher', chosenSettingType);
    }

    const bracketState = {
      id: 'current',
      status: 'active',
      settingType: chosenSettingType,
      hasLowerBracket: chosenHasLowerBracket,
      draftStep: 0,
      draftOrder: [],
      isSnakeReverse: false,
      captains: [],
      draftPool: [],
      teams: bracketTeams,
      currentPickerId: null,
      matches: generatedMatches,
      type: 'bracket',
      tournamentId
    };

    await setDoc(paths.bracket, bracketState);
    res.json(bracketState);
  } catch (error: any) {
    console.error('Error starting direct bracket:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize direct brackets.' });
  }
});

// 2. Setup Snake Draft
app.post('/api/bracket/setup-draft', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  try {
    // Query players of this tournament
    let playersSnap;
    try {
      playersSnap = await getDocs(paths.players);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}/players`);
    }
    
    const allPlayers: any[] = [];
    playersSnap.forEach(docSnap => {
      allPlayers.push(docSnap.data());
    });

    let tournamentSnap;
    try {
      tournamentSnap = await getDoc(paths.tournament);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}`);
    }
    
    if (!tournamentSnap.exists()) {
      return res.status(400).json({ error: 'No tournament has been configured yet.' });
    }

    const tournament = tournamentSnap.data()!;
    const format = tournament.format || '2s';
    const teamSize = format === '2s' ? 2 : 4;

    const numTeams = Math.floor(allPlayers.length / teamSize);
    if (numTeams < 2) {
      return res.status(400).json({ 
        error: `Not enough players registered to form at least 2 teams of size ${teamSize} (minimum players needed is ${2 * teamSize}). Current player count is ${allPlayers.length}.` 
      });
    }

    const females = allPlayers.filter(p => p.gender === 'female').sort((a, b) => (b.points || 0) - (a.points || 0));
    const nonFemales = allPlayers.filter(p => !p.gender || p.gender !== 'female').sort((a, b) => (b.points || 0) - (a.points || 0));

    let chosenCaptains: any[] = [];
    let chosenDraftPool: any[] = [];

    if (females.length >= numTeams) {
      // Enough females to act as captains
      const captainFemales = females.slice(0, numTeams);
      const remainingFemales = females.slice(numTeams);

      chosenCaptains = captainFemales.map(f => ({
        playerId: f.id,
        name: f.name,
        score: f.points || 0,
        gender: 'female'
      }));

      // The rest of the females plus all non-females go to draft pool
      const poolPlayers = [...remainingFemales, ...nonFemales].sort((a, b) => (b.points || 0) - (a.points || 0));
      chosenDraftPool = poolPlayers.map(p => ({
        playerId: p.id,
        name: p.name,
        score: p.points || 0,
        gender: p.gender || 'male'
      }));
    } else {
      // Not enough females; use all available females plus the top scoring non-females to fill out the captains
      chosenCaptains = females.map(f => ({
        playerId: f.id,
        name: f.name,
        score: f.points || 0,
        gender: 'female'
      }));

      const remCaptainsNeeded = numTeams - females.length;
      const captainMales = nonFemales.slice(0, remCaptainsNeeded);
      const remainingMales = nonFemales.slice(remCaptainsNeeded);

      chosenCaptains = [
        ...chosenCaptains,
        ...captainMales.map(m => ({
          playerId: m.id,
          name: m.name,
          score: m.points || 0,
          gender: m.gender || 'male'
        }))
      ];

      // Only the remaining non-females go to the draft pool
      chosenDraftPool = remainingMales.map(m => ({
        playerId: m.id,
        name: m.name,
        score: m.points || 0,
        gender: m.gender || 'male'
      }));
    }

    if (chosenCaptains.length === 0) {
      return res.status(400).json({ error: "Draft requires at least 1 player to act as team captain!" });
    }
    if (chosenDraftPool.length === 0) {
      return res.status(400).json({ error: "Draft requires at least 1 player in the selection pool!" });
    }

    const draftOrder = chosenCaptains.map(c => c.playerId);
    
    const teams = chosenCaptains.map(cap => ({
      id: `team_${cap.playerId}`,
      name: `Team ${cap.name}`,
      captainId: cap.playerId,
      captainName: cap.name,
      memberIds: [],
      memberNames: []
    }));

    const bracketState = {
      id: 'current',
      status: 'drafting',
      settingType: 'single',
      hasLowerBracket: false,
      draftStep: 0,
      draftOrder,
      isSnakeReverse: false,
      captains: chosenCaptains,
      draftPool: chosenDraftPool,
      teams,
      currentPickerId: draftOrder[0] || null,
      matches: [],
      type: 'bracket',
      tournamentId
    };

    await setDoc(paths.bracket, bracketState);
    res.json(bracketState);
  } catch (error: any) {
    console.error('Error starting draft:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize draft.' });
  }
});

// 3. Draft a male player
app.post('/api/bracket/draft-player', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  const { playerId, teamId } = req.body;
  
  try {
    const snap = await getDoc(paths.bracket);
    if (!snap.exists()) {
      return res.status(400).json({ error: 'No bracket draft is active.' });
    }

    const state = snap.data()!;
    if (state.status !== 'drafting') {
      return res.status(400).json({ error: 'Draft is not active.' });
    }

    const nCaptains = state.draftOrder.length;
    const currentStep = state.draftStep;
    const roundIdx = Math.floor(currentStep / nCaptains);
    const seqIdx = currentStep % nCaptains;
    const pickerIdx = (roundIdx % 2 === 1) ? (nCaptains - 1 - seqIdx) : seqIdx;
    const activePickerId = state.draftOrder[pickerIdx];

    const targetTeam = state.teams.find((t: any) => t.id === teamId);
    if (!targetTeam || targetTeam.captainId !== activePickerId) {
      return res.status(400).json({ error: 'It is not this team\'s turn to draft!' });
    }

    const playerToDraft = state.draftPool.find((p: any) => p.playerId === playerId);
    if (!playerToDraft) {
      return res.status(400).json({ error: 'Selected player is not in the draft pool!' });
    }

    targetTeam.memberIds.push(playerToDraft.playerId);
    targetTeam.memberNames.push(playerToDraft.name);

    state.draftPool = state.draftPool.filter((p: any) => p.playerId !== playerId);

    const nextStep = currentStep + 1;
    state.draftStep = nextStep;

    const nextRoundIdx = Math.floor(nextStep / nCaptains);
    const nextSeqIdx = nextStep % nCaptains;
    const nextPickerIdx = (nextRoundIdx % 2 === 1) ? (nCaptains - 1 - nextSeqIdx) : nextSeqIdx;
    const nextPickerId = state.draftOrder[nextPickerIdx];

    state.currentPickerId = state.draftPool.length > 0 ? (nextPickerId || null) : null;
    state.isSnakeReverse = (nextRoundIdx % 2 === 1);

    await setDoc(paths.bracket, state);
    res.json(state);
  } catch (error: any) {
    console.error('Error in draft picker:', error);
    res.status(500).json({ error: error.message || 'Failed to pick player.' });
  }
});

// 4. Generate Bracket from Drafted teams
app.post('/api/bracket/create-bracket', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  const { settingType, hasLowerBracket } = req.body;
  
  try {
    const snap = await getDoc(paths.bracket);
    if (!snap.exists()) {
      return res.status(400).json({ error: 'No bracket playing document found. Please set up a draft first.' });
    }

    const state = snap.data()!;
    state.settingType = settingType || 'single';
    state.hasLowerBracket = !!hasLowerBracket;

    const captainScores = new Map<string, number>(state.captains.map((c: any) => [c.playerId as string, Number(c.score)]));
    const teamsSorted = [...state.teams].sort((a: any, b: any) => {
      const scoreA = captainScores.get(a.captainId) || 0;
      const scoreB = captainScores.get(b.captainId) || 0;
      return scoreB - scoreA;
    });

    let generatedMatches: any[] = [];

    if (hasLowerBracket) {
      const mid = Math.ceil(teamsSorted.length / 2);
      const higherTeams = teamsSorted.slice(0, mid);
      const lowerTeams = teamsSorted.slice(mid);

      const highMatches = generateMatchesForDivision(higherTeams, 'higher', state.settingType);
      const lowMatches = generateMatchesForDivision(lowerTeams, 'lower', state.settingType);
      generatedMatches = [...highMatches, ...lowMatches];
    } else {
      generatedMatches = generateMatchesForDivision(teamsSorted, 'higher', state.settingType);
    }

    state.matches = generatedMatches;
    state.status = 'active';

    await setDoc(paths.bracket, state);
    res.json(state);
  } catch (error: any) {
    console.error('Error generating brackets:', error);
    res.status(500).json({ error: error.message || 'Failed to create tournament brackets.' });
  }
});

// 5. Submit Bracket Match Score
app.post('/api/bracket/submit-score', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  const { matchId, scoreA, scoreB } = req.body;
  const parsedScoreA = parseInt(scoreA, 10);
  const parsedScoreB = parseInt(scoreB, 10);

  if (isNaN(parsedScoreA) || isNaN(parsedScoreB) || parsedScoreA < 0 || parsedScoreB < 0) {
    return res.status(400).json({ error: 'Scores must be non-negative integers.' });
  }

  try {
    const snap = await getDoc(paths.bracket);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'No bracket document found.' });
    }

    const state = snap.data()!;
    const match = state.matches.find((m: any) => m.id === matchId);
    if (!match) {
      return res.status(404).json({ error: `Bracket match '${matchId}' not found.` });
    }

    if (!match.teamAId || !match.teamBId) {
      return res.status(400).json({ error: 'Cannot score a match that has unpopulated teams!' });
    }

    match.scoreA = parsedScoreA;
    match.scoreB = parsedScoreB;
    match.status = 'completed';

    const winnerId = parsedScoreA > parsedScoreB ? match.teamAId : match.teamBId;
    const loserId = parsedScoreA > parsedScoreB ? match.teamBId : match.teamAId;

    match.winnerId = winnerId;
    match.loserId = loserId;

    if (match.nextWinnerMatchId) {
      const nextMatch = state.matches.find((nm: any) => nm.id === match.nextWinnerMatchId);
      if (nextMatch) {
         const winningTeam = state.teams.find((t: any) => t.id === winnerId);
         if (match.nextWinnersSlot === 'teamA') {
           nextMatch.teamAId = winnerId;
           nextMatch.teamAName = winningTeam ? winningTeam.name : 'Winner';
         } else {
           nextMatch.teamBId = winnerId;
           nextMatch.teamBName = winningTeam ? winningTeam.name : 'Winner';
         }
      }
    }

    if (match.nextLoserMatchId) {
      const nextLoserMatch = state.matches.find((nm: any) => nm.id === match.nextLoserMatchId);
      if (nextLoserMatch) {
        const losingTeam = state.teams.find((t: any) => t.id === loserId);
        if (match.nextLosersSlot === 'teamA') {
          nextLoserMatch.teamAId = loserId;
          nextLoserMatch.teamAName = losingTeam ? losingTeam.name : 'Loser';
        } else {
          nextLoserMatch.teamBId = loserId;
          nextLoserMatch.teamBName = losingTeam ? losingTeam.name : 'Loser';
        }
      }
    }

    const activeMatches = state.matches;
    let allCompleted = true;
    for (const m of activeMatches) {
      if (m.status !== 'completed' && m.teamAId && m.teamBId) {
        allCompleted = false;
        break;
      }
    }
    if (allCompleted) {
      state.status = 'completed';
    }

    await setDoc(paths.bracket, state);
    res.json(state);
  } catch (error: any) {
    console.error('Error submitting bracket score:', error);
    res.status(500).json({ error: error.message || 'Failed to submit bracket score.' });
  }
});

// 6. Reset Bracket completely
app.post('/api/bracket/reset', async (req, res) => {
  const tournamentId = getTournamentId(req);
  const paths = getPaths(tournamentId);

  try {
    await deleteDoc(paths.bracket);
    res.json({ success: true, message: 'Bracket reset successfully' });
  } catch (error: any) {
    console.error('Error resetting brackets:', error);
    res.status(500).json({ error: error.message || 'Failed to reset brackets.' });
  }
});

// Configure Vite integration for dev server or static distribution
async function startServer() {
  // Pre-seed owner as default organizer if database is initialized
  try {
    const targetEmail = 'proudsob355@gmail.com';
    const orgRef = doc(db, 'organizers', targetEmail);
    const docSnap = await getDoc(orgRef);
    if (!docSnap.exists()) {
      await setDoc(orgRef, {
        email: targetEmail,
        createdAt: new Date().toISOString(),
        addedBy: 'system-bootstrap'
      });
      console.log(`[BOOTSTRAP] Successfully seeded default organizer: ${targetEmail}`);
    } else {
      console.log(`[BOOTSTRAP] Default organizer ${targetEmail} is already registered.`);
    }
  } catch (err) {
    console.error('[BOOTSTRAP] Error seeding default organizer on server startup:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
