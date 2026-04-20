import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Dashboard } from './scenes/Dashboard';
import { DragonDrop } from './scenes/DragonDrop';
import { ShapeFinder } from './scenes/ShapeFinder';
import { RocketRush } from './scenes/RocketRush';
import { GameOver } from './scenes/GameOver';
import { AUTO, Game, Scale } from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#000341',
    scale: {
        mode:       Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [
        Boot,
        Preloader,
        Dashboard,
        DragonDrop,
        ShapeFinder,
        RocketRush,
        GameOver,
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
