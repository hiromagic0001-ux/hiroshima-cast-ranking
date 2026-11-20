# 2026-11-20 優先重複候補・公開情報再照合 第2バッチ

作成日: 2026-11-20
対象: 15レコード・10候補群（#8/#238、#11/#242、#55/#84、#76/#247、#78/#255、#147/#253、#163/#254、#54/#257/#258、#101/#103、#116/#141）
目的: 既存横断台帳の優先重複候補を公開ページで再照合し、同一性・業態・住所の矛盾を整理する。
変更範囲: 本レポートのみ。店舗マスター、DB/D1、ランキング、アプリ表示、API、Render設定・デプロイは変更していない。

## 判定基準
- 店名、電話、住所、公式ドメイン、媒体ID、業態の複数要素を照合する。
- 電話や住所の一致だけで統合しない。
- 同じブランドの別ルーム、別業態、派遣サービスは区別する。
- 公開ページの掲載と現営業・当日受付は別の状態。
- 確認できなかった候補は削除・閉店扱いにしない。

## 1. 10候補群の再照合結果

|候補群|公開情報の再確認|判定・次の扱い|
|---|---|---|
|#8 Toriko / #238 Toriko|独立公式サイトに電話090-5245-2221、広島市中区舟入町、9:00〜22:00、予約フォームと出勤情報を掲載。公式: https://hiroshima-toriko.com/ 。予約フォーム: https://hiroshima-toriko.com/sp/contact.php 。|電話・公式ドメインが一致する高確度重複候補。公式営業時間は9:00〜22:00だが第三者媒体に別時間帯もあるため営業時間は公式値と媒体値を併記し、#8/#238の自動統合はしない。|
|#11 ENEL / #242 ENEL|公式サイトに電話080-8244-9297、6:00〜翌5:00、出勤表を掲載。アクセス案内は中区の昭和町・竹屋等の複数ルーム。公式: https://enel-official.com/ 。第三者媒体も電話・営業時間・公式URLが一致。|高確度重複候補。複数ルームの情報を維持し、固定単一住所へ集約しない。|
|#55 Seraphi Spa / #84 セラフィスパ|公式ブランドサイト配下のセラピストページにSeraphi Spa、電話070-5051-6726、10:00〜30:00（受付9:30〜29:00）を掲載。URL: https://seraphi-sp.com/therapist/994718/ 。エステ魂店舗ID43583も電話・広島市掲載を確認。URL: https://estama.jp/shop/43583/cast/ 。|電話・ブランド名・掲載ページの一致から高確度重複候補。#55/#84は関連付け候補とする。|
|#76 Refresh / #247 Refresh|エステ魂の個別ページに電話080-8244-3030、住所は中区舟入町、営業時間10:00〜翌2:00、公式HP r-s-refresh-hiroshima.com、2026-10-28の新着情報を掲載。URL: https://estama.jp/shop/28164/ 。|公式URL・電話・店名が一致する高確度重複候補。公式サイト側の時間表記と媒体側の差異は併記する。複数住所はルーム情報として維持。|
|#78 Arinoa / #255 Arinoa|メンエスじゃぱんの出勤ページに電話080-2517-0007、11:00〜LAST、公式HP arinoa-esthe.com、2026-11-15週の出勤情報を掲載。URL: https://mens-est.jp/shop/arinoahrsm/schedule/ 。|電話・公式URL・店名が一致する高確度重複候補。公式ドメインへの直接接続確認とは区別し、媒体掲載情報として扱う。|
|#147 Cherry SPA広島 / #253 Cherry SPA東平塚店|公式サイトに電話080-3435-5505、固定電話082-207-0960、9:00〜翌5:00、複数ルーム（宝町6、銀山町、東平塚2、昭和町6）を掲載。公式: https://cherryspahiroshima.com/ 。メンエスmallにも2026-10-24更新表示、同じ携帯番号を掲載。URL: https://menesmall.jp/shop/cherryspa 。|同一ブランド/運営の関連候補として強い。#147は元データcategory=esthetic、#253はmen-estheで分類不整合あり。店舗/ルームとカテゴリの再確認が必要。単純に片方を削除せず、公式の複数ルームを保持する。|
|#163 NAGOMI～和み～ / #254 出張メンズエステ～NAGOMI～|公式サイトに電話090-7130-2000、8:00〜翌6:00、出勤表・予約フォームを掲載。公式: https://nagomi-hiroshima.com/ 。メンエスmallの#254相当ページは同電話、昭和町の住所、12:00〜翌5:00、ホテル/自宅出張可と掲載。URL: https://dr.ptr216.ptrcloud.net/shop/nagomi/contact 。|同一ブランドの可能性は高いが、公式と媒体で営業時間が異なり、#254の出張サービス登録と#163の店舗ブランド登録の粒度が異なる。店舗と出張を別サービス単位で残し、統合は保留。|
|#54 キング / #257 KING'S 広島 / #258 KING'S|エスタマ求人のKING'Sページに電話080-9555-2545、広島市マンション個室の掲載。URL: https://esjob.jp/etc/hiroshima/a3401/p6/ 。既存台帳の#54にも同電話・富士見町・10:00〜LASTの媒体記録がある。|#54/#257/#258は同一店舗候補の可能性が高まったが、#257/#258個別の店舗ID・公式ページを確定できていない。電話一致だけで統合せず、3件とも保留。|
|#101 LIGHT / #103 STORY ここだけの物語|LIGHTは中区弥生町3-12、電話082-541-2118、9:00〜24:00、ソープランドとして掲載。URL: https://ultimate-map.com/yoru/fu-zoku/shop.php?id=267a936b58 。STORYも同じ住所3-12、電話082-240-5167、9:00〜24:00、ソープとして掲載。URL: https://ultimate-map.com/yoru/fu-zoku/shop.php?id=e8a7064798 。|同じ住所でも電話・店舗名・個別掲載が異なるため別店舗維持。住所共有、建物内区画、旧店名等の関係は未確定。通常メンズエステランキング対象外。|
|#116 Serenity / #141 Serenity Oasis|Serenityは中区弥生町3-20、電話082-246-0070、9:00〜24:00、店舗型ヘルスとして掲載。URL: https://ultimate-map.com/yoru/fu-zoku/shop.php?id=f13fabfea0 。|#141 Serenity Oasisの同住所を裏付ける独立ページを今回確認できず。#116は店舗型ヘルス。#141は未確認のまま別保持し、同住所だけで統合しない。|

