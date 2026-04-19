/**
 * LMSBridge
 *
 * Formats a SessionResult into the LMS-agreed JSON payload and persists it
 * to localStorage under `mm_last_session`.
 *
 * The LMS can read the payload by calling:
 *   JSON.parse(localStorage.getItem('mm_last_session'))
 *
 * Or, if the LMS injects a postMessage / callback, wire it in sendToLMS().
 */

import { StorageManager, STORAGE_KEYS } from './StorageManager';
import { type SessionResult, type GameId } from './GameSession';

// ─── LMS payload shape (matches the agreed contract) ─────────────────────────

export interface LMSPayload {
    /** Identifies the learner — injected by LMS or auto-generated */
    userId:      string;

    /** Top-level content identifier for the whole game */
    contentId:   'mouse_masters';

    /** Which mini-game produced this result */
    chapterId:   GameId;

    /** Level number (1-based for readability) */
    taskId:      number;

    score:       number;
    maxScore:    number;

    /** true if the level was reached and a result was recorded */
    completion:  boolean;

    /** true if the player met the win condition */
    success:     boolean;

    /** Stars awarded (0-3) */
    stars:       number;

    /** Total seconds the player spent on this attempt */
    duration:    number;

    /** Number of times the player started this level */
    attempts:    number;

    /** ISO 8601 — when this payload was generated */
    timestamp:   string;
}

// ─── LMSBridge ───────────────────────────────────────────────────────────────

export class LMSBridge {

    /**
     * Main entry point — call this from LevelComplete or GameOver scenes.
     *
     * 1. Builds the payload from the session result + stored user.
     * 2. Writes it to localStorage (mm_last_session).
     * 3. Attempts to notify the LMS host if a hook is available.
     */
    static commit(result: SessionResult): LMSPayload {
        const user    = StorageManager.getUser();
        const payload = LMSBridge.buildPayload(result, user.userId);

        StorageManager.write(STORAGE_KEYS.LAST_SESSION, payload);
        LMSBridge.sendToLMS(payload);

        return payload;
    }

    // ── Payload builder ──────────────────────────────────────────────────────

    static buildPayload(result: SessionResult, userId: string): LMSPayload {
        return {
            userId,
            contentId:  'mouse_masters',
            chapterId:  result.gameId,
            taskId:     result.level + 1,   // convert 0-based level to 1-based
            score:      result.score,
            maxScore:   result.maxScore,
            completion: result.completion,
            success:    result.success,
            stars:      result.stars,
            duration:   result.duration,
            attempts:   result.attempts,
            timestamp:  result.finishedAt,
        };
    }

    // ── LMS notification ─────────────────────────────────────────────────────

    /**
     * Extend this method to add direct LMS communication.
     *
     * Current strategies (in priority order):
     *  1. window.__MM_onResult__ callback injected by the LMS host
     *  2. postMessage to parent frame (for iframe embedding)
     *  3. Silent localStorage-only fallback (default)
     */
    private static sendToLMS(payload: LMSPayload): void {
        // Strategy 1 — direct callback
        const win = window as Window & {
            __MM_onResult__?: (payload: LMSPayload) => void;
        };
        if (typeof win.__MM_onResult__ === 'function') {
            try {
                win.__MM_onResult__(payload);
            } catch (e) {
                console.warn('[LMSBridge] __MM_onResult__ threw:', e);
            }
            return;
        }

        // Strategy 2 — postMessage to parent (iframe embedding)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: 'MM_RESULT', payload },
                '*',   // tighten to LMS origin once known
            );
            return;
        }

        // Strategy 3 — localStorage only (default, LMS polls or reads on exit)
        // Already written by commit() before this method is called.
    }

    // ── Utility ──────────────────────────────────────────────────────────────

    /** Read the last written payload (useful for debugging or recap screens) */
    static getLastPayload(): LMSPayload | null {
        return StorageManager.read<LMSPayload>(STORAGE_KEYS.LAST_SESSION);
    }

    /**
     * Calculate star rating based on score percentage and time.
     * Scenes can use this helper instead of implementing their own logic.
     *
     *   ≥ 90% score, ≤ fastSeconds  → 3 stars
     *   ≥ 60% score                 → 2 stars
     *   > 0% score / completed      → 1 star
     *   no completion               → 0 stars
     */
    static calculateStars(
        score:       number,
        maxScore:    number,
        duration:    number,
        fastSeconds: number = 60,
    ): number {
        if (!maxScore || score <= 0) return 0;
        const pct = score / maxScore;
        if (pct >= 0.9 && duration <= fastSeconds) return 3;
        if (pct >= 0.6)                             return 2;
        return 1;
    }
}
