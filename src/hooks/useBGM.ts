import { useEffect, useMemo, useRef } from 'react';

const BGM_PLAYLIST = ['/bgm_001.ogg', '/bgm_002.ogg', '/bgm_003.ogg', '/bgm_004.ogg', '/bgm_005.ogg'];

/**
 * Manages background music playback with shuffle and auto-advance.
 * Pauses when `shouldPlay` is false (e.g., on the menu screen).
 */
export function useBGM(shouldPlay: boolean): void {
    const playlist = useMemo(() => BGM_PLAYLIST, []);
    const shuffledRef = useRef<string[]>([]);
    const currentIndexRef = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        shuffledRef.current = [...playlist].sort(() => Math.random() - 0.5);

        const audio = new Audio(shuffledRef.current[0]);
        audio.volume = 0.5;
        audioRef.current = audio;

        const playNext = () => {
            currentIndexRef.current = (currentIndexRef.current + 1) % shuffledRef.current.length;
            audio.src = shuffledRef.current[currentIndexRef.current];
            audio.play().catch(() => {});
        };

        audio.addEventListener('ended', playNext);

        const playAudio = () => {
            audio.play().catch(() => {});
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
            if (shouldPlay) {
                audioRef.current.play().catch(() => {});
            } else {
                audioRef.current.pause();
            }
        }
    }, [shouldPlay]);
}
