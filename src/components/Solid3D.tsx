/**
 * Solid3D — real interactive 3D solids (Three.js / WebGL), for the topics where a
 * flat picture genuinely fails: cubes, spheres, cylinders, cones, pyramids, prisms.
 * The child can DRAG to spin each solid and see its faces, edges and corners.
 * Fully offline (local WebGL). Lazy-loaded so Three.js never bloats the main bundle.
 * Wrapped by VisualBoundary upstream, so a WebGL failure falls back to the caption.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface SolidSpec {
  kind: "cube" | "cuboid" | "sphere" | "cylinder" | "cone" | "pyramid" | "prism";
  size?: number;   // rough overall size (default 1)
  label?: string;
}

function cssColor(varName: string, fallback: string): THREE.Color {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const c = new THREE.Color();
    c.setStyle(v || fallback);
    return c;
  } catch { return new THREE.Color(fallback); }
}

function geometryFor(kind: SolidSpec["kind"], s: number): THREE.BufferGeometry {
  const r = s * 0.6, h = s * 1.2;
  switch (kind) {
    case "cube": return new THREE.BoxGeometry(s, s, s);
    case "cuboid": return new THREE.BoxGeometry(s * 1.4, s, s * 0.8);
    case "sphere": return new THREE.SphereGeometry(r, 40, 28);
    case "cylinder": return new THREE.CylinderGeometry(r, r, h, 40);
    case "cone": return new THREE.ConeGeometry(r, h, 40);
    case "pyramid": return new THREE.ConeGeometry(r, h, 4); // square-based pyramid
    case "prism": return new THREE.CylinderGeometry(r, r, h, 3); // triangular prism
    default: return new THREE.BoxGeometry(s, s, s);
  }
}

export function Solid3D({ solids, caption }: { solids: SolidSpec[]; caption?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const list = (solids || []).slice(0, 4);
    if (!list.length) return;

    const W = mount.clientWidth || 460, H = 300;
    const accent = cssColor("--accent", "#ff9f43");
    const good = cssColor("--good", "#2e7d32");
    const ink = cssColor("--ink", "#3d2f1e");

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D shapes — drag to rotate");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 1.4, 6.5);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(4, 6, 5);
    scene.add(dir);

    const group = new THREE.Group();
    const spacing = 2.6;
    const startX = -((list.length - 1) * spacing) / 2;
    const meshes: THREE.Mesh[] = [];
    list.forEach((sp, i) => {
      const s = sp.size ?? 1.4;
      const geo = geometryFor(sp.kind, s);
      const col = i % 2 === 0 ? accent : good;
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.1, flatShading: sp.kind !== "sphere" });
      const mesh = new THREE.Mesh(geo, mat);
      // crisp edges so faces/edges/corners are visible
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), new THREE.LineBasicMaterial({ color: ink }));
      mesh.add(edges);
      mesh.position.x = startX + i * spacing;
      group.add(mesh);
      meshes.push(mesh);
    });
    scene.add(group);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.autoRotate = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 1.6;
    controls.minDistance = 3.5;
    controls.maxDistance = 12;

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
      meshes.forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [solids]);

  return (
    <figure className="fm-visual fm-solid3d">
      <div ref={mountRef} className="fm-solid3d-stage" />
      {(solids ?? []).some((s) => s.label) && (
        <div className="fm-solid3d-labels">
          {solids.slice(0, 4).map((s, i) => s.label ? <span key={i} className="fm-solid3d-label">{s.label}</span> : null)}
        </div>
      )}
      <figcaption>{caption ? caption + " · " : ""}Drag to spin the shapes! 🖐️</figcaption>
    </figure>
  );
}
