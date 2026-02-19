import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { HUD } from './HUD';

interface MobileControlsProps {
    setKey: (code: string, isPressed: boolean) => void;
}

const FloatingJoystick = ({ onMove }: { onMove: (x: number, y: number) => void }) => {
    const [active, setActive] = useState(false);
    const [basePos, setBasePos] = useState({ x: 0, y: 0 });
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const areaRef = useRef<HTMLDivElement>(null);

    const handleStart = (e: React.PointerEvent) => {
        e.preventDefault();
        const x = e.clientX;
        const y = e.clientY;
        setBasePos({ x, y });
        setKnobPos({ x: 0, y: 0 });
        setActive(true);
    };

    const handleUpdate = (e: PointerEvent) => {
        if (!active) return;

        const dx = e.clientX - basePos.x;
        const dy = e.clientY - basePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Define max radius for the knob (clamp(100px, 20vw, 150px) / 2)
        const maxDist = Math.min(Math.max(window.innerWidth * 0.2, 100), 150) / 2;

        let limitedX = dx;
        let limitedY = dy;

        if (dist > maxDist) {
            limitedX = (dx / dist) * maxDist;
            limitedY = (dy / dist) * maxDist;
        }

        setKnobPos({ x: limitedX, y: limitedY });
        onMove(limitedX / maxDist, limitedY / maxDist);
    };

    const handleEnd = () => {
        setActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
    };

    useEffect(() => {
        const move = (e: PointerEvent) => handleUpdate(e);
        const up = () => handleEnd();
        if (active) {
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        }
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
    }, [active, basePos]);

    return (
        <div
            ref={areaRef}
            className="joystick-area"
            onPointerDown={handleStart}
            onContextMenu={(e) => e.preventDefault()}
        >
            {active && (
                <div
                    className="joystick-base"
                    style={{ left: basePos.x, top: basePos.y }}
                >
                    <div
                        className="joystick-knob"
                        style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
                    />
                </div>
            )}
        </div>
    );
};

export const MobileControls: React.FC<MobileControlsProps> = ({ setKey }) => {
    const aCharged = useGameStore(s => s.aCharged);
    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    useEffect(() => {
        const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        window.addEventListener('resize', handleResize);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('fullscreenchange', handleFsChange);
        };
    }, []);

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handlePress = (code: string, isPressed: boolean) => {
        setKey(code, isPressed);
        if (isPressed && window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    };

    const handleJoystick = (x: number, y: number) => {
        const threshold = 0.3;
        // Horizontal
        if (x < -threshold) {
            setKey('ArrowLeft', true);
            setKey('ArrowRight', false);
        } else if (x > threshold) {
            setKey('ArrowRight', true);
            setKey('ArrowLeft', false);
        } else {
            setKey('ArrowLeft', false);
            setKey('ArrowRight', false);
        }

        // Vertical (Jump & Crouch)
        if (y < -0.5) {
            setKey('ArrowUp', true);
            setKey('ArrowDown', false);
        } else if (y > 0.5) {
            setKey('ArrowDown', true);
            setKey('ArrowUp', false);
        } else {
            setKey('ArrowUp', false);
            setKey('ArrowDown', false);
        }
    };

    return (
        <>
            {isPortrait && (
                <div className="portrait-warning">
                    <div className="warning-content">
                        <span>📱</span>
                        <p>Better in Landscape!</p>
                    </div>
                </div>
            )}

            <button className="fs-toggle" onClick={handleFullscreen}>
                {isFullscreen ? 'EXIT FS' : 'FULLSCREEN'}
            </button>

            <div className="mobile-controls">
                {/* Left: Dynamic Floating Joystick Area */}
                <FloatingJoystick onMove={handleJoystick} />

                {/* Right Bottom: Unified HUD with Integrated Action Buttons */}
                <HUD onHandlePress={handlePress} aCharged={aCharged} />
            </div>
        </>
    );
};
