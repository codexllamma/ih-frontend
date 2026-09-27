import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, useGLTF, useAnimations } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

const RobotModel = () => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/robot.glb');
  const { actions } = useAnimations(animations, group);
  const { isLoading, appState } = useStore();

  useEffect(() => {
    const actionNames = Object.keys(actions);
    if (actionNames.length > 0) {
      actions[actionNames[0]]?.play();
    }
  }, [actions]);

  useFrame((state) => {
    if (!group.current) return;
    
    // 1. ROTATION (Fixing the "looking to the side" issue)
    // TWEAK THIS NUMBER: Change to 0.5, -0.5, 1.5, etc., until it faces front.
    const baseRotationY = 0.05; 

    if (appState === 'idle') {
      group.current.rotation.y = baseRotationY + (Math.sin(state.clock.elapsedTime * 0.5) * 0.2);
    } else {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, baseRotationY, 0.1);
    }
    
    // 2. SMOOTH SCALE ANIMATION
    const targetScale = appState === 'idle' ? 1.0 : 1.3;
    group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);

    // 3. SMOOTH POSITION ANIMATION
    const targetY = appState === 'idle' ? -0.5 : -0.5;
    const targetZ = appState === 'idle' ? 0.0 : -1.0;
    
    //  FORCE targetX to 0.0 so it stops fighting your CSS!
    const targetX = 0.0; 
    
    const wobble = isLoading ? Math.sin(state.clock.elapsedTime * 15) * 0.05 : 0;
    
    group.current.position.lerp(new THREE.Vector3(targetX, targetY + wobble, targetZ), 0.05);
  });

  return (
    // Note: We apply the Float to the primitive, but the scale/position is handled dynamically by useFrame above!
    <group ref={group} dispose={null}>
      <Float speed={appState === 'idle' ? 2 : 1} floatIntensity={0.8} rotationIntensity={0.2}>
        <primitive object={scene} /> 
      </Float>
    </group>
  );
};

useGLTF.preload('/robot.glb');

export const Agent3D = () => {
  return (
    <div className="w-full h-full cursor-pointer transform-gpu">
      <Canvas 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 0, 6], fov: 45 }} 
        gl={{
          powerPreference: 'high-performance', 
          antialias: true, 
          alpha: true, 
          depth: true,
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping
        }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 5]} intensity={2.5} color="#ffffff" />
        <directionalLight position={[-5, -4, -3]} intensity={1.2} color="#6366f1" />
        <RobotModel/>
      </Canvas>
    </div>
  );
};
