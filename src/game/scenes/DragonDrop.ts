import { Scene } from 'phaser';
import { returnToDashboard } from '../PhaserBridge';

const CANVAS_W = 1024;
const CANVAS_H = 768;
const HUD_H    = 60;

const LEVELS = ['level1', 'level2'] as const;
type LevelKey = typeof LEVELS[number];

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
    private clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];

    constructor() {
        super('DragonDrop');
    }

    preload(): void {
        this.load.json('level1', 'assets/tilemaps/first_level.json');
        this.load.json('level2', 'assets/tilemaps/second_level.json');
        this.load.spritesheet('brick', 'assets/tilemaps/brick_tile1.png', {
            frameWidth: 64, frameHeight: 64,
        });
        this.load.svg('cloud', 'assets/images/cloud.svg', { width: 240, height: 110 });
    }

    create(): void {
        this.clouds = [];
        this.createSky();
        this.createClouds();
        this.showLevel(this.currentLevel);

        // DEV: press N to skip to next level
        this.input.keyboard!.on('keydown-N', () => this.advanceLevel());
    }

    update(): void {
        for (const cloud of this.clouds) {
            cloud.img.x -= cloud.speed;
            if (cloud.img.x < -200) {
                cloud.img.x = CANVAS_W + 150;
            }
        }
    }

    // ── Sky & clouds ──────────────────────────────────────────────────────────

    private createSky(): void {
        const sky = this.add.graphics();
        // Gradient: deep blue at top → lighter sky blue at bottom
        sky.fillGradientStyle(0x1B6CA8, 0x1B6CA8, 0x87CEEB, 0x87CEEB, 1);
        sky.fillRect(0, HUD_H, CANVAS_W, CANVAS_H - HUD_H);
    }

    private createClouds(): void {
        for (const cfg of CLOUD_CONFIGS) {
            const img = this.add.image(cfg.x, cfg.y, 'cloud')
                .setScale(cfg.scale)
                .setAlpha(cfg.alpha);
            this.clouds.push({ img, speed: cfg.speed });
        }
    }

    // ── Level management ──────────────────────────────────────────────────────

    private showLevel(index: number): void {
        const key = LEVELS[index] as LevelKey;
        const mapData = this.cache.json.get(key);

        // Remove only map tiles and HUD from previous level (keep sky + clouds)
        this.children.list
            .filter(c => (c as Phaser.GameObjects.GameObject).getData?.('layer') === 'map' ||
                         (c as Phaser.GameObjects.GameObject).getData?.('layer') === 'hud')
            .forEach(c => c.destroy());

        this.drawMap(mapData);
        this.drawHUD(index);
        this.makeBackButton();
    }

    // ── Map rendering ─────────────────────────────────────────────────────────

    private drawMap(
        map: { width: number; height: number; tilewidth: number; layers: { data: number[] }[] },
    ): void {
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
                    const cx = ox + col * ts + ts / 2;
                    const cy = oy + row * ts + ts / 2;
                    this.add.image(cx, cy, 'brick', gid - 1)
                        .setDisplaySize(ts, ts)
                        .setData('layer', 'map');
                }
            }
        }
    }

    // ── HUD ───────────────────────────────────────────────────────────────────

    private drawHUD(levelIndex: number): void {
        const bg = this.add.graphics().setData('layer', 'hud');
        bg.fillStyle(0x000220, 0.95);
        bg.fillRect(0, 0, CANVAS_W, HUD_H);
        bg.lineStyle(1, 0xffe483, 0.2);
        bg.lineBetween(0, HUD_H, CANVAS_W, HUD_H);

        const style = {
            fontSize:   '20px',
            fontStyle:  'bold',
            color:      '#ffe483',
            fontFamily: 'Arial Black, Arial, sans-serif',
        };

        this.add.text(24,            HUD_H / 2, `Stage: ${levelIndex + 1}`, style)
            .setOrigin(0, 0.5).setData('layer', 'hud');
        this.add.text(CANVAS_W / 2,  HUD_H / 2, 'Time: 0', { ...style, color: '#ffffff' })
            .setOrigin(0.5, 0.5).setData('layer', 'hud');
        this.add.text(CANVAS_W - 24, HUD_H / 2, 'Score: 0', style)
            .setOrigin(1, 0.5).setData('layer', 'hud');
    }

    // ── Back button ───────────────────────────────────────────────────────────

    private makeBackButton(): void {
        const btn = this.add.text(CANVAS_W - 12, CANVAS_H - 10, '← Back', {
            fontSize:   '13px',
            color:      '#ffffff70',
            fontFamily: 'Arial, sans-serif',
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).setData('layer', 'hud');

        btn.on('pointerover',  () => btn.setColor('#ffffffcc'));
        btn.on('pointerout',   () => btn.setColor('#ffffff70'));
        btn.on('pointerdown',  () => returnToDashboard());
    }

    // ── Called when player reaches the goal ───────────────────────────────────

    advanceLevel(): void {
        if (this.currentLevel < LEVELS.length - 1) {
            this.currentLevel++;
            this.showLevel(this.currentLevel);
        }
    }
}
