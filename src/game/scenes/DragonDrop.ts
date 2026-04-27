import { Scene } from 'phaser';
import { returnToDashboard } from '../PhaserBridge';

const CANVAS_W = 1024;
const CANVAS_H = 768;
const HUD_H    = 60;
const FOOD_COUNT = 3;

const LEVELS = ['level1', 'level2'] as const;
type LevelKey = typeof LEVELS[number];

interface MapBounds {
    ox: number; oy: number; ts: number;
    cols: number; rows: number;
    tiles: number[];
}

interface CloudConfig { x: number; y: number; scale: number; speed: number; alpha: number }

const CLOUD_CONFIGS: CloudConfig[] = [
    { x: 120,  y: HUD_H + 40,  scale: 0.55, speed: 0.35, alpha: 0.75 },
    { x: 380,  y: HUD_H + 80,  scale: 0.90, speed: 0.55, alpha: 0.85 },
    { x: 600,  y: HUD_H + 30,  scale: 0.70, speed: 0.45, alpha: 0.70 },
    { x: 820,  y: HUD_H + 100, scale: 1.10, speed: 0.28, alpha: 0.60 },
    { x: 260,  y: HUD_H + 140, scale: 0.65, speed: 0.65, alpha: 0.80 },
    { x: 700,  y: HUD_H + 160, scale: 0.80, speed: 0.50, alpha: 0.65 },
];

export class DragonDrop extends Scene {

