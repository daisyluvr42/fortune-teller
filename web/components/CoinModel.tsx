"use client";

import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { Group } from "three";
import { SRGBColorSpace } from "three";

type CoinModelProps = {
  modelUrl: string;
  size?: number;
  className?: string;
  delay?: number;
  duration?: number;
  spinTurns?: number;
  finalRotation?: { x: number; y: number; z: number };
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function AnimatedModel({
  modelUrl,
  delay = 0,
  duration = 2.5,
  spinTurns = 4,
  finalRotation = { x: 0, y: 0, z: 0 },
}: {
  modelUrl: string;
  delay?: number;
  duration?: number;
  spinTurns?: number;
  finalRotation?: { x: number; y: number; z: number };
}) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const groupRef = useRef<Group>(null);

  useMemo(() => {
    gltf.scene.traverse((obj: any) => {
      if (obj.material && obj.material.map) {
        obj.material.map.colorSpace = SRGBColorSpace;
        obj.material.map.needsUpdate = true;
      }
    });
  }, [gltf.scene]);

  useFrame(({ clock }) => {
    const tRaw = (clock.getElapsedTime() - delay) / duration;
    const t = Math.max(0, Math.min(1, tRaw));
    const ease = easeOutCubic(t);
    const spin = (1 - ease) * spinTurns * Math.PI * 2;

    if (groupRef.current) {
      const rx = spin + finalRotation.x * ease;
      const ry = spin + finalRotation.y * ease;
      const rz = finalRotation.z * ease;
      groupRef.current.rotation.set(rx, ry, rz);
    }
  });

  return (
    <group ref={groupRef} scale={1.2}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export default function CoinModel({
  modelUrl,
  size = 80,
  className,
  delay = 0,
  duration = 2.5,
  spinTurns = 4,
  finalRotation = { x: 0, y: 0, z: 0 },
}: CoinModelProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 3.2], fov: 35 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <directionalLight position={[-3, -2, 2]} intensity={0.6} />
        <Suspense fallback={null}>
          <AnimatedModel
            modelUrl={modelUrl}
            delay={delay}
            duration={duration}
            spinTurns={spinTurns}
            finalRotation={finalRotation}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
