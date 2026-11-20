# 2026-11-20 #210 FREEDOM / #276 Be-ange P0再照合：誤紐付けの訂正範囲

## 結論
前回の「#210全体がBe-angeの誤名称」という仮説は広すぎた。再照合すると、#210の**店舗名FREEDOM自体は独立したFREEDOM掲載（エステ魂ID40477）と一致**する。一方、#210レコード内の一部フィールドにBe-ange（エステ魂ID38980）の電話・URLが混入しており、**レコード全体ではなく、個別監査フィールドの混在・誤紐付け**として扱うのが妥当。

## 一次的に確認できた掲載情報
### FREEDOM（#36/#261と同じ候補）
- エステ魂個別ページ：https://estama.jp/shop/40477/
- ニュースページ：https://estama.jp/shop/40477/newslist/
- ページ名はFREEDOM、電話070-8499-1534、営業時間10:00〜LAST、広島市掲載。直近ニュースにもFREEDOMの店舗名・電話・営業時間が記載されている。
- メンエスじゃぱんのFREEDOM個別ページも電話070-8499-1534、宝町ROOM、フジグラン広島徒歩1分を掲載。
- メンズエステマップのFREEDOM個別ページも電話070-8499-1534、広島市、10:00〜LASTを掲載。
- #36の記録は電話070-8499-1534、エステ魂40477のニュース、メンエスじゃぱん、メンズエステマップの情報と整合。
- #261はエステ魂40477を明示しており、同じFREEDOM候補として整合。

### Be-ange（#276）
- エステ魂個別ページ：https://estama.jp/shop/38980/
- メンエスmall個別ページ：https://menesmall.jp/shop/be-ange
- 店名Be-ange、電話090-9251-0678、中区宝町、営業時間11:00〜翌3:00、予約受付10:00〜翌3:00、LINE ID beange.beauty。
- エステ魂の公式HP欄は https://beange.men-este.net/ だが、既存監査では同URLは404。稼働する独立公式サイトとは扱わない。
- #276の記録はBe-ange、電話090-9251-0678、宝町、同じエステ魂ID38980と整合。

## #210レコード内の混在箇所
- `name`: FREEDOM（フリーダム）— エステ魂ID40477の店舗名と整合。
- `sources`: Ultimate Mapの広島市一覧、エステ魂ID38980、Be-ange独立ドメインと記載。ここにBe-ange由来の参照が混ざっている。
- `individualAudit.url`: https://beange-beauty.com/
- `individualAudit.phone`: 090-9251-0678
- `individualAudit.hours`: 11:00〜27:00
- `individualAudit.kind`: independent-official-site-confirmed
- これらはBe-ange側の電話・掲載情報に対応するが、#210のFREEDOM（ID40477）とは一致しない。
- 一方、同じ#210内の `batchAudit` にはFREEDOMのID40477、電話070-8499-1534、10:00〜30:00の情報が記録されており、#36/#261と整合する。
- #210の `officialUrl` はbeange-beauty.comとして保存されているが、Be-angeのエステ魂ID38980に記載された公式HP欄はbeange.men-este.net。独立ドメインの真正性・#210との対応は確認できないため、#210のFREEDOM公式URLとして採用しない。

## 安全な訂正案（未適用）
1. #210のレコード名FREEDOMは維持する。Be-angeへの名称変更は行わない。
2. #210のBe-ange由来と考えられる `individualAudit` の電話・営業時間・URL・kind・sourcesを「誤紐付け疑い／旧監査記録」として隔離し、FREEDOMの確認済み情報として参照しない。
3. #210のFREEDOM情報は、エステ魂ID40477および電話070-8499-1534を基準に、#36/#261と同じ重複候補グループへ参照設定する案。ただしID40477が#36/#261の元出典と同じであることを保持する。
4. #276はBe-ange ID38980・電話090-9251-0678の別レコードとして維持する。
5. #210の `officialUrl` を即時削除・置換しない。FREEDOMの独立公式サイトが未確認であることを記録し、Be-ange由来のURLを公式URL欄から外す変更は人手承認後に行う。
6. #210の元情報・誤混入フィールド・訂正理由・出典URLを履歴として保存する。

## 重要な訂正
- 旧仮説「#210はBe-angeの名称誤り」：撤回。
- 新しい判断「#210はFREEDOMのレコードだが、Be-angeの個別監査情報が混在」：現時点で最も整合的。
- #210と#276を統合しない。
- #36/#261 FREEDOMと#210は同一店舗候補として維持するが、レコード削除はしない。

## 実変更
- 店舗マスター更新：0
- #210/#276の名称・電話・URL・住所変更：0
- 重複統合・削除：0
- DB/D1/ランキング/アプリ/API/Render変更：0

## 根拠ページ
- エステ魂 FREEDOM ID40477: https://estama.jp/shop/40477/
- エステ魂 FREEDOMニュース: https://estama.jp/shop/40477/newslist/
- メンエスじゃぱん FREEDOM: https://mens-est.jp/shop/frdmhrs/
- メンズエステマップ FREEDOM: https://ultimate-map.com/yoru/mensaesthe/spot.php?id=raf3fba35d7
- エステ魂 Be-ange ID38980: https://estama.jp/shop/38980/
- メンエスmall Be-ange: https://menesmall.jp/shop/be-ange
