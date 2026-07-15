# GoalCast — AI World Cup Fan Companion on Injective

**Dibangun untuk The Injective Global Cup (3–19 Juli 2026)**

GoalCast adalah web app fan World Cup yang menggabungkan AI match analyst,
micropayment on-demand, dan on-chain fan prediction pool — dibangun di atas
empat teknologi baru Injective sekaligus: **x402, CCTP, MCP Server, dan
Agent Skills**.

🔗 **Live app**: <isi di sini — URL Vercel>
🔗 **Video demo**: <isi di sini — link YouTube/Loom>

---

## Masalah yang diselesaikan

1. **Prediksi fan enggak transparan.** Polling/prediksi fan di platform lain
   cuma disimpan di database perusahaan — bisa diedit atau dihapus sepihak,
   enggak bisa diverifikasi siapa pun. GoalCast mencatatnya di smart
   contract on-chain, terbuka buat diaudit siapa saja.
2. **AI insight berkualitas terkunci di balik subscription bulanan**, padahal
   fan sering cuma butuh insight buat 1-2 pertandingan tertentu. GoalCast
   pakai micropayment x402 — bayar $0.05 per analisis yang benar-benar
   dipakai, bukan langganan.
3. **Fan di luar ekosistem Injective kesulitan berpartisipasi** karena harus
   bridge USDC manual yang ribet. GoalCast pakai CCTP buat transfer USDC
   native langsung dari Ethereum/Base ke Injective.

## Fitur utama

| Fitur | Deskripsi |
|---|---|
| **Dashboard live** | Jadwal & skor World Cup real-time + visualisasi pool split prediksi tiap pertandingan |
| **AI Match Analyst** | Chat dengan AI yang dibekali Agent Skill khusus (`world-cup-analyst`) — baca form tim, matchup kunci, dan confidence prediksi |
| **Deep-Dive Premium (x402)** | Analisis mendalam (momentum menit-per-menit, ancaman set-piece) dibuka lewat micropayment USDC $0.05, mengikuti standar HTTP 402 |
| **Fan Prediction Pool (MCP Server)** | Prediksi fan tercatat di smart contract Injective lewat MCP server custom, bukan simulasi — protokol MCP asli |
| **Cross-chain funding (CCTP)** | Fan dari chain lain bisa top-up USDC langsung ke Injective tanpa bridge pihak ketiga |

## Alur kerja end-to-end

```
Fan buka dashboard
   → lihat jadwal & skor + persentase pool prediksi
   → chat dengan AI Analyst (baca Agent Skill world-cup-analyst)
   → (opsional) buka Deep-Dive Premium via x402 micropayment
   → submit prediksi → app manggil MCP Server (protokol MCP asli)
   → MCP Server eksekusi tx RegisterPrediction ke smart contract di Injective
   → Pool split ter-update, tercatat permanen on-chain
   → (opsional) fan dari chain lain top-up USDC via CCTP
```

## Arsitektur & teknologi Injective

| Teknologi | Implementasi |
|---|---|
| **Agent Skills** | `lib/skills/world-cup-analyst/SKILL.md` — dipakai sebagai system prompt AI analyst |
| **Injective MCP Server** | Server MCP custom (protokol MCP asli via `@modelcontextprotocol/sdk`, Streamable HTTP) yang membungkus contract `PredictionPool`, expose 2 tools: `register_prediction`, `get_pool_status` |
| **x402** | Deep-dive analysis di-gate lewat HTTP 402 payment challenge standar |
| **CCTP** | Helper `depositForBurn` buat transfer USDC lintas chain ke Injective |

```
┌─────────────────────┐         ┌──────────────────────┐
│   GoalCast App        │  MCP    │   MCP Server           │
│   (Next.js, Vercel)   │ ──────▶ │   (Railway)             │
│   dashboard+chat+x402 │         │   register_prediction    │
│                        │         │   get_pool_status         │
└─────────────────────┘         └──────────┬───────────┘
                                              │ tx / query
                                              ▼
                                 PredictionPool (CosmWasm)
                                 Injective Testnet
                                 <isi di sini — contract address>
```

## Repo

Project ini dipecah jadi 3 repo, masing-masing di-deploy terpisah:

| Repo | Isi | Deploy ke |
|---|---|---|
| [`goalcast`](<isi di sini>) | App Next.js (dashboard, AI chat, x402) | Vercel |
| [`goalcast-mcp-server`](<isi di sini>) | MCP server (register_prediction, get_pool_status) | Railway |
| [`goalcast-contracts`](<isi di sini>) | Contract `PredictionPool` (Rust/CosmWasm) | Injective Testnet |

**Contract address (live di testnet)**: `<isi di sini — inj1...>`
Cek langsung di explorer: `<isi di sini — link ke Injective testnet explorer>`

## Tech stack

- **Frontend/Backend**: Next.js 14, TypeScript, Tailwind CSS
- **AI**: OpenRouter (chat completion, model gratis)
- **On-chain**: CosmWasm (Rust), `@injectivelabs/sdk-ts`
- **MCP**: `@modelcontextprotocol/sdk` (Streamable HTTP transport)
- **Data**: football-data.org (jadwal & skor World Cup real-time)

## Cara jalanin lokal

```bash
# 1. App utama
git clone <isi di sini — repo goalcast>
cd goalcast
npm install
cp .env.example .env.local   # isi OPENROUTER_API_KEY (gratis), FOOTBALL_API_KEY, INJECTIVE_MCP_SERVER_URL
npm run dev

# 2. MCP server (repo terpisah)
git clone <isi di sini — repo goalcast-mcp-server>
cd goalcast-mcp-server
npm install
cp .env.example .env   # isi INJECTIVE_PRIVATE_KEY, PREDICTION_POOL_CONTRACT_ADDRESS
npm run dev
```

## Known limitations (jujur, biar transparan ke juri)

1. **Wallet MCP server sendiri yang menandatangani semua prediksi**, bukan
   wallet fan masing-masing. Cukup buat membuktikan alur MCP → contract →
   chain jalan penuh, tapi versi production idealnya fan sign sendiri
   lewat wallet mereka (Keplr/Leap) sebelum di-relay ke MCP server.
2. **Pool split di dashboard belum otomatis nyambung ke data live** — ID
   pertandingan dari football-data.org (numerik) dan `match_id` di contract
   (string custom) masih perlu di-mapping manual. Saat ini pool split cuma
   muncul buat pertandingan demo yang sudah di-`SetKickoff` manual.
3. **CCTP** masih di level helper function (`buildDepositForBurnArgs`) —
   alur signing dari wallet EVM ke Injective belum diwire ke UI, jadi belum
   bisa didemokan end-to-end, cuma diverifikasi logic-nya.

## Roadmap setelah hackathon

- [ ] Fan-side wallet signing buat prediksi (bukan server-side signing)
- [ ] Mapping otomatis match ID API ↔ on-chain
- [ ] UI top-up CCTP end-to-end
- [ ] Audit contract sebelum ke mainnet

---

Dibangun solo oleh <isi di sini — nama kamu> untuk The Injective Global Cup.
