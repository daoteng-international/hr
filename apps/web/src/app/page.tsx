export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      {/* Coloured with var(--brand) — if this renders in the tenant brand
          colour, white-label CSS-variable injection is working. */}
      <h1
        className="text-4xl font-bold"
        style={{ color: "var(--brand)" }}
      >
        HR 差勤系統
      </h1>
      <p className="text-gray-600">多租戶白標差勤 SaaS — P0 骨架</p>
    </main>
  );
}
