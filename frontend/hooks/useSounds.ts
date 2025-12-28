import { useEffect, useRef, useState } from 'react';

// Sound effects using Web Audio API
export const useSounds = () => {
  const [enabled, setEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize Audio Context
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Load sound preference
      const saved = localStorage.getItem('soundEnabled');
      if (saved !== null) {
        setEnabled(saved === 'true');
      }

      // Listen for sound toggle events
      const handleSoundToggle = (e: CustomEvent) => {
        setEnabled(e.detail);
      };

      window.addEventListener('soundToggle', handleSoundToggle as EventListener);

      return () => {
        window.removeEventListener('soundToggle', handleSoundToggle as EventListener);
        audioContextRef.current?.close();
      };
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
    if (!enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = volume;

    oscillator.start(ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration);
  };

  // Predefined sound effects (Enterprise Grade - Subtle & Professional)
  const sounds = {
    // Button click - very subtle click
    click: () => {
      playSound(600, 0.05, 'sine', 0.03);
    },

    // Hover - extremely subtle air puff
    hover: () => {
      playSound(400, 0.03, 'sine', 0.01);
    },

    // Success - clean, professional chime
    success: () => {
      playSound(880, 0.1, 'sine', 0.05); // A5
      setTimeout(() => playSound(1108, 0.15, 'sine', 0.05), 80); // C#6
    },

    // Error - soft warning thud
    error: () => {
      playSound(150, 0.15, 'triangle', 0.05);
    },

    // Notification - glass ping
    notification: () => {
      playSound(800, 0.1, 'sine', 0.04);
      setTimeout(() => playSound(1200, 0.2, 'sine', 0.02), 50);
    },

    // Toggle - soft switch
    toggle: () => {
      playSound(400, 0.05, 'sine', 0.04);
    },

    // Open dialog - quick rise
    open: () => {
      playSound(300, 0.1, 'sine', 0.03);
    },

    // Close dialog - quick fall
    close: () => {
      playSound(250, 0.1, 'sine', 0.03);
    },

    // Select - soft tick
    select: () => {
      playSound(500, 0.05, 'sine', 0.03);
    },

    // Whoosh - removed for enterprise (too game-like), replaced with silence or very subtle breath
    whoosh: () => {
      // Intentionally silent or extremely subtle for enterprise
    },

    // Celebrate - subtle major chord
    celebrate: () => {
      const notes = [523.25, 659.25, 783.99]; // C Major
      notes.forEach((note, i) => {
        setTimeout(() => playSound(note, 0.3, 'sine', 0.04), i * 60);
      });
    },
  };

  return {
    sounds,
    enabled,
    setEnabled,
  };
};

// Hook for individual sound effects
export const useSound = (soundType: keyof ReturnType<typeof useSounds>['sounds']) => {
  const { sounds, enabled } = useSounds();

  return () => {
    if (enabled) {
      sounds[soundType]();
    }
  };
};
