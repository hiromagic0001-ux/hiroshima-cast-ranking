# 2026-11-20 #210 FREEDOM / #276 Be-ange 最新公開ページ再確認・P0結論

## 対象と安全条件
- 対象: Hiroshima Cast Search の監査番号#210、#276。比較対象#36/#261。
- baseline: `switcher/store-database.json` / SHA `d7e32e6ca082352ffbe981a73df80b233e024c43`。
- 公開ページを再確認しただけで、店舗マスター、DB/D1、ランキング、アプリ、API、Renderは変更していない。

## 1. 最新ページで再確認した内容
### FREEDOM（エステ魂 ID40477）
- https://estama.jp/shop/40477/newslist/
- 2026-11-20付の複数ニュースに店舗名FREEDOM、広島市、電話070-8499-1534、営業時間10:00〜30:00を掲載。
- 店舗ページ上部は10:00〜LAST表記。
- https://estama.jp/shop/40477/menu/ でも予約電話070-8499-1534、営業時間10:00〜LASTを確認。
- https://estama.jp/shop/40477/flow/ は宝町ルーム、フジグラン広島から徒歩1分、予約時に電話で案内する流れを掲載。
- これらはFREEDOM ID40477の情報であり、#210のbatchAuditおよび#36/#261の電話・ID情報と整合。

### Be-ange（エステ魂 ID38980）
- https://estama.jp/shop/38980/
- 店名Be-ange、広島市中区宝町、電話090-9251-0678、営業時間11:00〜翌3:00、受付10:00〜翌3:00を掲載。
- 同ページの公式ホームページ欄は https://beange.men-este.net/ 。
- https://estama.jp/shop/38980/menu/ でも電話・店名・営業時間が整合。
- これは#276 Be-angeの既存情報と整合し、FREEDOM ID40477とは別店舗掲載。

## 2. #210の最終的なフィールド判断
- `name` = FREEDOM（フリーダム）: 維持。ID40477のページ名と一致。
- `batchAudit`: FREEDOM ID40477 / 070-8499-1534 / 10:00〜30:00として有効な照合証拠。
- `individualAudit.phone` = 090-9251-0678、`hours` = 11:00〜27:00、`url` = https://beange-beauty.com/、`kind` = independent-official-site-confirmed: FREEDOM ID40477と不一致。Be-ange由来の可能性が高い混入証拠として隔離対象。
- `sources`内のID38980およびBe-ange独立ドメインURL: FREEDOMの確認根拠としては使用しない。元の監査履歴として削除せず保全する。
- `officialUrl` = https://beange-beauty.com/: Be-angeの現行エステ魂公式HP欄は別URL beange.men-este.netを示している。beange-beauty.comの真正性・帰属は未確定。FREEDOMの公式URLとしては採用しない。即削除・置換もしない。
- #276 Be-ange、#36/#261 FREEDOMのレコードは一切変更しない。

## 3. 修正案の最小範囲（未適用）
1. #210の変更前全レコードを隔離履歴に完全保存。
2. #210に「ID40477 FREEDOMとID38980 Be-angeの監査証拠混在」フラグを追加。
3. Be-ange由来と考えられるindividualAudit一式とURLを、FREEDOMの確証済み情報から除外し、隔離履歴から参照できる状態にする。
4. FREEDOMの電話・営業時間はID40477のページを出典として別証拠に記録する。ただし既存の値を上書きする前にvalidatorと承認を必須とする。
5. #210のname/category、#276、#36/#261、既存duplicateGroupは不変。
6. 公式URLの空欄化/置換は独立公式サイトの確認後に判断。

## 4. 結論
前回の仮説「#210の店名そのものがBe-angeの誤り」は採用しない。最も整合する説明は「#210はFREEDOMのレコードだが、Be-angeの個別監査フィールドが混入」。#210を#36/#261と関連するFREEDOM候補として扱い、#276を別Be-angeレコードとして維持する。自動統合・削除はしない。

## 5. 次の優先調査
次は#278 CRADLEの電話番号競合（070-1482-6332 / 070-1482-6361）を、店舗公式・現行媒体・各番号の帰属の順に追加確認する。番号が異なるだけで複数店舗や別店舗と断定しない。

## 6. 変更状況
- 店舗マスター変更: 0
- #210/#276/#36/#261のフィールド変更: 0
- 統合・削除: 0
- DB/D1/ランキング/アプリ/API/Render変更: 0
