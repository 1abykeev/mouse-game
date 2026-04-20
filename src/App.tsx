import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { launchGame, returnToDashboard } from './game/PhaserBridge';

export default function App() {
    const [activeGame, setActiveGame] = useState<string | null>(null);

    // Register the back-to-dashboard callback so Phaser scenes can call it
    useEffect(() => {
        (window as Window & { __MM_onBackToDashboard?: () => void })
            .__MM_onBackToDashboard = () => setActiveGame(null);
    }, []);

    // Start or stop the Phaser game when the active game changes
    useEffect(() => {
        if (activeGame) {
            // Wait one tick so the container div is visible before Phaser measures it
            const id = setTimeout(() => launchGame('game-container', activeGame), 0);
            return () => clearTimeout(id);
        } else {
            returnToDashboard();
        }
    }, [activeGame]);

    return (
        <>
            {/* React dashboard — unmounts when a game is active */}
            {!activeGame && <Dashboard onGameSelect={setActiveGame} />}

            {/* Phaser canvas host — always in the DOM so the Game instance persists */}
            <div
                id="game-container"
                style={{
                    display:         activeGame ? 'block' : 'none',
                    position:        'fixed',
                    inset:           0,
                    width:           '100%',
                    height:          '100%',
                    backgroundColor: '#000341',
                }}
            />
        </>
    );
}
