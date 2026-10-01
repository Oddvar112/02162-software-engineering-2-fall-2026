import roster from "@/lib/robots.json";
import { RobotPreview } from "./robot-preview";

const SPOTS = [
  { left: "5%", top: "16%" },
  { left: "88%", top: "14%" },
  { left: "2%", top: "46%" },
  { left: "92%", top: "44%" },
  { left: "9%", top: "72%" },
  { left: "80%", top: "70%" },
  { left: "62%", top: "78%" },
];

export function OtherRobots({
  players,
}: {
  players: { id: string; name: string; robot: string }[];
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden xl:block"
      aria-hidden="true"
    >
      {players.map((player, index) => (
        <div
          key={player.id}
          className="absolute flex w-24 flex-col items-center text-center"
          style={SPOTS[index % SPOTS.length]}
        >
          <RobotPreview id={player.robot} className="h-20 w-20" />
          <p className="text-xs">{player.name}</p>
          <p className="text-xs text-foreground/50">
            {roster.find((robot) => robot.id === player.robot)?.name}
          </p>
        </div>
      ))}
    </div>
  );
}