    private currentLevel = 0;
    private mapBounds: MapBounds | null = null;
    private clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];
    private player!: Phaser.GameObjects.Sprite;
    private foods: Phaser.GameObjects.Sprite[] = [];
    private score = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private isRestarting = false;

    constructor() {
        super('DragonDrop');
    }

    preload(): void {
        this.load.json('level1', 'assets/tilemaps/first_level.json');
        this.load.json('level2', 'assets/tilemaps/second_level.json');
        this.load.spritesheet('brick', 'assets/tilemaps/brick_tile1.png', { frameWidth: 64, frameHeight: 64 });
        this.load.svg('cloud', 'assets/images/cloud.svg', { width: 240, height: 110 });
        this.load.spritesheet('player_idle', 'assets/player/Idle.png', { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet('player_walk', 'assets/player/Walk.png', { frameWidth: 48, frameHeight: 48 });
        this.load.spritesheet('food_idle',   'assets/food/Idle.png',   { frameWidth: 48, frameHeight: 48 });
    }

    create(): void {
        this.score  = 0;
        this.clouds = [];
        this.foods  = [];

        this.createSky();
        this.createClouds();
        this.setupAnimations();
        this.setupDrag();

        this.showLevel(this.currentLevel);

        // DEV: press N to skip to next level
        this.input.keyboard!.on('keydown-N', () => this.advanceLevel());
    }

    update(): void {
        // Scroll clouds
        for (const c of this.clouds) {
            c.img.x -= c.speed;
            if (c.img.x < -200) c.img.x = CANVAS_W + 150;
        }

        // Check eat collisions
        if (!this.player || !this.mapBounds) return;
        const eatRadius = this.mapBounds.ts * 1.1;

        for (let i = this.foods.length - 1; i >= 0; i--) {
            const dx = this.player.x - this.foods[i].x;
            const dy = this.player.y - this.foods[i].y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < eatRadius) this.eatFood(i);
        }
    }

    // ── Sky & clouds ──────────────────────────────────────────────────────────

    private createSky(): void {
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x1B6CA8, 0x1B6CA8, 0x87CEEB, 0x87CEEB, 1);
        sky.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);
    }

    private createClouds(): void {
        for (const cfg of CLOUD_CONFIGS) {
            const img = this.add.image(cfg.x, cfg.y, 'cloud')
                .setScale(cfg.scale).setAlpha(cfg.alpha);
            this.clouds.push({ img, speed: cfg.speed });
        }
    }

    // ── Animations ────────────────────────────────────────────────────────────

    private setupAnimations(): void {
        const def = (key: string, texture: string, end: number, fps: number) => {
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames:    this.anims.generateFrameNumbers(texture, { start: 0, end }),
                    frameRate: fps,
                    repeat:    -1,
                });
            }
        };
        def('player_idle', 'player_idle', 5, 8);
        def('player_walk', 'player_walk', 5, 12);
        def('food_idle',   'food_idle',   3, 7);
    }

    // ── Drag input ────────────────────────────────────────────────────────────

    private setupDrag(): void {
        this.input.on('dragstart', (_ptr: unknown, obj: Phaser.GameObjects.Sprite) => {
            if (obj !== this.player) return;
            this.player.setTexture('player_walk').play('player_walk');
        });

        this.input.on('drag', (_ptr: unknown, obj: Phaser.GameObjects.Sprite, dragX: number, dragY: number) => {
            if (obj !== this.player || this.isRestarting) return;

            if (this.isWallAt(dragX, dragY)) {
                this.hitWall(); // touching a wall ends the level
                return;
            }

            if (dragX < obj.x) obj.setFlipX(true);
            else if (dragX > obj.x) obj.setFlipX(false);

            obj.x = dragX;
            obj.y = dragY;
        });

        this.input.on('dragend', (_ptr: unknown, obj: Phaser.GameObjects.Sprite) => {
            if (obj !== this.player) return;
            this.player.setTexture('player_idle').play('player_idle');
        });
    }

    // ── Level management ──────────────────────────────────────────────────────

    private showLevel(index: number): void {
        // Destroy previous map objects and HUD (keep sky, clouds, player)
        this.children.list
            .filter(c => {
                const go = c as Phaser.GameObjects.GameObject;
                const layer = go.getData?.('layer');
                return layer === 'map' || layer === 'hud';
            })
            .forEach(c => c.destroy());

        // Clear food tweens & sprites
        for (const f of this.foods) { this.tweens.killTweensOf(f); f.destroy(); }
        this.foods = [];

        const key     = LEVELS[index] as LevelKey;
        const mapData = this.cache.json.get(key);

        this.mapBounds = this.drawMap(mapData);
        this.drawHUD(index);

        // Spawn or teleport player
        const spawnPos = this.getSpawnPosition(this.mapBounds);
        if (!this.player) {
            this.spawnPlayer(spawnPos, this.mapBounds.ts);
        } else {
            this.player
                .setPosition(spawnPos.x, spawnPos.y)
                .setTexture('player_idle')
                .play('player_idle')
                .setAlpha(1)
                .setDepth(10);
            this.input.setDraggable(this.player, true);
        }

        // Spawn food
        for (let i = 0; i < FOOD_COUNT; i++) this.spawnFood(this.mapBounds);
    }

    // ── Map rendering ─────────────────────────────────────────────────────────

    private drawMap(
        map: { width: number; height: number; tilewidth: number; layers: { data: number[] }[] },
    ): MapBounds {
        const cols    = map.width;
        const rows    = map.height;
        const srcTile = map.tilewidth;

        const availH = CANVAS_H - HUD_H;
        const scale  = Math.min(CANVAS_W / (cols * srcTile), availH / (rows * srcTile));
        const ts     = srcTile * scale;

        const mapW = cols * ts;
        const mapH = rows * ts;
        const ox   = Math.round((CANVAS_W - mapW) / 2);
        const oy   = Math.round(HUD_H + (availH - mapH) / 2);

        const tiles = map.layers[0].data;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const gid = tiles[row * cols + col];
                if (gid !== 0) {
                    this.add.image(ox + col * ts + ts / 2, oy + row * ts + ts / 2, 'brick', gid - 1)
                        .setDisplaySize(ts, ts)
                        .setData('layer', 'map');
                }
            }
        }

        return { ox, oy, ts, cols, rows, tiles };
    }

    // ── Player ────────────────────────────────────────────────────────────────

    private spawnPlayer(pos: { x: number; y: number }, ts: number): void {
        const size = ts * 2;
        this.player = this.add.sprite(pos.x, pos.y, 'player_idle')
            .setDisplaySize(size, size)
            .play('player_idle')
            .setDepth(10)
            .setInteractive({ draggable: true });

        this.input.setDraggable(this.player);
    }

    // ── Food ──────────────────────────────────────────────────────────────────

    private spawnFood(mb: MapBounds): void {
        const pos  = this.getOpenPosition(mb);
        const size = mb.ts * 1.5;

        const food = this.add.sprite(pos.x, pos.y, 'food_idle')
            .setDisplaySize(size, size)
            .play('food_idle')
            .setDepth(9);

        this.tweens.add({
            targets:  food,
            y:        pos.y - 10,
            duration: 1000 + Math.random() * 800,
            ease:     'Sine.easeInOut',
            yoyo:     true,
            repeat:   -1,
        });

        this.foods.push(food);
    }

    private eatFood(index: number): void {
        const food = this.foods.splice(index, 1)[0];
        this.tweens.killTweensOf(food);

        this.tweens.add({
            targets:    food,
            scaleX:     0,
            scaleY:     0,
            alpha:      0,
            duration:   180,
            onComplete: () => food.destroy(),
        });

        this.score++;
        this.scoreText?.setText(`Score: ${this.score}`);

        // All food eaten → level complete
        if (this.foods.length === 0) {
            this.time.delayedCall(400, () => this.levelComplete());
        }
    }

    private levelComplete(): void {
        this.isRestarting = true; // lock input during transition
        this.input.setDraggable(this.player, false);

        const isLastLevel = this.currentLevel >= LEVELS.length - 1;

        const panel = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, 460, 130, 0x000220, 0.92).setDepth(50);
        const msg   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 22,
            isLastLevel ? '🎉  You Win! All levels done!' : '⭐  Level Complete!', {
                fontSize: '28px', color: '#ffe483', fontFamily: 'Arial Black, Arial, sans-serif',
            }).setOrigin(0.5).setDepth(51);
        const sub   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 24,
            isLastLevel ? 'Amazing job!' : 'Get ready for the next level…', {
                fontSize: '16px', color: '#ffffffaa', fontFamily: 'Arial, sans-serif',
            }).setOrigin(0.5).setDepth(51);

        this.time.delayedCall(2000, () => {
            panel.destroy(); msg.destroy(); sub.destroy();
            this.isRestarting = false;
            if (isLastLevel) {
                returnToDashboard();
            } else {
                this.advanceLevel();
            }
        });
    }

    // ── Collision helpers ─────────────────────────────────────────────────────

    private isWallAt(worldX: number, worldY: number): boolean {
        const mb = this.mapBounds;
        if (!mb) return false;
        const r = mb.ts * 0.45;
        const checks = [
            [worldX,     worldY    ],
            [worldX - r, worldY    ],
            [worldX + r, worldY    ],
            [worldX,     worldY - r],
            [worldX,     worldY + r],
        ];
        return checks.some(([px, py]) => {
            const col = Math.floor((px - mb.ox) / mb.ts);
            const row = Math.floor((py - mb.oy) / mb.ts);
            // Above or below the map = open, never a wall
            if (row < 0 || row >= mb.rows) return false;
            // Left / right canvas edge = hard boundary
            if (col < 0 || col >= mb.cols) return true;
            return mb.tiles[row * mb.cols + col] !== 0;
        });
    }

    /** Returns a random open tile that is adjacent to at least one wall (inside the maze). */
    private getOpenPosition(mb: MapBounds): { x: number; y: number } {
        const { ox, oy, ts, cols, rows, tiles } = mb;
        const candidates: { col: number; row: number }[] = [];

        for (let row = 1; row < rows - 1; row++) {
            for (let col = 1; col < cols - 1; col++) {
                if (tiles[row * cols + col] !== 0) continue;
                const hasWallNeighbor = [
                    [col - 1, row], [col + 1, row],
                    [col, row - 1], [col, row + 1],
                ].some(([nc, nr]) => tiles[nr * cols + nc] !== 0);
                if (hasWallNeighbor) candidates.push({ col, row });
            }
        }

        // Fallback: any open tile
        if (candidates.length === 0) {
            for (let row = 0; row < rows; row++)
                for (let col = 0; col < cols; col++)
                    if (tiles[row * cols + col] === 0) candidates.push({ col, row });
        }

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        return { x: ox + pick.col * ts + ts / 2, y: oy + pick.row * ts + ts / 2 };
    }

    private getSpawnPosition(mb: MapBounds): { x: number; y: number } {
        // Use the bottom-center open area of the map for player spawn
        return this.getOpenPosition(mb);
    }

    // ── HUD ───────────────────────────────────────────────────────────────────

    private drawHUD(levelIndex: number): void {
        const bg = this.add.graphics().setData('layer', 'hud');
        bg.fillStyle(0x000220, 0.95);
        bg.fillRect(0, 0, CANVAS_W, HUD_H);
        bg.lineStyle(1, 0xffe483, 0.2);
        bg.lineBetween(0, HUD_H, CANVAS_W, HUD_H);

        const style = {
            fontSize: '20px', fontStyle: 'bold',
            color: '#ffe483', fontFamily: 'Arial Black, Arial, sans-serif',
        };

        this.add.text(24, HUD_H / 2, `Stage: ${levelIndex + 1}`, style)
            .setOrigin(0, 0.5).setData('layer', 'hud');

        this.add.text(CANVAS_W / 2, HUD_H / 2, 'Drag to eat!', { ...style, color: '#ffffff', fontSize: '16px' })
            .setOrigin(0.5, 0.5).setData('layer', 'hud');

        this.scoreText = this.add.text(CANVAS_W - 24, HUD_H / 2, `Score: ${this.score}`, style)
            .setOrigin(1, 0.5).setData('layer', 'hud');

        const back = this.add.text(CANVAS_W - 12, CANVAS_H - 10, '← Back', {
            fontSize: '13px', color: '#ffffff70', fontFamily: 'Arial, sans-serif',
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).setData('layer', 'hud');

        back.on('pointerover',  () => back.setColor('#ffffffcc'));
        back.on('pointerout',   () => back.setColor('#ffffff70'));
        back.on('pointerdown',  () => returnToDashboard());
    }

    // ── Wall hit → level restart ──────────────────────────────────────────────

    private hitWall(): void {
        this.isRestarting = true;
        this.input.setDraggable(this.player, false);

        // Flash the player
        this.tweens.killTweensOf(this.player);
        this.tweens.add({
            targets:  this.player,
            alpha:    0.15,
            duration: 80,
            yoyo:     true,
            repeat:   4,
            onComplete: () => this.player?.setAlpha(1),
        });

        // Overlay
        const panel = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, 460, 120, 0x000000, 0.88).setDepth(50);
        const msg   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 18, '💥  Oops! Don\'t touch the walls!', {
            fontSize: '24px', color: '#ff5555', fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);
        const sub   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 22, 'Restarting level…', {
            fontSize: '15px', color: '#ffffff70', fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);

        this.time.delayedCall(1500, () => {
            panel.destroy();
            msg.destroy();
            sub.destroy();
            this.score        = 0;
            this.isRestarting = false;
            this.showLevel(this.currentLevel);
        });
    }

    // ── Level advance ─────────────────────────────────────────────────────────

    advanceLevel(): void {
        if (this.currentLevel < LEVELS.length - 1) {
            this.currentLevel++;
            this.showLevel(this.currentLevel);
        }
    }
}
