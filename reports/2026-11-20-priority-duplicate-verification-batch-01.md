# 2026-11-20 優先重複候補・一次公開情報再照合 第1バッチ

作成日: 2026-11-20
対象: 横断最終チェックで優先度A/Bとした重複・誤紐付け候補のうち10グループ
目的: 公開されている公式ページ/店舗個別ページを再確認し、同一候補の根拠と未解決点を更新する。
変更範囲: 本レポートのみ。店舗マスター、DB/D1、ランキング、アプリ表示、API、Render設定・デプロイは変更していない。

## 判定ルール
- 店名・電話・住所・公式ドメイン・掲載IDの複数項目を組み合わせて判断する。
- 電話番号が一致しても、電話共用や誤掲載が疑われる場合は統合しない。
- 同一ブランドでも店舗・ルーム・出張サービスの登録単位は保持する。
- 公開ページに掲載されていることと、当日の営業・受付可否は区別する。
- 外部ページの情報を店舗マスターへ自動転記しない。

## 1. 再照合結果

|候補群|今回再確認できた公開情報|評価・次の扱い|
|---|---|---|
|#36 FREEDOM / #261 FREEDOM|メンエスじゃぱんのFREEDOMページに電話070-8499-1534、営業時間10:00〜LAST、広島エリアを掲載。既存の#36/#261照合情報と一致。URL: https://mens-est.jp/shop/frdmhrs/|高確度重複候補。#36/#261の関連付けを維持。|
|#210 FREEDOM / #276 Be-ange|エステ魂のBe-ange個別ページに電話090-9251-0678、広島市中区宝町、11:00〜翌3:00、LINE ID beange.beauty、公式HP欄beange.men-este.netを掲載。URL: https://estama.jp/shop/38980/ 。一方、#210の台帳名はFREEDOMで、以前の監査ではbeange-beauty.comが関連付けられているが、その独立公式性は直接確認できていない。|#210をFREEDOM #36/#261へ統合しない。#210/#276はBe-ange誤紐付け/重複の高優先候補として隔離。#210の元URL・掲載IDを再確認してから人手修正を判断。|
|#278 CRADLE|求人ガイド掲載は中区鶴見町7、電話070-1482-6361、10:00〜翌5:00。URL: https://hiroshima-menes-recruit.com/store/store-046/ 。エステ魂個別ページは同住所・同営業時間帯だが電話070-1482-6332。URL: https://estama.jp/shop/43539/bloglist/|住所・営業時間は一致。電話は2媒体で不一致。どちらも確定番号にせずnull/未確定を維持。求人ガイドの記述は求人情報由来で、予約用番号と同一とは限らない。|
|#52 Grace Spa / #243 Grace Spa|公式サイトhiroshima-grace-spa.comに電話090-7373-9222、OPEN 10:00〜LASTを掲載。URL: https://hiroshima-grace-spa.com/ 。メンエスmallは11/19更新表示、同電話・広島市内マンション型掲載。URL: https://menesmall.jp/shop/grace-spa|高確度重複候補。4ルーム情報は削らず、ブランドとルームを分けて保持。|
|#35 Dior / #62 Dior観音店|エステ魂の個別ページにDior観音店、電話090-5818-3970、住所西区観音本町1-4-7 BM-12ビル、11:00〜翌2:00、公式HP aroma-iris.netを掲載。URL: https://estama.jp/shop/34319/ 。別媒体にも同電話・住所・営業時間が掲載。URL: https://menes-style.jp/chugoku_shikoku/hiroshima/diorkanon|観音店のレコードは同一店舗候補として高確度。#35がブランド/別ルームの包括レコードである可能性があるため、#35/#62を単純削除・統合せず、観音店単位を維持。|
|#166/#189/#252/#271 IVY SPA|公式予約ページに電話番号例080-3884-8693を明記し、利用場所はホテル/自宅を入力する形式。固定店舗来店ではなく出張利用の設計。URL: https://ivyspa.jp/reserve.html|同一出張専門ブランドの候補として関連維持。固定住所を作らない。電話番号の現在の受付利用可否は予約画面の表示だけでは確定しない。|
|#195 spa R / #215・#266 Men's spa R|mensspa-r.comの公開サイトに「Mens spa R」の名称、セラピスト一覧、最新情報、出張交通費に関する記載。URL: https://mensspa-r.com/|同一ブランド候補の根拠は強まった。#145「スパ アール」と同一か、また複数台帳行が同一店舗/出張ページかは未確定。店名が似ているだけの他店と統合しない。|
|#208 Affino / #259 Affino|メンエスmallにAffino、電話090-7120-0001、中区三川町6、11:00〜翌2:00。店舗ページ更新表示2025/06/30。URL: https://menesmall.jp/shop/affino 。利用案内ページにも同電話・同住所。URL: https://menesmall.jp/shop/affino/flow|同一店舗候補として高確度。#208/#259は重複整理対象だが、マスター統合は未実施。掲載更新日が古いため現営業は未確認。|
|#219 Reflet Spa / #269 Reflet Spa|メンエスmallに電話080-8356-7959、住所中区田中町1-1 山本ビル1F、営業時間11:00〜翌3:00、受付10:00〜LAST。URL: https://menesmall.jp/shop/reflet-spa 。問い合わせページも同じ値。URL: https://menesmall.jp/shop/reflet-spa/contact|高確度重複候補。両番号を同一店舗候補として関連付ける。店舗マスター統合は未実施。|
|#191 天使のエプロン / #228・#274 Labyrinth|Labyrinthのメンエスmallページに電話080-9130-7433、広島市内マンション型、営業時間10:00〜翌3:00。URL: https://menesmall.jp/shop/labyrinth 。#191側にも同電話の記録があるが、店名・公式リンクは異なる。|#228/#274は高確度重複候補。#191は電話番号一致だけなので統合禁止。電話共用/誤掲載の可能性を残して別レコード維持。|

