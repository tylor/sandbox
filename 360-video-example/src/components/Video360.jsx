import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;
export const HEADING_SIGN = 1;

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Video360({ src, poster, heading, onVideo, onReady }) {
  const materialRef = useRef(null);
  const shown = useRef(null); // 'poster' | 'video' for the current src
  const readyFor = useRef(null);

  const video = useMemo(() => {
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    return vid;
  }, []);

  const videoTexture = useMemo(() => {
    const tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [video]);

  useEffect(() => {
    if (onVideo) onVideo(video);
  }, [video, onVideo]);

  useEffect(() => {
    shown.current = null;
    video.src = src;
    video.load();
    if (!reducedMotion()) video.play().catch(() => {});
    return () => video.pause();
  }, [src, video]);

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const hasFrame = video.readyState >= video.HAVE_CURRENT_DATA;
    const want = hasFrame ? 'video' : 'poster';
    if (shown.current !== want) {
      shown.current = want;
      mat.map = want === 'video' ? videoTexture : poster;
      mat.needsUpdate = true;
    }
    if (readyFor.current !== src) {
      readyFor.current = src;
      if (onReady) onReady();
    }
  });

  return (
    <mesh scale={[-1, 1, 1]} rotation-y={HEADING_SIGN * (heading - 0.75) * TWO_PI}>
      <sphereGeometry args={[500, 64, 32]} />
      <meshBasicMaterial ref={materialRef} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}
