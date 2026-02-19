import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { HUD } from './HUD';

interface MobileControlsProps {
    setKey: (code: string, isPressed: boolean) => void;
}

const Joystick = ({ onMove }: { onMove: (x: number, y: number) => void }) => {
    const [dragging, setDragging] = useState(false);
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleStart = (e: React.PointerEvent) => {
        setDragging(true);
        handleUpdate(e);
    };

    const handleUpdate = (e: React.PointerEvent | PointerEvent) => {
        if (!dragging && e.type !== 'pointerdown') return;
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxDist = rect.width / 2;

        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        setKnobPos({ x: dx, y: dy });
        onMove(dx / maxDist, dy / maxDist);
    };

    const handleEnd = () => {
        setDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
    };

    useEffect(() => {
        const up = () => handleEnd();
        const move = (e: PointerEvent) => dragging && handleUpdate(e);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointermove', move);
        return () => {
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointermove', move);
        };
    }, [dragging]);

    return (
        <div
            ref={containerRef}
            className="joystick-base"
            onPointerDown={handleStart}
        >
            <div
                className="joystick-knob"
                style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
            />
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

        // Vertical (Jump)
        if (y < -0.5) {
            setKey('ArrowUp', true);
        } else {
            setKey('ArrowUp', false);
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
                {/* Left: Joystick */}
                <div className="left-controls">
                    <Joystick onMove={handleJoystick} />
                </div>

                {/* Right Bottom: Unified HUD with Integrated Action Buttons */}
                <HUD onHandlePress={handlePress} aCharged={aCharged} />
            </div>
        </>
    );
};