## 2. このバッチで優先度を更新した項目

### 統合候補として強い（マスター操作はまだしない）
- #36/#261 FREEDOM
- #52/#243 Grace Spa
- #208/#259 Affino
- #219/#269 Reflet Spa
- #228/#274 Labyrinth
- #35/#62 Dior観音店の同一店舗候補

### 誤紐付け・電話不一致などのため保留
- #210/#276 Be-ange: #210の元データ帰属を解消するまで修正保留
- #278 CRADLE: 070-1482-6361と070-1482-6332の両方を未確定として保持
- #191 天使のエプロン: Labyrinthとの電話一致だけでは統合しない
- IVY SPA: 出張専門のブランド重複として保持、固定住所なし
- spa R: 同一ブランド候補を維持し、#145との関係は保留

## 3. 次の処理
1. #210の台帳原始データとURL・店舗IDの対応を確認し、誤紐付けの修正案を作成。
2. #278 CRADLEは店舗側の予約導線に電話が明示されるかを追加確認。求人用番号と予約番号を混同しない。
3. 高確度重複候補は、店舗マスター変更前に統合前後のレコード差分を作成。
4. その後、#1〜#100の残りの横断候補を同じ方式で確認する。

## 4. 変更範囲・制約
- 今回再照合: 10グループ。
- 重複統合・レコード削除・名称変更: 0件。
- 店舗マスター/DB/D1/ランキング/アプリ/API変更: 0件。
- Render設定・デプロイ: 0件。
- 現営業・当日受付の全件確認は行っていない。
- 参照ページの掲載内容は、掲載時点の公開情報として扱う。

## 参照URL
- https://mens-est.jp/shop/frdmhrs/
- https://estama.jp/shop/38980/
- https://hiroshima-menes-recruit.com/store/store-046/
- https://estama.jp/shop/43539/bloglist/
- https://hiroshima-grace-spa.com/
- https://menesmall.jp/shop/grace-spa
- https://estama.jp/shop/34319/
- https://menes-style.jp/chugoku_shikoku/hiroshima/diorkanon
- https://ivyspa.jp/reserve.html
- https://mensspa-r.com/
- https://menesmall.jp/shop/affino
- https://menesmall.jp/shop/affino/flow
- https://menesmall.jp/shop/reflet-spa
- https://menesmall.jp/shop/reflet-spa/contact
- https://menesmall.jp/shop/labyrinth
