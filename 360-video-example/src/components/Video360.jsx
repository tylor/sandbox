import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Video360({ src, onVideoReady }) {
  const videoRef = useRef(null);
  const textureRef = useRef(null);
  const materialRef = useRef(null);

  // Create video element and texture once (persist across re-renders)
  if (!videoRef.current) {
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    videoRef.current = vid;
  }

  if (!textureRef.current) {
    const tex = new THREE.VideoTexture(videoRef.current);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = tex;
  }

  // Update video source when src changes
  useEffect(() => {
    const video = videoRef.current;
    video.src = src;
    video.load();
    video.play().catch(() => {});

    if (onVideoReady) onVideoReady(video);

    return () => {
      video.pause();
    };
  }, [src]);

  // Keep texture updating each frame
  useFrame(() => {
    const video = videoRef.current;
    const texture = textureRef.current;
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }
    // Ensure material knows about the texture
    if (materialRef.current && materialRef.current.map !== texture) {
      materialRef.current.map = texture;
      materialRef.current.needsUpdate = true;
    }
  });

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 64, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        map={textureRef.current}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}
