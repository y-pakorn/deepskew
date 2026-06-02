"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { SurfaceRow } from "@/lib/surface";
import { VolSurface } from "./vol-surface";

/** The r3f Canvas hosting the rotating, blooming vol surface. */
export function SurfaceScene({
  rows,
  version,
}: {
  rows: SurfaceRow[];
  version: number;
}) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [3.6, 3.2, 4.4], fov: 32 }}
    >
      <color attach="background" args={["#0a0b0e"]} />
      <fogExp2 attach="fog" args={["#0a0b0e", 0.05]} />
      <group position={[0, -0.5, 0]}>
        <VolSurface rows={rows} version={version} />
      </group>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.35}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.42}
        target={[0, 0.15, 0]}
      />
      <EffectComposer>
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.12}
          luminanceSmoothing={0.4}
          radius={0.7}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
