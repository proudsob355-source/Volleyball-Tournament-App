# Firestore Security Specification - Tournament Tracker

This document presents the security invariants and threat models for the Tournament Tracker's Firestore database structure.

## 1. Zero-Trust Access & Invariants

This application uses a strict **Server-Authoritative Multi-Round Model** where **all state-mutating operations** (creating players, moving rounds, recording scores, resetting tournaments) are restricted of client-side writes. Clients possess **read-only access** to view live leaderboards, court assignments, and matches in real time. 

### Data Invariants
1. **Unbounded Writes**: No client is authorized to modify or create documents in `players`, `matches`, `rounds`, or `tournaments`.
2. **Leaderboard Integrity**: Player scores can only be modified via cumulative propagation computed by the backend on authorized match score submissions.
3. **Round Progression**: Tournament round progression and match scheduling must be controlled synchronously by the backend to prevent skipping rounds or generating duplicates.
4. **Valid Format**: Format must always be limited to either `2s` or `4s`.

---

## 2. The Dirty Dozen Payloads

These 12 scenarios describe attempts to bypass the security layers:

1. **Direct Player Score Hijack**: Attempting to set an individual's points to `9999` directly from the browser.
2. **Shadow Match Submission**: Attempting to write a fake `Match` document to the `matches` collection representing a win for a team.
3. **Format Spoofing**: Attempting to alter the active tournament's format from `2s` to an arbitrary string `6s` via browser client.
4. **Rounds Escalation**: Overwriting the current round counter to bypass matches.
5. **Ghost Registration**: Inserting unauthorized player names directly into the `players` collection.
6. **Double-Sided Bye Forgery**: Attempting to manually create a bye metadata record to sideline competitors.
7. **Score Negation**: Submitting negative values for team scores to corrupt averages.
8. **Orphaned Match Creation**: Inserting a match with undefined teammate pairings.
9. **Role Escalation**: Attempting to create an `admin` role or flag document.
10. **Resource Poisoning**: Injecting a 2MB binary payload as a player's ID to hit storage limits.
11. **Metadata Tampering**: Attempting to overwrite existing system metadata structures.
12. **Self-Promotion**: Upgrading privileges by writing to server settings directly.

---

## 3. Test Runner - `firestore.rules.test.ts`

The rules-validations will be audited with the following logic pattern:

```typescript
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

describe('Tournament Tracker Zero-Trust Security Rules', () => {
  it('blocks client from self-creating a player', async () => {
    const db = getUnauthenticatedFirestore();
    await assertFails(db.collection('players').add({ name: 'Malicious Hack' }));
  });

  it('blocks client from self-updating a player score', async () => {
    const db = getAuthenticatedFirestore('player-123');
    await assertFails(db.collection('players').doc('player-123').update({ points: 999 }));
  });

  it('blocks client from direct score entry', async () => {
    const db = getAuthenticatedFirestore('player-123');
    await assertFails(db.collection('matches').doc('match-1').set({ teamAScore: 21 }));
  });

  it('allows public read for scoreboard updates', async () => {
    const db = getUnauthenticatedFirestore();
    await assertSucceeds(db.collection('players').get());
  });
});
```
