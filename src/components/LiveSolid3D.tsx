/**
 * LiveSolid3D — a solid whose DIMENSIONS respond live to slider input.
 * Unlike Solid3D (fixed-size, rotate-only), this rebuilds just the geometry
 * on every parameter change while keeping the renderer/scene/camera/controls
 * alive — so dragging a slider feels instant, with no flicker or re-mount.
 * Same imperative Three.js style as Solid3D/Scene3D; lazy-loaded by the caller.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function cssColor(varName: string, fallback: string): THREE.Color {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const c = new THREE.Color();
    c.setStyle(v || fallback);
    return c;
  } catch { return new THREE.Color(fallback); }
}

const COLOR_VAR: Record<string, [string, string]> = {
  accent: ["--accent", "#ff9f43"],
  good: ["--good", "#2e7d32"],
  cool: ["--accent-dark", "#3d6bd6"],
};

function geometryFor(shape: string, p: Record<string, number>): THREE.BufferGeometry {
  const g = (k: string, d: number) => (Number.isFinite(p[k]) && p[k] > 0 ? p[k] : d);
  switch (shape) {
    case "cube": { const s = g("s", 1); return new THREE.BoxGeometry(s, s, s); }
    case "cuboid": return new THREE.BoxGeometry(g("l", 1), g("h", 1), g("w", 1));
    case "cylinder": { const r = g("r", 1); return new THREE.CylinderGeometry(r, r, g("h", 1), 40); }
    case "cone": return new THREE.ConeGeometry(g("r", 1), g("h", 1), 40);
    case "sphere": return new THREE.SphereGeometry(g("r", 1), 40, 28);
    default: {
      // Best-effort fallback for future shapes: use whichever params exist.
      if ("l" in p && "w" in p && "h" in p) return new THREE.BoxGeometry(g("l", 1), g("h", 1), g("w", 1));
      if ("r" in p && "h" in p) return new THREE.CylinderGeometry(g("r", 1), g("r", 1), g("h", 1), 40);
      if ("r" in p) return new THREE.SphereGeometry(g("r", 1), 40, 28);
      const s = g("s", 1); return new THREE.BoxGeometry(s, s, s);
    }
  }
}

export function LiveSolid3D({
  shape,
  params,
  maxExtent = 5,
  color = "accent",
  caption,
}: {
  shape: string;
  params: Record<string, number>;
  /** Largest a dimension can get (drives camera distance so the shape always fits). */
  maxExtent?: number;
  color?: "accent" | "good" | "cool";
  caption?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const edgesRef = useRef<THREE.LineSegments | null>(null);

  // One-time setup: renderer, scene, camera, lights, controls, animate loop.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 460, H = 300;

    const [varName, fallback] = COLOR_VAR[color] ?? COLOR_VAR.accent;
    const col = cssColor(varName, fallback);
    const ink = cssColor("--ink", "#3d2f1e");

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "Live 3D shape — drag sliders to resize, drag to rotate");

    const scene = new THREE.Scene();
    const dist = Math.max(6, maxExtent * 2.4 + 2);
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, dist * 6);
    camera.position.set(0, dist * 0.32, dist);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(4, 6, 5);
    scene.add(dir);

    const geo = geometryFor(shape, params);
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.1, flatShading: shape !== "sphere" });
    const mesh = new THREE.Mesh(geo, mat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), new THREE.LineBasicMaterial({ color: ink }));
    mesh.add(edges);
    scene.add(mesh);
    meshRef.current = mesh;
    edgesRef.current = edges;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.autoRotate = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 1.4;
    controls.minDistance = dist * 0.3;
    controls.maxDistance = dist * 2.5;

    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth || W;
      renderer.setSize(w, H); camera.aspect = w / H; camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      geo.dispose(); mat.dispose();
      edges.geometry.dispose(); (edges.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      meshRef.current = null; edgesRef.current = null;
    };
    // Renderer/scene are built once per shape+color; params are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, color, maxExtent]);

  // Live update: on every slider change, swap ONLY the geometry — no re-mount, no flicker.
  useEffect(() => {
    const mesh = meshRef.current, edges = edgesRef.current;
    if (!mesh || !edges) return;
    const oldGeo = mesh.geometry;
    const newGeo = geometryFor(shape, params);
    mesh.geometry = newGeo;
    const oldEdgeGeo = edges.geometry;
    edges.geometry = new THREE.EdgesGeometry(newGeo, 15);
    oldGeo.dispose();
    oldEdgeGeo.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, JSON.stringify(params)]);

  return (
    <figure className="fm-visual fm-solid3d fm-live-solid3d">
      <div ref={mountRef} className="fm-solid3d-stage" />
      <figcaption>{caption ? caption + " · " : ""}Drag a slider to resize · drag the shape to spin it! 🖐️</figcaption>
    </figure>
  );
}
