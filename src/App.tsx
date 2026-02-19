import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { Menu } from './components/UI/Menu';
import { Settings } from './components/UI/Settings';
import { GameCanvas } from './components/Game/GameCanvas';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GAME_STRATEGY } from './components/Game/GameStrategy';

const { UI } = GAME_STRATEGY;


const VictoryView: React.FC = () => {
  const { stage, nextStage, setScreen } = useGameStore();

  useEffect(() => {
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#bb0000', '#ffffff']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#bb0000', '#ffffff']
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <motion.div
      key="victory"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col items-center justify-center gap-6 md:gap-8 bg-black/80"
    >
      <h2 className="responsive-header font-black text-accent">{UI.VICTORY_TITLE}</h2>
      <p className="text-xl md:text-2xl text-white/80">{UI.STAGE_CLEAR_MESSAGE(stage)}</p>
      {stage < GAME_STRATEGY.STAGE.TOTAL_STAGES ? (
        <button
          onClick={() => { nextStage(); setScreen('game'); }}
          className="btn-primary text-xl md:text-2xl px-8 md:px-12 py-4 md:py-6"
        >
          {UI.NEXT_STAGE_BUTTON}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl md:text-4xl text-white">{UI.ALL_CLEAR_MESSAGE}</p>
          <button onClick={() => setScreen('menu')} className="btn-primary">
            {UI.MAIN_MENU_BUTTON}
          </button>
        </div>
      )}
    </motion.div>

  );
};

const App: React.FC = () => {
  const { screen, setScreen, resetGame } = useGameStore();

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const playlist = ['/bgm_001.m4a', '/bgm_002.m4a', '/bgm_003.m4a'];
    const randomTrack = playlist[Math.floor(Math.random() * playlist.length)];
    const audio = new Audio(randomTrack);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

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
      ['click', 'mousedown', 'keydown', 'touchstart'].forEach(event => {
        window.removeEventListener(event, playAudio);
      });
    };
  }, [screen]);

  useEffect(() => {
    if (audioRef.current) {
      if (screen === 'menu') {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.log("Autoplay blocked", err));
      }
    }
  }, [screen]);

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
