import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

const RobotModel = () => {
  const group = useRef<THREE.Group>(null);
  const radarRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/robot.glb'); 
  const { isLoading, appState } = useStore();

  // 1. EXTRACT THE GLOWING MATERIAL
  const glowMaterial = useMemo(() => {
    let mat: THREE.MeshStandardMaterial | null = null;
    scene.traverse((node: any) => {
      if (node.isMesh && node.material?.name === 'Material.003') {
        mat = node.material;
        if (mat) mat.emissiveIntensity = 2.0; 
      }
    });
    return mat;
  }, [scene]);

  // 2. THE EXPLICIT RIGGING SYSTEM
  const { head, arms } = useMemo(() => {
    const parts = { head: null as THREE.Object3D | null, body: null as THREE.Object3D | null, arms: [] as THREE.Object3D[] };
    
    const faceParts: THREE.Object3D[] = [];
    const neckParts: THREE.Object3D[] = [];
    const limbParts: THREE.Object3D[] = [];

    scene.traverse((node) => {
      if (node.name === 'Cube003') {
        parts.head = node;
        node.userData.baseX = node.rotation.x || 0; 
      }
      else if (node.name === 'Cube') {
        parts.body = node;
      }
      else if (node.name === 'Cube001') {
        parts.arms.push(node);
        node.userData.baseZ = node.rotation.z || 0; 
      }
      else if (node.name.includes('NurbsPath') || node.name.includes('Cube008')) {
        faceParts.push(node);
      }
      else if (node.name.includes('Cube002') || node.name.includes('Cube006') || node.name.includes('Cube007')) {
        neckParts.push(node);
      }
      else if (node.name.includes('Cube005') || node.name.includes('Sphere')) {
        limbParts.push(node);
      }
    });
    
    scene.updateMatrixWorld(true);

    faceParts.forEach(node => parts.head?.attach(node));
    neckParts.forEach(node => parts.body?.attach(node)); 
    
    limbParts.forEach((node) => {
      if (parts.arms.length === 0) return;
      let closestArm = parts.arms[0];
      let minDistance = Infinity;
      
      const partPos = new THREE.Vector3();
      node.getWorldPosition(partPos);
      
      parts.arms.forEach((arm) => {
        const armPos = new THREE.Vector3();
        arm.getWorldPosition(armPos);
        if (armPos.distanceTo(partPos) < minDistance) {
          minDistance = armPos.distanceTo(partPos);
          closestArm = arm;
        }
      });
      
      closestArm.attach(node);
    });

    return parts;
  }, [scene]);

  const idleColor = useMemo(() => new THREE.Color("#00ffff"), []); 
  const thinkingColor = useMemo(() => new THREE.Color("#ff8800"), []); 
  const successColor = useMemo(() => new THREE.Color("#39ff14"), []); 
  const errorColor = useMemo(() => new THREE.Color("#ff0000"), []); 

  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.elapsedTime;
    
    const isProcessing = isLoading || appState === 'loading';

    // 3. MULTI-STATE COLOR SHIFTING 
    if (glowMaterial) {
      const mat = glowMaterial as THREE.MeshStandardMaterial;
      let targetColor = idleColor;
      
      if (isProcessing) {
        targetColor = thinkingColor;
      } else if (appState === 'success') {
        targetColor = successColor;
      } else if (appState === 'error') {
        targetColor = errorColor;
      }
      
      mat.color.lerp(targetColor, 0.05);
      mat.emissive.lerp(targetColor, 0.05);
    }

    // 4. THE 360 JUMP SPIN INTRO
    const introDuration = 1.2; 
    let introBounce = 0;
    let introSpin = 0;

    if (time < introDuration) {
      const progress = time / introDuration; 
      introBounce = Math.sin(progress * Math.PI) * 0.7; 
      const easeOut = 1 - Math.pow(1 - progress, 3);
      introSpin = easeOut * Math.PI * 2; 
    } else {
      introSpin = Math.PI * 2;
    }
    
    // 5. PROCEDURAL MOUSE TRACKING
    const targetLookX = time > introDuration ? (state.pointer.x * Math.PI) / 4 : 0; 
    const targetLookY = time > introDuration ? (state.pointer.y * Math.PI) / 4 : 0; 
    const baseRotationY = 0.5;

    let targetRotY = baseRotationY + targetLookX + introSpin;
    let targetRotX = -targetLookY;

    if (!isProcessing) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.15);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.15);
    } else {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, baseRotationY + introSpin, 0.15);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.15);
    }
    
    // 6. ANIMATE THE HEAD 
    if (head) {
      let targetHeadX = head.userData.baseX + Math.sin(time * 2) * 0.05; 
      let targetHeadY = 0;

      if (isProcessing) {
        targetHeadX = head.userData.baseX - 0.05; 
        targetHeadY = Math.sin(time * 1.5) * 0.05; 
      }
      
      if (!isNaN(targetHeadX)) {
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetHeadX, 0.1);
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadY, 0.1);
      }
    }

    // 7. ANIMATE THE HOLOGRAPHIC RADAR
    if (radarRef.current) {
      radarRef.current.children[0].rotation.z += 0.02; 
      radarRef.current.children[1].rotation.z -= 0.03; 

      const isShowingRadar = isProcessing || appState === 'success' || appState === 'error';
      const radarScale = isShowingRadar ? 1.0 : 0.0;
      radarRef.current.scale.lerp(new THREE.Vector3(radarScale, radarScale, radarScale), 0.1);
      
      const mat = glowMaterial as THREE.MeshStandardMaterial | null;
      const currentGlowColor = mat?.emissive || idleColor;
      
      (radarRef.current.children[0] as any).material.color.copy(currentGlowColor);
      (radarRef.current.children[1] as any).material.color.copy(currentGlowColor);
    }

    // 8. SUBTLE ARM IDLE 
    arms.forEach((arm) => {
      const armWaveAdd = Math.sin(time * 2.5) * 0.05; 
      const targetZ = arm.userData.baseZ + armWaveAdd;
      if (!isNaN(targetZ)) {
        arm.rotation.z = THREE.MathUtils.lerp(arm.rotation.z, targetZ, 0.1); 
      }
    });

    // 9. SMOOTH SCALE & POSITION ANIMATION
    const targetY = -0.5;
    const targetZ = !isProcessing ? 0.0 : -1.0;
    const wobble = isProcessing ? Math.sin(time * 15) * 0.05 : 0;
    
    group.current.position.lerp(new THREE.Vector3(0.0, targetY + wobble + introBounce, targetZ), 0.15);
  });

  return (
    <group ref={group} dispose={null}>
      <Float speed={!isLoading && appState !== 'loading' ? 2 : 1} floatIntensity={0.2} rotationIntensity={0.05}>
        <primitive object={scene} /> 
        
        <group ref={radarRef} position={[0, 1.2, 1.2]} scale={0}>
          <mesh>
            <torusGeometry args={[0.2, 0.015, 16, 32]} />
            <meshBasicMaterial transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.3, 0.02, 16, 32, Math.PI * 1.5]} />
            <meshBasicMaterial transparent opacity={0.9} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>

      </Float>
    </group>
  );
};

useGLTF.preload('/robot.glb');

export const Agent3D = () => {
  return (
    // 👇 No more translate-x here! App.tsx handles the movement now. 👇
    <div className="w-full h-full cursor-pointer transform-gpu">
      <Canvas 
        dpr={[0.5, 1.3]} 
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
        <ambientLight intensity={0.8} color="#94a3b8" />
        <directionalLight position={[5, 8, 5]} intensity={2.5} color="#ffffff" />
        <directionalLight position={[-5, -4, -3]} intensity={1.2} color="#6366f1" />
        <RobotModel/>
      </Canvas>
    </div>
  );
};