import { Scene } from 'phaser';
import { StorageManager } from '../systems/StorageManager';

// ─── Colour tokens (from DESIGN.md) ──────────────────────────────────────────
const C = {
    bg:        0x000341,
    surf:      0x000662,
    surfLow:   0x000450,
    surfHigh:  0x000873,
    primary:   0xffe483,
    secondary: 0x3fff8b,
    tertiary:  0xff833f,
    onSurf:    0xe3e3ff,
    onVar:     0x9ba4ff,
    primCont:  0xfdd400,
    secCont:   0x006d35,
    tertCont:  0xfd6c00,
    lime:      0xa3e635,
    starEmpty: 0x353e97,
} as const;

// ─── Card definitions ─────────────────────────────────────────────────────────
interface CardDef {
    title:        string;
    skill:        string;
    description:  string;
    accent:       number;
    iconBg:       number;
    btnShadow:    number;
    btnTextColor: string;
    icon:         string;
    targetScene:  string;
    progressKey:  'dragonDrop' | 'shapeFinder' | 'rocketRush';
}

const CARD_DEFS: CardDef[] = [
    {
        title:        'Dragon Drop',
        skill:        'Click & Drag',
        description:  'Navigate your mouse\nthrough the galaxy maze!',
        accent:       C.secondary,
        iconBg:       C.secCont,
        btnShadow:    0x004820,
        btnTextColor: '#004820',
        icon:         '🐾',
        targetScene:  'DragonDrop',
        progressKey:  'dragonDrop',
    },
    {
        title:        'Shape Finder',
        skill:        'Double Click',
        description:  'Double-click the correct\nshape before time runs out!',
        accent:       C.primary,
        iconBg:       C.primCont,
        btnShadow:    0x645300,
        btnTextColor: '#635200',
        icon:         '🔷',
        targetScene:  'ShapeFinder',
        progressKey:  'shapeFinder',
    },
    {
        title:        'Rocket Rush',
        skill:        'Left & Right Click',
        description:  'Use left & right click\nto dodge asteroids in space!',
        accent:       C.tertiary,
        iconBg:       C.tertCont,
        btnShadow:    0x321000,
        btnTextColor: '#321000',
        icon:         '🚀',
        targetScene:  'RocketRush',
        progressKey:  'rocketRush',
    },
];

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_W  = 304;
const CARD_H  = 420;
const CARD_Y  = 175;
const CARD_XS = [32, 360, 688] as const;  // 32 + 304 + 24 = 360, etc.

export class Dashboard extends Scene {

    constructor() {
        super('Dashboard');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(C.bg);
        this.createStarfield();
        this.drawHeader();
        this.drawHero();
        this.createGameCards();
        this.drawBottomNav();
    }

    // ── Starfield ─────────────────────────────────────────────────────────────

    private createStarfield(): void {
        const gfx = this.add.graphics();

        // White stars (varied size and opacity)
        for (let i = 0; i < 160; i++) {
            const x = Math.floor(Math.random() * 1024);
            const y = Math.floor(Math.random() * 768);
            const r = 0.4 + Math.random() * 1.6;
            const a = 0.2 + Math.random() * 0.8;
            gfx.fillStyle(0xffffff, a);
            gfx.fillCircle(x, y, r);
        }

        // Coloured accent dots (rare)
        const accents = [C.primary, C.secondary, C.tertiary];
        for (let i = 0; i < 14; i++) {
            const x = Math.floor(Math.random() * 1024);
            const y = Math.floor(Math.random() * 768);
            gfx.fillStyle(accents[i % 3], 0.35);
            gfx.fillCircle(x, y, 1.5);
        }
    }

    // ── Header ────────────────────────────────────────────────────────────────

