import Link from "next/link";

export default function GameNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-12 text-center">
      <h1 className="text-3xl font-bold">Game not found</h1>
      <p>This game does not exist or the link is invalid.</p>
      <Link href="/lobbies" className="underline">
        Back to lobbies
      </Link>
    </main>
  );
}
