/**
 * soundManager.ts
 * Web Audio API 기반 타격음 생성기 (외부 파일 없이 프로그래매틱하게 생성)
 * "퍽", "푹", "으악" 스타일 효과음
 */

// ─────────────────────────────────────────────
// AudioContext 관리
// ─────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    try {
        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        // suspended 상태면 resume 시도 (비동기지만 즉시 호출)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => { });
        }
        // running 상태가 아니면 소리 재생 불가 — null 반환하지 않고 시도는 계속
        return audioCtx;
    } catch (_) {
        return null;
    }
}

/** 사운드를 재생하기 위해 AudioContext를 활성화
 *  브라우저 자동재생 정책: 사용자 인터랙션 이벤트 핸들러에서 호출해야 효과적임 */
export function resumeAudio() {
    try {
        if (!audioCtx) {
            // 첫 상호작용에서 Context 생성 (이게 가장 안전한 시점)
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtx.state !== 'running') {
            audioCtx.resume().catch(() => { });
        }
    } catch (_) { }
}

// ─────────────────────────────────────────────
// 재생 쿨다운 (프레임당 사운드 폭발 방지)
// ─────────────────────────────────────────────
const lastPlay: Record<string, number> = {};

function canPlay(key: string, minIntervalMs = 80): boolean {
    const now = Date.now();
    if ((now - (lastPlay[key] || 0)) < minIntervalMs) return false;
    lastPlay[key] = now;
    return true;
}

// ─────────────────────────────────────────────
// 공통 마스터 게인 (전체 볼륨 조절용)
// ─────────────────────────────────────────────
function getMaster(ctx: AudioContext): GainNode {
    // ctx에 _master 속성을 캐시
    const c = ctx as any;
    if (!c._master) {
        const g = ctx.createGain();
        g.gain.value = 0.8;
        g.connect(ctx.destination);
        c._master = g;
    }
    return c._master as GainNode;
}

// ─────────────────────────────────────────────
// 1. 퍽! — 클럽/검으로 몬스터를 타격할 때
// ─────────────────────────────────────────────
export function playHitEnemy() {
    if (!canPlay('hitEnemy', 80)) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
        const master = getMaster(ctx);
        const t = ctx.currentTime;

        // 둔탁한 임팩트 (저주파 노이즈 burst)
        const bufSize = Math.floor(ctx.sampleRate * 0.12);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buf;

        // 저역통과 필터 → "퍽" 느낌
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.exponentialRampToValueAtTime(80, t + 0.1);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(1.2, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        // 피치 하강 오실레이터
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.9, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

        noise.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(master);
        osc.connect(oscGain);
        oscGain.connect(master);

        noise.start(t);
        noise.stop(t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
    } catch (_) { }
}

// ─────────────────────────────────────────────
// 2. 푹! — 발로 밟아서 몬스터를 쓰러뜨릴 때 (스텀프)
// ─────────────────────────────────────────────
export function playStompEnemy() {
    if (!canPlay('stomp', 100)) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
        const master = getMaster(ctx);
        const t = ctx.currentTime;

        // 묵직한 저주파 "쿵"
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(320, t);
        osc2.frequency.exponentialRampToValueAtTime(50, t + 0.14);

        // 노이즈 추가로 더 실감나게
        const bufSize = Math.floor(ctx.sampleRate * 0.05);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        }
        const impNoise = ctx.createBufferSource();
        impNoise.buffer = buf;
        const impGain = ctx.createGain();
        impGain.gain.setValueAtTime(0.6, t);
        impGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.6, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        osc2.connect(gain2);
        impNoise.connect(impGain);
        gain.connect(master);
        gain2.connect(master);
        impGain.connect(master);

        osc.start(t);
        osc.stop(t + 0.25);
        osc2.start(t);
        osc2.stop(t + 0.18);
        impNoise.start(t);
        impNoise.stop(t + 0.06);
    } catch (_) { }
}

