import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { Menu } from './components/UI/Menu';
import { Settings } from './components/UI/Settings';
import { GameCanvas } from './components/Game/GameCanvas';
import { motion, AnimatePresence } from 'framer-motion';
import { GAME_STRATEGY } from './components/Game/GameStrategy';

const { UI } = GAME_STRATEGY;


const VictoryView: React.FC = () => {
  const { stage, nextStage, setScreen, resetGame } = useGameStore();

  return (
    <motion.div
      key="victory"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-full flex flex-col items-center justify-center gap-6 md:gap-8 bg-black/80 backdrop-blur-md"
    >
      <div className="relative z-10 flex flex-col items-center gap-6 md:gap-8 p-10 glass-morphism shadow-2xl">
        <h2 className="responsive-header font-black text-accent drop-shadow-[0_5px_15px_rgba(249,212,35,0.4)]">{UI.VICTORY_TITLE}</h2>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xl md:text-3xl text-white font-bold tracking-wider">{UI.STAGE_CLEAR_MESSAGE(stage)}</p>
          <div className="w-24 h-1 bg-accent rounded-full mt-2 animate-bounce" />
        </div>

        {stage < GAME_STRATEGY.STAGE.TOTAL_STAGES ? (
          <button
            onClick={() => { nextStage(); setScreen('game'); }}
            className="btn-primary text-xl md:text-2xl px-10 md:px-14 py-4 md:py-6 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 transform"
          >
            {UI.NEXT_STAGE_BUTTON}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <p className="text-2xl md:text-5xl text-white font-black animate-pulse drop-shadow-lg">{UI.ALL_CLEAR_MESSAGE}</p>
            <button
              onClick={() => { resetGame(); setScreen('menu'); }}
              className="btn-primary px-12 py-5 text-xl font-bold shadow-xl hover:scale-105 transition-transform"
            >
              {UI.MAIN_MENU_BUTTON}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const App: React.FC = () => {
  const { screen, setScreen, resetGame } = useGameStore();

  const playlist = React.useMemo(() => ['/bgm_001.ogg', '/bgm_002.ogg', '/bgm_003.ogg', '/bgm_004.ogg', '/bgm_005.ogg'], []);
  const shuffledRef = React.useRef<string[]>([]);
  const currentIndexRef = React.useRef(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Shuffle playlist on start
    shuffledRef.current = [...playlist].sort(() => Math.random() - 0.5);

    const audio = new Audio(shuffledRef.current[0]);
    audio.volume = 0.5;
    audioRef.current = audio;

    const playNext = () => {
      currentIndexRef.current = (currentIndexRef.current + 1) % shuffledRef.current.length;
      audio.src = shuffledRef.current[currentIndexRef.current];
      audio.play().catch(err => console.log("Next track play blocked", err));
    };

    audio.addEventListener('ended', playNext);

    const playAudio = () => {
      if (screen !== 'menu') {
        audio.play().catch(err => console.log("Autoplay blocked, waiting for interaction", err));
      }
      ['click', 'mousedown', 'keydown', 'touchstart'].forEach(event => {
        window.removeEventListener(event, playAudio);
      });
    };

    ['click', 'mousedown', 'keydown', 'touchstart'].forEach(event => {
      window.addEventListener(event, playAudio);
    });

    return () => {
      audio.pause();
      audio.removeEventListener('ended', playNext);
      ['click', 'mousedown', 'keydown', 'touchstart'].forEach(event => {
        window.removeEventListener(event, playAudio);
      });
    };
  }, [playlist]);

  useEffect(() => {
    if (audioRef.current) {
      if (screen === 'menu') {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.log("Autoplay blocked", err));
      }
    }
  }, [screen]);

  // Mobile Detection
  const { setIsMobile } = useGameStore();
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const isSmall = window.innerWidth <= 1024;
      setIsMobile(isTouch || isSmall);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-dark">
      <div className="background-overlay" />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          {screen === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center"
            >
              <Menu />
            </motion.div>
          )}

          {screen === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full h-full flex items-center justify-center"
            >
              <Settings />
            </motion.div>
          )}

          {screen === 'game' && (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full flex items-center justify-center"
            >
              {/* GameCanvas component is assumed to render its own canvas with the 'game-canvas' class internally */}
              <GameCanvas />
            </motion.div>
          )}

          {screen === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col items-center justify-center gap-6 md:gap-8 bg-black/80"
            >
              <h2 className="text-5xl md:text-8xl font-black text-primary">{UI.GAME_OVER_TITLE}</h2>
              <button onClick={() => resetGame()} className="btn-primary text-xl md:text-2xl px-8 md:px-12 py-4 md:py-6">
                {UI.RETRY_BUTTON}
              </button>
              <button onClick={() => setScreen('menu')} className="btn-secondary">
                {UI.MAIN_MENU_BUTTON}
              </button>
            </motion.div>
          )}


          {screen === 'victory' && (
            <VictoryView />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
