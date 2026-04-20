import { StorageManager } from '../game/systems/StorageManager';

// ─── Game card definitions ────────────────────────────────────────────────────

interface GameDef {
    sceneKey:        string;
    title:           string;
    skill:           string;
    description:     string;
    iconName:        string;
    iconBg:          string;
    iconColor:       string;
    cardBorderBase:  string;
    cardBorderHover: string;
    btnBg:           string;
    btnShadow:       string;
    btnText:         string;
    skillColor:      string;
    progressKey:     'dragonDrop' | 'shapeFinder' | 'rocketRush';
}

const GAMES: GameDef[] = [
    {
        sceneKey:        'DragonDrop',
        title:           'Dragon Drop',
        skill:           'Click & Drag',
        description:     'Navigate your mouse through the galaxy maze!',
        iconName:        'pets',
        iconBg:          'bg-secondary-container',
        iconColor:       'text-secondary',
        cardBorderBase:  'border-secondary/20',
        cardBorderHover: 'group-hover:border-secondary',
        btnBg:           'bg-secondary',
        btnShadow:       'shadow-[0_4px_0_#006832]',
        btnText:         'text-on-secondary-fixed',
        skillColor:      'text-secondary',
        progressKey:     'dragonDrop',
    },
    {
        sceneKey:        'ShapeFinder',
        title:           'Shape Finder',
        skill:           'Double Click',
        description:     'Double-click the correct shape before time runs out!',
        iconName:        'category',
        iconBg:          'bg-primary-container',
        iconColor:       'text-on-primary-container',
        cardBorderBase:  'border-primary/20',
        cardBorderHover: 'group-hover:border-primary',
        btnBg:           'bg-primary',
        btnShadow:       'shadow-[0_4px_0_#645300]',
        btnText:         'text-on-primary',
        skillColor:      'text-primary',
        progressKey:     'shapeFinder',
    },
    {
        sceneKey:        'RocketRush',
        title:           'Rocket Rush',
        skill:           'Left & Right Click',
        description:     'Use left & right click to dodge asteroids in space!',
        iconName:        'rocket_launch',
        iconBg:          'bg-tertiary-container',
        iconColor:       'text-on-tertiary-container',
        cardBorderBase:  'border-tertiary/20',
        cardBorderHover: 'group-hover:border-tertiary',
        btnBg:           'bg-tertiary',
        btnShadow:       'shadow-[0_4px_0_#321000]',
        btnText:         'text-on-tertiary-container',
        skillColor:      'text-tertiary',
        progressKey:     'rocketRush',
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
    return (
        <div className="flex items-center gap-1 mb-4">
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className={`material-symbols-outlined text-lg ${i < count ? 'text-primary' : 'text-outline-variant'}`}
                    style={i < count ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                    star
                </span>
            ))}
        </div>
    );
}