    private drawHeader(): void {
        const g = this.add.graphics();

        // Bar background
        g.fillStyle(C.bg, 0.95);
        g.fillRect(0, 0, 1024, 70);

        // Subtle bottom glow line
        g.fillStyle(C.primary, 0.22);
        g.fillRect(0, 68, 1024, 2);

        // Logo circle (yellow)
        g.fillStyle(C.primCont, 1);
        g.fillCircle(36, 35, 21);

        // Mouse icon
        this.add.text(36, 35, '🖱', { fontSize: '16px' }).setOrigin(0.5);

        // Game title
        this.add.text(64, 35, 'MOUSE MASTERS', {
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffe483',
            fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0, 0.5);

        // Total stars badge (top-right)
        const { total } = StorageManager.getTotalStars();
        const badgeX = 952;
        g.fillStyle(C.surfHigh, 1);
        g.fillRoundedRect(badgeX, 16, 60, 38, 19);
        this.add.text(badgeX + 30, 35, `⭐ ${total}`, {
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffe483',
        }).setOrigin(0.5);
    }

    // ── Hero section ──────────────────────────────────────────────────────────

    private drawHero(): void {
        this.add.text(512, 100, 'GALACTIC PLAYGROUND', {
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#ffe483',
            fontFamily: 'Arial Black, Arial, sans-serif',
            shadow: {
                color:   '#ffe483',
                blur:    18,
                offsetX: 0,
                offsetY: 0,
                fill:    true,
            },
        }).setOrigin(0.5);

        this.add.text(512, 143, 'Learn to use your mouse while having fun!', {
            fontSize: '16px',
            color: '#9ba4ff',
            fontFamily: 'Arial, sans-serif',
        }).setOrigin(0.5);
    }

    // ── Game cards ────────────────────────────────────────────────────────────

    private createGameCards(): void {
        const progress = StorageManager.getProgress();

        CARD_DEFS.forEach((def, i) => {
            const record      = progress[def.progressKey];
            const earnedStars = Math.min(3, record.levelsCompleted);
            this.createCard(CARD_XS[i], CARD_Y, def, earnedStars);
        });
    }

    private createCard(cx: number, cy: number, def: CardDef, earnedStars: number): void {
        const container = this.add.container(cx, cy);

        // ── Background layers ────────────────────────────────────────────────
        const bg = this.add.graphics();

        // Outer raised shell
        bg.fillStyle(C.surfLow, 1);
        bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 22);

        // Inner body
        bg.fillStyle(C.surf, 1);
        bg.fillRoundedRect(5, 5, CARD_W - 10, CARD_H - 10, 18);

        // Bottom accent strip
        bg.fillStyle(def.accent, 0.5);
        bg.fillRect(5, CARD_H - 14, CARD_W - 10, 9);

        // Mask the accent strip's top corners so it blends into the inner body
        bg.fillStyle(C.surf, 1);
        bg.fillRect(5, CARD_H - 14, 9, 5);
        bg.fillRect(CARD_W - 14, CARD_H - 14, 9, 5);

        container.add(bg);

        // ── Icon area ────────────────────────────────────────────────────────
        const iconBg = this.add.graphics();
        iconBg.fillStyle(def.iconBg, 1);
        iconBg.fillRoundedRect(20, 20, 62, 62, 14);
        container.add(iconBg);

        container.add(
            this.add.text(51, 51, def.icon, { fontSize: '30px' }).setOrigin(0.5),
        );

        // ── Title ────────────────────────────────────────────────────────────
        container.add(
            this.add.text(20, 97, def.title, {
                fontSize:   '21px',
                fontStyle:  'bold',
                color:      '#e3e3ff',
                fontFamily: 'Arial Black, Arial, sans-serif',
            }),
        );

        // ── Skill label ───────────────────────────────────────────────────────
        const learnLabel = this.add.text(20, 130, 'Learn: ', {
            fontSize: '13px',
            color:    '#9ba4ff',
        });
        container.add(learnLabel);

        const accentCss = '#' + def.accent.toString(16).padStart(6, '0');
        container.add(
            this.add.text(20 + learnLabel.width, 130, def.skill, {
                fontSize:  '13px',
                fontStyle: 'bold',
                color:     accentCss,
            }),
        );

        // ── Stars ────────────────────────────────────────────────────────────
        for (let s = 0; s < 3; s++) {
            container.add(
                this.add.text(22 + s * 30, 158, '★', {
                    fontSize: '24px',
                    color:    s < earnedStars ? '#ffe483' : '#353e97',
                }),
            );
        }

        // ── Description ──────────────────────────────────────────────────────
        container.add(
            this.add.text(CARD_W / 2, 200, def.description, {
                fontSize:    '13px',
                color:       '#9ba4ff',
                align:       'center',
                lineSpacing: 4,
            }).setOrigin(0.5, 0),
        );

        // ── PLAY button ───────────────────────────────────────────────────────
        const btnTop    = CARD_H - 80;
        const btnW      = CARD_W - 44;
        const btnH      = 52;
        const btnLeft   = 22;
        const btnRadius = 14;

        // Shadow (3D cartoon offset)
        const btnShadow = this.add.graphics();
        btnShadow.fillStyle(def.btnShadow, 1);
        btnShadow.fillRoundedRect(btnLeft, btnTop + 5, btnW, btnH, btnRadius);
        container.add(btnShadow);

        // Face (redrawn on hover)
        const btnFace = this.add.graphics();
        const redrawBtn = (alpha: number) => {
            btnFace.clear();
            btnFace.fillStyle(def.accent, alpha);
            btnFace.fillRoundedRect(btnLeft, btnTop, btnW, btnH, btnRadius);
        };
        redrawBtn(1);
        container.add(btnFace);

        container.add(
            this.add.text(CARD_W / 2, btnTop + btnH / 2, '▶  PLAY', {
                fontSize:   '18px',
                fontStyle:  'bold',
                color:      def.btnTextColor,
                fontFamily: 'Arial Black, Arial, sans-serif',
            }).setOrigin(0.5),
        );

        // ── Hit zone (transparent, on top of everything) ──────────────────────
        const hitZone = this.add.rectangle(
            CARD_W / 2, CARD_H / 2,
            CARD_W,     CARD_H,
            0x000000, 0,
        ).setInteractive({ useHandCursor: true });
        container.add(hitZone);

        hitZone.on('pointerover', () => {
            this.tweens.killTweensOf(container);
            this.tweens.add({ targets: container, y: cy - 10, duration: 180, ease: 'Power2' });
            redrawBtn(0.82);
        });

        hitZone.on('pointerout', () => {
            this.tweens.killTweensOf(container);
            this.tweens.add({ targets: container, y: cy, duration: 180, ease: 'Power2' });
            redrawBtn(1);
        });

        hitZone.on('pointerdown', () => {
            this.scene.start(def.targetScene);
        });
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────

    private drawBottomNav(): void {
        const navY = 700;

        const g = this.add.graphics();

        // Nav background with rounded top
        g.fillStyle(C.bg, 0.92);
        g.fillRoundedRect(0, navY, 1024, 72, { tl: 28, tr: 28, bl: 0, br: 0 });

        // Faint top glow line
        g.fillStyle(C.primary, 0.12);
        g.fillRect(0, navY, 1024, 2);

        const tabs = [
            { x: 512 - 220, label: 'Home',     icon: '🏠', active: true  },
            { x: 512,       label: 'Progress', icon: '🚀', active: false },
            { x: 512 + 220, label: 'Settings', icon: '⚙️', active: false },
        ];

        for (const tab of tabs) {
            if (tab.active) {
                // Elevated lime circle for active tab
                const tg = this.add.graphics();
                tg.fillStyle(C.lime, 1);
                tg.fillCircle(tab.x, navY + 8, 30);

                this.add.text(tab.x, navY + 8,  tab.icon,  { fontSize: '18px' }).setOrigin(0.5);
                this.add.text(tab.x, navY + 44, tab.label, {
                    fontSize:   '11px',
                    fontStyle:  'bold',
                    color:      '#a3e635',
                    fontFamily: 'Arial, sans-serif',
                }).setOrigin(0.5);
            } else {
                this.add.text(tab.x, navY + 20, tab.icon,  { fontSize: '20px' }).setOrigin(0.5).setAlpha(0.5);
                this.add.text(tab.x, navY + 50, tab.label, {
                    fontSize:   '11px',
                    color:      '#9ba4ff',
                    fontFamily: 'Arial, sans-serif',
                }).setOrigin(0.5).setAlpha(0.5);
            }
        }
    }
}
