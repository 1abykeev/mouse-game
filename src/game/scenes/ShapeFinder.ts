import { Scene } from 'phaser';
import { returnToDashboard } from '../PhaserBridge';

const CANVAS_W       = 1024;
const CANVAS_H       = 768;
const HUD_H          = 60;
const TIMER_SECONDS  = 5;
const DBL_CLICK_MS   = 350;

// ── Cloud configs (same as DragonDrop) ───────────────────────────────────────

interface CloudConfig { x: number; y: number; scale: number; speed: number; alpha: number }

const CLOUD_CONFIGS: CloudConfig[] = [
    { x: 120,  y: HUD_H + 40,  scale: 0.55, speed: 0.35, alpha: 0.75 },
    { x: 380,  y: HUD_H + 80,  scale: 0.90, speed: 0.55, alpha: 0.85 },
    { x: 600,  y: HUD_H + 30,  scale: 0.70, speed: 0.45, alpha: 0.70 },
    { x: 820,  y: HUD_H + 100, scale: 1.10, speed: 0.28, alpha: 0.60 },
    { x: 260,  y: HUD_H + 140, scale: 0.65, speed: 0.65, alpha: 0.80 },
    { x: 700,  y: HUD_H + 160, scale: 0.80, speed: 0.50, alpha: 0.65 },
];

// ── Shape / colour data ───────────────────────────────────────────────────────

type ShapeType = 'circle' | 'square' | 'triangle';
type ColorName = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

const COLORS: Record<ColorName, { hex: number; tr: string }> = {
    red:    { hex: 0xe74c3c, tr: 'Kırmızı' },
    blue:   { hex: 0x2980b9, tr: 'Mavi'    },
    green:  { hex: 0x27ae60, tr: 'Yeşil'   },
    yellow: { hex: 0xf1c40f, tr: 'Sarı'    },
    purple: { hex: 0x8e44ad, tr: 'Mor'     },
};

const SHAPE_TR: Record<ShapeType, string> = {
    circle:   'daireyi',
    square:   'kareyi',
    triangle: 'üçgeni',
};

// ── Level 1 definition ────────────────────────────────────────────────────────

const TARGET      = { shape: 'circle'   as ShapeType, color: 'blue'  as ColorName };
const DISTRACTORS = [
    { shape: 'circle'   as ShapeType, color: 'red'    as ColorName },
    { shape: 'square'   as ShapeType, color: 'red'    as ColorName },
];

// ── Scene ─────────────────────────────────────────────────────────────────────

export class ShapeFinder extends Scene {

    private clouds:           { img: Phaser.GameObjects.Image; speed: number }[] = [];
    private cursorImg!:       Phaser.GameObjects.Image;
    private timerBar!:        Phaser.GameObjects.Graphics;
    private timerEvent!:      Phaser.Time.TimerEvent;
    private isLocked         = false;
    private lastClickTime    = 0;
    private lastClickIdx     = -1;
    private score            = 0;
    private scoreText!:       Phaser.GameObjects.Text;

    constructor() { super('ShapeFinder'); }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    preload(): void {
        if (!this.textures.exists('cloud')) {
            this.load.svg('cloud', 'assets/images/cloud.svg', { width: 240, height: 110 });
        }
        if (!this.textures.exists('sf_cursor')) {
            this.load.image('sf_cursor', 'assets/game2/mouse.png');
        }
    }

    create(): void {
        this.isLocked       = false;
        this.clouds         = [];
        this.score          = 0;
        this.lastClickTime  = 0;
        this.lastClickIdx   = -1;

        this.createSky();
        this.createClouds();
        this.drawHUD();
        this.showRound();
        this.setupCursor();

        // Restore system cursor when scene stops
        this.events.once('shutdown', () => this.input.setDefaultCursor('auto'));
    }

    update(): void {
        for (const c of this.clouds) {
            c.img.x -= c.speed;
            if (c.img.x < -200) c.img.x = CANVAS_W + 150;
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

    // ── Custom cursor ─────────────────────────────────────────────────────────

    private setupCursor(): void {
        this.input.setDefaultCursor('none');
        this.cursorImg = this.add.image(CANVAS_W / 2, CANVAS_H / 2, 'sf_cursor')
            .setDisplaySize(52, 65)
            .setDepth(100)
            .setOrigin(0.15, 0.08);   // hotspot at arrow tip

        this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
            this.cursorImg.setPosition(ptr.x, ptr.y);
        });
    }

    // ── Round ─────────────────────────────────────────────────────────────────

