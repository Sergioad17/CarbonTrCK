import React, { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

function Model() {
  const { scene } = useGLTF("/Landing/Models/carcasa_prototipo.glb");
  const autoRotateRef = useRef(null);
  const fitRef = useRef(null);
  const uprightRotation = [-Math.PI / 2, Math.PI, 0];

  useLayoutEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useLayoutEffect(() => {
    if (!fitRef.current) return;

    const box = new THREE.Box3().setFromObject(fitRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 1.5;
    const scale = targetSize / maxAxis;

    fitRef.current.scale.setScalar(scale);
    fitRef.current.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [scene]);

  useFrame((_, delta) => {
    if (autoRotateRef.current) {
      autoRotateRef.current.rotation.y += delta * 0.22;
    }
  });

  return (
    <group ref={autoRotateRef} position={[0, -0.10, 0]}>
      <group ref={fitRef} rotation={uprightRotation}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div
        style={{
          color: "rgba(241,245,249,.72)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        loading
      </div>
    </Html>
  );
}

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(241,245,249,.72)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          model unavailable
        </div>
      );
    }

    return this.props.children;
  }
}

export default function HeroModel() {
  return (
    <ModelErrorBoundary>
      <div style={{ width: "100%", height: "100%" }}>
        <Canvas
          shadows
          dpr={[1, 1.8]}
          camera={{ position: [0, 0.35, 3.2], fov: 38 }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <ambientLight intensity={0.55} />
            <directionalLight
              position={[4, 5, 3]}
              intensity={1.15}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <directionalLight position={[-3, 2, -2]} intensity={0.35} />

            <Model />

            <mesh rotation-x={-Math.PI / 2} position={[0, -1.05, 0]} receiveShadow>
              <planeGeometry args={[12, 12]} />
              <shadowMaterial opacity={0.22} />
            </mesh>

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              minAzimuthAngle={-0.6}
              maxAzimuthAngle={0.6}
              minPolarAngle={Math.PI / 2 - 0.28}
              maxPolarAngle={Math.PI / 2 + 0.22}
            />
          </Suspense>
        </Canvas>
      </div>
    </ModelErrorBoundary>
  );
}

useGLTF.preload("/Landing/Models/carcasa_prototipo.glb");
