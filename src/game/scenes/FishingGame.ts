import { Scene } from 'phaser';
import { returnToDashboard } from '../PhaserBridge';

const CANVAS_W    = 1024;
const CANVAS_H    = 768;
const HUD_H       = 60;
const WATER_Y     = 145;   // water surface
const SEABED_Y    = 710;   // seabed top
const ROD_X       = 130;   // fishing line x
const ROD_TIP_Y   = 115;   // rod tip y (above water)
const HOOK_MIN_Y  = WATER_Y + 30;
const HOOK_MAX_Y  = SEABED_Y - 30;
const FISH_TO_WIN = 5;
const SCROLL_STEP = 38;

interface FishData {
    sprite:   Phaser.GameObjects.Sprite;
    speed:    number;     // px/frame, negative = leftward
    dir:      1 | -1;
    points:   number;
    hitR:     number;
    obstacle: boolean;
}

interface Bubble { x: number; y: number; r: number; speed: number; alpha: number }

export class FishingGame extends Scene {

    private hookY       = HOOK_MIN_Y + 80;
    private hookTargetY = HOOK_MIN_Y + 80;

    private lineGfx!:   Phaser.GameObjects.Graphics;
    private hookGfx!:   Phaser.GameObjects.Graphics;
    private bubbleGfx!: Phaser.GameObjects.Graphics;

    private fishList: FishData[] = [];
    private bubbles:  Bubble[]   = [];

    private caught     = 0;
    private isLocked   = false;

    private catchText!:  Phaser.GameObjects.Text;
    private depthText!:  Phaser.GameObjects.Text;
    private depthBar!:   Phaser.GameObjects.Graphics;

    private spawnTimer!: Phaser.Time.TimerEvent;

    constructor() { super('FishingGame'); }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    preload(): void {
        const img = (key: string, path: string) => {
            if (!this.textures.exists(key)) this.load.image(key, path);
        };
        const ss = (key: string, path: string, fw: number, fh: number) => {
            if (!this.textures.exists(key)) this.load.spritesheet(key, path, { frameWidth: fw, frameHeight: fh });
        };

        ss('fish1_o',  'assets/fishing/fish1_orange.png', 16, 16);
        ss('fish1_p',  'assets/fishing/fish1_pink.png',   16, 16);
        ss('fish2_b',  'assets/fishing/fish2_blue.png',   32, 16);
        ss('fish2_g',  'assets/fishing/fish2_green.png',  32, 16);
        ss('fish3_r',  'assets/fishing/fish3_red.png',    32, 16);
        ss('fg_shark', 'assets/fishing/shark.png',        32, 32);
        ss('fg_jelly', 'assets/fishing/jellyfish.png',    32, 16);
        ss('fg_weed',  'assets/fishing/seaweed.png',      16, 32);
        img('fg_chest','assets/fishing/chest.png');
    }

    create(): void {
        this.caught      = 0;
        this.isLocked    = false;
        this.fishList    = [];
        this.bubbles     = [];
        this.hookY       = HOOK_MIN_Y + 80;
        this.hookTargetY = HOOK_MIN_Y + 80;

        this.setupAnimations();
        this.createBackground();
        this.createBubbles();
        this.createSeabed();
        this.createLineAndHook();
        this.createDepthBar();
        this.drawHUD();
        this.setupInput();
        this.startSpawning();
    }

    update(): void {
        if (this.isLocked) return;

        // Smooth hook movement (lerp)
        this.hookY += (this.hookTargetY - this.hookY) * 0.2;
        this.redrawLine();
        this.tickBubbles();
        this.tickFish();
        this.updateDepthBar();

        const pct = (this.hookY - HOOK_MIN_Y) / (HOOK_MAX_Y - HOOK_MIN_Y);
        this.depthText?.setText(`${Math.round(pct * 20)} m`);
    }

    // ── Animations ────────────────────────────────────────────────────────────

