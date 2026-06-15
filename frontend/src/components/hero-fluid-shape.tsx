"use client";
import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere, Environment, Float } from "@react-three/drei";
import * as THREE from "three";

function PremiumOrb() {
  const groupRef = useRef<THREE.Group>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<any>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const { viewport, mouse } = useThree();
  
  const [hovered, setHovered] = useState(false);
  const [isBlasted, setIsBlasted] = useState(false);
  
  // Physics & interaction tracking
  const prevMouse = useRef({ x: 0, y: 0 });
  const mouseVelocity = useRef(0);
  const jumpSpike = useRef(0);

  // Auto-reset on scroll
  useEffect(() => {
    const handleScroll = () => {
      // Lower threshold to ensure reset triggers even on smaller scrolls
      if (window.scrollY > 200) {
        setIsBlasted(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (!isBlasted) {
      setIsBlasted(true);
      jumpSpike.current = 0.8; // Safe spike to avoid breaking distortion bounds
    } else {
      jumpSpike.current = 0.5; // Tap ripples when already full
    }
  };

  useFrame((state, delta) => {
    const safeDelta = Math.max(delta, 0.001); // Prevent division by zero
    // 1. Calculate Mouse Velocity for Sloshing
    const dx = mouse.x - prevMouse.current.x;
    const dy = mouse.y - prevMouse.current.y;
    const currentVel = Math.sqrt(dx * dx + dy * dy) / safeDelta;
    mouseVelocity.current = THREE.MathUtils.lerp(mouseVelocity.current, currentVel, 0.1);
    prevMouse.current = { x: mouse.x, y: mouse.y };

    // Decay jump spike
    if (jumpSpike.current > 0) {
      jumpSpike.current = THREE.MathUtils.lerp(jumpSpike.current, 0, 0.05);
    }

    if (groupRef.current) {
      // Slosh: Add a slight tilt based on velocity direction if blasted
      const targetX = (mouse.x * viewport.width) / 10;
      const targetY = (mouse.y * viewport.height) / 10;
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.05);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.05);
      
      // Gentle continuous rotation
      groupRef.current.rotation.x += safeDelta * 0.15;
      groupRef.current.rotation.y += safeDelta * 0.2;
    }
    
    if (coreRef.current) {
      // 2. Dynamic Fluid States
      let targetSpeed, targetDistort, targetScale;

      if (isBlasted) {
        // Strict boundary math: max reach = targetScale + targetDistort. Outer shell is 1.2.
        // We set targetScale to 0.85 and strictly cap distortion at 0.34 so 0.85 + 0.34 = 1.19 (safe).
        targetScale = 0.85; 
        const sloshDistort = Math.min(mouseVelocity.current * 0.2, 0.2);
        targetDistort = Math.min(0.2 + sloshDistort + (jumpSpike.current * 0.5), 0.34); 
        targetSpeed = 2.0 + (mouseVelocity.current * 2) + (jumpSpike.current * 3);
      } else {
        targetScale = 0.65;
        targetSpeed = hovered ? 4 : 1.5;
        targetDistort = hovered ? 0.45 : 0.25;
      }

      // Smoothly interpolate material properties
      coreRef.current.speed = THREE.MathUtils.lerp(coreRef.current.speed, targetSpeed, 0.1);
      coreRef.current.distort = THREE.MathUtils.lerp(coreRef.current.distort, targetDistort, 0.1);
      
      // Smoothly scale the mesh itself to blast/recede
      if (innerMeshRef.current) {
        const currentScale = innerMeshRef.current.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.08);
        innerMeshRef.current.scale.set(newScale, newScale, newScale);
      }
    }
  });

  const scale = viewport.width < 6 ? 1.4 : 2.2;

  return (
    <group ref={groupRef} scale={scale}>
      <Float speed={isBlasted ? 1 : 2} rotationIntensity={isBlasted ? 0.1 : 0.2} floatIntensity={isBlasted ? 0.5 : 1.5}>
        {/* Inner Fluid Core */}
        <Sphere
          ref={innerMeshRef}
          args={[1, 128, 128]} // Higher segment count for smoother liquid ripples
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          <MeshDistortMaterial
            ref={coreRef}
            color="#2dd4bf" 
            emissive="#2dd4bf" // Match the color exactly for maximum vibrance
            emissiveIntensity={0.6} // Crank up the glow so it's not dull
            roughness={0.05} // Ultra glossy
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            transparent={false} // Make it solid! Transparent mixes with the creme background and makes it look dull.
            opacity={1}
            distort={0.25}
            speed={1.5}
          />
        </Sphere>
        
        {/* Outer Frosted Glass Shell */}
        <Sphere args={[1.2, 64, 64]} ref={shellRef}>
          <meshPhysicalMaterial
            color="#ffffff"
            roughness={0}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0}
            transparent={true}
            opacity={0.1}
            side={THREE.FrontSide}
            depthWrite={false}
          />
        </Sphere>
      </Float>
    </group>
  );
}

export default function HeroFluidShape({ className }: { className?: string }) {
  return (
    <div className={className} style={{ width: "100%", height: "100%", cursor: "grab" }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} color="#ffffff" />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#e0f2fe" />
        <directionalLight position={[-5, -10, -5]} intensity={0.5} color="#ccfbf1" />
        <pointLight position={[0, 0, 8]} intensity={1.0} color="#ffffff" />
        
        <PremiumOrb />
      </Canvas>
    </div>
  );
}
