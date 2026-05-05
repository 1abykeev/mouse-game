/**
 * PhaserBridge
 *
 * Manages the single Phaser Game instance for the hybrid React + Phaser app.
 *
 * React calls launchGame() → canvas becomes active for that scene.
 * Phaser scenes call returnToDashboard() → canvas idles, React dashboard re-mounts.
 */

import { Game, AUTO, Scale } from 'phaser';
import { IdleScene }    from './scenes/IdleScene';
import { DragonDrop }  from './scenes/DragonDrop';
import { ShapeFinder } from './scenes/ShapeFinder';
import { RocketRush }  from './scenes/RocketRush';
import { FishingGame } from './scenes/FishingGame';

let game: Game | null = null;
let pendingScene: string | null = null;

function createGame(containerId: string): Game {
    return new Game({
        type:            AUTO,
        parent:          containerId,
        width:           1024,
        height:          768,
        backgroundColor: '#000341',
        scale: {
            mode:       Scale.FIT,
            autoCenter: Scale.CENTER_BOTH,
        },
        // IdleScene is first → starts automatically on boot (blank dark canvas)
        scene: [IdleScene, DragonDrop, ShapeFinder, RocketRush, FishingGame],
    });
}

/** Called by React when the player presses PLAY on a card. */
export function launchGame(containerId: string, sceneKey: string): void {
    if (!game) {
        pendingScene = sceneKey;
        game = createGame(containerId);
        // After Phaser finishes booting, switch from IdleScene to the real game
        game.events.once('ready', () => {
            if (pendingScene) {
                game!.scene.stop('Idle');
                game!.scene.start(pendingScene);
                pendingScene = null;
            }
        });
        return;
    }

    // Game already exists — stop whatever is running and start the new scene
    game.scene.getScenes(true).forEach(s => game!.scene.stop(s.scene.key));
    game.scene.start(sceneKey);
}

/** Called by Phaser scenes when the player presses "Back to Dashboard". */
export function returnToDashboard(): void {
    if (game) {
        game.scene.getScenes(true).forEach(s => game!.scene.stop(s.scene.key));
        game.scene.start('Idle');
    }
    // Notify React to re-show the dashboard
    (window as Window & { __MM_onBackToDashboard?: () => void })
        .__MM_onBackToDashboard?.();
}
