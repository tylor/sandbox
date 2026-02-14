import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function PortalSphere({ position, color, label, onClick }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2) * 2;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Invisible larger hit area for easier clicking */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'grab';
        }}
      >
        <sphereGeometry args={[12, 16, 16]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Visible portal sphere */}
      <mesh rotation-y={Date.now() * 0.001}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 1.5 : 0.5}
          transparent
          opacity={0.85}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {hovered && (
        <Html center distanceFactor={100} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '5px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}
