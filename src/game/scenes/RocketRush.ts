import { Scene } from 'phaser';

/**
 * RocketRush — Left & right click rocket dodge game.
 * Stub scene — full implementation in Phase 5.
 */
export class RocketRush extends Scene {

    constructor() {
        super('RocketRush');
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
        this.add.text(512, 280, '🚀  Rocket Rush', {
            fontSize:   '42px',
            fontStyle:  'bold',
            color:      '#ff833f',
            fontFamily: 'Arial Black, Arial, sans-serif',
        }).setOrigin(0.5);

        this.add.text(512, 350, 'Left & Right Click — Coming Soon', {
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
        g.fillStyle(0x321000, 1);
        g.fillRoundedRect(362, 492, 300, 4, { bl: 14, br: 14, tl: 0, tr: 0 });

        const btn = this.add.text(512, 468, '← Back to Dashboard', {
            fontSize:  '18px',
            fontStyle: 'bold',
            color:     '#ff833f',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout',  () => btn.setColor('#ff833f'));
        btn.on('pointerdown', () => this.scene.start('Dashboard'));
    }
}