    private setupAnimations(): void {
        const def = (key: string, end: number, fps: number) => {
            if (!this.anims.exists(key))
                this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: fps, repeat: -1 });
        };
        def('fish1_o',  7, 8);
        def('fish1_p',  7, 8);
        def('fish2_b',  7, 8);
        def('fish2_g',  7, 8);
        def('fish3_r',  7, 8);
        def('fg_shark', 7, 6);
        def('fg_jelly', 3, 6);
        def('fg_weed',  7, 5);
    }

    // ── Background ────────────────────────────────────────────────────────────

    private createBackground(): void {
        // Sky
        const sky = this.add.graphics().setDepth(0);
        sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x1E90FF, 0x1E90FF, 1);
        sky.fillRect(0, HUD_H, CANVAS_W, WATER_Y - HUD_H);

        // Water (light blue → deep navy)
        const water = this.add.graphics().setDepth(0);
        water.fillGradientStyle(0x1a8fe3, 0x1a8fe3, 0x00092b, 0x00092b, 1);
        water.fillRect(0, WATER_Y, CANVAS_W, CANVAS_H - WATER_Y);

        // Water surface shimmer
        const surf = this.add.graphics().setDepth(2);
        surf.fillStyle(0xffffff, 0.18);
        surf.fillRect(0, WATER_Y, CANVAS_W, 5);
        surf.lineStyle(2, 0xaaddff, 0.5);
        surf.lineBetween(0, WATER_Y, CANVAS_W, WATER_Y);

        // Depth zone hints (right edge)
        const z = { fontSize: '11px', color: '#ffffff28', fontFamily: 'Arial, sans-serif' };
        this.add.text(CANVAS_W - 8, 270, '── sığ',  z).setOrigin(1, 0.5).setDepth(2);
        this.add.text(CANVAS_W - 8, 430, '── orta', z).setOrigin(1, 0.5).setDepth(2);
        this.add.text(CANVAS_W - 8, 610, '── derin',z).setOrigin(1, 0.5).setDepth(2);

        // Dock plank above water
        const dock = this.add.graphics().setDepth(3);
        dock.fillStyle(0x8B5E3C, 1);
        dock.fillRect(0, HUD_H + 2, 220, 14);       // horizontal plank
        dock.fillStyle(0x6B4226, 1);
        dock.fillRect(40,  WATER_Y - 30, 12, 40);   // left post
        dock.fillRect(130, WATER_Y - 30, 12, 40);   // right post
        dock.fillRect(210, WATER_Y - 30, 12, 40);   // far post
    }

    // ── Bubbles ───────────────────────────────────────────────────────────────

    private createBubbles(): void {
        this.bubbleGfx = this.add.graphics().setDepth(3);
        for (let i = 0; i < 28; i++) {
            this.bubbles.push({
                x:     Math.random() * CANVAS_W,
                y:     WATER_Y + Math.random() * (SEABED_Y - WATER_Y),
                r:     1 + Math.random() * 3,
                speed: 0.3 + Math.random() * 0.7,
                alpha: 0.15 + Math.random() * 0.35,
            });
        }
    }

    private tickBubbles(): void {
        this.bubbleGfx.clear();
        for (const b of this.bubbles) {
            b.y -= b.speed;
            if (b.y < WATER_Y) { b.y = SEABED_Y; b.x = Math.random() * CANVAS_W; }
            this.bubbleGfx.fillStyle(0xffffff, b.alpha);
            this.bubbleGfx.fillCircle(b.x, b.y, b.r);
        }
    }

    // ── Seabed ────────────────────────────────────────────────────────────────

    private createSeabed(): void {
        const sb = this.add.graphics().setDepth(4);
        sb.fillStyle(0xB8860B, 1);
        sb.fillRect(0, SEABED_Y, CANVAS_W, CANVAS_H - SEABED_Y);
        sb.lineStyle(2, 0x8B6914, 0.6);
        sb.lineBetween(0, SEABED_Y, CANVAS_W, SEABED_Y);

        // Seaweed at seabed
        for (const x of [70, 190, 330, 470, 600, 730, 860, 970]) {
            this.add.sprite(x, SEABED_Y, 'fg_weed', 0)
                .setScale(3).setDepth(5).setOrigin(0.5, 1).play('fg_weed');
        }
    }

    // ── Line & Hook ───────────────────────────────────────────────────────────

    private createLineAndHook(): void {
        // Static rod
        const rod = this.add.graphics().setDepth(8);
        rod.lineStyle(5, 0x6B3A1F, 1);
        rod.lineBetween(20, HUD_H + 55, ROD_X + 15, ROD_TIP_Y);  // rod shaft

        this.lineGfx = this.add.graphics().setDepth(8);
        this.hookGfx = this.add.graphics().setDepth(9);
        this.redrawLine();
    }

    private redrawLine(): void {
        // Line
        this.lineGfx.clear();
        this.lineGfx.lineStyle(1.5, 0xffffff, 0.65);
        this.lineGfx.lineBetween(ROD_X + 15, ROD_TIP_Y, ROD_X, this.hookY);

        // Hook
        this.hookGfx.clear();
        this.hookGfx.lineStyle(2, 0xbbbbbb, 1);
        this.hookGfx.beginPath();
        this.hookGfx.moveTo(ROD_X, this.hookY - 8);
        this.hookGfx.lineTo(ROD_X, this.hookY + 6);
        this.hookGfx.lineTo(ROD_X + 8, this.hookY + 14);
        this.hookGfx.lineTo(ROD_X + 8, this.hookY + 8);
        this.hookGfx.strokePath();
        // Bait (red dot)
        this.hookGfx.fillStyle(0xff3333, 1);
        this.hookGfx.fillCircle(ROD_X + 8, this.hookY + 8, 4);
    }

    // ── Depth Bar (right side) ────────────────────────────────────────────────

    private createDepthBar(): void {
        const barX = CANVAS_W - 18;
        const barH = SEABED_Y - WATER_Y;

        // Background track
        const track = this.add.graphics().setDepth(10);
        track.fillStyle(0x000000, 0.3);
        track.fillRoundedRect(barX - 5, WATER_Y, 10, barH, 5);

        this.depthBar = this.add.graphics().setDepth(11);
    }

    private updateDepthBar(): void {
        const barX   = CANVAS_W - 18;
        const barH   = SEABED_Y - WATER_Y;
        const pct    = (this.hookY - HOOK_MIN_Y) / (HOOK_MAX_Y - HOOK_MIN_Y);
        const indY   = WATER_Y + pct * barH;

        this.depthBar.clear();
        this.depthBar.fillStyle(0x00ccff, 0.9);
        this.depthBar.fillCircle(barX, indY, 7);
        this.depthBar.lineStyle(2, 0xffffff, 0.6);
        this.depthBar.strokeCircle(barX, indY, 7);
    }

    // ── Input ─────────────────────────────────────────────────────────────────

    private setupInput(): void {
        this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, deltaY: number, _dz: number) => {
            if (this.isLocked) return;
            this.hookTargetY = Math.max(HOOK_MIN_Y, Math.min(HOOK_MAX_Y,
                this.hookTargetY + (deltaY > 0 ? SCROLL_STEP : -SCROLL_STEP),
            ));
        });
    }

    // ── Spawning ──────────────────────────────────────────────────────────────

    private startSpawning(): void {
        // Pre-fill a few fish
        for (let i = 0; i < 5; i++) this.time.delayedCall(i * 350, () => this.spawnFish());

        this.spawnTimer = this.time.addEvent({
            delay: 1800, loop: true, callback: this.spawnFish, callbackScope: this,
        });
    }

    private spawnFish(): void {
        if (this.isLocked) return;

        const roll = Math.random();
        let tex: string, scale: number, speed: number;
        let minY: number, maxY: number, points: number, hitR: number, obstacle: boolean;

        if (roll < 0.25) {
            tex = 'fish1_o'; scale = 3.5; speed = 1.8 + Math.random();
            minY = WATER_Y + 25; maxY = 310; points = 1; hitR = 28; obstacle = false;
        } else if (roll < 0.45) {
            tex = 'fish1_p'; scale = 3.5; speed = 2.0 + Math.random();
            minY = WATER_Y + 25; maxY = 310; points = 1; hitR = 28; obstacle = false;
        } else if (roll < 0.60) {
            tex = 'fish2_b'; scale = 2.8; speed = 1.3 + Math.random();
            minY = 310; maxY = 510; points = 2; hitR = 38; obstacle = false;
        } else if (roll < 0.72) {
            tex = 'fish2_g'; scale = 2.8; speed = 1.5 + Math.random();
            minY = 310; maxY = 510; points = 2; hitR = 38; obstacle = false;
        } else if (roll < 0.82) {
            tex = 'fish3_r'; scale = 3.0; speed = 0.9 + Math.random() * 0.6;
            minY = 500; maxY = 660; points = 3; hitR = 42; obstacle = false;
        } else if (roll < 0.92) {
            tex = 'fg_jelly'; scale = 3.0; speed = 0.5 + Math.random() * 0.6;
            minY = WATER_Y + 40; maxY = 600; points = 0; hitR = 34; obstacle = true;
        } else {
            tex = 'fg_shark'; scale = 3.5; speed = 1.8 + Math.random();
            minY = 460; maxY = 660; points = 0; hitR = 52; obstacle = true;
        }

        const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
        const startX = dir === -1 ? CANVAS_W + 70 : -70;
        const y      = minY + Math.random() * (maxY - minY);

        const sprite = this.add.sprite(startX, y, tex, 0)
            .setScale(scale).setDepth(6).setFlipX(dir === 1).play(tex);

        this.fishList.push({ sprite, speed: speed * dir * -1, dir, points, hitR, obstacle });
        // Note: speed * dir * -1 because dir=-1 should move leftward (negative x)
        // dir=-1: speed * (-1) * (-1) = +speed  ← wrong
        // Actually: dir=-1 means right→left, which needs negative x movement
        // Let me fix: speed should be negative when moving left
    }

    // ── Tick ─────────────────────────────────────────────────────────────────

    private tickFish(): void {
        for (let i = this.fishList.length - 1; i >= 0; i--) {
            const f = this.fishList[i];

            // Move: dir=-1 means right→left → negative x
            f.sprite.x += f.dir === -1 ? -Math.abs(f.speed) : Math.abs(f.speed);

            // Despawn off-screen
            if (f.sprite.x < -120 || f.sprite.x > CANVAS_W + 120) {
                f.sprite.destroy();
                this.fishList.splice(i, 1);
                continue;
            }

            // Collision with hook
            const dx = ROD_X - f.sprite.x;
            const dy = this.hookY - f.sprite.y;
            if (Math.sqrt(dx * dx + dy * dy) < f.hitR) {
                if (f.obstacle) { this.hitObstacle(i); return; }
                else            { this.catchFish(i);   return; }
            }
        }
    }

    // ── Outcomes ─────────────────────────────────────────────────────────────

    private catchFish(idx: number): void {
        const f = this.fishList.splice(idx, 1)[0];

        this.tweens.add({
            targets: f.sprite, y: f.sprite.y - 60, alpha: 0, scaleX: 0, scaleY: 0,
            duration: 350, onComplete: () => f.sprite.destroy(),
        });

        // Score popup
        const pop = this.add.text(f.sprite.x, f.sprite.y - 20, `+${f.points}`, {
            fontSize: '24px', color: '#ffe483', fontFamily: 'Arial Black, Arial, sans-serif',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({
            targets: pop, y: pop.y - 55, alpha: 0, duration: 750,
            onComplete: () => pop.destroy(),
        });

        this.caught++;
        this.catchText?.setText(`🎣 ${this.caught} / ${FISH_TO_WIN}`);
        if (this.caught >= FISH_TO_WIN) this.time.delayedCall(400, () => this.levelComplete());
    }

    private hitObstacle(_idx: number): void {
        if (this.isLocked) return;
        this.isLocked = true;

        // Hook bounces to surface
        this.hookTargetY = HOOK_MIN_Y;

        // Flash line/hook
        this.tweens.add({
            targets: [this.lineGfx, this.hookGfx], alpha: 0.1,
            duration: 80, yoyo: true, repeat: 3,
            onComplete: () => {
                this.lineGfx?.setAlpha(1);
                this.hookGfx?.setAlpha(1);
                this.isLocked = false;
            },
        });

        const warn = this.add.text(CANVAS_W / 2, CANVAS_H / 2, '⚠️  Tehlike! Oltayı çek!', {
            fontSize: '24px', color: '#ff8800',
            fontFamily: 'Arial Black, Arial, sans-serif',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.time.delayedCall(1200, () => warn.destroy());
    }

    private levelComplete(): void {
        if (this.isLocked) return;
        this.isLocked = true;
        this.spawnTimer?.destroy();

        const panel = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, 520, 140, 0x000220, 0.93).setDepth(50);
        const msg   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 24, '🎉  Tebrikler!', {
            fontSize: '34px', color: '#ffe483', fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);
        const sub   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 26, `${FISH_TO_WIN} balık yakaladın! Harika!`, {
            fontSize: '17px', color: '#ffffffbb', fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);

        this.time.delayedCall(2500, () => {
            panel.destroy(); msg.destroy(); sub.destroy();
            returnToDashboard();
        });
    }

    // ── HUD ───────────────────────────────────────────────────────────────────

    private drawHUD(): void {
        const bg = this.add.graphics().setDepth(20);
        bg.fillStyle(0x000f2e, 0.95);
        bg.fillRect(0, 0, CANVAS_W, HUD_H);
        bg.lineStyle(1, 0x00ccff, 0.25);
        bg.lineBetween(0, HUD_H, CANVAS_W, HUD_H);

        const style = {
            fontSize: '20px', fontStyle: 'bold',
            color: '#00ccff', fontFamily: 'Arial Black, Arial, sans-serif',
        };

        this.add.text(24, HUD_H / 2 - 7, 'Balık Tut', style).setOrigin(0, 0.5).setDepth(21);

        this.add.text(24, HUD_H / 2 + 10, '↕ fare tekerleği = derinlik', {
            fontSize: '11px', color: '#ffffff50', fontFamily: 'Arial, sans-serif',
        }).setOrigin(0, 0.5).setDepth(21);

        this.depthText = this.add.text(CANVAS_W / 2, HUD_H / 2, '0 m', {
            fontSize: '16px', color: '#aaddff', fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5).setDepth(21);

        this.add.text(CANVAS_W / 2, HUD_H / 2 + 14, 'derinlik', {
            fontSize: '10px', color: '#ffffff40', fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5).setDepth(21);

        this.catchText = this.add.text(CANVAS_W - 24, HUD_H / 2, `🎣 0 / ${FISH_TO_WIN}`, style)
            .setOrigin(1, 0.5).setDepth(21);

        const back = this.add.text(CANVAS_W - 12, CANVAS_H - 10, '← Geri', {
            fontSize: '13px', color: '#ffffff70', fontFamily: 'Arial, sans-serif',
        }).setOrigin(1, 1).setInteractive().setDepth(21);
        back.on('pointerover',  () => back.setColor('#ffffffcc'));
        back.on('pointerout',   () => back.setColor('#ffffff70'));
        back.on('pointerdown',  () => returnToDashboard());
    }
}
