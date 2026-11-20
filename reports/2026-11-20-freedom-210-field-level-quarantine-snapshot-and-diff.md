# 2026-11-20 #210 FREEDOM/Be-ange フィールド単位差分・隔離スナップショット案

## 1. 作業状態
- 対象: `switcher/store-database.json` の監査番号#210（配列index 209）と#276（index 275）、比較対象#36/#261
- 取得した基準Blob SHA: `d7e32e6ca082352ffbe981a73df80b233e024c43`
- 基準件数: 278
- 今回は基準Blobを読み取り、完全な#210/#276レコードをスナップショット化した設計案を作成した。
- JSON、DB/D1、ランキング、アプリ、API、Renderへの書き込みは行っていない。

## 2. #210で判明している矛盾
#210はレコード名が「FREEDOM（フリーダム）」、categoryがmen-esthe。一方で、次の情報が同じレコード内に混在している。

### A. Be-ange側に対応する情報
- エステ魂 ID 38980
- 電話 090-9251-0678
- URL https://beange-beauty.com/
- 営業時間 11:00〜27:00（受付10:00〜27:00）
- 公式URLステータスは「独立ドメインの店舗ブランドサイトを媒体のブランドサイト欄から確認」と記録
- #276 Be-angeにもエステ魂 ID 38980、電話090-9251-0678、広島市中区宝町、11:00〜翌3:00の第三者媒体情報が記録されている
- ただし#276の登録公式URLは https://beange.men-este.net/ で、監査時点404。#210のbeange-beauty.comと同一ドメインではない。両URLが同一店舗の別ドメインか、別のブランドサイトかは公開根拠だけで断定しない。

### B. FREEDOM側に対応する情報
- エステ魂 ID 40477
- 電話 070-8499-1534
- 営業時間 10:00〜LAST（ニュース等では10:00〜30:00表記）
- #36と#261の既存監査にも同じ電話・ID 40477が記録されている
- #210のbatchAuditもID 40477、電話070-8499-1534、10:00〜30:00を記録している

### C. 現時点での正確な結論
#210は、FREEDOMを示すbatchAuditと、Be-ange ID38980に対応するindividualAudit/officialUrl/sourcesが同居する競合レコード。Be-ange情報の混入疑いは強いが、#210の全レコード名がFREEDOMで正しいと確定したわけではない。名前・カテゴリはこの差分案では変更しない。Be-ange関連フィールドを無断削除せず、原値の完全スナップショットを残した上で「競合・隔離」状態にする案とする。

## 3. #210の完全な変更前スナップショット
以下はbaseline SHAの#210レコード全体。省略・編集せず隔離履歴に保持する。

```json
{
  "name": "FREEDOM（フリーダム）",
  "category": "men-esthe",
  "area": "広島市候補",
  "areaStatus": "媒体の広島市掲載・住所照合待ち",
  "status": "媒体掲載・未確定",
  "sources": [
    {"label": "風俗マップ・広島市メンズエステ37店", "url": "https://ultimate-map.com/yoru/mensaesthe/prefs.php?p=34"},
    {"label": "エステ魂 店舗詳細・ブランドサイト欄", "url": "https://estama.jp/shop/38980/"},
    {"label": "Be-ange 独立ドメイン公式サイト", "url": "https://beange-beauty.com/"}
  ],
  "bulkAuditStatus": "媒体掲載候補として一括点検済み・公式HP/所在地/営業状況の個別確認待ち",
  "bulkCrossCheck": {
    "checkedAt": "2026-11-14",
    "status": "name-match-in-current-directory-snapshot",
    "sources": [
      "Ultimate Map 広島県一覧（199件・広島市中区101件等）",
      "メンエスmall 広島（広島75店・広島市内65店と表示）",
      "メンエスパーク 広島（15店・2026-11-13更新）",
      "エステランキング 広島市内（メンズエステ48店表示）"
    ],
    "note": "現行ディレクトリの取得表示内に同名または名称一致を確認。営業中・公式サイト・住所の個別確証ではない。"
  },
  "individualAudit": {
    "checkedAt": "2026-11-19",
    "result": "広島市を対象とする現行媒体一覧の掲載名と照合一致。これは媒体掲載確認であり、現在営業中・当日受付・住所/電話/営業時間・公式サイトの真正性を独立確認したものではない。",
    "status": "媒体のブランドサイトリンクから独立ドメイン公式サイトを確認。公式サイトと媒体の店名・電話番号が一致。旧登録URLは404。住所の個別照合と最新営業状況は未確証。",
    "evidence": [
      {"source": "広島県メンズエステマップ（広島市37店の一覧）", "url": "https://ultimate-map.com/yoru/mensaesthe/prefs.php?p=34"},
      {"source": "広島市メンズエステ情報ランキング（107店一覧）", "url": "https://mensesthe-rank.jp/areas/hiroshima-hiroshima"},
      {"source": "MEN'S ES広島市一覧（184店舗）", "url": "https://mens-es.men/area/3401"},
      {"source": "メンエスセレクト広島市一覧（125店表示）", "url": "https://menesu-select.com/hiroshima/hiroshima/"}
    ],
    "scope": "広島市対象の媒体一覧の名称照合",
    "officialSiteStatus": "未確認",
    "operatingStatus": "営業中の個別確証なし",
    "url": "https://beange-beauty.com/",
    "kind": "independent-official-site-confirmed",
    "sources": [
      "https://estama.jp/shop/38980/",
      "https://beange-beauty.com/"
    ],
    "phone": "090-9251-0678",
    "hours": "11:00〜27:00（受付10:00〜27:00）",
    "thirdStageCrossCheck": {
      "checkedAt": "2026-11-19",
      "scope": "広島市カテゴリ第三者媒体の現行一覧スナップショット照合。店舗への直接確認ではない",
      "status": "今回取得した一覧表示範囲では名称一致未確証",
      "sources": [
        "https://mensesthe-rank.jp/areas/hiroshima-hiroshima",
        "https://menesu-select.com/hiroshima/hiroshima/"
      ],
      "note": "取得した一覧の表示範囲で一致を確証できず。表記揺れ・一覧の表示範囲・別業種・掲載時差の可能性があり、閉店・不存在・市外とは判定しない。既存個別監査は維持。"
    },
    "cityDirectoryCrossCheck20261119Batch201to250": {
      "checkedAt": "2026-11-19",
      "sourceType": "current third-party Hiroshima City directories",
      "note": "FREEDOM（フリーダム）は広島市の現行第三者店舗一覧に掲載。市役所前駅最寄り・10:00〜LAST。既存URLは保持し、独立公式サイトの稼働は未確認。",
      "sources": [
        "https://ultimate-map.com/yoru/mensaesthe/prefs.php?p=34",
        "https://mensesthe-rank.jp/areas/hiroshima-hiroshima",
        "https://mensesthe-ranking.net/column/new-shops/",
        "https://www.salonowa.jp/area/hiroshima/therapists?today=1"
      ]
    }
  },
  "officialUrl": "https://beange-beauty.com/",
  "officialUrlStatus": "独立ドメインの店舗ブランドサイトを媒体のブランドサイト欄から確認・直接アクセス可能。旧URL beange.men-este.net は404のため置換。",
  "batchAudit": {
    "checkedAt": "2026-11-19",
    "batch": "20店舗まとめて個別再確認",
    "status": "エステ魂の店舗ニュースに広島市、電話070-8499-1534、10:00〜30:00の最新掲載を確認。媒体掲載であり独立公式HPは未確認。",
    "sources": ["https://estama.jp/shop/40477/newslist/"]
  }
}
```

