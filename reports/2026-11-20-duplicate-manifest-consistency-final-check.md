# 2026-11-20 重複候補11グループ・差分案整合性最終確認

## 基準と範囲
- 基準JSON: `switcher/store-database.json`
- 基準Blob SHA: `d7e32e6ca082352ffbe981a73df80b233e024c43`
- 基準レコード: 278件
- 対象: レビュー用manifestと訂正版適用キュー。店舗データそのものは変更しない。

## 自動照合結果
- manifest高確度候補: 11グループ、23レコード参照
- manifest保留候補: 11グループ、26レコード参照（重複注意群を独立グループから除外後）
- 監査番号・配列index・店舗名・categoryの一致: 全参照でPASS
- 基準JSONのSHAと件数: PASS
- 既存duplicateGroupの検出: enel、refresh、arinoa、mens-spa-r。既存値を維持する必要あり。

## 発見した不整合と修正
1. #228/#274 Labyrinthが高確度候補と保留候補の両方に重複登録されていたため、保留候補の独立グループ`angels-apron-labyrinth`を削除。
2. #191 天使のエプロンと#228/#274の電話一致だけで統合しない注意は、`nonMergeWarnings`へ移動して保持。#191はLabyrinth候補グループに含めない。
3. spa R候補の#195/#215/#266には既存`duplicateGroup=mens-spa-r`がある。`spa-r`へ上書き・改名せず、既存値を保持する注意を追加。
4. #210はFREEDOMのまま候補群#36/#210/#261に置き、Be-ange由来疑いフィールドのみ隔離レビュー対象。#276 Be-angeは候補群に含めない。

## 非破壊性・未実施事項
- 店舗レコード削除・統合: 0
- 店舗名/カテゴリ/電話/住所/公式URL/営業時間の本番上書き: 0
- #210の履歴保存・隔離フラグ適用: 未実施
- duplicateGroupメタデータ適用: 未実施
- DB/D1・ランキング・アプリ・API・Render変更: 0
- manifestの修正はレビュー資料内の重複記載の解消のみ。

## 次の安全条件
掲載IDとサービス単位の確認が完了し、ユーザーから明示的な本番反映指示があるまで、manifestは`review_only_not_executable`のままとする。