"use client";

import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import type { Group } from "three";
import {
  TextureLoader,
  CircleGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  DoubleSide,
  SRGBColorSpace,
} from "three";

type Coin3DProps = {
  frontImg: string;
  backImg: string;
  size?: number;
  className?: string;
  delay?: number;
  duration?: number;
  spinTurns?: number;
  finalRotation?: { x: number; y: number; z: number };
};

function CoinMesh({
  frontImg,
  backImg,
  delay = 0,
  duration = 2.5,
  spinTurns = 4,
  finalRotation = { x: 0, y: 0, z: 0 },
}: {
  frontImg: string;
  backImg: string;
  delay?: number;
  duration?: number;
  spinTurns?: number;
  finalRotation?: { x: number; y: number; z: number };
}) {
  const [frontTexture, backTexture] = useLoader(TextureLoader, [frontImg, backImg]);
  frontTexture.colorSpace = SRGBColorSpace;
  backTexture.colorSpace = SRGBColorSpace;
  frontTexture.flipY = false;
  backTexture.flipY = false;
  const groupRef = useRef<Group>(null);

  const { sideGeometry, frontGeometry, backGeometry } = useMemo(() => {
    const thickness = 0.08;
    const radius = 1;

    const sideGeometry = new CylinderGeometry(radius, radius, thickness, 64, 1, true);
    sideGeometry.rotateX(Math.PI / 2);

    const frontGeometry = new CircleGeometry(radius, 64);
    const backGeometry = new CircleGeometry(radius, 64);

    return { sideGeometry, frontGeometry, backGeometry };
  }, []);

  const sideMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: 0xaa8833,
        metalness: 0.8,
        roughness: 0.3,
        side: DoubleSide,
      }),
    []
  );

  const frontMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: frontTexture,
        metalness: 0.7,
        roughness: 0.4,
        transparent: true,
        alphaTest: 0.2,
        side: DoubleSide,
      }),
    [frontTexture]
  );

  const backMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: backTexture,
        metalness: 0.7,
        roughness: 0.4,
        side: DoubleSide,
        transparent: true,
        alphaTest: 0.2,
      }),
    [backTexture]
  );

  return (
    <group ref={groupRef}>
      <mesh geometry={sideGeometry} material={sideMaterial} />
      <mesh geometry={frontGeometry} material={frontMaterial} position={[0, 0, 0.041]} />
      <mesh geometry={backGeometry} material={backMaterial} position={[0, 0, -0.041]} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function Coin3D({
  frontImg,
  backImg,
  size = 80,
  className,
  delay = 0,
  duration = 2.5,
  spinTurns = 4,
  finalRotation = { x: 0, y: 0, z: 0 },
}: Coin3DProps) {
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
          <AnimatedCoin
            frontImg={frontImg}
            backImg={backImg}
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

function AnimatedCoin(props: {
  frontImg: string;
  backImg: string;
  delay: number;
  duration: number;
  spinTurns: number;
  finalRotation: { x: number; y: number; z: number };
}) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const tRaw = (clock.getElapsedTime() - props.delay) / props.duration;
    const t = Math.max(0, Math.min(1, tRaw));
    const ease = easeOutCubic(t);
    const spin = (1 - ease) * props.spinTurns * Math.PI * 2;

    if (groupRef.current) {
      const rx = spin + props.finalRotation.x * ease;
      const ry = spin + props.finalRotation.y * ease;
      const rz = props.finalRotation.z * ease;
      groupRef.current.rotation.set(rx, ry, rz);
    }
  });

  return (
    <group ref={groupRef} scale={1.2}>
      <CoinMesh {...props} />
    </group>
  );
}
