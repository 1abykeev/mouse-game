import { Scene } from 'phaser';
import { returnToDashboard } from '../PhaserBridge';

const CANVAS_W     = 1024;
const CANVAS_H     = 768;
const HUD_H        = 60;
const LANE_XS      = [170, 512, 854] as const;
const STARS_TO_WIN = 5;
const SCROLL_SPEED = 4;
const BG_SPEED     = 1.5;

export class RocketRush extends Scene {

    private rocket!:       Phaser.GameObjects.Image;
    private currentLane  = 1;
    private isMoving     = false;
    private isRestarting = false;

    private bgTiles:    Phaser.GameObjects.Image[] = [];
    private bgScaledH   = 0;

    private meteors: { img: Phaser.GameObjects.Image; big: boolean }[] = [];
    private coins:   Phaser.GameObjects.Sprite[] = [];

    private collected  = 0;
    private coinText!: Phaser.GameObjects.Text;

    private dashOffset = 0;
    private dashGfx!:  Phaser.GameObjects.Graphics;

    private spawnMeteorEvt!: Phaser.Time.TimerEvent;
    private spawnCoinEvt!:   Phaser.Time.TimerEvent;

    constructor() { super('RocketRush'); }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    preload(): void {
        const load = (key: string, path: string) => {
            if (!this.textures.exists(key)) this.load.image(key, path);
        };
        load('rr_rocket',       'assets/rocket/rocket.png');
        load('rr_bg',           'assets/rocket/bg.png');
        load('rr_meteor_big',   'assets/rocket/meteor_big.png');
        load('rr_meteor_small', 'assets/rocket/meteor_small.png');
        for (let i = 1; i <= 6; i++) load(`rr_star_${i}`, `assets/rocket/star_${i}.png`);
    }

    create(): void {
        this.isMoving     = false;
        this.isRestarting = false;
        this.collected    = 0;
        this.meteors      = [];
        this.coins        = [];
        this.dashOffset   = 0;

        this.setupAnimations();
        this.createBackground();
        this.createDashLines();
        this.createRocket();
        this.drawHUD();
        this.setupInput();
        this.startSpawning();

        this.events.once('shutdown', () => {
            this.game.canvas.oncontextmenu = null;
        });
    }

    update(): void {
        if (this.isRestarting) return;
        this.scrollBackground();
        this.dashOffset = (this.dashOffset + SCROLL_SPEED) % 80;
        this.drawDashes();
        this.tickMeteors();
        this.tickCoins();
    }

    // ── Animations ────────────────────────────────────────────────────────────

    private setupAnimations(): void {
        if (!this.anims.exists('coin_shine')) {
            this.anims.create({
                key:       'coin_shine',
                frames:    [1, 2, 3, 4, 5, 6].map(i => ({ key: `rr_star_${i}` })),
                frameRate: 8,
                repeat:    -1,
            });
        }
    }

    // ── Background ────────────────────────────────────────────────────────────

    private createBackground(): void {
        const src      = this.textures.get('rr_bg').getSourceImage() as HTMLImageElement;
        const sc       = CANVAS_W / src.width;
        this.bgScaledH = src.height * sc;

        const t1 = this.add.image(CANVAS_W / 2, CANVAS_H / 2,                  'rr_bg').setScale(sc).setDepth(0);
        const t2 = this.add.image(CANVAS_W / 2, CANVAS_H / 2 - this.bgScaledH, 'rr_bg').setScale(sc).setDepth(0);
        this.bgTiles = [t1, t2];
    }

    private scrollBackground(): void {
        const h     = this.bgScaledH;
        const other = (t: Phaser.GameObjects.Image) => this.bgTiles.find(x => x !== t)!;
        for (const t of this.bgTiles) {
            t.y += BG_SPEED;
            if (t.y - h / 2 > CANVAS_H) t.y = other(t).y - h;
        }
    }

    // ── Lane dividers ─────────────────────────────────────────────────────────

    private createDashLines(): void {
        this.dashGfx = this.add.graphics().setDepth(2);
    }

    private drawDashes(): void {
        this.dashGfx.clear();
        this.dashGfx.lineStyle(2, 0xffffff, 0.22);
        const DASH = 40, GAP = 40, PERIOD = DASH + GAP;
        for (const x of [352, 672]) {
            let y = HUD_H + (this.dashOffset % PERIOD) - PERIOD;
            while (y < CANVAS_H) {
                this.dashGfx.lineBetween(x, y, x, y + DASH);
                y += PERIOD;
            }
        }
    }

    // ── Rocket ────────────────────────────────────────────────────────────────

    private createRocket(): void {
        this.currentLane = 1;
        this.rocket = this.add.image(LANE_XS[1], 630, 'rr_rocket')
            .setDisplaySize(90, 90)
            .setDepth(10);
    }

    private moveRocket(dir: -1 | 1): void {
        const next = this.currentLane + dir;
        if (next < 0 || next > 2 || this.isMoving) return;
        this.currentLane = next;
        this.isMoving    = true;
        this.tweens.add({
            targets:    this.rocket,
            x:          LANE_XS[this.currentLane],
            duration:   160,
            ease:       'Cubic.easeOut',
            onComplete: () => { this.isMoving = false; },
        });
    }

    // ── Input ─────────────────────────────────────────────────────────────────

