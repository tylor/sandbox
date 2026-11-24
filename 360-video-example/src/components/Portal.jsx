import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';

const RADIUS = 9;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Portal({ scene, poster, position, onTravel }) {
  const scaleRef = useRef();
  const [hovered, setHovered] = useState(false);

  const map = useMemo(() => {
    const t = poster.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(60 / 360, 60 / 180);
    t.offset.set(scene.heading - 60 / 360 / 2, 0.5 - 60 / 180 / 2);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [poster, scene.heading]);

  useFrame(() => {
    const g = scaleRef.current;
    if (!g) return;
    const target = hovered ? 1.08 : 1;
    if (reduced()) g.scale.setScalar(target);
    else g.scale.setScalar(g.scale.x + (target - g.scale.x) * 0.15);
  });

  const over = (e) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    setHovered(false);
    document.body.style.cursor = 'grab';
  };

  return (
    <group position={position}>
      <Billboard>
        <group ref={scaleRef}>
          <mesh>
            <circleGeometry args={[RADIUS, 64]} />
            <meshBasicMaterial map={map} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <ringGeometry args={[RADIUS, 9.5, 96]} />
            <meshBasicMaterial color="#fff" transparent opacity={hovered ? 1 : 0.7} toneMapped={false} />
          </mesh>
        </group>
        <mesh
          position={[0, 0, 0.02]}
          onClick={(e) => {
            e.stopPropagation();
            onTravel();
          }}
          onPointerOver={over}
          onPointerOut={out}
        >
          <circleGeometry args={[11, 32]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Billboard>

      <Html center position={[0, -13, 0]} zIndexRange={[5, 0]}>
        <button
          type="button"
          className="portal-label"
          onClick={onTravel}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <span className="portal-place">{scene.place}</span>
          <span className="portal-region">{scene.region}</span>
        </button>
      </Html>
    </group>
  );
}
