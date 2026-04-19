/**
 * GameSession
 *
 * Tracks the state of a single play-through of one game level:
 * elapsed time, score, lives, and attempt count.
 *
 * Usage inside a Phaser scene:
 *
 *   this.session = new GameSession('dragon_drop', 2);
 *   this.session.start();
 *   ...
 *   this.session.addScore(100);
 *   this.session.loseLife();
 *   ...
 *   const result = this.session.finish();  // stop timer, return SessionResult
 */

export type GameId = 'dragon_drop' | 'shape_finder' | 'rocket_rush';

export interface SessionResult {
    gameId:      GameId;
    level:       number;
    score:       number;
    maxScore:    number;
    stars:       number;   // 0-3, calculated by the scene and passed to finish()
    lives:       number;
    duration:    number;   // seconds (integer)
    completion:  boolean;
    success:     boolean;
    attempts:    number;
    startedAt:   string;   // ISO 8601
    finishedAt:  string;   // ISO 8601
}

export class GameSession {

    readonly gameId:   GameId;
    readonly level:    number;
    readonly maxScore: number;

    private _score:     number = 0;
    private _lives:     number;
    private _attempts:  number = 1;
    private _startedAt: Date | null = null;
    private _elapsed:   number = 0;   // ms
    private _running:   boolean = false;

    constructor(gameId: GameId, level: number, maxScore: number = 1000, startingLives: number = 3) {
        this.gameId   = gameId;
        this.level    = level;
        this.maxScore = maxScore;
        this._lives   = startingLives;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    start(): void {
        this._startedAt = new Date();
        this._running   = true;
    }

    /** Call when the player retries without creating a new scene */
    restart(): void {
        this._score    = 0;
        this._elapsed  = 0;
        this._lives    = 3;
        this._attempts++;
        this._startedAt = new Date();
        this._running   = true;
    }

    /**
     * Stops the timer and returns the full result object.
     * @param stars  0-3, determined by the calling scene's own rules
     * @param completion  true if the level was finished (win OR lose)
     * @param success     true only if the player won
     */
    finish(stars: number, completion: boolean, success: boolean): SessionResult {
        this._running = false;
        const finishedAt = new Date();

        if (this._startedAt) {
            this._elapsed += finishedAt.getTime() - this._startedAt.getTime();
        }

        return {
            gameId:     this.gameId,
            level:      this.level,
            score:      this._score,
            maxScore:   this.maxScore,
            stars:      Math.max(0, Math.min(3, stars)),
            lives:      this._lives,
            duration:   Math.round(this._elapsed / 1000),
            completion,
            success,
            attempts:   this._attempts,
            startedAt:  (this._startedAt ?? finishedAt).toISOString(),
            finishedAt: finishedAt.toISOString(),
        };
    }

    // ── Score ────────────────────────────────────────────────────────────────

    addScore(points: number): void {
        this._score = Math.max(0, this._score + points);
    }

    setScore(points: number): void {
        this._score = Math.max(0, points);
    }

    get score(): number {
        return this._score;
    }

    // ── Lives ────────────────────────────────────────────────────────────────

    loseLife(): void {
        this._lives = Math.max(0, this._lives - 1);
    }

    gainLife(): void {
        this._lives++;
    }

    get lives(): number {
        return this._lives;
    }

    get isAlive(): boolean {
        return this._lives > 0;
    }

    // ── Timer ────────────────────────────────────────────────────────────────

    /**
     * Returns elapsed seconds (does NOT stop the session).
     * Call this from Phaser's update() to display a live timer in the HUD.
     */
    get elapsedSeconds(): number {
        if (!this._startedAt) return 0;
        const base = this._elapsed;
        const live = this._running ? (Date.now() - this._startedAt.getTime()) : 0;
        return Math.round((base + live) / 1000);
    }

    get isRunning(): boolean {
        return this._running;
    }
}
