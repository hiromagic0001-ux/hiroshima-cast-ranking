# 2026-11-20 278件全体・#210隔離案の非破壊整合性ドライラン

## 実施範囲
- 対象リポジトリ: `hiromagic0001-ux/hiroshima-cast-ranking`
- 対象データ: `switcher/store-database.json`
- 参照したbaseline Git blob: `d7e32e6ca082352ffbe981a73df80b233e024c43`
- baselineレコード数: 278
- 既存レビュー用manifest: `reports/2026-11-20-duplicate-review-patch-manifest-278.json`
- manifest mode: `review_only_not_executable`
- manifest sourceBlobSha: baseline SHAと一致
- manifest内の高優先候補: 11グループ / 23レコード
- 保留候補: 11グループ / 26レコード

## ドライランで試した仮想差分
本番ファイルは変更せず、baseline JSONをメモリ上で複製し、#210（配列index 209）だけに次の2フィールドを追加する仮想差分を作成した。
- `identityConflict`: FREEDOM ID40477 と Be-ange ID38980 の証拠が同一レコードに混在する可能性を示し、店舗同定を保留する文字列
- `quarantinedAuditEvidence`: baseline SHA、取得日、隔離理由、および変更前#210レコード全体の完全コピー

その他の値は変更しない仮想差分である。#210のname/category/URL/phone/hoursなど既存フィールドも変更しない。

## メモリ上の比較結果
| 検査項目 | 結果 |
|---|---|
| レコード数 | 278 → 278 |
| 変更レコード | #210のみ |
| name/category全278件 | 全件一致 |
| #210の隔離スナップショット | 変更前レコード全体と完全一致 |
| #36/#261/#276 | 全フィールド不変 |
| 既存duplicateGroup対象（#11/#242、#76/#247、#78/#255、#195/#215/#266） | 値を保持 |
| カテゴリ件数 | 全カテゴリで前後一致 |
| その他277件 | 全フィールド不変 |

カテゴリ件数:
- men-esthe: 218
- soap: 15
- store-health: 8
- esthetic: 10
- delivery: 22
- sm-other: 2
- unclassified: 3

## 重要な制約
- これはGitHubから取得したbaseline JSONを使った、JavaScriptメモリ内の構造比較である。
- `tools/validate_store_database_patch.py` のソースは確認したが、Python実行環境でスクリプト本体を実行したわけではない。
- よって「validator実行済み」「本番適用可能」とは判定しない。
- 仮想差分ファイルやallowlistを本番データに保存していない。
- manifestは引き続き `review_only_not_executable`。候補グループの自動統合やduplicateGroup追加は行っていない。

## 結論
今回の最小案（#210に競合フラグと完全な旧レコード隔離履歴を追加するだけ）は、メモリ上の比較では278件の件数・順序・カテゴリ・名称を維持し、#210以外の277件に差分が発生しないことを確認した。

ただし、店舗同定の結論自体は未確定であり、#210の公式URLや個別監査情報をどちらの店舗へ帰属させるかは未解決。実データへの適用は行わず、ユーザーの明示承認とvalidatorの実行ログ取得を別途必要とする。

## 本番変更の有無
- `switcher/store-database.json`: 変更なし
- DB/D1: 変更なし
- ランキング・アプリ・API・Render: 変更なし
- 店舗統合・削除・名称変更: 0件
