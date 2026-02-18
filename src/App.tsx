import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { Menu } from './components/UI/Menu';
import { Settings } from './components/UI/Settings';
import { GameCanvas } from './components/Game/GameCanvas';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const { screen, setScreen, resetGame, nextStage, stage } = useGameStore();

  useEffect(() => {
    const audio = new Audio('/bgm_001.m4a');
    audio.loop = true;
    audio.volume = 0.5;

    const playAudio = () => {
      audio.play().catch(err => console.log("Autoplay blocked, waiting for interaction", err));
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
  }, []);

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
              className="w-full h-full flex flex-col items-center justify-center gap-8 bg-black/80"
            >
              <h2 className="text-8xl font-black text-primary">GAME OVER</h2>
              <button onClick={() => resetGame()} className="btn-primary text-2xl px-12 py-6">
                RETRY
              </button>
              <button onClick={() => setScreen('menu')} className="btn-secondary">
                MAIN MENU
              </button>
            </motion.div>
          )}

          {screen === 'victory' && (
            <motion.div
              key="victory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col items-center justify-center gap-8 bg-black/80"
            >
              <h2 className="text-8xl font-black text-accent">VICTORY!</h2>
              <p className="text-2xl text-white/80">Stage {stage} Cleared!</p>
              {stage < 3 ? (
                <button
                  onClick={() => { nextStage(); setScreen('game'); }}
                  className="btn-primary text-2xl px-12 py-6"
                >
                  NEXT STAGE
                </button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-4xl text-white">All Stages Conquered!</p>
                  <button onClick={() => setScreen('menu')} className="btn-primary">
                    MAIN MENU
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
