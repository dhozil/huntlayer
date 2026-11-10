# HuntLayer — Test Evidence (Studionet)

Dokumentasi bukti eksekusi **nyata di GenLayer Studionet** (bukan mock), menggunakan wallet asli dari `D:\Genlayer-project\wallet`.

## Lingkungan & Identitas
- **Network**: Studionet (GenLayer)
- **Contract (final, wallet-deployed)**: `0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF`
- **Deploy tx**: `0x3da22d38844b411022fbc5801ab98cda8c26ec1d01673b726a15f3cd2068fb3e` (ACCEPTED)
- **Deployer/Creator wallet**: `0x3958A649b41cd7C8561F4233cC0F5b0469Bc98E0` (`D:\Genlayer-project\wallet\.env`)
- **Adversary wallet**: `0x99bF44395CaC814E671ADFF8b69d968Fac4e5Db3` (`D:\Genlayer-project\wallet\seller.env`)
- **Script eksekusi**: `scripts/test_all_methods.py`
- **Lint/Validasi**: `genvm-lint check contracts/huntlayer.py` — PASSED (lint + validation, schema OK)

## Ringkasan Hasil
| Kategori | Jumlah | Hasil |
|---|---:|---|
| Method/flow positif | 13+ | ✅ Berhasil (ACCEPTED, MAJORITY_AGREE) |
| Skenario negatif/adversarial | 6 | ✅ Ditolak sesuai ekspektasi |

## Bukti Transaksi Positif (Happy Path)

| # | Method / Skenario | Tx Hash | Status | Catatan |
|---|---|---|---|---|
| 1 | `create_bounty` (payable, 1 GEN, deadline 2099-12-31) | `0xbcb2d291f0ac08080291485220962774fba5e870e6ab5f9bd5d8e0f7509c33a1` | ACCEPTED / MAJORITY_AGREE | Bounty `bounty_0` dibuat, pool 1e18 |
| 2 | `fund_bounty` (+0.5 GEN) | `0xf67d01929cadb8c821faebd5bbd175c2e0fe6b16a80e29a151a7b9212bfdd452` | ACCEPTED | Pool menjadi 1.5e18 |
| 3 | `submit_pr` (PR open, belum merged) | `0x3e58d6030d5f93d515d40865a201908e19aa2c6f9f55c83b4ed09494bbbdf32f` | ACCEPTED | Submission `sub_0` tercatat |
| 4 | `evaluate_severity` (AI consensus + web) | `0x14fcecf5f27ba6951b445e0067bc4143203f7feabc5d4530991e02619880df8e` | ACCEPTED | Severity `low`, confidence `100` |
| 5 | `reopen_evaluation` (creator) | `0xeb9eaef78c5d422439cf2cdcad960073b375d245e7179ec177c9dd2bde96960b` | ACCEPTED | Evaluasi di-reset (evaluated=False) |
| 6 | `evaluate_severity` (re-eval) | `0x880a051642290a3536d912ba962a35fc687cdfed4ce67a79e6de529d00e532fd` | ACCEPTED | Evaluasi ulang berhasil |
| 7 | `create_bounty` (bounty_1) | `0xe76e6b6fad639fd89902e19c37ecd231bc38c749495e0ba121f3a1146a35d9af` | ACCEPTED | Bounty kedua dibuat |
| 8 | `close_if_expired` (belum expired, no-op) | `0x9b4cb0e3470d10556ac07d6e4d65fc73d958b1263650186e38e2cc8e57a165d3` | ACCEPTED | Status tetap `open` |
| 9 | `close_bounty` (creator) | `0x8ac3541f31d7a433ed8178219f9da77ce6a8ff18e4e714e8754ed2a17deaa5a3` | ACCEPTED | Status `closed` |
| 10 | `create_bounty` (bounty_2, untuk merged PR) | `0xcd8d911ce2a5d9cf43bceb851844adff651b87248c2493c7ce3c5f1fc8f2d46f` | ACCEPTED | Bounty ketiga dibuat |
| 11 | `submit_pr` (PR merged: `octocat/Spoon-Knife#3`) | `0x403c8e561b42ddeef97f090a945976f5d37b16b9ecb9be27a73c59081df1dd71` | ACCEPTED | Submission untuk PR yang sudah merged |
| 12 | `evaluate_severity` (merged PR) | `0x629bc66745e532dfb99bade53f890fa0944f57fc0210b3b66ccf9b9842e35ddf` | ACCEPTED | Severity ditetapkan konsensus |
| 13 | `release_bounty` (PR merged) | `0x4adc6460f7c6aa543b86f4a63b4569b63d0c54a4f063c7cf021a9460067700d6` | ACCEPTED | **Paid**, status `paid`, pool berkurang, reputasi ter-update |

**View methods (read, terverifikasi):** `get_bounty`, `get_submissions`, `get_reputation`, `get_contributor_stats` — mengembalikan data konsisten (reputation 1, merges 1, total_earned 1).

## Bukti Transaksi Negatif / Adversarial (Ditolak)

Semua transaksi di bawah mencapai konsensus namun **execution ERROR** dengan payload `[EXPECTED] ...` (state tidak berubah), sesuai desain keamanan.

| # | Skenario | Aktor | Tx Hash | Payload / Alasan |
|---|---|---|---|---|
| N1 | `release_bounty` saat PR belum merged | Creator | `0x813516d95007ea4ea8017080f2e2bef3240832253e542e17dba58fa7ad2b87a2` | `[EXPECTED] PR not merged yet` |
| N2 | `close_bounty` oleh non-creator | Adversary wallet | `0xa5445d8594c3d70ae3cbf48d9c07b680fac1906ee91169fa9bea906da5e7bc36` | `[EXPECTED] only creator can close` |
| N3 | `reopen_evaluation` oleh non-creator | Adversary wallet | `0xc8b118275ffbb5b5d8c5eb8b828742ea00eb07c3279db386593f46a216805037` | `[EXPECTED] only creator` |
| N4 | `submit_pr` duplikat (PR sama disubmit ulang) | Creator | `0x16fa7bc545865e3862e23c40593d587c238d1ebf98271f94fb110f10995169ba` | `[EXPECTED] PR already submitted` |
| N5 | `submit_pr` setelah bounty ditutup | Creator | `0xd915e591064bbd0c85947f4a4d411f10eaa38a5de3df4e0e0a92034027031ab1` | `[EXPECTED] bounty is closed` |

## Catatan Keamanan & Akurasi (Relevansi Bukti)
- **Konsensus AI**: severity ditentukan via non-deterministic LLM+web dengan validator independen, perbandingan field `severity` dan toleransi `confidence` (±15), gate `critical` memerlukan confidence ≥70.
- **Anti-manipulasi**: akses creator-only, anti-duplikasi PR, cek merge sebelum release, cek pool sufficiency.
- **Batasan**: akurasi tidak 100% (bergantung prompt/sumber/validator), namun mekanisme leader-validator + appeal window mengurangi risiko halusinasi/manipulasi tunggal.

## Cara Reproduksi
```bash
# deploy dengan wallet dari D:\Genlayer-project\wallet\.env
python scripts/test_all_methods.py
# atau integration tests
gltest test/test_huntlayer.py -v -s --network studionet
```

*Dokumen ini merangkum bukti transaksi on-chain studionet yang telah dieksekusi dan diverifikasi.* 