## 2. 重要な訂正・分類注意
- #101 LIGHTと#103 STORYは、同住所でも電話が異なり、別のソープランド掲載ページが存在する。住所一致で統合しない。
- #116 Serenityは通常メンズエステではなく店舗型ヘルスの掲載。#141 Serenity Oasisとの同一性は未確認。
- #147 Cherry SPAは元データのカテゴリタグがesthetic、#253はmen-esthe。公式サイトは同一ブランドの複数ルームを示すため、カテゴリ・店舗単位の整理が必要。
- #163/#254 NAGOMIは同一電話だが、店舗ブランドと出張サービスの粒度が異なる。営業時間も公式8:00〜翌6:00、第三者ページ12:00〜翌5:00と異なる。
- #54/#257/#258 KING'Sは電話一致情報があるが、個別店舗IDを確定できず統合保留。

## 3. 判定まとめ
### 高確度重複候補（自動統合はしない）
- #8/#238 Toriko
- #11/#242 ENEL
- #55/#84 Seraphi Spa
- #76/#247 Refresh
- #78/#255 Arinoa
- #147/#253 Cherry SPA（ブランド/複数ルームの関連）
- #163/#254 NAGOMI（同一ブランド候補だが店舗・出張のサービス単位は保持）

### 要追加確認・別レコード維持
- #54/#257/#258 KING'S
- #101/#103 LIGHT・STORY（別電話・別掲載のため別維持）
- #116/#141 Serenity・Serenity Oasis（#141の独立情報未確認）

## 4. 変更範囲
- 再照合: 15レコード・10候補群。
- 店舗マスターの統合・削除・名称変更: 0件。
- DB/D1/ランキング/アプリ/API変更: 0件。
- Render設定・デプロイ: 0件。
- 現営業・当日受付を全件保証する調査ではない。

## 参照URL
- https://hiroshima-toriko.com/
- https://hiroshima-toriko.com/sp/contact.php
- https://enel-official.com/
- https://enel-official.com/schedule.php
- https://seraphi-sp.com/therapist/994718/
- https://estama.jp/shop/43583/cast/
- https://estama.jp/shop/28164/
- https://mens-est.jp/shop/arinoahrsm/schedule/
- https://cherryspahiroshima.com/
- https://menesmall.jp/shop/cherryspa
- https://nagomi-hiroshima.com/
- https://dr.ptr216.ptrcloud.net/shop/nagomi/contact
- https://esjob.jp/etc/hiroshima/a3401/p6/
- https://ultimate-map.com/yoru/fu-zoku/shop.php?id=267a936b58
- https://ultimate-map.com/yoru/fu-zoku/shop.php?id=e8a7064798
- https://ultimate-map.com/yoru/fu-zoku/shop.php?id=f13fabfea0
