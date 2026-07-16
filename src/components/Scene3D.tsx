/**
 * Scene3D — richer interactive 3D scenes (Three.js) for senior geometry, where a flat
 * picture genuinely fails:
 *   • a POINT plotted in 3D space (with a dashed line to the origin)   → 3D coordinates
 *   • a VECTOR drawn as a real arrow from the origin                    → vector algebra
 *   • a CONE with a tilted slicing PLANE                               → conic sections
 * Drag to orbit. Fully offline (local WebGL); lazy-loaded so Three.js stays code-split.
 * Wrapped by VisualBoundary upstream, so any WebGL failure falls back to the caption.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface Scene3DSpec {
  axes?: boolean;
  points?: { x: number; y: number; z: number; label?: string }[];
  vectors?: { x: number; y: number; z: number; label?: string }[];
  cone?: { tilt?: number; label?: string };
}

function cssColor(v: string, fb: string): THREE.Color {
  try { const s = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); const c = new THREE.Color(); c.setStyle(s || fb); return c; }
  catch { return new THREE.Color(fb); }
}

export function Scene3D({ spec, caption }: { spec: Scene3DSpec; caption?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !spec) return;
    const W = mount.clientWidth || 460, H = 320;
    const accent = cssColor("--accent", "#ff9f43");
    const good = cssColor("--good", "#2e7d32");
    const cool = cssColor("--accent-dark", "#b4620a");
    const ink = cssColor("--ink", "#3d2f1e");

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D scene — drag to rotate");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
    camera.position.set(6, 5, 8);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 1.0); dl.position.set(5, 8, 6); scene.add(dl);

    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(o: T) => { disposables.push(o); return o; };

    // ---- axes ----
    if (spec.axes || spec.points?.length || spec.vectors?.length) {
      const L = 5;
      const mk = (dir: THREE.Vector3, col: THREE.Color) =>
        scene.add(new THREE.ArrowHelper(dir.clone().normalize(), new THREE.Vector3(0, 0, 0), L, col.getHex(), 0.35, 0.22));
      mk(new THREE.Vector3(1, 0, 0), accent);
      mk(new THREE.Vector3(0, 1, 0), good);
      mk(new THREE.Vector3(0, 0, 1), cool);
      const grid = new THREE.GridHelper(10, 10, ink.getHex(), ink.getHex());
      (grid.material as THREE.Material).opacity = 0.18; (grid.material as THREE.Material).transparent = true;
      scene.add(grid);
    }

    // ---- plotted points (with dashed line to origin) ----
    for (const p of spec.points ?? []) {
      const v = new THREE.Vector3(p.x, p.y, p.z);
      const dot = new THREE.Mesh(track(new THREE.SphereGeometry(0.16, 20, 16)), track(new THREE.MeshStandardMaterial({ color: accent })));
      dot.position.copy(v); scene.add(dot);
      const g = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), v]));
      const line = new THREE.Line(g, track(new THREE.LineDashedMaterial({ color: ink, dashSize: 0.25, gapSize: 0.18 })));
      line.computeLineDistances(); scene.add(line);
    }

    // ---- vectors (arrows from origin) ----
    for (const vv of spec.vectors ?? []) {
      const v = new THREE.Vector3(vv.x, vv.y, vv.z);
      scene.add(new THREE.ArrowHelper(v.clone().normalize(), new THREE.Vector3(0, 0, 0), v.length(), accent.getHex(), 0.4, 0.26));
    }

    // ---- cone with a tilted slicing plane (conic sections) ----
    if (spec.cone) {
      const cone = new THREE.Mesh(
        track(new THREE.ConeGeometry(2, 4, 48, 1, true)),
        track(new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.5 })));
      cone.position.y = 0; scene.add(cone);
      const tilt = spec.cone.tilt ?? 0.5;
      const plane = new THREE.Mesh(
        track(new THREE.CircleGeometry(3.2, 48)),
        track(new THREE.MeshStandardMaterial({ color: good, transparent: true, opacity: 0.4, side: THREE.DoubleSide })));
      plane.rotation.x = Math.PI / 2 - tilt; scene.add(plane);
      const ring = new THREE.Mesh(track(new THREE.TorusGeometry(1.35, 0.05, 12, 60)), track(new THREE.MeshStandardMaterial({ color: cool })));
      ring.rotation.x = Math.PI / 2 - tilt; scene.add(ring);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 1.1;
    controls.minDistance = 5; controls.maxDistance = 24; controls.target.set(0, 1, 0);

    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    const ro = new ResizeObserver(() => { const w = mount.clientWidth || W; renderer.setSize(w, H); camera.aspect = w / H; camera.updateProjectionMatrix(); });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [spec]);

  const labels = [...(spec?.points ?? []), ...(spec?.vectors ?? [])].filter((p) => p.label);
  return (
    <figure className="fm-visual fm-solid3d">
      <div ref={mountRef} className="fm-solid3d-stage" />
      {(labels.length > 0 || spec?.cone?.label) && (
        <div className="fm-solid3d-labels">
          {spec?.cone?.label && <span className="fm-solid3d-label">{spec.cone.label}</span>}
          {labels.map((p, i) => <span key={i} className="fm-solid3d-label">{p.label}</span>)}
        </div>
      )}
      <figcaption>{caption ? caption + " · " : ""}Drag to orbit the scene! 🖐️</figcaption>
    </figure>
  );
}
