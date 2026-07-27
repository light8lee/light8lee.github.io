"use client";

import { useEffect, useRef, useState } from "react";
import { SceneKey, ScenarioKey } from "../lib/simulation";

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export function useSceneAudio(scene: SceneKey, scenario: ScenarioKey, active: boolean) {
  const [enabled, setEnabled] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled || !active) return;
    const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    contextRef.current = context;
    const master = context.createGain();
    master.gain.value = 0.055;
    master.connect(context.destination);
    const sources: AudioScheduledSourceNode[] = [];
    const timers: number[] = [];

    const noise = (gainValue: number, cutoff: number, type: BiquadFilterType = "lowpass") => {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = type;
      filter.frequency.value = cutoff;
      filter.Q.value = type === "bandpass" ? 1.8 : 0.7;
      gain.gain.value = gainValue;
      source.connect(filter).connect(gain).connect(master);
      source.start();
      sources.push(source);
    };

    const tone = (frequency: number, duration = 0.06, level = 0.22, type: OscillatorType = "square", delay = 0) => {
      if (context.state === "closed") return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(level, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration);
    };

    const repeat = (play: () => void, every: number) => {
      play();
      timers.push(window.setInterval(play, every));
    };

    const chirp = (from: number, to: number, duration = 0.16, level = 0.18) => {
      if (context.state === "closed") return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(from, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(to, context.currentTime + duration);
      gain.gain.setValueAtTime(level, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain).connect(master);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    };

    if (scene === "meeting") {
      noise(0.035, 720, "bandpass");
      repeat(() => { tone(1180, 0.025, 0.12, "sine"); tone(820, 0.03, 0.08, "sine", 0.14); }, 3600);
    }
    if (scene === "command") {
      if (scenario === "storm") noise(0.62, 1450);
      repeat(() => { tone(690, 0.055, 0.24, "square"); tone(920, 0.075, 0.2, "square", 0.11); }, 2250);
      repeat(() => chirp(360, 760, 0.42, 0.11), 7200);
    }
    if (scene === "warehouse") {
      noise(0.07, 520, "bandpass");
      repeat(() => { tone(260, 0.06, 0.22, "triangle"); tone(420, 0.035, 0.14, "square", 0.12); }, 980);
      repeat(() => { tone(740, 0.08, 0.22, "square"); tone(740, 0.08, 0.22, "square", 0.22); tone(740, 0.08, 0.22, "square", 0.44); }, 4700);
    }
    if (scene === "facility") {
      noise(0.018, 1800, "highpass");
      repeat(() => { tone(480, 0.025, 0.22, "square"); tone(320, 0.035, 0.12, "square", 0.08); }, 2600);
      repeat(() => { tone(1040, 0.06, 0.2, "sine"); tone(1320, 0.09, 0.18, "sine", 0.16); }, 5100);
    }
    if (scene === "hospital") {
      noise(0.012, 2200, "highpass");
      repeat(() => { tone(980, 0.055, 0.15, "sine"); tone(980, 0.055, 0.12, "sine", 0.7); }, 2800);
      repeat(() => { tone(520, 0.025, 0.16, "square"); tone(680, 0.03, 0.12, "square", 0.09); }, 5600);
    }

    return () => {
      timers.forEach((timer) => window.clearInterval(timer));
      sources.forEach((source) => { try { source.stop(); } catch {} });
      void context.close();
      contextRef.current = null;
    };
  }, [enabled, active, scene, scenario]);

  return { enabled, audible: enabled && active, toggle: () => setEnabled((value) => !value) };
}
