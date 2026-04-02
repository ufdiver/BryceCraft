export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, dur, vol = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
}

export const sfx = {
    hurt: () => { playTone(150, 'sawtooth', 0.4, 0.2); playTone(100, 'sine', 0.4, 0.2); },
    buy: () => { playTone(600, 'sine', 0.1); setTimeout(() => playTone(900, 'sine', 0.2), 100); },
    win: () => { playTone(800, 'sine', 0.1); setTimeout(() => playTone(1200, 'sine', 0.3), 100); },
    fail: () => { playTone(200, 'square', 0.3, 0.15); },
    shoot: () => {
        // Deep bang
        playTone(90,  'sawtooth', 0.18, 0.55);
        playTone(55,  'sine',     0.22, 0.4);
        // High crack / snap
        playTone(900, 'square',   0.04, 0.25);
        playTone(400, 'sawtooth', 0.06, 0.15);
    },
    levelUp: () => {
        [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2), i * 150));
    }
};