    private showRound(): void {
        // Clear previous round objects
        this.children.list
            .filter(c => (c as Phaser.GameObjects.GameObject).getData?.('layer') === 'round')
            .forEach(c => c.destroy());

        if (this.timerEvent) this.timerEvent.destroy();

        this.lastClickTime = 0;
        this.lastClickIdx  = -1;

        // Shuffle the three shapes
        const slots: { shape: ShapeType; color: ColorName; isTarget: boolean }[] = [
            { ...TARGET,          isTarget: true  },
            { ...DISTRACTORS[0],  isTarget: false },
            { ...DISTRACTORS[1],  isTarget: false },
        ];
        for (let i = slots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }

        // ── Prompt panel ──────────────────────────────────────────────────────
        const promptBg = this.add.graphics().setDepth(3).setData('layer', 'round');
        promptBg.fillStyle(0xffffff, 0.38);
        promptBg.fillRoundedRect(CANVAS_W / 2 - 270, HUD_H + 18, 540, 70, 18);

        const colorTr = COLORS[TARGET.color].tr;
        const shapeTr = SHAPE_TR[TARGET.shape];
        this.add.text(CANVAS_W / 2, HUD_H + 53, `${colorTr} ${shapeTr} bul!`, {
            fontSize:   '38px',
            fontStyle:  'bold',
            color:      '#000f2e',
            fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5).setDepth(4).setData('layer', 'round');

        // ── Timer bar ─────────────────────────────────────────────────────────
        const BAR_W = 480, BAR_H = 16;
        const BAR_X = (CANVAS_W - BAR_W) / 2;
        const BAR_Y = HUD_H + 104;

        const barBg = this.add.graphics().setDepth(3).setData('layer', 'round');
        barBg.fillStyle(0x00000033, 1);
        barBg.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 8);

        this.timerBar = this.add.graphics().setDepth(4).setData('layer', 'round');

        // ── Shapes ────────────────────────────────────────────────────────────
        const POSITIONS = [{ x: 190, y: 430 }, { x: 512, y: 430 }, { x: 834, y: 430 }];
        const R = 95;

        slots.forEach((def, idx) => {
            const { x, y } = POSITIONS[idx];

            const gfx = this.add.graphics().setDepth(5).setData('layer', 'round');
            this.drawShape(gfx, def.shape, COLORS[def.color].hex, x, y, R);

            const zone = this.add.zone(x, y, R * 2 + 24, R * 2 + 24)
                .setInteractive()
                .setDepth(6)
                .setData('layer', 'round');

            // Hover: brighten outline
            zone.on('pointerover', () => {
                if (this.isLocked) return;
                gfx.clear();
                this.drawShape(gfx, def.shape, COLORS[def.color].hex, x, y, R);
                gfx.lineStyle(7, 0xffffff, 0.75);
                this.strokeShape(gfx, def.shape, x, y, R + 7);
            });
            zone.on('pointerout', () => {
                if (this.isLocked) return;
                gfx.clear();
                this.drawShape(gfx, def.shape, COLORS[def.color].hex, x, y, R);
            });

            // Double-click detection
            zone.on('pointerdown', () => {
                if (this.isLocked) return;
                const now = Date.now();
                if (now - this.lastClickTime < DBL_CLICK_MS && this.lastClickIdx === idx) {
                    this.lastClickTime = 0;
                    this.lastClickIdx  = -1;
                    if (def.isTarget) this.onCorrect();
                    else              this.onWrong();
                } else {
                    // First click: pulse alpha as feedback
                    this.lastClickTime = now;
                    this.lastClickIdx  = idx;
                    this.tweens.add({ targets: gfx, alpha: 0.6, duration: 70, yoyo: true });
                }
            });
        });

        this.startTimer(BAR_X, BAR_Y, BAR_W, BAR_H);
    }

    // ── Shape drawing helpers ─────────────────────────────────────────────────

    private drawShape(gfx: Phaser.GameObjects.Graphics, shape: ShapeType, color: number, cx: number, cy: number, r: number): void {
        // Drop shadow
        gfx.fillStyle(0x000000, 0.22);
        if (shape === 'circle')   gfx.fillCircle(cx + 5, cy + 7, r);
        else if (shape === 'square') gfx.fillRect(cx - r + 5, cy - r + 7, r * 2, r * 2);
        else                      gfx.fillTriangle(cx + 5, cy - r + 7, cx + r + 5, cy + r + 7, cx - r + 5, cy + r + 7);

        // Fill
        gfx.fillStyle(color, 1);
        if (shape === 'circle')   gfx.fillCircle(cx, cy, r);
        else if (shape === 'square') gfx.fillRect(cx - r, cy - r, r * 2, r * 2);
        else                      gfx.fillTriangle(cx, cy - r, cx + r, cy + r, cx - r, cy + r);

        // Outline
        gfx.lineStyle(5, 0x000000, 1);
        this.strokeShape(gfx, shape, cx, cy, r);
    }

