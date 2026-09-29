import type { ConveyorTile, Tile } from "@/lib/tile";
import { DIRECTION_ROTATION } from "./board-coordinates";

function Conveyor({ direction, express }: ConveyorTile) {
  return (
    <group
      position={[0, 0.135, 0]}
      rotation={[0, DIRECTION_ROTATION[direction], 0]}
    >
      <mesh receiveShadow>
        <boxGeometry args={[0.82, 0.05, 0.82]} />
        <meshStandardMaterial
          color="#18252b"
          metalness={0.62}
          roughness={0.38}
        />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, 0.045, 0]}>
          <boxGeometry args={[0.06, 0.08, 0.78]} />
          <meshStandardMaterial
            color={express ? "#f5c452" : "#32c5d6"}
            emissive={express ? "#b88116" : "#18899a"}
            emissiveIntensity={0.35}
            metalness={0.72}
            roughness={0.28}
          />
        </mesh>
      ))}
      {[-0.25, 0, 0.25].map((z) => (
        <mesh key={z} position={[0, 0.065, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.065, 0.64, 12]} />
          <meshStandardMaterial
            color="#81949c"
            metalness={0.85}
            roughness={0.24}
          />
        </mesh>
      ))}
      {[-0.105, 0.105].map((x) => (
        <mesh
          key={x}
          position={[x, 0.145, -0.08]}
          rotation={[0, x < 0 ? -Math.PI / 4 : Math.PI / 4, 0]}
        >
          <boxGeometry args={[0.29, 0.025, 0.065]} />
          <meshBasicMaterial color="#d6fbff" />
        </mesh>
      ))}
    </group>
  );
}

function Checkpoint({ order }: { order: number }) {
  const checks = [
    [-0.19, -0.19, "#f5c452"],
    [0.19, -0.19, "#20292e"],
    [-0.19, 0.19, "#20292e"],
    [0.19, 0.19, "#f5c452"],
  ] as const;

  return (
    <group position={[0, 0.135, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.84, 0.05, 0.84]} />
        <meshStandardMaterial
          color="#111a1f"
          metalness={0.6}
          roughness={0.34}
        />
      </mesh>
      {checks.map(([x, z, color]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.035, z]}>
          <boxGeometry args={[0.34, 0.025, 0.34]} />
          <meshStandardMaterial
            color={color}
            metalness={0.5}
            roughness={0.42}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.075, 24]} />
        <meshStandardMaterial
          color="#17242a"
          metalness={0.78}
          roughness={0.25}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <torusGeometry args={[0.13, 0.035, 8, 24]} />
        <meshStandardMaterial
          color="#fff0a8"
          emissive="#f4b942"
          emissiveIntensity={0.9}
        />
      </mesh>
      {Array.from({ length: order }, (_, index) => (
        <mesh
          key={index}
          position={[(index - (order - 1) / 2) * 0.075, 0.155, 0]}
        >
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshBasicMaterial color="#fff7d6" />
        </mesh>
      ))}
    </group>
  );
}

function Gear({ clockwise }: { clockwise: boolean }) {
  const direction = clockwise ? 1 : -1;

  return (
    <group position={[0, 0.14, 0]} rotation={[0, direction * 0.12, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.39, 0.39, 0.045, 24]} />
        <meshStandardMaterial
          color="#162229"
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <mesh
            key={angle}
            position={[Math.cos(angle) * 0.38, 0.045, Math.sin(angle) * 0.38]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.115, 0.055, 0.105]} />
            <meshStandardMaterial
              color="#a7b8be"
              metalness={0.86}
              roughness={0.22}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.285, 0.285, 0.075, 24]} />
        <meshStandardMaterial
          color="#d78136"
          emissive="#8f3f10"
          emissiveIntensity={0.18}
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.055, 16]} />
        <meshStandardMaterial
          color="#263840"
          metalness={0.86}
          roughness={0.22}
        />
      </mesh>
      <mesh
        position={[direction * 0.16, 0.12, -0.15]}
        rotation={[-Math.PI / 2, 0, direction * 0.7]}
      >
        <circleGeometry args={[0.075, 3]} />
        <meshBasicMaterial color="#fff1b7" />
      </mesh>
    </group>
  );
}

export function TileMesh({ tile }: { tile: Tile }) {
  switch (tile.kind) {
    case "floor":
      return null;
    case "checkpoint":
      return <Checkpoint order={tile.number} />;
    case "conveyor":
      return <Conveyor {...tile} />;
    case "gear":
      return <Gear clockwise={tile.clockwise} />;
    case "laser":
      return (
        <group rotation={[0, DIRECTION_ROTATION[tile.direction], 0]}>
          <mesh position={[0, 0.27, 0.32]} castShadow>
            <boxGeometry args={[0.62, 0.32, 0.22]} />
            <meshStandardMaterial
              color="#76353b"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {Array.from({ length: tile.strength }, (_, index) => (
            <mesh
              key={index}
              position={[(index - (tile.strength - 1) / 2) * 0.12, 0.28, -0.1]}
            >
              <boxGeometry args={[0.035, 0.035, 0.66]} />
              <meshBasicMaterial color="#ff4d57" />
            </mesh>
          ))}
        </group>
      );
    case "pusher":
      return (
        <group rotation={[0, DIRECTION_ROTATION[tile.direction], 0]}>
          <mesh position={[0, 0.26, 0.33]} castShadow>
            <boxGeometry args={[0.68, 0.3, 0.18]} />
            <meshStandardMaterial
              color="#dba442"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0.24, 0.1]}>
              <boxGeometry args={[0.08, 0.08, 0.3]} />
              <meshStandardMaterial
                color="#a7b8be"
                metalness={0.85}
                roughness={0.22}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.24, -0.08]}>
            <boxGeometry args={[0.68, 0.22, 0.1]} />
            <meshStandardMaterial
              color="#dba442"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      );
    case "repair":
      return (
        <group position={[0, 0.135, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[0.82, 0.05, 0.82]} />
            <meshStandardMaterial
              color="#215a42"
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          {[0, Math.PI / 2].map((angle) => (
            <mesh key={angle} position={[0, 0.035, 0]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.55, 0.025, 0.16]} />
              <meshBasicMaterial color="#c9ffdf" />
            </mesh>
          ))}
        </group>
      );
    case "pit":
      return (
        <mesh position={[0, 0.105, 0]}>
          <boxGeometry args={[0.76, 0.025, 0.76]} />
          <meshStandardMaterial
            color="#071018"
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>
      );
  }
}
