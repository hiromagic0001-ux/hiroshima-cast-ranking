# Store database patch validator

`tools/validate_store_database_patch.py` は、広島キャスト検索の店舗DB修正候補を本番反映前に検査するフェイルクローズ型の補助スクリプトです。

## 実行方法
```bash
python3 tools/validate_store_database_patch.py baseline.json candidate.json --expected-git-blob-sha d7e32e6ca082352ffbe981a73df80b233e024c43
```

デフォルトでは全フィールドの変更を拒否します。承認済みの変更だけを許可する場合は、監査番号とJSON Pointerを列挙したallowlist JSONを別途用意し、`--allowlist approved-changes.json` を付けます。許可リストにない変更、実際には発生しなかった許可項目、基準SHA不一致はすべて失敗になります。

## 検査内容
- baselineファイルのGit blob SHA-1一致
- JSON構造と278件のレコード数維持
- 配列順・各レコード名・カテゴリの維持
- 全フィールド差分の検出と明示的allowlist照合
- カテゴリ件数の維持
- JSONのシリアライズ/再解析

## 安全上の制限
- このスクリプトは入力ファイルを変更しません。
- allowlistは本番反映承認そのものではありません。別途人間の承認が必要です。
- #210の誤混入フィールド隔離、duplicateGroup追加などは、対象フィールド・保存する履歴・承認内容を明記したallowlistがない限り拒否されます。
- 監査番号は基準ファイルの配列位置です。基準SHAが変わった場合は処理を停止してください。
- このファイル追加だけではデプロイ・Render設定・アプリ動作は変わりません。