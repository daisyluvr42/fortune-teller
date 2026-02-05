"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { Group, Object3D } from "three";
import { SRGBColorSpace } from "three";

type CoinSpec = {
  top: number;
  left: number;
  delay: number;
  duration: number;
  spinTurns: number;
  finalRotation: { x: number; y: number; z: number };
  face: 0 | 1;
};

type CoinTossSceneProps = {
  modelUrl: string;
  coins: CoinSpec[];
  seed: number;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useSizedPositions(coins: CoinSpec[]) {
  const { viewport } = useThree();
  return useMemo(() => {
    return coins.map((coin) => {
      const x = (coin.left / 100 - 0.5) * viewport.width;
      const y = (0.5 - coin.top / 100) * viewport.height;
      return { ...coin, x, y };
    });
  }, [coins, viewport.height, viewport.width]);
}

function CoinInstance({
  base,
  model,
  startAtRef,
}: {
  base: CoinSpec & { x: number; y: number };
  model: Object3D;
  startAtRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const now = performance.now() / 1000;
    const tRaw = (now - startAtRef.current - base.delay) / base.duration;
    const t = Math.max(0, Math.min(1, tRaw));
    const ease = easeOutCubic(t);
    const spin = (1 - ease) * base.spinTurns * Math.PI * 2;
    const lift = Math.sin(Math.PI * ease) * 0.6;

    if (groupRef.current) {
      const rx = spin + base.finalRotation.x * ease;
      const ry = spin + (base.face === 1 ? Math.PI : 0) + base.finalRotation.y * ease;
      const rz = base.finalRotation.z * ease;
      groupRef.current.rotation.set(rx, ry, rz);
      groupRef.current.position.set(base.x, base.y + lift, 0);
    }
  });

  return <primitive ref={groupRef} object={model} />;
}

function Coins({ modelUrl, coins, seed }: CoinTossSceneProps) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const positionedCoins = useSizedPositions(coins);
  const startAtRef = useRef(0);
  const lastSeedRef = useRef<number | null>(null);

  useMemo(() => {
    gltf.scene.traverse((obj: any) => {
      if (obj.material && obj.material.map) {
        obj.material.map.colorSpace = SRGBColorSpace;
        obj.material.map.needsUpdate = true;
      }
    });
  }, [gltf.scene]);

  useEffect(() => {
    if (lastSeedRef.current !== seed) {
      startAtRef.current = performance.now() / 1000;
      lastSeedRef.current = seed;
    }
  }, [seed]);

  return (
    <group scale={1.2}>
      {positionedCoins.map((coin, idx) => (
        <CoinInstance key={idx} base={coin} model={gltf.scene.clone(true)} startAtRef={startAtRef} />
      ))}
    </group>
  );
}

export default function CoinTossScene({ modelUrl, coins, seed }: CoinTossSceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 6], fov: 40 }}
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <directionalLight position={[-3, -2, 2]} intensity={0.6} />
      <Suspense fallback={null}>
        <Coins modelUrl={modelUrl} coins={coins} seed={seed} />
      </Suspense>
    </Canvas>
  );
}
