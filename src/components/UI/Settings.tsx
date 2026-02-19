import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { Camera, ChevronLeft, Check } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import type { WeaponType } from '../../store/useGameStore';

/** Draw a mini great sword preview on a canvas */
function drawSwordPreview(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI * 0.25); // Diagonal tilt

    const length = 60;

    // Blade
    ctx.beginPath();
    ctx.moveTo(8, -9);
    ctx.lineTo(length, 0);
    ctx.lineTo(8, 9);
    ctx.closePath();
    ctx.fillStyle = '#C8C8E8';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.fill(); ctx.stroke();

    // Fuller
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(length * 0.85, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Crossguard
    ctx.fillStyle = '#8888B0'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.fillRect(-2, -10, 12, 20); ctx.strokeRect(-2, -10, 12, 20);
    // Guard tips
    ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(-8, -13); ctx.lineTo(-2, -4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(-8, 13); ctx.lineTo(-2, 4); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Grip
    ctx.strokeStyle = '#5C3A1E'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-22, 0); ctx.stroke();

    // Grip wrapping
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    [-8, -13, -18].forEach(gx => {
        ctx.beginPath(); ctx.moveTo(gx, -4); ctx.lineTo(gx, 4); ctx.stroke();
    });

    // Pommel
    ctx.fillStyle = '#8888B0'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-22, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9B59B6';
    ctx.beginPath(); ctx.arc(-22, 0, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

/** Draw a mini flail/club preview on a canvas */
function drawClubPreview(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Origin at left side so handle is on left, chain extends right, ball in center
    // Canvas is 120x80. Place handle grip at (12, 40), ball around (90, 40)
    const hx = 12, hy = 40;

    // Handle
    ctx.strokeStyle = '#4E342E'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 28, hy - 6); ctx.stroke();

    // Chain links from handle tip toward ball
    const chainStartX = hx + 28, chainStartY = hy - 6;
    const ballX = 90, ballY = 38;
    const segments = 5;
    ctx.strokeStyle = '#9E9E9E'; ctx.lineWidth = 3;
    let lx = chainStartX, ly = chainStartY;
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const rx = chainStartX + (ballX - chainStartX) * t;
        const ry = chainStartY + (ballY - chainStartY) * t + Math.sin(t * Math.PI) * -10;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
        ctx.fillStyle = '#757575';
        ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2); ctx.fill();
        lx = rx; ly = ry;
    }

    // Ball — prominent, centered in canvas
    const ballR = 16;
    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(ballX + 3, ballY + ballR + 2, ballR * 0.8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Ball body
    const grad = ctx.createRadialGradient(ballX - 4, ballY - 4, 2, ballX, ballY, ballR);
    grad.addColorStop(0, '#546E7A');
    grad.addColorStop(1, '#1C313A');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Spikes
    ctx.fillStyle = '#78909C'; ctx.strokeStyle = '#263238'; ctx.lineWidth = 1.2;
    for (let s = 0; s < 8; s++) {
        ctx.save();
        ctx.translate(ballX, ballY);
        ctx.rotate(s * Math.PI * 2 / 8 + Math.PI / 8);
        ctx.beginPath();
        ctx.moveTo(ballR - 4, -7); ctx.lineTo(ballR + 12, 0); ctx.lineTo(ballR - 4, 7);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Shine dot
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(ballX - 5, ballY - 5, 4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

const WEAPONS: { type: WeaponType; label: string; subLabel: string; draw: (c: HTMLCanvasElement) => void }[] = [
    { type: 'sword', label: '대검', subLabel: 'Greatsword', draw: drawSwordPreview },
    { type: 'club', label: '철퇴', subLabel: 'Flail Club', draw: drawClubPreview },
];

const WeaponCard: React.FC<{
    w: typeof WEAPONS[0];
    selected: boolean;
    onSelect: () => void;
}> = ({ w, selected, onSelect }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) w.draw(canvasRef.current);
    }, [w]);

    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSelect}
            style={{
                cursor: 'pointer',
                position: 'relative',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                background: selected
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.3))'
                    : 'rgba(255,255,255,0.06)',
                border: selected ? '2px solid rgba(168,85,247,0.8)' : '2px solid rgba(255,255,255,0.1)',
                boxShadow: selected ? '0 0 20px rgba(168,85,247,0.4)' : 'none',
                transition: 'all 0.2s ease',
                minWidth: '120px',
            }}
        >
            {selected && (
                <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(168,85,247,0.8)', borderRadius: '50%',
                    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Check size={13} strokeWidth={3} color="white" />
                </div>
            )}
            <canvas
                ref={canvasRef}
                width={120}
                height={80}
                style={{ imageRendering: 'crisp-edges' }}
            />
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: selected ? '#D8B4FE' : 'white' }}>
                    {w.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {w.subLabel}
                </div>
            </div>
        </motion.div>
    );
};

