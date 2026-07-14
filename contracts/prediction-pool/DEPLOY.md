# Deploy PredictionPool ke Injective Testnet

Contract ini sudah dicek: `cargo test` lulus (logic register/kickoff/pool
split terverifikasi). Ikuti langkah ini di komputer kamu sendiri (butuh
`rustup`, yang tidak tersedia di sandbox tempat contract ini ditulis) untuk
sampai ke `INJECTIVE_PREDICTION_CONTRACT`.

## 0. Prasyarat (sekali saja)

```bash
# Install rustup kalau belum ada
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install injectived (CLI Injective)
# ikuti https://docs.injective.network -> Install injectived, atau:
curl -sSf https://raw.githubusercontent.com/InjectiveLabs/injective-chain-releases/master/install.sh | bash

# Docker, untuk optimizer wasm (hasil build harus dioptimasi ukurannya)
# pastikan docker sudah terpasang & jalan
```

## 1. Build wasm yang sudah dioptimasi

Dari folder `contracts/prediction-pool/`:

```bash
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="prediction_pool_cache",target=/code/target \
  --mount type=volume,source="registry_cache",target=/usr/local/cargo/registry \
  cosmwasm/optimizer:0.16.0
```

Hasilnya ada di `artifacts/prediction_pool.wasm` — inilah yang di-upload ke chain.

## 2. Setup wallet CLI

```bash
injectived keys add goalcast-deployer --keyring-backend test
# copy address yang muncul (inj1...), lalu isi INJ testnet gratis:
# https://testnet.faucet.injective.network/
```

> Ini bisa pakai address yang sama dengan yang kamu export ke
> `INJECTIVE_PRIVATE_KEY` di `.env.local` — supaya wallet CLI dan wallet
> yang dipakai app adalah satu yang sama.

## 3. Store (upload) contract code

```bash
injectived tx wasm store artifacts/prediction_pool.wasm \
  --from goalcast-deployer \
  --chain-id injective-888 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --gas-prices 160000000inj \
  --gas auto --gas-adjustment 1.3 \
  --keyring-backend test -y
```

Catat **code_id** dari output tx (query tx-nya kalau tidak langsung muncul):

```bash
injectived query tx <TX_HASH> --node https://testnet.sentry.tm.injective.network:443
```

## 4. Instantiate contract → dapat contract address

```bash
injectived tx wasm instantiate <CODE_ID> '{"admin": null}' \
  --from goalcast-deployer \
  --label "goalcast-prediction-pool" \
  --chain-id injective-888 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --gas-prices 160000000inj \
  --gas auto --gas-adjustment 1.3 \
  --keyring-backend test \
  --no-admin -y
```

Ambil contract address dari hasil query tx-nya:

```bash
injectived query wasm list-contract-by-code <CODE_ID> \
  --node https://testnet.sentry.tm.injective.network:443
```

Output-nya array berisi address `inj1...` — **itulah nilai untuk**:

```
INJECTIVE_PREDICTION_CONTRACT=inj1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 5. Buka match untuk prediksi (sekali per pertandingan)

```bash
injectived tx wasm execute <CONTRACT_ADDRESS> \
  '{"set_kickoff": {"match_id": "m-usa-mex-01", "kickoff_timestamp": 1783876800}}' \
  --from goalcast-deployer \
  --chain-id injective-888 \
  --node https://testnet.sentry.tm.injective.network:443 \
  --gas-prices 160000000inj --gas auto --gas-adjustment 1.3 \
  --keyring-backend test -y
```

## 6. Tes query pool status

```bash
injectived query wasm contract-state smart <CONTRACT_ADDRESS> \
  '{"get_pool_status": {"match_id": "m-usa-mex-01"}}' \
  --node https://testnet.sentry.tm.injective.network:443
```

Kalau ini balikin JSON `{home, draw, away, ...}`, contract-nya sudah live dan
siap disambungkan ke MCP Server / langsung dipanggil dari `lib/injective.ts`.
