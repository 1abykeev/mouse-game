import { Scene } from 'phaser';

/** Minimal first scene — dark background, does nothing. Active while no game is running. */
export class IdleScene extends Scene {
    constructor() {
        super({ key: 'Idle' });
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x000341);
    }
}
