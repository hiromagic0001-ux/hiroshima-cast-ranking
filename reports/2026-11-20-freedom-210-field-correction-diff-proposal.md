# 2026-11-20 #210 FREEDOM 誤混入フィールドの安全な修正差分案

## 判定
#210のレコード名はFREEDOMのまま維持する。現行の `individualAudit` 内にあるBe-ange由来と判断される電話090-9251-0678、営業時間11:00〜27:00、URL beange-beauty.com、エステ魂ID38980への参照を、FREEDOMの確認済み情報として使わないよう隔離する。

FREEDOM側の根拠はエステ魂ID40477、電話070-8499-1534、10:00〜LAST。#36/#261と同じ候補群として扱う。#276 Be-angeはID38980、電話090-9251-0678の別レコードとして維持する。

## #210 現行値と修正案
| JSONパス | 現行値 | 提案値 |
|---|---|---|
| `records[209].name` | `FREEDOM（フリーダム）` | 変更なし |
| `records[209].category` | `men-esthe` | 変更なし |
| `records[209].officialUrl` | `https://beange-beauty.com/` | `null`（FREEDOM公式URL未確認） |
| `records[209].officialUrlStatus` | Be-ange公式URLを確認した旨 | FREEDOMの独立公式URLは未確認。旧値は誤紐付け疑いとして履歴に隔離 |
| `records[209].sources` | 広島市一覧、エステ魂ID38980、Be-ange URL | FREEDOMの広島市一覧、エステ魂ID40477、FREEDOM個別掲載ページに差し替え |
| `records[209].individualAudit.phone` | `090-9251-0678` | `070-8499-1534` |
| `records[209].individualAudit.hours` | `11:00〜27:00` | `10:00〜LAST` |
| `records[209].individualAudit.url` | `https://beange-beauty.com/` | `https://estama.jp/shop/40477/`（第三者媒体の個別ページ。公式URLではない） |
| `records[209].individualAudit.kind` | `independent-official-site-confirmed` | `current-third-party-listing-only` |
| `records[209].individualAudit.officialSiteStatus` | 未確認 | 独立公式サイト未確認 |
| `records[209].batchAudit` | FREEDOM ID40477・070-8499-1534・10:00〜30:00 | 既存のFREEDOM根拠を維持。営業時間表記差（10:00〜LAST / 10:00〜30:00）は媒体ごとに記録 |

## 隔離して履歴保存する値
次の現行値は削除せず、別の監査履歴フィールド `quarantinedAuditEvidence` に「誤紐付け疑い」として保存する案。
- `individualAudit.url`: https://beange-beauty.com/
- `individualAudit.phone`: 090-9251-0678
- `individualAudit.hours`: 11:00〜27:00（受付10:00〜27:00）
- `individualAudit.sources`: https://estama.jp/shop/38980/ 、https://beange-beauty.com/
- 元の `officialUrl`: https://beange-beauty.com/
- 元の `officialUrlStatus` 全文
- #210内の元 `individualAudit` オブジェクト全体を、変更前スナップショットとして保存する。

隔離理由：Be-angeの#276はエステ魂ID38980、電話090-9251-0678、宝町、11:00〜翌3:00。#210のFREEDOMはエステ魂ID40477、電話070-8499-1534、10:00〜LAST。店舗ID・電話・店名が異なる。

## #210のFREEDOM側に採用する出典案
1. https://estama.jp/shop/40477/
2. https://estama.jp/shop/40477/newslist/
3. https://mens-est.jp/shop/frdmhrs/
4. https://ultimate-map.com/yoru/mensaesthe/spot.php?id=raf3fba35d7
5. https://ultimate-map.com/yoru/mensaesthe/prefs.php?p=34

いずれも第三者媒体の情報であり、FREEDOMの独立公式サイトが確認できたという意味ではない。

## #36・#261との関係
- #36：電話070-8499-1534、エステ魂ID40477に関するニュース、メンエスじゃぱん、メンズエステマップ情報。
- #261：エステ魂ID40477、電話070-8499-1534。
- #210：名前FREEDOM、同じID40477と電話070-8499-1534に対応する既存batchAuditがある。
- よって3件は同一店舗候補の参照グループにまとめる案。ただし元レコードは削除しない。#210のBe-ange混入情報はグループに継承しない。

## 実装前チェック
1. 現行ファイルの最新Blob SHAを再取得し、今回レビューしたSHAと一致するか確認。
2. #210の変更前オブジェクトをそのままバックアップ。
3. `quarantinedAuditEvidence` を追加し、Be-ange由来疑いの旧値を保存。
4. #210の現行フィールドのみFREEDOM ID40477の掲載情報へ訂正。
5. #276の値に変更がないことを比較。
6. #36/#261/#210の元出典・監査番号・カテゴリが維持されることをテスト。
7. 278件の総数、全レコードの元URL・電話・住所・カテゴリ・出典が消失していないことをテスト。
8. 承認が別途得られるまで本番JSONには適用しない。

## 今回の状態
- この文書は修正差分案のみ。
- `store-database.json` 変更なし。
- #210/#276の実データ変更なし。
- レコード削除・統合なし。
- DB/D1/ランキング/アプリ/API/Render変更なし。
