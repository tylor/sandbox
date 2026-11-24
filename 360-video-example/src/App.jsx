import React, { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import Video360 from './components/Video360';
import Portal from './components/Portal';
import { VIDEO_SCENES } from './scenes';
import './App.css';

const DEFAULT_FOV = 75;
const SLOT_DISTANCE = 80;

// Two windows ahead of the viewer, left and right. On narrow (portrait) screens
// pull them in so both stay inside the horizontal field of view.
function slotPositions(aspect) {
  const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(DEFAULT_FOV / 2)) * aspect);
  const az = Math.min(THREE.MathUtils.degToRad(28), halfH * 0.5);
  const x = SLOT_DISTANCE * Math.sin(az);
  const z = -SLOT_DISTANCE * Math.cos(az);
  return [[-x, -6, z], [x, -6, z]];
}
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Rig({ resetRef }) {
  const controls = useRef();
  const { camera, gl } = useThree();

  useEffect(() => {
    resetRef.current = () => {
      camera.fov = DEFAULT_FOV;
      camera.updateProjectionMatrix();
      controls.current?.reset();
    };
  }, [camera, resetRef]);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e) => {
      e.preventDefault();
      camera.fov = Math.min(90, Math.max(35, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [camera, gl]);

  return (
    <OrbitControls
      ref={controls}
      enableZoom={false}
      enablePan={false}
      rotateSpeed={-0.5}
      target={[0, 0, 0]}
    />
  );
}

function Scene({ current, onVideo, onReady, onTravel, resetRef }) {
  const posters = useTexture(VIDEO_SCENES.map((s) => s.poster), (textures) =>
    textures.forEach((t) => (t.colorSpace = THREE.SRGBColorSpace))
  );
  const { size } = useThree();
  const slots = useMemo(() => slotPositions(size.width / size.height), [size.width, size.height]);
  const scene = VIDEO_SCENES[current];
  const others = VIDEO_SCENES.map((s, i) => i).filter((i) => i !== current);
  return (
    <>
      <Video360
        src={scene.src}
        poster={posters[current]}
        heading={scene.heading}
        onVideo={onVideo}
        onReady={onReady}
      />
      {others.map((i, slot) => (
        <Portal
          key={VIDEO_SCENES[i].id}
          scene={VIDEO_SCENES[i]}
          poster={posters[i]}
          position={slots[slot]}
          onTravel={() => onTravel(i)}
        />
      ))}
      <Rig resetRef={resetRef} />
    </>
  );
}

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="#fff" aria-hidden="true">
    <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
    <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
  </svg>
);
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="#fff" aria-hidden="true">
    <path d="M4 2.2v11.6a.5.5 0 0 0 .77.42l9-5.8a.5.5 0 0 0 0-.84l-9-5.8A.5.5 0 0 0 4 2.2z" />
  </svg>
);

export default function App() {
  const [current, setCurrent] = useState(0);
  const [video, setVideo] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [hintGone, setHintGone] = useState(false);
  const [dark, setDark] = useState(false);
  const resetRef = useRef(() => {});
  const pending = useRef(false);
  const busy = useRef(false);
  const timers = useRef([]);
  const drag = useRef({ down: false });

  useEffect(() => {
    if (!video) return;
    const sync = () => setPlaying(!video.paused);
    sync();
    video.addEventListener('play', sync);
    video.addEventListener('playing', sync);
    video.addEventListener('pause', sync);
    return () => {
      video.removeEventListener('play', sync);
      video.removeEventListener('playing', sync);
      video.removeEventListener('pause', sync);
    };
  }, [video]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleReady = useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    busy.current = false;
    setDark(false);
  }, []);

  const travel = useCallback(
    (i) => {
      if (busy.current || i === current) return;
      setHintGone(true);
      if (reduced()) {
        resetRef.current();
        setCurrent(i);
        return;
      }
      busy.current = true;
      setDark(true);
      timers.current.push(
        setTimeout(() => {
          pending.current = true;
          resetRef.current();
          setCurrent(i);
          // safety: never stay dark for long
          timers.current.push(
            setTimeout(() => {
              if (pending.current) handleReady();
            }, 1500)
          );
        }, 200)
      );
    },
    [current, handleReady]
  );

  const toggle = () => {
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const scene = VIDEO_SCENES[current];

  return (
    <>
      <div
        className="stage"
        onPointerDown={() => (drag.current.down = true)}
        onPointerMove={() => drag.current.down && setHintGone(true)}
        onPointerUp={() => (drag.current.down = false)}
        onPointerCancel={() => (drag.current.down = false)}
      >
        <Canvas camera={{ position: [0, 0, 0.1], fov: DEFAULT_FOV }}>
          <Suspense fallback={null}>
            <Scene
              current={current}
              onVideo={setVideo}
              onReady={handleReady}
              onTravel={travel}
              resetRef={resetRef}
            />
          </Suspense>
        </Canvas>
      </div>

      <div className="scrim" />

      <div className="caption">
        <h1>{scene.place}</h1>
        <p>{scene.region}</p>
      </div>

      <button
        type="button"
        className="pause"
        onClick={toggle}
        aria-label={playing ? 'Pause video' : 'Play video'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className={'hint' + (hintGone ? ' gone' : '')} aria-hidden={hintGone}>
        Drag to look around
      </div>

      <div className={'fade' + (dark ? ' dark' : '')} />
    </>
  );
}
