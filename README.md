# GoalCast — AI World Cup Fan Companion on Injective

Dibangun untuk **The Injective Global Cup** (3–19 Juli 2026). GoalCast adalah
web app fan World Cup yang menggabungkan empat teknologi baru Injective
sekaligus, bukan sekadar demo satu fitur:

| Teknologi | Dipakai di mana |
|---|---|
| **Agent Skills** | `lib/skills/world-cup-analyst/SKILL.md` — mendefinisikan cara AI analyst membaca pertandingan, dipakai sebagai system prompt di `/api/chat` |
| **Injective MCP Server** | `lib/injective.ts` — AI/agent mendaftarkan prediksi fan ke on-chain prediction pool lewat MCP tools `register_prediction` & `get_pool_status` |
| **x402** | `lib/x402.ts` + `/api/premium-insight` — deep-dive analisis AI premium dibuka lewat micropayment USDC $0.05, mengikuti handshake HTTP 402 standar |
| **CCTP** | `lib/cctp.ts` — fan bisa top-up USDC dari Ethereum/Base langsung ke alamat Injective mereka untuk isi saldo prediction pool |

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi ANTHROPIC_API_KEY minimal, sisanya optional untuk demo
npm run dev
```

Buka `http://localhost:3000`. Tanpa env Injective/x402/CCTP diisi, app tetap
jalan penuh — semua bagian on-chain punya **simulated fallback** (lihat
komentar `TODO` di `lib/injective.ts` dan `lib/x402.ts`) supaya UI dan alur
AI bisa didemokan sebelum kontrak & MCP server live.

## Struktur project

```
app/
  page.tsx                 dashboard fixture + pool split
  chat/page.tsx             AI analyst chat + unlock premium + submit prediksi
  api/chat/route.ts         Claude + Agent Skill (world-cup-analyst)
  api/premium-insight/route.ts   x402-gated deep dive
  api/predict/route.ts      submit/baca prediksi lewat Injective MCP Server
components/
  MatchCard.tsx              kartu fixture + live pool split bar
  WalletConnect.tsx          connect wallet Injective (stub, ganti ke wallet-ts)
lib/
  injective.ts               MCP Server bridge + saldo on-chain
  x402.ts                    payment challenge + verifikasi
  cctp.ts                    bantuan build calldata depositForBurn
  skills/world-cup-analyst/SKILL.md   Agent Skill definition
contracts/
  README.md                  spesifikasi PredictionPool CosmWasm + cara wiring ke MCP
```

## Roadmap sampai submission (checklist realistis buat solo)

**Prioritas 1 — supaya app "hidup" (1-2 hari)**
- [ ] Ganti data `MATCHES` di `app/page.tsx` dengan fetch API bola beneran
      (mis. API-Football / football-data.org, key gratis)
- [ ] Isi `ANTHROPIC_API_KEY`, test chat end-to-end
- [ ] Rekam demo video 2-3 menit: dashboard → chat AI → submit prediksi → unlock premium

**Prioritas 2 — supaya on-chain-nya nyata (3-4 hari)**
- [ ] Deploy `PredictionPool` (lihat `contracts/README.md`) ke Injective testnet
- [ ] Jalankan Injective MCP Server, arahkan `INJECTIVE_MCP_SERVER_URL`
- [ ] Ganti `WalletConnect.tsx` stub dengan `@injectivelabs/wallet-ts` beneran (Keplr/Leap)

**Prioritas 3 — polish x402 & CCTP (sisa waktu)**
- [ ] Wire signing X-PAYMENT beneran di `unlockDeepDive()` (`app/chat/page.tsx`)
- [ ] Tambah tombol "Top-up via CCTP" di dashboard yang manggil `buildDepositForBurnArgs`
- [ ] Tulis README submission + diagram arsitektur buat panel juri

## Kenapa arah ini kompetitif

- Memakai **keempat** teknologi wajib secara fungsional saling terhubung
  (bukan ditempel terpisah): AI kasih insight → insight itu yang dipremiumkan
  lewat x402 → prediksi hasil insight itu yang didaftarkan lewat MCP Server →
  CCTP yang mendanai partisipasi.
- Ada nilai guna nyata buat fan (bukan cuma showcase teknis).
- Scope MVP-nya achievable solo dalam window 3–19 Juli kalau ikut roadmap di atas.
