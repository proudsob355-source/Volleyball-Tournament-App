import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ParticipantHub, ParticipantTournamentView } from './components/ParticipantView';

const OrganizerView = React.lazy(() => import('./components/OrganizerView'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 bg-[radial-gradient(120%_120%_at_50%_0%,_#241a0f_0%,_#030a12_100%)]">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-brand-500 animate-spin"></div>
          <p className="text-xs text-indigo-400 font-mono mt-4 font-bold">Synchronizing Arena Channels...</p>
        </div>
      }>
        <Routes>
          {/* Public Read-Only Participant Routes */}
          <Route path="/" element={<ParticipantHub />} />
          <Route path="/tournament/:id" element={<ParticipantTournamentView />} />

          {/* Gated Administrative Organizer Routes */}
          <Route path="/organizer" element={<OrganizerView />} />
          <Route path="/organizer/tournament/:id" element={<OrganizerView />} />
          
          {/* Aliases & Routing Fallbacks */}
          <Route path="/admin" element={<Navigate to="/organizer" replace />} />
          <Route path="/admin/tournament/:id" element={<Navigate to="/organizer/tournament/:id" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
