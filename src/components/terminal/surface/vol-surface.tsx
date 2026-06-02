"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  type LineBasicMaterial,
} from "three";
import { buildSurface, type SurfaceRow } from "@/lib/surface";

/**
 * Glowing IV surface: a faint solid sheet + a clean quad wireframe with additive
 * blending (bright line crossings sparkle; bloom in the scene does the glow).
 * Geometry rebuilds only when `version` changes (a checksum of the live SVI
 * data), keeping GPU uploads off the 1s clock tick.
 */
export function VolSurface({
  rows,
  version,
}: {
  rows: SurfaceRow[];
  version: number;
}) {
  const geom = useMemo(() => {
    const data = buildSurface(rows);
    if (!data) return null;
    const position = new BufferAttribute(data.positions, 3);
    const color = new BufferAttribute(data.colors, 3);
    const fill = new BufferGeometry();
    fill.setAttribute("position", position);
    fill.setAttribute("color", color);
    fill.setIndex(new BufferAttribute(data.indices, 1));
    const lines = new BufferGeometry();
    lines.setAttribute("position", position);
    lines.setAttribute("color", color);
    lines.setIndex(new BufferAttribute(data.lineIndices, 1));
    return { fill, lines };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version captures rows' content
  }, [version]);

  useEffect(
    () => () => {
      geom?.fill.dispose();
      geom?.lines.dispose();
    },
    [geom],
  );

  // Flare the wireframe on each new SVI tick (~700ms decay).
  const wireRef = useRef<LineBasicMaterial>(null);
  const pulseStart = useRef(-Infinity);
  useEffect(() => {
    pulseStart.current = performance.now();
  }, [version]);

  useFrame(() => {
    const m = wireRef.current;
    if (!m) return;
    const e = performance.now() - pulseStart.current;
    const pulse = e >= 0 && e < 700 ? 1 - e / 700 : 0;
    m.opacity = 0.85 + 0.25 * pulse;
  });

  if (!geom) return null;
  return (
    <group>
      <mesh geometry={geom.fill}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.1}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={geom.lines}>
        <lineBasicMaterial
          ref={wireRef}
          vertexColors
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
