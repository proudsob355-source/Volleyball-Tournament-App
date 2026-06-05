export interface Tournament {
  id?: string;
  title?: string;
  date?: string;
  format: '2s' | '4s';
  totalRounds: number;
  currentRound: number;
  status: 'configuring' | 'active' | 'completed';
  playMode?: 'matches' | 'individual';
  maxCourts?: number | null;
  splitWomenEvenly?: boolean;
}

export interface Player {
  id: string;
  name: string;
  points: number;
  byesCount: number;
  satOutRounds: number[];
  gender?: 'male' | 'female';
}

export interface BracketTeam {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  memberIds: string[];
  memberNames: string[];
}

export interface BracketMatch {
  id: string;
  division: 'higher' | 'lower';
  bracketType: 'winners' | 'losers' | 'grand_final';
  round: number;
  matchIndex: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string;
  teamBName: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'completed';
  winnerId: string | null;
  loserId: string | null;
  nextWinnerMatchId: string | null;
  nextWinnersSlot: 'teamA' | 'teamB' | null;
  nextLoserMatchId: string | null;
  nextLosersSlot: 'teamA' | 'teamB' | null;
}

export interface BracketState {
  id: string;
  status: 'idle' | 'drafting' | 'active' | 'completed';
  settingType: 'single' | 'double';
  hasLowerBracket: boolean;
  draftStep: number;
  draftOrder: string[];
  isSnakeReverse: boolean;
  captains: { playerId: string; name: string; score: number; gender: string }[];
  draftPool: { playerId: string; name: string; score: number; gender: string }[];
  teams: BracketTeam[];
  currentPickerId: string | null;
  matches: BracketMatch[];
}

export interface Match {
  id: string;
  round: number;
  court: number;
  teamA: string[];
  teamANames: string[];
  teamB: string[];
  teamBNames: string[];
  teamAScore: number | null;
  teamBScore: number | null;
  status: 'pending' | 'completed';
  playerScores?: Record<string, number | null>;
}

export interface RoundInfo {
  roundNumber: number;
  byes: { id: string; name: string }[];
}
