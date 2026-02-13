import React, { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Video360 from './components/Video360';
import PortalSphere from './components/PortalSphere';
import { VIDEO_SCENES } from './scenes';
import './App.css';

export default function App() {
  const [currentScene, setCurrentScene] = useState(0);
  const [videoEl, setVideoEl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleVideoReady = useCallback((video) => {
    setVideoEl(video);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    // Clean up old listeners by storing on the element
    if (video._portalListeners) {
      video.removeEventListener('playing', video._portalListeners.onPlay);
      video.removeEventListener('pause', video._portalListeners.onPause);
    }
    video.addEventListener('playing', onPlay);
    video.addEventListener('pause', onPause);
    video._portalListeners = { onPlay, onPause };
  }, []);

  const handlePlayPause = () => {
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play();
    } else {
      videoEl.pause();
    }
  };

  const handleMute = () => {
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    setIsMuted(videoEl.muted);
  };

  const scene = VIDEO_SCENES[currentScene];

  return (
    <>
      <div className="overlay info">
        <h2>360 Video Viewer</h2>
        <p>Drag to look around</p>
        <p>Scroll to zoom</p>
        <p><strong>Click portals to switch scenes</strong></p>
      </div>

      <div className="overlay scene-info">
        <h3>{scene.name}</h3>
        <p>{scene.description}</p>
      </div>

      <div className="controls">
        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={handleMute}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>

      <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
        <Suspense fallback={null}>
          <Video360 src={scene.src} onVideoReady={handleVideoReady} />

          {VIDEO_SCENES.map((s, index) => {
            if (index === currentScene) return null;
            return (
              <PortalSphere
                key={s.id}
                position={s.portalPosition}
                color={s.portalColor}
                label={`${s.name} — ${s.description}`}
                onClick={() => setCurrentScene(index)}
              />
            );
          })}

          <ambientLight intensity={0.6} />
          <pointLight position={[0, 0, 0]} intensity={1} />

          <OrbitControls
            enableZoom={true}
            enablePan={false}
            rotateSpeed={-0.5}
            zoomSpeed={0.5}
            minDistance={0.01}
            maxDistance={50}
          />
        </Suspense>
      </Canvas>
    </>
  );
}