## 4. #276の保護対象スナップショット
#276「Be-ange（ビアンジュ）」は別レコードとして保持する。現行情報の主要項目:
- category: men-esthe
- area: 広島市中区宝町
- officialUrl: https://beange.men-este.net/
- verifiedAddress: 広島県広島市中区宝町（掲載媒体情報）
- verifiedHours: 11:00〜翌3:00（掲載媒体情報）
- verifiedPhone: 090-9251-0678（掲載媒体情報）
- Estama ID 38980 / メンズエステmall個別ページ: https://menesmall.jp/shop/be-ange
- #276の全フィールドは今回変更しない。特に#210から#276へフィールドをコピーしたり、URLを統一したりしない。

## 5. フィールド単位の提案差分（未承認・非実行）
変更を行う場合の安全案:
1. #210の既存レコード全体を `quarantinedAuditEvidence` 等の専用履歴フィールドに完全コピーし、基準SHA・取得日時・隔離理由を併記する。
2. #210の `individualAudit` をFREEDOMの確証済み情報に置き換えるのではなく、まず `identityConflict` 等の状態を追加し、Be-angeとFREEDOMの根拠を別々の候補として保持する。
3. #210の `officialUrl` と `officialUrlStatus` はどちらも保留。beange-beauty.comを削除・移動せず、Be-ange側との関係が確定するまでは「所属先競合・未解決」と明示する。
4. FREEDOM側のID40477・電話070-8499-1534は既存batchAuditの出典と#36/#261の根拠を参照する。#210の公式URLとはしない。
5. #210のname/category/area/status/sources/verifiedAddress/verifiedHours/verifiedPhoneはこの段階では変更しない。
6. #276は完全に不変。
7. #36/#261も不変。既存duplicateGroupを含む他のグループ値を変更しない。

### 推奨する暫定状態
- #210: `identityConflict: "FREEDOM ID40477 と Be-ange ID38980 の証拠が同一レコードに混在。店舗同定を保留"`
- `quarantinedAuditEvidence`: #210の変更前レコード全体を完全保存
- FREEDOM ID40477: 既存batchAuditの参照に限定
- Be-ange ID38980: #276の既存記録を保持し、#210側の旧証拠は隔離履歴から参照
- これは提案フィールド名であり、現行スキーマに追加済みではない。

## 6. 検証要件
実装前に必ず:
- baseline SHAが一致すること
- 278件、順序、全レコードのname/categoryが不変であること
- #276、#36、#261が完全一致で不変であること
- #210の変更前レコード全体が隔離履歴と完全一致すること
- 既存のsourcesや監査履歴が失われていないこと
- 差分はallowlistにあるフィールドだけであること
- validatorを実環境で実行し、その実行ログを保存すること
- validatorの実行確認なしに「テスト済み」と表現しないこと

## 7. 今回の実施結果
- 基準Blob SHA: `d7e32e6ca082352ffbe981a73df80b233e024c43`
- 基準件数: 278
- #210/#276/#36/#261の原データ取得: 完了
- 変更前スナップショットを含む差分設計書: 作成
- 本番JSON変更: 0
- DB/D1/ランキング/アプリ/API/Render変更: 0
- 店舗削除・統合・名称変更: 0
