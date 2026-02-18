import React from 'react';
import { useGameStore } from './store/useGameStore';
import { Menu } from './components/UI/Menu';
import { Settings } from './components/UI/Settings';
import { GameCanvas } from './components/Game/GameCanvas';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const { screen, setScreen, resetGame, nextStage, stage } = useGameStore();

  return (
    <div className="h-screen w-screen overflow-hidden bg-dark">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
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
            className="h-full"
          >
            <Settings />
          </motion.div>
        )}

        {screen === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
          >
            <GameCanvas />
          </motion.div>
        )}

        {screen === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center gap-8 bg-black/80"
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
            className="h-full flex flex-col items-center justify-center gap-8 bg-black/80"
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
  );
};

export default App;