function GameCard({ game, stars, onPlay }: { game: GameDef; stars: number; onPlay: () => void }) {
    return (
        <div className="group relative bg-surface-container-low rounded-lg p-1 transition-all duration-300 hover:-translate-y-2 cursor-pointer">
            <div
                className={`
                    bg-surface-container rounded-[1.8rem] p-5 h-full flex flex-col
                    border-b-4 ${game.cardBorderBase} ${game.cardBorderHover} transition-colors
                `}
            >
                {/* Icon */}
                <div className={`w-12 h-12 ${game.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <span className={`material-symbols-outlined ${game.iconColor}`}
                          style={{ fontSize: '1.5rem' }}>
                        {game.iconName}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold font-headline mb-1 text-on-surface">{game.title}</h3>

                {/* Skill */}
                <p className="text-on-surface-variant text-xs mb-3">
                    Learn:{' '}
                    <span className={`${game.skillColor} font-bold`}>{game.skill}</span>
                </p>

                {/* Stars */}
                <StarRow count={stars} />

                {/* Description */}
                <p className="text-on-surface-variant text-xs mb-3 flex-1">{game.description}</p>

                {/* PLAY button */}
                <div className="mt-auto">
                    <button
                        onClick={onPlay}
                        className={`
                            w-full py-4 ${game.btnBg} ${game.btnText} ${game.btnShadow}
                            font-headline font-black text-xl rounded-xl
                            active:translate-y-1 active:shadow-none
                            transition-all duration-150
                            flex items-center justify-center gap-2
                            group-hover:brightness-110
                        `}
                    >
                        PLAY
                        <span className="material-symbols-outlined">play_arrow</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface Props {
    onGameSelect: (sceneKey: string) => void;
}

export default function Dashboard({ onGameSelect }: Props) {
    const progress    = StorageManager.getProgress();
    const { total }   = StorageManager.getTotalStars();
    const getStars    = (key: GameDef['progressKey']) =>
        Math.min(3, progress[key].levelsCompleted);

    return (
        <div className="bg-background text-on-background min-h-screen font-body selection:bg-primary selection:text-on-primary">

            {/* ── Header ────────────────────────────────────────────────── */}
            <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-background/60 backdrop-blur-xl rounded-b-3xl shadow-[0_10px_30px_rgba(255,228,131,0.1)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container shadow-lg">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>mouse</span>
                    </div>
                    <h1 className="text-2xl font-black text-primary uppercase tracking-wide font-headline">
                        Mouse Masters
                    </h1>
                </div>

                {/* Total stars badge */}
                <div className="bg-surface-container-high rounded-full px-4 py-1.5 flex items-center gap-1.5">
                    <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                    >
                        star
                    </span>
                    <span className="text-primary font-bold text-sm font-headline">{total}</span>
                </div>
            </header>

            {/* ── Main ──────────────────────────────────────────────────── */}
            <main className="pt-24 pb-28 px-6 max-w-5xl mx-auto relative overflow-hidden">
                {/* Background accent blobs */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="absolute bottom-20 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

                {/* Compact hero — title + subtitle only, no image */}
                <section className="text-center mb-8">
                    <h2 className="text-3xl font-black text-primary mb-2 font-headline uppercase tracking-tight text-glow">
                        Galactic Playground
                    </h2>
                    <p className="text-base text-on-surface-variant font-medium">
                        Learn to use your mouse while having fun!
                    </p>
                </section>

                {/* Game cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {GAMES.map(game => (
                        <GameCard
                            key={game.sceneKey}
                            game={game}
                            stars={getStars(game.progressKey)}
                            onPlay={() => onGameSelect(game.sceneKey)}
                        />
                    ))}
                </div>
            </main>

            {/* ── Bottom nav ────────────────────────────────────────────── */}
            <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-8 pb-4 bg-background/80 backdrop-blur-2xl rounded-t-[3rem] h-24 shadow-[0_-10px_40px_rgba(0,3,65,0.5)]">
                {/* Home — active */}
                <a
                    href="#"
                    className="flex flex-col items-center justify-center bg-lime-400 text-[#000341] rounded-full p-4 -translate-y-4 shadow-[0_0_20px_rgba(163,230,53,0.6)] active:scale-90 transition-transform duration-200"
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                    <span className="font-bold text-xs font-body">Home</span>
                </a>

                {/* Progress — inactive */}
                <a href="#" className="flex flex-col items-center justify-center text-white/60 p-2 hover:text-white transition-colors active:scale-90">
                    <span className="material-symbols-outlined">rocket_launch</span>
                    <span className="font-bold text-xs font-body">Progress</span>
                </a>

                {/* Settings — inactive */}
                <a href="#" className="flex flex-col items-center justify-center text-white/60 p-2 hover:text-white transition-colors active:scale-90">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="font-bold text-xs font-body">Settings</span>
                </a>
            </nav>

            {/* Mobile FAB */}
            <button className="fixed bottom-32 right-6 w-16 h-16 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(253,212,0,0.4)] md:hidden active:scale-90 transition-transform z-40">
                <span className="material-symbols-outlined scale-150">rocket</span>
            </button>
        </div>
    );
}
