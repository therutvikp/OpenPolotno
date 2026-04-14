'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';
import { StoreType } from '../model/store';
import { AudioType } from '../model/audio-model';

function useAudio(src: string): [HTMLAudioElement | null, string] {
  const [audio, setAudio] = React.useState<HTMLAudioElement | null>(null);
  const [status, setStatus] = React.useState('loading');

  React.useEffect(() => {
    const el = new Audio(src);
    const onCanPlay = () => { setStatus('loaded'); setAudio(el); };
    const onError = () => { setStatus('failed'); setAudio(null); };
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('error', onError);
    };
  }, [src]);

  return [audio, status];
}

type Props = {
  store: StoreType;
  audio: AudioType;
};

export const AudioElement = observer(({ audio, store }: Props) => {
  const [audioEl] = useAudio(audio.src);

  // Sync duration once loaded
  React.useEffect(() => {
    if (!audioEl) return;
    store.history.ignore(() => {
      audio.set({ duration: audioEl.duration * 1000 });
    });
  }, [audioEl, audio, store.history]);

  // Playback sync
  React.useEffect(() => {
    if (!audioEl) return;

    const onEnded = () => {
      audioEl.currentTime = (audio.startTime * audio.duration) / 1000;
    };
    const onTimeUpdate = () => {
      const endTime = (audio.endTime * audio.duration) / 1000;
      if (audioEl.currentTime >= endTime) {
        audioEl.pause();
        audioEl.currentTime = (audio.startTime * audio.duration) / 1000;
      }
    };

    audioEl.addEventListener('ended', onEnded);
    audioEl.addEventListener('timeupdate', onTimeUpdate);

    const dispose = autorun(() => {
      const animatedIds = store.animatedElementsIds;
      if (animatedIds.length && !animatedIds.includes(audio.id)) return;

      const elapsed = (store as any).currentTime - audio.delay;
      const loopDuration = audio.duration * (audio.endTime - audio.startTime);
      const isActive = elapsed >= 0 && elapsed < loopDuration;

      if (!(store as any).isPlaying || ((store as any).animatedElementsIds.length !== 0) || !isActive) {
        audioEl.pause();
        return;
      }

      audioEl.volume = audio.volume;
      if (audioEl.paused) audioEl.play();

      const targetTime = (elapsed % loopDuration) / 1000 + (audio.startTime * audio.duration) / 1000;
      const currentTime = audioEl.currentTime;
      if (Math.abs(currentTime - targetTime) > 0.5 && targetTime !== currentTime) {
        audioEl.currentTime = targetTime;
      }
    });

    return () => {
      audioEl.pause();
      audioEl.removeEventListener('ended', onEnded);
      audioEl.removeEventListener('timeupdate', onTimeUpdate);
      dispose();
    };
  }, [(store as any).isPlaying, audio.startTime, audio.endTime, audio.volume, audioEl]);

  return null;
}) as ((props: Props) => any) & { displayName: string };

AudioElement.displayName = 'AudioElement';
