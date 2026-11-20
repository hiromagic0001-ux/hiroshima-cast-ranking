# Serenity #116 / Serenity Oasis #141 店名変更・住所一致の履歴照合（2026-11-20）

## 基準データ
Blob: d7e32e6ca082352ffbe981a73df80b233e024c43
- #116: Serenity（セレニティ）、category=store-health、住所 広島市中区弥生町3-20、電話082-246-0070、営業時間9:00〜24:00（Ultimate Mapの第三者掲載値）。
- #141: Serenity Oasis、category=store-health、求人媒体の住所 広島市中区弥生町3-20。電話・営業時間の確認値は基準レコードに未設定。

## 今回の公開情報照合
1. バニラ求人のSerenity Oasisページ（更新2026-11-07）は、店名Serenity Oasis、広島市中区弥生町3-20、店舗型ヘルスと記載。応募用メールは serenityoasis0070@icloud.com。顧客予約電話の記載は取得本文で確認できず。
   URL: https://chugoku-shikoku.qzin.jp/39929797/?d=22294
2. メンズバニラの求人ページもSerenity Oasis、同住所、広島市、店舗型ヘルスを掲載。
   URL: https://mens-qzin.jp/hiroshima/area_34001/detail/frozenmens/
3. ぴゅあじょの求人一覧もSerenity Oasis、同住所「広島市中区弥生町3番20号」を掲載。
   URL: https://work.purelovers.com/chugoku-shikoku/shoplist/as670.html
4. 広島の店舗履歴をまとめた公開ページは、2026-05-15に「Serenity Oasis」がFROZENの場所で開店し、2026-08-01に店名を「Serenity（セレニティ）」へ変更した履歴を記載。Serenityはオアシス系列と説明。
   URL: https://www.xn--3ck9buft17qyvb.com/column.html
5. Ultimate MapのSerenity個別ページ（基準レコード既存ソース）は、広島市中区弥生町3-20、電話082-246-0070、9:00〜24:00、無休と掲載。
   URL: https://ultimate-map.com/yoru/fu-zoku/shop.php?id=f13fabfea0

## 判定
- #116と#141は住所が同一であるだけでなく、公開店舗履歴にSerenity Oasis（2026-05-15開店）からSerenity（2026-08-01店名変更）への連続した店名変更履歴が明示される。さらに2026-11-07更新のSerenity Oasis求人ページは同じ住所で旧店名を掲載し続けている。
- よって、単なる住所一致より強い「同一場所・同系列の店名変更/掲載更新遅延」候補と判定。ただし、店名変更後もSerenity Oasis名義で求人が継続しているため、同一運営・同一営業主体が現在も完全に同一であるかは求人掲載だけでは確定できない。安全上は高確度関連候補としてリンクし、統合は保留。
- #116の電話082-246-0070はUltimate Map掲載値。Serenity Oasis求人ページには顧客電話がなく、同じ番号を現在の予約番号として確証できない。番号を#141へ転記しない。
- 営業時間9:00〜24:00も#116の第三者掲載値。Serenity Oasisの現行営業時間として転記しない。
- 店舗型ヘルス（store-health）であり、メンズエステや派遣型として分類変更しない。
- 「Serenity Oasis」は2026-11-07にも求人情報が更新されているが、求人ページ更新は顧客向け営業・当日受付の証明ではない。

## 安全措置
#116/#141は店名変更履歴・同一住所の高確度関連候補として相互参照するのみ。自動統合・削除なし。電話・営業時間・公式URL・categoryを上書きしない。ランキング/API/Render本番への変更なし。
