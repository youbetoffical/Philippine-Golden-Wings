/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Trophy, Clock, ExternalLink, RefreshCw } from "lucide-react";

// --- Constants ---
const COIN_SCORE = 10;
const INITIAL_FALL_SPEED = 3;
const SPEED_INCREMENT = 0.0005;
const SPAWN_RATE = 0.02; // Probability per frame
const BOMB_CHANCE = 0.3; // 30% of spawns are bombs
const COUNTDOWN_MINUTES = 15;

// --- Types ---
type GameObject = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "coin" | "bomb";
  speed: number;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_MINUTES * 60);
  
  // Game state refs to avoid re-renders during game loop
  const gameState = useRef({
    playerX: 0,
    objects: [] as GameObject[],
    score: 0,
    speedMultiplier: 1,
    lastTime: 0,
    isPaused: true, // Start paused
  });

  // --- Pixel Art Drawing Functions ---
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Dark Green Background
    ctx.fillStyle = "#064e3b"; // emerald-950
    ctx.fillRect(0, 0, width, height);

    // Grid effect (Subtle)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }

    // Draw some pixel trees in the background
    ctx.fillStyle = "#065f46"; // emerald-900
    const treeSpacing = 120;
    for (let i = 0; i < width + treeSpacing; i += treeSpacing) {
      const x = i - (gameState.current.speedMultiplier * 20 % treeSpacing);
      const y = height - 100;
      // Tree Trunk
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x + 20, y + 40, 10, 60);
      // Tree Leaves (Triangle/Pixel style)
      ctx.fillStyle = "#065f46";
      ctx.fillRect(x, y + 20, 50, 30);
      ctx.fillRect(x + 10, y, 30, 20);
    }
  };

  const drawEagle = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = "#8B4513"; // Brown body
    ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.6);
    
    ctx.fillStyle = "#FFFFFF"; // White head
    ctx.fillRect(x + w * 0.35, y, w * 0.3, h * 0.35);
    
    ctx.fillStyle = "#FFD700"; // Yellow beak
    ctx.fillRect(x + w * 0.6, y + h * 0.1, w * 0.15, h * 0.1);
    
    ctx.fillStyle = "#000000"; // Eye
    ctx.fillRect(x + w * 0.45, y + h * 0.1, w * 0.05, h * 0.05);
    
    ctx.fillStyle = "#A0522D"; // Wings
    ctx.fillRect(x, y + h * 0.4, w * 0.2, h * 0.4);
    ctx.fillRect(x + w * 0.8, y + h * 0.4, w * 0.2, h * 0.4);
  };

  const drawCoin = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#DAA520";
    ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.6);
  };

  const drawBomb = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y + size * 0.2, size, size * 0.8);
    ctx.fillRect(x + size * 0.2, y, size * 0.6, size * 0.2);
    
    // Fuse
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x + size * 0.45, y - size * 0.2, size * 0.1, size * 0.2);
    
    // Spark
    ctx.fillStyle = Math.random() > 0.5 ? "#FF4500" : "#FFFF00";
    ctx.fillRect(x + size * 0.4, y - size * 0.4, size * 0.2, size * 0.2);
  };

  // --- Game Loop ---
  const update = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background always draws
    drawBackground(ctx, canvas.width, canvas.height);

    if (gameState.current.isPaused) {
      // If not started, draw player in center
      if (!isStarted) {
        const playerWidth = 60;
        const playerHeight = 60;
        const playerY = canvas.height - playerHeight - 20;
        drawEagle(ctx, canvas.width / 2 - 30, playerY, playerWidth, playerHeight);
      }
      requestAnimationFrame(update);
      return;
    }

    // Speed increases every 50 points
    gameState.current.speedMultiplier = 1 + (Math.floor(gameState.current.score / 50) * 0.25);

    // Spawn Objects
    if (Math.random() < SPAWN_RATE) {
      const type = Math.random() < BOMB_CHANCE ? "bomb" : "coin";
      const size = 30;
      gameState.current.objects.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        type,
        speed: (INITIAL_FALL_SPEED + Math.random() * 2) * gameState.current.speedMultiplier,
      });
    }

    // Draw & Update Objects
    const playerWidth = 60;
    const playerHeight = 60;
    const playerY = canvas.height - playerHeight - 20;

    gameState.current.objects = gameState.current.objects.filter((obj) => {
      obj.y += obj.speed;

      // Collision Detection
      const hitX = gameState.current.playerX < obj.x + obj.width && gameState.current.playerX + playerWidth > obj.x;
      const hitY = playerY < obj.y + obj.height && playerY + playerHeight > obj.y;

      if (hitX && hitY) {
        if (obj.type === "coin") {
          gameState.current.score += COIN_SCORE;
          setScore(gameState.current.score);
          return false;
        } else {
          // Game Over
          gameState.current.isPaused = true;
          setIsGameOver(true);
          setShowModal(true);
          return false;
        }
      }

      // Draw
      if (obj.type === "coin") {
        drawCoin(ctx, obj.x, obj.y, obj.width);
      } else {
        drawBomb(ctx, obj.x, obj.y, obj.width);
      }

      return obj.y < canvas.height;
    });

    // Draw Player
    drawEagle(ctx, gameState.current.playerX, playerY, playerWidth, playerHeight);

    // Score Text (Top Center)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "16px 'Press Start 2P', cursive";
    ctx.textAlign = "center";
    ctx.fillText(`SCORE: ${gameState.current.score}`, canvas.width / 2, 40);

    requestAnimationFrame(update);
  }, [isStarted]);

  // --- Initialization & Controls ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameState.current.playerX = canvas.width / 2 - 30;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    const handleTouch = (e: TouchEvent | MouseEvent) => {
      if (gameState.current.isPaused) return;
      const x = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      gameState.current.playerX = Math.max(0, Math.min(canvas.width - 60, x - 30));
    };

    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("mousemove", handleTouch);

    requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("touchmove", handleTouch);
      canvas.removeEventListener("mousemove", handleTouch);
    };
  }, [update]);

  // --- Countdown Timer ---
  useEffect(() => {
    if (!isGameOver) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startGame = () => {
    setIsStarted(true);
    gameState.current.isPaused = false;
  };

  const resetGame = () => {
    gameState.current = {
      playerX: canvasRef.current ? canvasRef.current.width / 2 - 30 : 0,
      objects: [],
      score: 0,
      speedMultiplier: 1,
      lastTime: 0,
      isPaused: false,
    };
    setScore(0);
    setIsGameOver(false);
    setShowModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden touch-none select-none font-pixel">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Start Screen */}
      <AnimatePresence>
        {!isStarted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase italic leading-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                Philippine<br />Golden Wings
              </h1>
              <p className="text-zinc-400 text-[10px] mb-12 uppercase tracking-[0.2em]">
                Catch Coins • Avoid Bombs
              </p>
              
              <button
                onClick={startGame}
                className="group relative inline-flex items-center justify-center px-12 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-none border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 transition-all uppercase text-xl"
              >
                <span className="relative z-10">START GAME</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <div className="mt-12 text-zinc-500 text-[8px] uppercase tracking-widest animate-pulse">
                Slide to move eagle
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-zinc-900 border-4 border-blue-600 p-8 text-center shadow-[0_0_20px_rgba(37,99,235,0.5)]"
            >
              <h2 className="text-2xl font-black text-red-500 mb-6 tracking-tighter uppercase italic leading-tight">
                GAME OVER!
              </h2>
              
              <div className="flex flex-col items-center justify-center gap-2 text-zinc-400 mb-8">
                <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
                <span className="text-sm uppercase tracking-widest">Final Score</span>
                <span className="text-3xl text-white font-bold">{score}</span>
              </div>

              <div className="bg-zinc-800 p-6 rounded-none mb-8 border-2 border-zinc-700">
                <p className="text-blue-400 font-bold mb-4 text-[10px] uppercase tracking-widest">Limited Time Reward</p>
                <h3 className="text-sm text-white font-bold mb-4 leading-relaxed uppercase">
                  CONGRATULATIONS!<br />
                  YOU'VE WON <span className="text-yellow-400">$88</span> BONUS!
                </h3>

                {/* Copyable Discount Code */}
                <div className="mb-6">
                  <p className="text-[8px] text-zinc-500 uppercase mb-2">Your Discount Code</p>
                  <div className="flex items-center gap-2 bg-black p-2 border border-zinc-700">
                    <span className="text-xs text-yellow-400 font-bold flex-1">PANALO88</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("PANALO88");
                        const btn = document.getElementById('copy-btn-react');
                        if (btn) {
                          const originalText = btn.innerText;
                          btn.innerText = 'COPIED!';
                          btn.classList.add('bg-green-600');
                          setTimeout(() => {
                            btn.innerText = originalText;
                            btn.classList.remove('bg-green-600');
                          }, 2000);
                        }
                      }}
                      id="copy-btn-react"
                      className="bg-zinc-800 hover:bg-zinc-700 text-[8px] px-2 py-1 text-white uppercase border border-zinc-600 active:scale-95 transition-transform"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-3 text-red-400 font-bold text-xl">
                  <Clock className="w-5 h-5 animate-pulse" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <a
                  href="https://www.lottopanalo.com/?referral=bb47856"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-4 rounded-none border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all uppercase text-xs"
                >
                  REGISTER TO CLAIM
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={resetGame}
                  className="flex items-center justify-center gap-2 w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-bold py-3 px-4 rounded-none border-b-4 border-zinc-800 active:border-b-0 active:translate-y-1 transition-all uppercase text-[10px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  PLAY AGAIN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD for Score (Mobile) */}
      {!isGameOver && (
        <div className="absolute top-4 left-4 text-white/30 text-[8px] uppercase tracking-widest pointer-events-none">
          Philippine Golden Wings
        </div>
      )}
    </div>
  );
}
