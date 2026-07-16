/**
 * Surface3D — a REAL interactive 3D surface z = f(x, y) rendered with Three.js/WebGL.
 * Replaces the old flat-canvas "3D surface" wireframe in the Advanced Tools dock with a
 * genuine mesh the student can DRAG to orbit. Height is colour-mapped (blue → green →
 * orange) and a faint wireframe shows the grid. Fully offline (local WebGL).
 * Mirrors the proven Solid3D renderer / OrbitControls / dispose pattern.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function Surface3D({ sample }: { sample: (x: number, y: number) => number }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 560, H = 460;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D surface — drag to rotate");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(5.5, 5, 7);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    // ---- build the surface mesh from z = f(x, y) ----
    const N = 48, span = 6;                       // x, y in [-3, 3]
    const geo = new THREE.PlaneGeometry(span, span, N, N);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;

    let zmin = Infinity, zmax = -Infinity;
    const heights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);     // plane lies in local XY
      let z = sample(x, y);
      if (!isFinite(z)) z = 0;
      z = Math.max(-1e4, Math.min(1e4, z));
      heights[i] = z;
      if (z < zmin) zmin = z;
      if (z > zmax) zmax = z;
    }
    const range = (zmax - zmin) || 1;
    const k = 3 / range;                          // scale peak-to-peak to ~3 world units
    const mid = (zmin + zmax) / 2;

    const colors = new Float32Array(pos.count * 3);
    const cLow = new THREE.Color("#3b82f6"), cMid = new THREE.Color("#22c55e"), cHigh = new THREE.Color("#f97316");
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (heights[i] - mid) * k);        // displace local z (becomes world "up" after rotation)
      const t = (heights[i] - zmin) / range;      // 0..1
      if (t < 0.5) tmp.copy(cLow).lerp(cMid, t * 2);
      else tmp.copy(cMid).lerp(cHigh, (t - 0.5) * 2);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;               // lay the plane flat so height points up
    scene.add(mesh);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x1b1533, transparent: true, opacity: 0.12 })
    );
    mesh.add(wire);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.minDistance = 4;
    controls.maxDistance = 18;

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
      (wire.geometry as THREE.BufferGeometry).dispose();
      (wire.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [sample]);

  return <div ref={mountRef} className="fm-solid3d-stage" style={{ height: 460, cursor: "grab" }} />;
}
