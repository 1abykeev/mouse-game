/**
 * StorageManager
 *
 * Single source of truth for all localStorage operations.
 * All keys are namespaced under the MM_ prefix so the game
 * never collides with other LMS data stored in the same origin.
 */

// ─── Key registry ────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
    USER:          'mm_user',
    PROGRESS:      'mm_progress',
    DRAGON_DROP:   'mm_dragon_drop',
    SHAPE_FINDER:  'mm_shape_finder',
    ROCKET_RUSH:   'mm_rocket_rush',
    LAST_SESSION:  'mm_last_session',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ─── Data shapes ─────────────────────────────────────────────────────────────

export interface UserData {
    userId:    string;
    name:      string;
}

/** Stars (0-3) and high score per game */
export interface GameRecord {
    levelsCompleted: number;
    stars:           number[];   // index = level (0-based), value = 0|1|2|3
    highScores:      number[];   // index = level (0-based)
    totalAttempts:   number;
}

export interface ProgressData {
    dragonDrop:  GameRecord;
    shapeFinder: GameRecord;
    rocketRush:  GameRecord;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_GAME_RECORD: GameRecord = {
    levelsCompleted: 0,
    stars:           [],
    highScores:      [],
    totalAttempts:   0,
};


// ─── StorageManager ──────────────────────────────────────────────────────────

export class StorageManager {

    // ── Low-level helpers ───────────────────────────────────────────────────

    static read<T>(key: StorageKey): T | null {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            console.warn(`[StorageManager] Failed to read key "${key}"`);
            return null;
        }
    }

    static write<T>(key: StorageKey, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            console.warn(`[StorageManager] Failed to write key "${key}"`);
        }
    }

    static remove(key: StorageKey): void {
        localStorage.removeItem(key);
    }

    // ── User ────────────────────────────────────────────────────────────────

    /**
     * Returns the stored user, or creates a guest user if none exists.
     * The LMS can inject window.__MM_USER_ID__ before the game loads
     * to supply a real user id.
     */
    static getUser(): UserData {
        const stored = StorageManager.read<UserData>(STORAGE_KEYS.USER);
        if (stored) return stored;

        const injected = (window as Window & { __MM_USER_ID__?: string }).__MM_USER_ID__;
        const user: UserData = {
            userId: injected ?? `guest_${Date.now()}`,
            name:   'Explorer',
        };
        StorageManager.write(STORAGE_KEYS.USER, user);
        return user;
    }

    static saveUser(user: UserData): void {
        StorageManager.write(STORAGE_KEYS.USER, user);
    }

    // ── Progress ────────────────────────────────────────────────────────────

    static getProgress(): ProgressData {
        return StorageManager.read<ProgressData>(STORAGE_KEYS.PROGRESS) ?? {
            dragonDrop:  { ...DEFAULT_GAME_RECORD },
            shapeFinder: { ...DEFAULT_GAME_RECORD },
            rocketRush:  { ...DEFAULT_GAME_RECORD },
        };
    }

    static saveProgress(progress: ProgressData): void {
        StorageManager.write(STORAGE_KEYS.PROGRESS, progress);
    }

    /**
     * Updates a single level result in the progress record for a game.
     * Stars and high score are only overwritten if the new value is better.
     */
    static updateGameRecord(
        game:   'dragonDrop' | 'shapeFinder' | 'rocketRush',
        level:  number,
        stars:  number,
        score:  number,
    ): void {
        const progress = StorageManager.getProgress();
        const record   = progress[game];

        record.totalAttempts++;

        const prevStars = record.stars[level] ?? 0;
        const prevScore = record.highScores[level] ?? 0;

        record.stars[level]      = Math.max(prevStars, stars);
        record.highScores[level] = Math.max(prevScore, score);

        if (stars > 0 && level >= record.levelsCompleted) {
            record.levelsCompleted = level + 1;
        }

        StorageManager.saveProgress(progress);
    }

    // ── Total stars (used for dashboard display) ────────────────────────────

    static getTotalStars(): { dragonDrop: number; shapeFinder: number; rocketRush: number; total: number } {
        const p = StorageManager.getProgress();
        const sum = (rec: GameRecord) => rec.stars.reduce((a, b) => a + b, 0);
        const dd = sum(p.dragonDrop);
        const sf = sum(p.shapeFinder);
        const rr = sum(p.rocketRush);
        return { dragonDrop: dd, shapeFinder: sf, rocketRush: rr, total: dd + sf + rr };
    }
}
