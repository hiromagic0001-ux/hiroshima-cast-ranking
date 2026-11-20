# 2026-11-20 高確度重複候補・非破壊差分シミュレーション

## 位置付け
この結果は基準JSONのメモリ上コピーに対するシミュレーションのみ。`switcher/store-database.json`、DB/D1、ランキング、アプリ、API、Renderには書き込んでいない。候補タグの本番適用承認でもない。

## シミュレーション条件
- 基準Blob SHA: `d7e32e6ca082352ffbe981a73df80b233e024c43`
- 基準レコード数: 278件
- 対象: manifestの高確度候補11グループ・23レコード
- 仮想追加フィールド: `duplicateCandidateGroup` のみ
- 既存 `duplicateGroup` は一切上書きしない

## 結果
- 監査番号・配列位置・店舗名・カテゴリの照合: PASS
- 仮想タグ追加: 23件
- 既存フィールド保持（name/category/area/status/URL/住所/営業時間/電話/sources/individualAudit/batchAudit）: PASS
- 既存duplicateGroup値（enel/refresh/arinoa等）: 維持
- 278件の件数・配列順: 維持
- カテゴリ件数: 維持
- 基準JSON自体: 変更なし

## 候補グループと注意点
- toriko: #8, #238 — same-store-candidate。電話・公式URL・所在地の一致。元掲載ID最終照合を条件とする
- enel: #11, #242 — existing-group-review。既存duplicateGroup=enel。既存グループを維持し、元掲載ID/サービス単位を確認
- freedom: #36, #210, #261 — field-contamination-review。#210はFREEDOM名維持。Be-ange由来疑いフィールド隔離案。#276は対象外
- grace-spa: #52, #243 — same-store-candidate。複数ルームを保持し、元掲載ID確認後に相互参照
- seraphi-spa: #55, #84 — same-store-candidate。電話・掲載情報一致。個別掲載ID確認後に相互参照
- lumiella: #73, #89 — same-store-candidate。電話・所在地一致。#89の直接掲載ID対応を確認
- refresh: #76, #247 — existing-group-review。既存duplicateGroup=refresh。複数ルーム保持
- arinoa: #78, #255 — existing-group-review。既存duplicateGroup=arinoa。媒体/公式出典を区別
- cherry-spa: #147, #253 — brand-room-review。ブランド候補。業態カテゴリ差とルーム単位を保持
- reflet-spa: #219, #269 — same-store-candidate。電話・住所一致。元掲載ID確認後に相互参照
- labyrinth: #228, #274 — same-store-candidate。電話一致候補。#191は含めない

## 重要な保留条件
- #210 FREEDOM: 名前は維持。Be-ange由来疑いの電話・URL・個別監査情報を本番で修正/隔離する作業は未実施。#276は別レコードのまま。
- #147/#253 Cherry SPA: category差を保持。ブランドと店舗/ルームを同一視しない。
- #73/#89 Lumiella等、元掲載IDの直接照合が未完了の候補は、タグの本番追加前に掲載IDを確認する。
- #228/#274 Labyrinth候補に#191天使のエプロンは含めない。
- 高確度候補という名称は調査上の優先候補を示すもので、削除・統合の確定ではない。

## 結論
非破壊タグ方式なら保護フィールドを変更せずに候補関係を表現できることを、コピー上で確認した。ただし、掲載IDの最終照合と明示的な反映承認がないため、本番適用は行わない。