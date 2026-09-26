import { useEffect, useRef } from "react";
import type { ChartSlice } from "@/components/budget/spend-chart";

type Donut3DProps = {
  slices: ChartSlice[];
  onSelect?: (categoryId: string) => void;
  onUnavailable?: () => void;
};

function resolveColor(input: string) {
  const probe = document.createElement("span");
  probe.style.color = input;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || "#475569";
}

export function Donut3D({ slices, onSelect, onUnavailable }: Donut3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const selectRef = useRef(onSelect);
  const failRef = useRef(onUnavailable);
  selectRef.current = onSelect;
  failRef.current = onUnavailable;
  const slicesRef = useRef(slices);
  slicesRef.current = slices;
  const signature = slices.map((slice) => `${slice.categoryId}:${slice.cents}:${slice.fill}`).join("|");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stopped = false;
    let cleanup = () => {};

    void import("three").then((THREE) => {
      if (stopped || !host.current) return;
      const width = host.current.clientWidth || 280;
      const height = 300;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      if (!renderer.getContext()) {
        renderer.dispose();
        failRef.current?.();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      host.current.replaceChildren(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 50);
      camera.position.set(0, 2.8, 2.8);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 0.72));
      const light = new THREE.DirectionalLight(0xffffff, 1.15);
      light.position.set(2.5, 4, 2);
      scene.add(light);

      const current = slicesRef.current;
      const group = new THREE.Group();
      const total = current.reduce((sum, slice) => sum + slice.cents, 0) || 1;
      let angle = -Math.PI / 2;
      for (const slice of current) {
        const sweep = (slice.cents / total) * Math.PI * 2;
        const span = Math.max(sweep - (current.length > 1 && sweep > 0.05 ? 0.02 : 0), 0.012);
        const shape = new THREE.Shape();
        shape.absarc(0, 0, 1.32, angle, angle + span, false);
        shape.absarc(0, 0, 0.82, angle + span, angle, true);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.26,
          bevelEnabled: true,
          bevelThickness: 0.02,
          bevelSize: 0.015,
          bevelSegments: 1,
          curveSegments: Math.max(6, Math.ceil(span * 14)),
        });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: resolveColor(slice.fill), roughness: 0.42, metalness: 0.04 }),
        );
        mesh.userData = { id: slice.categoryId };
        group.add(mesh);
        angle += sweep;
      }
      scene.add(group);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let frame = 0;
      let progress = reduce ? 1 : 0;
      const draw = () => {
        group.rotation.y = -0.55 * (1 - progress) * (1 - progress);
        renderer.render(scene, camera);
      };
      const tick = () => {
        if (stopped || document.hidden) return;
        progress = Math.min(progress + 0.018, 1);
        draw();
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      tick();

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(group.children, false)[0];
        const id = hit?.object.userData.id as string | undefined;
        if (id && id !== "other") selectRef.current?.(id);
      };
      renderer.domElement.addEventListener("pointerdown", pick);
      renderer.domElement.style.touchAction = "manipulation";

      const onResize = () => {
        const next = host.current?.clientWidth || width;
        camera.aspect = next / height;
        camera.updateProjectionMatrix();
        renderer.setSize(next, height);
        draw();
      };
      const observer = new ResizeObserver(onResize);
      observer.observe(host.current);
      const onLost = (event: Event) => {
        event.preventDefault();
        failRef.current?.();
      };
      renderer.domElement.addEventListener("webglcontextlost", onLost);

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        renderer.domElement.removeEventListener("pointerdown", pick);
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        group.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            const material = node.material;
            if (Array.isArray(material)) material.forEach((item) => item.dispose());
            else material.dispose();
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    }).catch(() => failRef.current?.());

    return () => {
      stopped = true;
      cleanup();
    };
  }, [signature]);

  return <div ref={host} className="h-[300px] w-full" />;
}
