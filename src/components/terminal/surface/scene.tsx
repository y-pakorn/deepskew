"use client";

import { useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { SurfaceRow } from "@/lib/surface";
import { type HoverInfo, SurfaceReadout } from "./readout";
import { VolSurface } from "./vol-surface";

/** The r3f Canvas hosting the rotating, blooming vol surface. Auto-rotation
 *  pauses while the cursor is reading a point off the surface. */
export function SurfaceScene({
  rows,
  version,
  onTenorHover,
}: {
  rows: SurfaceRow[];
  version: number;
  onTenorHover?: (index: number | null) => void;
}) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const handleHover = (info: HoverInfo | null) => {
    setHover(info);
    onTenorHover?.(info ? info.tenorIndex : null);
  };
  return (
    <>
      <Canvas
        className="!absolute inset-0"
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ position: [3.1, 2.7, 3.7], fov: 35 }}
      >
        <color attach="background" args={["#0a0b0e"]} />
        <fogExp2 attach="fog" args={["#0a0b0e", 0.05]} />
        <group position={[0, -0.5, 0]}>
          <VolSurface rows={rows} version={version} onHover={handleHover} />
        </group>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          autoRotate={!hover}
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
      <SurfaceReadout info={hover} />
    </>
  );
}