export const Settings: React.FC = () => {
    const {
        faces, selectedFaceIndex, selectedWeapon,
        playerWidth, playerHeight,
        addFace, selectFace, setWeapon, setScreen,
        setPlayerWidth, setPlayerHeight,
        manualMobileControls, setManualMobileControls
    } = useGameStore();
    const webcamRef = useRef<Webcam>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const capture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            addFace(imageSrc);
            setIsCameraOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-4xl mx-auto overflow-y-auto">
            <div className="flex items-center gap-4 mb-6 md:mb-8">
                <button onClick={() => setScreen('menu')} className="btn-secondary p-2 rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-3xl md:text-4xl font-bold">Settings</h2>
            </div>

            {/* Weapon Selection */}
            <div className="glass-morphism p-4 md:p-6 mb-6">
                <h3 className="text-xl font-semibold mb-1">Weapon Selection</h3>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                    S/W키: 일반공격 &nbsp;|&nbsp; S/W키 3초 홀드 후 해제: 차지 어택
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {WEAPONS.map(w => (
                        <WeaponCard
                            key={w.type}
                            w={w}
                            selected={selectedWeapon === w.type}
                            onSelect={() => setWeapon(w.type)}
                        />
                    ))}
                </div>
            </div>

            {/* Player Dimensions */}
            <div className="glass-morphism p-4 md:p-6 mb-6">
                <h3 className="text-xl font-semibold mb-3">Player Dimensions (10px - 100px)</h3>
                <div className="flex gap-8">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-white/60 text-indigo-200">Width (px)</label>
                        <input
                            type="number"
                            min={10}
                            max={100}
                            value={playerWidth}
                            onChange={(e) => setPlayerWidth(Math.max(10, Math.min(100, parseInt(e.target.value) || 10)))}
                            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 w-32"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-white/60 text-indigo-200">Height (px)</label>
                        <input
                            type="number"
                            min={10}
                            max={100}
                            value={playerHeight}
                            onChange={(e) => setPlayerHeight(Math.max(10, Math.min(100, parseInt(e.target.value) || 10)))}
                            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 w-32"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Controls Toggle */}
            <div className="glass-morphism p-4 md:p-6 mb-6">
                <h3 className="text-xl font-semibold mb-3">Environment</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold">Manual Mobile Controls</p>
                        <p className="text-sm text-white/50">Show on-screen controls even on desktop</p>
                    </div>
                    <button
                        onClick={() => setManualMobileControls(!manualMobileControls)}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${manualMobileControls ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                            }`}
                    >
                        {manualMobileControls ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="glass-morphism p-4 md:p-6 flex flex-col items-center gap-4">
                    <h3 className="text-xl font-semibold mb-2">Register Face</h3>

                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20 flex items-center justify-center border-2 border-dashed border-white/20">
                        {isCameraOpen ? (
                            <>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                <button
                                    onClick={capture}
                                    className="absolute bottom-4 p-4 bg-primary rounded-full shadow-xl hover:scale-110 transition-transform"
                                >
                                    <Camera size={32} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsCameraOpen(true)}
                                className="btn-primary"
                            >
                                Open Camera
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-white/60 text-center">Capture your face to use on the character!</p>
                </div>

                <div className="glass-morphism p-4 md:p-6 flex flex-col gap-4">
                    <h3 className="text-xl font-semibold mb-2 text-center md:text-left">Select Your Hero ({faces.length}/10)</h3>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4 overflow-y-auto max-h-[250px] md:max-h-[300px] p-2">
                        {faces.map((face, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ scale: 1.05 }}
                                className="relative cursor-pointer flex justify-center"
                                onClick={() => selectFace(index)}
                            >
                                <img
                                    src={face}
                                    alt={`face ${index}`}
                                    className={`face-preview ${selectedFaceIndex === index ? 'selected' : ''}`}
                                />
                                {selectedFaceIndex === index && (
                                    <div className="absolute top-0 right-0 sm:-top-1 sm:-right-1 bg-accent text-dark p-1 rounded-full">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {faces.length === 0 && (
                            <div className="col-span-4 h-32 flex items-center justify-center text-white/20 border-2 border-dashed border-white/10 rounded-xl">
                                No faces registered
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