    private strokeShape(gfx: Phaser.GameObjects.Graphics, shape: ShapeType, cx: number, cy: number, r: number): void {
        if (shape === 'circle')      gfx.strokeCircle(cx, cy, r);
        else if (shape === 'square') gfx.strokeRect(cx - r, cy - r, r * 2, r * 2);
        else                         gfx.strokeTriangle(cx, cy - r, cx + r, cy + r, cx - r, cy + r);
    }

    // ── Timer ─────────────────────────────────────────────────────────────────

    private startTimer(barX: number, barY: number, barW: number, barH: number): void {
        let elapsed = 0;
        this.timerEvent = this.time.addEvent({
            delay: 16,
            loop:  true,
            callback: () => {
                if (this.isLocked) return;
                elapsed += 16;
                const frac   = Math.max(0, 1 - elapsed / (TIMER_SECONDS * 1000));
                const fillW  = barW * frac;
                const col    = frac > 0.5 ? 0x27ae60 : frac > 0.25 ? 0xf1c40f : 0xe74c3c;
                this.timerBar.clear();
                if (fillW > 0) {
                    this.timerBar.fillStyle(col, 1);
                    this.timerBar.fillRoundedRect(barX, barY, fillW, barH, 8);
                }
                if (elapsed >= TIMER_SECONDS * 1000) {
                    this.timerEvent.destroy();
                    this.onTimeout();
                }
            },
        });
    }

    // ── Outcomes ──────────────────────────────────────────────────────────────

    private onCorrect(): void {
        this.isLocked = true;
        this.timerEvent?.destroy();
        this.score++;
        this.scoreText?.setText(`Skor: ${this.score}`);
        this.showOverlay('🎉  Aferin!', '#27ae60', 'Harika iş! Seviyeyi bitirdin!', () => {
            this.input.setDefaultCursor('auto');
            returnToDashboard();
        });
    }

    private onWrong(): void {
        this.isLocked = true;
        this.timerEvent?.destroy();
        this.showOverlay('❌  Yanlış!', '#e74c3c', 'Tekrar dene…', () => {
            this.isLocked = false;
            this.showRound();
        });
    }

    private onTimeout(): void {
        this.isLocked = true;
        this.showOverlay('⏰  Süre doldu!', '#e67e22', 'Tekrar dene…', () => {
            this.isLocked = false;
            this.showRound();
        });
    }

    private showOverlay(title: string, color: string, sub: string, onDone: () => void): void {
        const panel  = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, 520, 140, 0x000220, 0.93).setDepth(50);
        const msg    = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 24, title, {
            fontSize: '32px', color, fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);
        const subTx  = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 26, sub, {
            fontSize: '16px', color: '#ffffffbb', fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);

        this.time.delayedCall(1800, () => {
            panel.destroy(); msg.destroy(); subTx.destroy();
            onDone();
        });
    }

    // ── HUD ───────────────────────────────────────────────────────────────────

    private drawHUD(): void {
        const bg = this.add.graphics();
        bg.fillStyle(0x000220, 0.95);
        bg.fillRect(0, 0, CANVAS_W, HUD_H);
        bg.lineStyle(1, 0xffe483, 0.2);
        bg.lineBetween(0, HUD_H, CANVAS_W, HUD_H);

        const style = {
            fontSize: '20px', fontStyle: 'bold',
            color: '#ffe483', fontFamily: 'Arial Black, Arial, sans-serif',
        };

        this.add.text(24, HUD_H / 2, 'Şekil Bulucu', style).setOrigin(0, 0.5);

        this.scoreText = this.add.text(CANVAS_W - 24, HUD_H / 2, 'Skor: 0', style)
            .setOrigin(1, 0.5);

        const back = this.add.text(CANVAS_W - 12, CANVAS_H - 10, '← Geri', {
            fontSize: '13px', color: '#ffffff70', fontFamily: 'Arial, sans-serif',
        }).setOrigin(1, 1).setInteractive();

        back.on('pointerover',  () => back.setColor('#ffffffcc'));
        back.on('pointerout',   () => back.setColor('#ffffff70'));
        back.on('pointerdown',  () => {
            this.input.setDefaultCursor('auto');
            returnToDashboard();
        });
    }
}
