# 2026-11-20 #210 FREEDOM修正差分案：278件データ構造ドライラン検証

## 検証方法
- 対象: `switcher/store-database.json`
- 元Blob SHA: `d7e32e6ca082352ffbe981a73df80b233e024c43`
- 元データを読み込み、メモリ上の複製にのみ仮の `correctionReview` 履歴オブジェクトを追加して検査した。
- GitHub上の元JSON、DB/D1、ランキング、アプリ、API、Renderには書き込んでいない。

## 元データ構造
- 総レコード: 278
- category集計: men-esthe 218 / soap 15 / store-health 8 / esthetic 10 / delivery 22 / sm-other 2 / unclassified 3
- 全278件にname、category、sources配列あり。
- 現行JSONに永続record IDは存在しない。監査番号は配列順のため、実装時には別途不変IDまたは対応表が必要。

## #210 / #36 / #261 / #276の現状
| 番号 | 店舗名 | 電話情報 | 主な掲載根拠 |
|---|---|---|---|
| #36 | フリーダム | 070-8499-1534 | エステ魂ID40477等 |
| #210 | FREEDOM（フリーダム） | individualAuditに090-9251-0678 | individualAudit内にBe-ange情報、batchAuditにはFREEDOM ID40477 |
| #261 | FREEDOM | 070-8499-1534 | エステ魂ID40477 |
| #276 | Be-ange（ビアンジュ） | 090-9251-0678 | エステ魂ID38980、メンエスmall |

## ドライランのテスト結果
仮想コピーに#210の旧Be-ange由来疑い情報を `correctionReview.quarantine` として保存するテストを行った。

| テスト | 結果 |
|---|---|
| 278件の件数維持 | PASS |
| #210の店舗名維持 | PASS |
| #210のcategory維持 | PASS |
| #210のbatchAudit維持 | PASS |
| #210の旧individualAudit全体を履歴保存 | PASS |
| #276 Be-angeレコード不変 | PASS |
| 全レコードのsources配列維持 | PASS |
| category集計不変 | PASS |
| 元データオブジェクト不変 | PASS |

**9項目すべてPASS。** これはメモリ上の提案メタデータ追加テストであり、本番JSONへの訂正パッチ適用テストではない。

## 実装前に修正差分案を調整すべき点
1. #210の `individualAudit` を全面的に上書きするのではなく、旧オブジェクトを完全保存してからFREEDOMのID40477に基づく監査情報を新しいレビュー履歴として追加する。
2. `sources` 配列の既存Be-ange URL・媒体ID38980への参照は削除せず、誤紐付け疑いの出典として履歴化する。
3. `officialUrl` はFREEDOMの独立公式サイトが未確認のため、Be-ange URLをFREEDOMの公式URLとして表示しないようにする。ただしnull化・置換は承認後。
4. #210の `batchAudit` にはFREEDOM ID40477と電話070-8499-1534の記録があるため、この根拠を維持する。
5. #36/#261/#210を重複候補として相互参照する場合も、各レコードは削除しない。#276 Be-angeは独立維持。
6. 永続IDがないため、配列番号だけでパッチを当てない。ファイルの最新Blob SHAを確認し、#210のname/category/既存フィールド指紋も照合してから適用する。

## 結論
提案する非破壊の履歴追加方式は、現在の278件構造でドライラン検査に合格した。ただし、実データ変更はまだ行っていない。名称・電話・URLの訂正適用には、別途承認と最新Blobの再確認が必要。

## 今回の実変更
- `store-database.json`: 変更なし
- レコード削除・統合: 0
- DB/D1/ランキング/アプリ/API/Render変更: 0
