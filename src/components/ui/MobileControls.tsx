import React from 'react';

interface MobileControlsProps {
    setKey: (code: string, isPressed: boolean) => void;
}

const Button = ({ code, label, className = "", onHandlePress }: { code: string, label: React.ReactNode, className?: string, onHandlePress: (code: string, isPressed: boolean) => void }) => (
    <button
        onPointerDown={(e) => { e.preventDefault(); onHandlePress(code, true); }}
        onPointerUp={(e) => { e.preventDefault(); onHandlePress(code, false); }}
        onPointerCancel={(e) => { e.preventDefault(); onHandlePress(code, false); }}
        onContextMenu={(e) => e.preventDefault()}
        className={`control-btn ${className}`}
    >
        {label}
    </button>
);

export const MobileControls: React.FC<MobileControlsProps> = ({ setKey }) => {
    const handlePress = (code: string, isPressed: boolean) => {
        setKey(code, isPressed);

        // Add haptic feedback if available
        if (isPressed && window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    };

    return (
        <div className="mobile-controls">
            {/* D-Pad */}
            <div className="d-pad">
                <div />
                <Button code="ArrowUp" label="▲" onHandlePress={handlePress} />
                <div />
                <Button code="ArrowLeft" label="◀" onHandlePress={handlePress} />
                <Button code="ArrowDown" label="▼" onHandlePress={handlePress} />
                <Button code="ArrowRight" label="▶" onHandlePress={handlePress} />
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                <Button code="Space" label="A" className="btn-a" onHandlePress={handlePress} />
                <Button code="KeyS" label="S" className="btn-s" onHandlePress={handlePress} />
            </div>
        </div>
    );
};
