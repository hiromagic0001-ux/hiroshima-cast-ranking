# spa R #145/#195/#215/#266 電話番号・業種差分照合（2026-11-20）

## 基準データ
Blob: d7e32e6ca082352ffbe981a73df80b233e024c43
- #145: 「スパ アール」category=esthetic。既存 batchAudit に電話070-5626-5005、公式URL候補 mensspa-r.com、広島市の出張対応掲載。
- #195: 「spa R（スパアール）」category=men-esthe。公式URL mensspa-r.com、既存 duplicateGroup=mens-spa-r、role=primary。
- #215: 「Men’s spa R」category=men-esthe。既存 duplicateGroup=mens-spa-r、role=alias。
- #266: 「Men's spa R」category=men-esthe。既存 duplicateGroup=mens-spa-r、role=alias。

## 新たに取得した公開情報
1. 公式サイト https://mensspa-r.com/ は「Mens spa R」として稼働し、セラピスト一覧・最新情報を掲載。
2. メンズエステじゃぱん https://mens-est.jp/shop/MensspaR/ は同公式URLを示し、電話080-3895-5005（求人用）と別途店舗基本電話070-5626-5005を掲載。営業時間11:00〜翌4:00。
3. エステ魂の広島県出張店一覧 https://estama.jp/etc/shoplist/3400/delivery/typ90/ は spa R～スパアール～、広島市、電話070-5626-5005、9:00〜30:00を掲載。
4. Ultimate Map https://ultimate-map.com/yoru/mensaesthe/spot.php?id=r6f60f5f7d3 は Men’s spa R、広島市、出張型、電話080-3895-5005、9:00〜翌4:00を掲載。
5. メンエスmall https://menesmall.jp/shop/mensspa-r/system は Men’s spa R、電話080-3895-5005、広島市中区昭和町、出張型、11:00〜翌5:00を掲載。
6. メンズエステスタイル https://menes-style.jp/chugoku_shikoku/hiroshima/mensspar およびサロンガイド https://www.ms-guide.jp/shop/detail.php?id=mensspar-hiroshima も080-3895-5005、公式URL mensspa-r.com、出張型を掲載。

## 判定
- #195/#215/#266は、既存duplicateGroupと公式URLに加え、複数媒体でMen’s spa Rの名称・電話080-3895-5005・出張専門という情報が整合。既存の同一店舗候補を維持する。
- #145はカテゴリーがestheticで、電話070-5626-5005。これはエステ魂・メンズエステじゃぱんが現行公開情報として店舗電話に掲載する番号であり、080-3895-5005と同じブランドに併記される可能性がある。ただし、番号が二つある理由（予約窓口/旧番号/別店舗/媒体誤記）を公式一次情報で確定できない。
- したがって#145を#195/#215/#266へ自動統合しない。別カテゴリーのまま関連候補として保留。電話番号を片方へ上書きしない。
- 080-3895-5005は複数媒体で連続して確認できるが、公開サイトの電話表記が用途別に分かれている可能性があり、主番号・求人番号等の用途を断定しない。
- 住所について、メンエスmallは中区昭和町と掲載する一方、他媒体は広島市/広島駅発/派遣専門とする。固定店舗として住所登録せず、出張型として扱う。
- 営業時間は9:00〜翌4:00、11:00〜翌4:00、11:00〜翌5:00、9:00〜30:00と媒体差がある。媒体ごとの表記を保持し単一値に確定しない。
- 第三者媒体の掲載は当日の受付可否を保証しない。

## 安全措置
本報告は監査・相互参照のみ。#145のcategory、電話、公式URL、#195/#215/#266の既存duplicateGroupを変更しない。レコード削除・追加・統合なし。ランキング、API、Render本番への変更なし。
