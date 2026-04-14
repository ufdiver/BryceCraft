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

const createNoiseBuffer = () => {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    return buffer;
};
const noiseBuffer = createNoiseBuffer();

class AmbientLoop {
    constructor(setup) {
        this.gain = audioCtx.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(audioCtx.destination);
        setup(this);
    }
    setVol(v) { this.gain.gain.setTargetAtTime(v, audioCtx.currentTime, 0.1); }
}

export const ambient = {
    lava: new AmbientLoop(l => {
        const src = audioCtx.createBufferSource(); src.buffer = noiseBuffer; src.loop = true;
        const flt = audioCtx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 150;
        src.connect(flt); flt.connect(l.gain); src.start();
        setInterval(() => { if (l.gain.gain.value > 0.05) playTone(Math.random()*1500+500, 'sine', 0.02, l.gain.gain.value*0.1); }, 250);
    }),
    laser: new AmbientLoop(l => {
        const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 120;
        const lfo = audioCtx.createOscillator(); lfo.frequency.value = 40;
        const lfoG = audioCtx.createGain(); lfoG.gain.value = 100;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        osc.connect(l.gain); osc.start(); lfo.start();
    }),
    water: new AmbientLoop(l => {
        const src = audioCtx.createBufferSource(); src.buffer = noiseBuffer; src.loop = true;
        const flt = audioCtx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 800; flt.Q.value = 0.4;
        src.connect(flt); flt.connect(l.gain); src.start();
    })
};

export const sfx = {
    hurt: () => { playTone(150, 'sawtooth', 0.4, 0.2); playTone(100, 'sine', 0.4, 0.2); },
    buy: () => { playTone(600, 'sine', 0.1); setTimeout(() => playTone(900, 'sine', 0.2), 100); },
    win: () => { playTone(800, 'sine', 0.1); setTimeout(() => playTone(1200, 'sine', 0.3), 100); },
    fail: () => { playTone(200, 'square', 0.3, 0.15); },
    shoot: () => {
        playTone(90,  'sawtooth', 0.18, 0.55);
        playTone(55,  'sine',     0.22, 0.4);
        playTone(900, 'square',   0.04, 0.25);
        playTone(400, 'sawtooth', 0.06, 0.15);
    },
    levelUp: () => {
        [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2), i * 150));
    }
};
