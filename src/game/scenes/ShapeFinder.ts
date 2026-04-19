import { Scene } from 'phaser';

/**
 * ShapeFinder — Double-click shape matching game.
 * Stub scene — full implementation in Phase 4.
 */
export class ShapeFinder extends Scene {

    constructor() {
        super('ShapeFinder');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x000341);

        // Starfield background
        const gfx = this.add.graphics();
        for (let i = 0; i < 120; i++) {
            gfx.fillStyle(0xffffff, 0.2 + Math.random() * 0.7);
            gfx.fillCircle(
                Math.floor(Math.random() * 1024),
                Math.floor(Math.random() * 768),
                0.5 + Math.random() * 1.5,
            );
        }

        // Title
        this.add.text(512, 280, '🔷  Shape Finder', {
            fontSize:   '42px',
            fontStyle:  'bold',
            color:      '#ffe483',
            fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5);

        this.add.text(512, 350, 'Double Click — Coming Soon', {
            fontSize: '20px',
            color:    '#9ba4ff',
        }).setOrigin(0.5);

        // Back button
        this.makeBackButton();
    }

    private makeBackButton(): void {
        const g = this.add.graphics();
        g.fillStyle(0x000662, 1);
        g.fillRoundedRect(362, 440, 300, 56, 14);
        g.fillStyle(0x645300, 1);
        g.fillRoundedRect(362, 492, 300, 4, { bl: 14, br: 14, tl: 0, tr: 0 });

        const btn = this.add.text(512, 468, '← Back to Dashboard', {
            fontSize:  '18px',
            fontStyle: 'bold',
            color:     '#ffe483',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout',  () => btn.setColor('#ffe483'));
        btn.on('pointerdown', () => this.scene.start('Dashboard'));
    }
}
