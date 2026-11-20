# 2026-11-20 重複候補11グループ・全レコード最終整合性確認

## 1. 参照元と範囲
- baseline: `switcher/store-database.json`
- baseline Git blob SHA: `d7e32e6ca082352ffbe981a73df80b233e024c43`
- baseline件数: 278
- review manifest: `reports/2026-11-20-duplicate-review-patch-manifest-278.json`
- manifest mode: `review_only_not_executable`
- manifestのsourceBlobShaはbaseline SHAと一致

## 2. 全候補参照の整合性
| 区分 | グループ | 件数 | 現在の扱い |
|---|---|---:|---|
| 高優先候補 | toriko | 2 | 同一店舗候補。元掲載ID最終照合待ち |
| 高優先候補 | enel | 2 | 既存duplicateGroup=enelを維持 |
| 高優先候補 | freedom | 3 | #210のフィールド混入疑いを隔離検討。#276は対象外 |
| 高優先候補 | grace-spa | 2 | 複数ルーム保持・元掲載ID照合待ち |
| 高優先候補 | seraphi-spa | 2 | 掲載ID最終確認待ち |
| 高優先候補 | lumiella | 2 | #89の直接掲載ID対応待ち |
| 高優先候補 | refresh | 2 | 既存duplicateGroup=refreshを維持 |
| 高優先候補 | arinoa | 2 | 既存duplicateGroup=arinoaを維持 |
| 高優先候補 | cherry-spa | 2 | ブランド/ルーム候補。カテゴリ差を維持 |
| 高優先候補 | reflet-spa | 2 | 元掲載ID最終照合待ち |
| 高優先候補 | labyrinth | 2 | #228/#274候補。#191は含めない |

高優先候補は11グループ23レコード。保留候補は別途11グループ26レコード。

## 3. 自動整合性検査
- 高優先候補23レコードすべて、manifestのauditNumber / arrayIndexZeroBased / expectedName / expectedCategoryがbaseline上の実レコードと一致。
- 保留候補26レコードすべて同様に一致。
- 高優先候補の重複参照なし。
- 保留候補の重複参照なし。
- 高優先候補と保留候補のレコード番号重複なし。
- 高優先候補・保留候補を合わせた49件の参照はすべて278件の範囲内。
- 実データ上のname/categoryは今回変更していない。

## 4. 既存duplicateGroupの保護
既存のduplicateGroupを持つ高優先候補は次の3グループのみ:
- #11/#242: `enel`
- #76/#247: `refresh`
- #78/#255: `arinoa`

これらは既存値をそのまま維持する。新しいタグで上書きしない。

保留側の#195/#215/#266は既存 `duplicateGroup=mens-spa-r` を保持。#145をこの既存グループへ追加しない。manifestの保留グループ名 `spa-r` を使って既存値を置換しない。

## 5. 個別の衝突・境界条件
- #210 FREEDOM: #210のname/categoryは維持。Be-ange ID38980由来と疑われるURL/電話/営業時間をFREEDOM側に移し替えない。#36/#261と同一店舗関係の確定は別途証拠条件を維持。
- #276 Be-ange: FREEDOM候補グループへ入れない。変更しない。
- #147/#253 Cherry SPA: #147はesthetic、#253はmen-esthe。カテゴリ差を消さず、ブランド/ルーム同一視を保留。
- #228/#274 Labyrinth: 候補として維持するが、#191「天使のエプロン」は電話番号一致だけで統合せず、候補グループにも追加しない。
- #145/#195/#215/#266 spa R: カテゴリ差と既存mens-spa-rグループを維持。
- #163/#254 NAGOMI: 店舗型と出張型のサービス差を保持。
- #166/#189/#252/#271 IVY SPA: 出張専門の記録を固定住所へ統合しない。
- #101/#103 LIGHT/STORY: 電話番号が異なるため別記録。
- #104/#105 Sherbet: 本館/別館を別記録として維持。
- #149/#150 Casablanca/Mosaic: 合併履歴の参照にとどめ、別記録を維持。
- #278 CRADLE: 電話2件を出典別に保持し、どちらかへ一本化しない。

## 6. 非実行シミュレーション
manifestの高優先候補・保留候補をbaselineへ追加適用せず、メモリ上で参照整合性と既存フィールド衝突を点検した。実際のduplicateGroup追加、別名追加、レコード統合、削除、カテゴリ変更は行っていない。

## 7. 結論と制約
- manifestの参照整合性: 合格
- 高優先候補と保留候補の重複: なし
- 既存duplicateGroupの上書きリスク: 対象フィールドを変更しない限り回避可能
- ただし、11グループすべてが同一店舗として確定したわけではない。候補ごとの元掲載ID確認などの未解決条件は残る。
- このレポートはメモリ上の構造チェックであり、Python validatorの実行ログではない。
- manifestは引き続き `review_only_not_executable`。自動適用可能なパッチではない。

## 8. 本番変更の有無
- `switcher/store-database.json`: 変更なし
- DB/D1、ランキング、アプリ、API、Render: 変更なし
- 店舗統合・削除・名称変更: 0件
- duplicateGroupの追加・変更: 0件
