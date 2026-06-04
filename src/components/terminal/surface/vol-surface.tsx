"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  type LineBasicMaterial,
} from "three";
import { buildSurface, type SurfaceRow, X_HALF, Z_HALF } from "@/lib/surface";
import type { HoverInfo } from "./readout";

/** Markers must never intercept the ray, or hovering one breaks the readout. */
const noRaycast = () => null;
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

/**
 * Glowing IV surface: a faint solid sheet + a clean quad wireframe with additive
 * blending (bright line crossings sparkle; bloom in the scene does the glow).
 * Real oracle tenors render at full brightness; interpolated ribs are dimmed so
 * they fill in the surface without blowing out under bloom. Geometry rebuilds
 * only when `version` changes (a checksum of the live SVI data), keeping GPU
 * uploads off the 1s clock tick.
 *
 * Pointer-move raycasts the sheet, snaps to the nearest grid node, drops a
 * marker, and reports the node up via `onHover` for the DOM readout.
 */
export function VolSurface({
  rows,
  version,
  onHover,
  selectedIndex,
  onSelect,
}: {
  rows: SurfaceRow[];
  version: number;
  onHover: (info: HoverInfo | null) => void;
  /** Index (into `rows`) of the desk's active expiry, or -1 for none. */
  selectedIndex?: number;
  /** Lock the desk to a tenor by clicking its rib. */
  onSelect?: (index: number) => void;
}) {
  const { geom, data } = useMemo(() => {
    const d = buildSurface(rows);
    if (!d) return { geom: null, data: null };
    const position = new BufferAttribute(d.positions, 3);
    const fill = new BufferGeometry();
    fill.setAttribute("position", position);
    fill.setAttribute("color", new BufferAttribute(d.colors, 3));
    fill.setIndex(new BufferAttribute(d.indices, 1));
    const lines = new BufferGeometry();
    lines.setAttribute("position", position);
    lines.setAttribute("color", new BufferAttribute(d.lineColors, 3));
    lines.setIndex(new BufferAttribute(d.lineIndices, 1));
    return { geom: { fill, lines }, data: d };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version captures rows' content
  }, [version]);

  useEffect(
    () => () => {
      geom?.fill.dispose();
      geom?.lines.dispose();
    },
    [geom],
  );

  // Flare the wireframe on each new SVI tick (~700ms decay). Base opacity is
  // lower than the sparse surface so the denser grid doesn't blow out.
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
    m.opacity = 0.5 + 0.3 * pulse;
  });

  // Hover picking. The mesh sits at the origin with no rotation (OrbitControls
  // moves the camera, not the object), so a world-space hit inverts straight
  // back to grid coordinates from x and z alone. The tenor (row) snaps to the
  // nearest real oracle rib so the readout, the highlighted rib, and the bottom
  // tenor strip all refer to the same real expiry.
  const [pick, setPick] = useState<{ row: number; col: number } | null>(null);
  // Tenor index under the cursor + the pointer-down spot, so a click can lock
  // the desk to a rib while a drag is left to OrbitControls for orbiting.
  const hoverIdx = useRef<number | null>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!data) return;
      e.stopPropagation();
      const { nk, nr } = data;
      const c = clamp(
        Math.round(((e.point.x / X_HALF + 1) / 2) * (nk - 1)),
        nk - 1,
      );
      const r = clamp(
        Math.round(((1 - e.point.z / Z_HALF) / 2) * (nr - 1)),
        nr - 1,
      );
      const row = data.nearestRealRow[r];
      setPick({ row, col: c });
      hoverIdx.current = data.nearestRealIdx[r];
      const canvas = e.nativeEvent.target as HTMLElement | null;
      if (canvas) canvas.style.cursor = "pointer";
      onHover({
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
        w: canvas?.clientWidth ?? 0,
        h: canvas?.clientHeight ?? 0,
        k: data.colK[c],
        T: data.rowT[row],
        iv: data.ivGrid[row * nk + c],
        tenorIndex: data.nearestRealIdx[r],
      });
    },
    [data, onHover],
  );

  const handleOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    const canvas = e.nativeEvent.target as HTMLElement | null;
    if (canvas) canvas.style.cursor = "";
    setPick(null);
    hoverIdx.current = null;
    onHover(null);
  }, [onHover]);

  const handleDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    downPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const d = downPos.current;
      downPos.current = null;
      if (!d || hoverIdx.current == null) return;
      // Released far from where it went down → that was a drag to orbit.
      const moved = Math.hypot(
        e.nativeEvent.clientX - d.x,
        e.nativeEvent.clientY - d.y,
      );
      if (moved > 6) return;
      onSelect?.(hoverIdx.current);
    },
    [onSelect],
  );

  // The hovered tenor's smile curve, lifted a hair off the sheet so it reads as
  // a bright iso-tenor rib over the dim grid.
  const ribGeom = useMemo(() => {
    if (!data || !pick || pick.row >= data.nr) return null;
    const { nk } = data;
    const seg = new Float32Array((nk - 1) * 2 * 3);
    let o = 0;
    for (let c = 0; c < nk - 1; c++) {
      for (const cc of [c, c + 1]) {
        const b = (pick.row * nk + cc) * 3;
        seg[o++] = data.positions[b];
        seg[o++] = data.positions[b + 1] + 0.012;
        seg[o++] = data.positions[b + 2];
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(seg, 3));
    return g;
  }, [data, pick]);

  useEffect(() => () => ribGeom?.dispose(), [ribGeom]);

  // A persistent accent rib marking the desk's active expiry, so the surface
  // reflects the selected tenor even when nothing is hovered. Sits a hair below
  // the hover rib so hovering the active tenor still reads white on top.
  const selectedRibGeom = useMemo(() => {
    if (
      !data ||
      selectedIndex == null ||
      selectedIndex < 0 ||
      selectedIndex >= data.realRows.length
    )
      return null;
    const row = data.realRows[selectedIndex];
    if (row < 0 || row >= data.nr) return null;
    const { nk } = data;
    const seg = new Float32Array((nk - 1) * 2 * 3);
    let o = 0;
    for (let c = 0; c < nk - 1; c++) {
      for (const cc of [c, c + 1]) {
        const b = (row * nk + cc) * 3;
        seg[o++] = data.positions[b];
        seg[o++] = data.positions[b + 1] + 0.009;
        seg[o++] = data.positions[b + 2];
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(seg, 3));
    return g;
  }, [data, selectedIndex]);

  useEffect(() => () => selectedRibGeom?.dispose(), [selectedRibGeom]);

  const markerPos =
    data && pick && pick.row < data.nr
      ? ([
          data.positions[(pick.row * data.nk + pick.col) * 3],
          data.positions[(pick.row * data.nk + pick.col) * 3 + 1],
          data.positions[(pick.row * data.nk + pick.col) * 3 + 2],
        ] as [number, number, number])
      : null;

  if (!geom) return null;
  return (
    <group>
      <mesh
        geometry={geom.fill}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onPointerDown={handleDown}
        onClick={handleClick}
      >
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
          opacity={0.5}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
      {selectedRibGeom ? (
        <lineSegments geometry={selectedRibGeom} raycast={noRaycast}>
          <lineBasicMaterial
            color="#1f93ff"
            transparent
            opacity={0.9}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ) : null}
      {ribGeom ? (
        <lineSegments geometry={ribGeom} raycast={noRaycast}>
          <lineBasicMaterial
            color="#cdeeff"
            transparent
            opacity={0.95}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ) : null}
      {markerPos ? (
        <mesh position={markerPos} raycast={noRaycast}>
          <sphereGeometry args={[0.028, 16, 16]} />
          <meshBasicMaterial color="#eaf6ff" toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}