// ─────────────────────────────────────────────
// 3. 으악! — 플레이어가 피해를 입을 때
// ─────────────────────────────────────────────
export function playPlayerHurt() {
    if (!canPlay('playerHurt', 250)) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
        const master = getMaster(ctx);
        const t = ctx.currentTime;

        // "으악" 느낌: 비명음 (상승 후 하강)
        const scream = ctx.createOscillator();
        scream.type = 'sawtooth';
        scream.frequency.setValueAtTime(280, t);
        scream.frequency.linearRampToValueAtTime(850, t + 0.06);
        scream.frequency.exponentialRampToValueAtTime(180, t + 0.28);

        const screamGain = ctx.createGain();
        screamGain.gain.setValueAtTime(0.0, t);
        screamGain.gain.linearRampToValueAtTime(0.5, t + 0.04);
        screamGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        // 충격 노이즈 레이어
        const bufSize = Math.floor(ctx.sampleRate * 0.08);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.5);
        }
        const impactNoise = ctx.createBufferSource();
        impactNoise.buffer = buf;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 300;

        const impactGain = ctx.createGain();
        impactGain.gain.setValueAtTime(0.9, t);
        impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        scream.connect(screamGain);
        screamGain.connect(master);
        impactNoise.connect(hp);
        hp.connect(impactGain);
        impactGain.connect(master);

        scream.start(t);
        scream.stop(t + 0.32);
        impactNoise.start(t);
        impactNoise.stop(t + 0.1);
    } catch (_) { }
}

// ─────────────────────────────────────────────
// 4. 펑! — 총알 발사 시
// ─────────────────────────────────────────────
export function playShoot() {
    if (!canPlay('shoot', 120)) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
        const master = getMaster(ctx);
        const t = ctx.currentTime;

        const bufSize = Math.floor(ctx.sampleRate * 0.06);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.8);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buf;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1000;
        bp.Q.value = 0.8;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.07);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        noise.connect(bp);
        bp.connect(noiseGain);
        noiseGain.connect(master);
        osc.connect(oscGain);
        oscGain.connect(master);

        noise.start(t);
        noise.stop(t + 0.09);
        osc.start(t);
        osc.stop(t + 0.1);
    } catch (_) { }
}

// ─────────────────────────────────────────────
// 5. 쿵! — 보스 피격 시
// ─────────────────────────────────────────────
export function playBossHit() {
    if (!canPlay('bossHit', 120)) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
        const master = getMaster(ctx);
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(28, t + 0.32);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(340, t);
        osc2.frequency.exponentialRampToValueAtTime(55, t + 0.22);

        // 크런치 노이즈
        const bufSize = Math.floor(ctx.sampleRate * 0.04);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const nd = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            nd[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        }
        const crunch = ctx.createBufferSource();
        crunch.buffer = buf;
        const crunchGain = ctx.createGain();
        crunchGain.gain.setValueAtTime(0.5, t);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.5, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

        osc.connect(gain);
        gain.connect(master);
        osc2.connect(gain2);
        gain2.connect(master);
        crunch.connect(crunchGain);
        crunchGain.connect(master);

        osc.start(t);
        osc.stop(t + 0.4);
        osc2.start(t);
        osc2.stop(t + 0.28);
        crunch.start(t);
        crunch.stop(t + 0.06);
    } catch (_) { }
}

// ─────────────────────────────────────────────
// 6. 딩동! — 아이템 획득 시
// ─────────────────────────────────────────────
export function playItemCollect() {
    if (!canPlay('item', 150)) return;
    const ctx = getCtx();
    if (!ctx) return;

    try {
        const master = getMaster(ctx);
        const t = ctx.currentTime;

        const freqs = [523, 659, 784]; // C5, E5, G5
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const g = ctx.createGain();
            const st = t + i * 0.07;
            g.gain.setValueAtTime(0.0, st);
            g.gain.linearRampToValueAtTime(0.4, st + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, st + 0.2);

            osc.connect(g);
            g.connect(master);
            osc.start(st);
            osc.stop(st + 0.22);
        });
    } catch (_) { }
}