    private setupInput(): void {
        this.game.canvas.oncontextmenu = (e) => e.preventDefault();
        this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
            if (this.isMoving || this.isRestarting) return;
            if (ptr.rightButtonDown())     this.moveRocket(1);
            else if (ptr.leftButtonDown()) this.moveRocket(-1);
        });
    }

    // ── Spawning ──────────────────────────────────────────────────────────────

    private startSpawning(): void {
        this.spawnMeteorEvt = this.time.addEvent({
            delay: 1500, loop: true, callback: this.spawnMeteor, callbackScope: this,
        });
        this.spawnCoinEvt = this.time.addEvent({
            delay: 2000, loop: true, callback: this.spawnCoin, callbackScope: this,
        });
    }

    private spawnMeteor(): void {
        if (this.isRestarting) return;
        const lane = Math.floor(Math.random() * 3);
        const big  = Math.random() > 0.4;
        const img  = this.add.image(LANE_XS[lane], HUD_H - 60, big ? 'rr_meteor_big' : 'rr_meteor_small')
            .setDisplaySize(big ? 82 : 54, big ? 82 : 54)
            .setDepth(8);
        this.meteors.push({ img, big });
    }

    private spawnCoin(): void {
        if (this.isRestarting) return;
        const lane = Math.floor(Math.random() * 3);
        const s = this.add.sprite(LANE_XS[lane], HUD_H - 60, 'rr_star_1')
            .setDisplaySize(58, 58)
            .setDepth(8)
            .play('coin_shine');
        this.coins.push(s);
    }

    // ── Per-frame tick ────────────────────────────────────────────────────────

    private tickMeteors(): void {
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.img.y += SCROLL_SPEED;
            if (m.img.y > CANVAS_H + 80) {
                m.img.destroy();
                this.meteors.splice(i, 1);
                continue;
            }
            const dx = this.rocket.x - m.img.x;
            const dy = this.rocket.y - m.img.y;
            if (Math.sqrt(dx * dx + dy * dy) < (m.big ? 50 : 33)) {
                this.hitMeteor();
                return;
            }
        }
    }

    private tickCoins(): void {
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const c = this.coins[i];
            c.y += SCROLL_SPEED - 1;
            if (c.y > CANVAS_H + 60) {
                c.destroy();
                this.coins.splice(i, 1);
                continue;
            }
            const dx = this.rocket.x - c.x;
            const dy = this.rocket.y - c.y;
            if (Math.sqrt(dx * dx + dy * dy) < 50) this.collectCoin(i);
        }
    }

    // ── Outcomes ─────────────────────────────────────────────────────────────

    private collectCoin(idx: number): void {
        const c = this.coins.splice(idx, 1)[0];
        this.tweens.add({
            targets: c, scaleX: 0, scaleY: 0, alpha: 0, y: c.y - 30,
            duration: 200, onComplete: () => c.destroy(),
        });
        this.collected++;
        this.coinText?.setText(`⭐ ${this.collected} / ${STARS_TO_WIN}`);
        if (this.collected >= STARS_TO_WIN) {
            this.time.delayedCall(300, () => this.levelComplete());
        }
    }

    private hitMeteor(): void {
        if (this.isRestarting) return;
        this.isRestarting = true;
        this.spawnMeteorEvt?.destroy();
        this.spawnCoinEvt?.destroy();

        this.tweens.add({
            targets: this.rocket, alpha: 0.15, duration: 80,
            yoyo: true, repeat: 4, onComplete: () => this.rocket?.setAlpha(1),
        });

        const panel = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, 480, 130, 0x000000, 0.88).setDepth(50);
        const msg   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 20, '💥  Çarpışma!', {
            fontSize: '30px', color: '#ff5555', fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);
        const sub   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 24, 'Tekrar deniyoruz…', {
            fontSize: '16px', color: '#ffffff99', fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);

        this.time.delayedCall(1500, () => {
            panel.destroy(); msg.destroy(); sub.destroy();
            this.scene.restart();
        });
    }

    private levelComplete(): void {
        if (this.isRestarting) return;
        this.isRestarting = true;
        this.spawnMeteorEvt?.destroy();
        this.spawnCoinEvt?.destroy();

        const panel = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, 500, 140, 0x000220, 0.93).setDepth(50);
        const msg   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 24, '🎉  Tebrikler!', {
            fontSize: '34px', color: '#ffe483', fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5).setDepth(51);
        const sub   = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 26, `${STARS_TO_WIN} yıldızı topladın! Harika!`, {
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
        bg.fillStyle(0x000220, 0.92);
        bg.fillRect(0, 0, CANVAS_W, HUD_H);
        bg.lineStyle(1, 0xffe483, 0.2);
        bg.lineBetween(0, HUD_H, CANVAS_W, HUD_H);

        const style = {
            fontSize: '20px', fontStyle: 'bold',
            color: '#ffe483', fontFamily: 'Arial Black, Arial, sans-serif',
        };

        this.add.text(24, HUD_H / 2, 'Roket Koşusu', style)
            .setOrigin(0, 0.5).setDepth(21);

        this.add.text(CANVAS_W / 2, HUD_H / 2, '← Sol Tık     Sağ Tık →', {
            fontSize: '14px', color: '#ffffff88', fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5).setDepth(21);

        this.coinText = this.add.text(CANVAS_W - 24, HUD_H / 2, `⭐ 0 / ${STARS_TO_WIN}`, style)
            .setOrigin(1, 0.5).setDepth(21);

        const back = this.add.text(CANVAS_W - 12, CANVAS_H - 10, '← Geri', {
            fontSize: '13px', color: '#ffffff70', fontFamily: 'Arial, sans-serif',
        }).setOrigin(1, 1).setInteractive().setDepth(21);

        back.on('pointerover',  () => back.setColor('#ffffffcc'));
        back.on('pointerout',   () => back.setColor('#ffffff70'));
        back.on('pointerdown',  () => returnToDashboard());
    }
}
