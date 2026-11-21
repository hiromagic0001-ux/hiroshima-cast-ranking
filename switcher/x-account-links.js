/* Hiroshima Cast Search: X accounts grouped by the three business industries. */
window.HIROSHIMA_X_LINKS = [
{industry:"メンズエステ",store:"サロンドニーナ",cast:"峰城",url:"https://x.com/salondo_m?s=11"},
{industry:"メンズエステ",store:"サロンドニーナ",cast:"未来（みらい）",url:"https://x.com/mirai__nina?s=11"},
{industry:"メンズエステ",store:"BODY spa Hiroshima",cast:"天使（あまつか）",url:"https://x.com/xamatsuka_2x?s=11"},
{industry:"メンズエステ",store:"Vivienne",cast:"ひな",url:"https://x.com/hinachansab?s=11"},
{industry:"メンズエステ",store:"Lavie＆Spa",cast:"早坂みゆう",url:"https://x.com/miyuu_salon?s=11"},
{industry:"メンズエステ",store:"サロンドニーナ",cast:"矢吹",url:"https://x.com/salondonina_y?s=11"},
{industry:"メンズエステ",store:"アガットテイク",cast:"花澤メイ",url:"https://x.com/agatetakemay?s=11"},
{industry:"メンズエステ",store:"ゆりかご広島",cast:"麗華",url:"https://x.com/reikayurikago?s=11"},
{industry:"メンズエステ",store:"7DREAM Este",cast:"奏もも",url:"https://x.com/7dreammomo?s=11"},
{industry:"メンズエステ",store:"Vivienne",cast:"美波",url:"https://x.com/vivienne_minami?s=11"},
{industry:"メンズエステ",store:"Lavie＆Spa",cast:"さわ",url:"https://x.com/sawa_laviespa?s=11"},
{industry:"メンズエステ",store:"Lavie＆Spa",cast:"いちか",url:"https://x.com/ichikatanlavie?s=11",instagram:"ichika_lav"},
{industry:"メンズエステ",store:"Lavie＆Spa",cast:"らな",url:"https://x.com/lavie__rana4?s=11"},
{industry:"メンズエステ",store:"広島メンズエステ La Paix",cast:"らぺ",url:"https://x.com/paix_la72927?s=11"},
{industry:"メンズエステ",store:"Queen",cast:"こころ",url:"https://x.com/queen_kokoro2?s=11"},
{industry:"メンズエステ",store:"Lavie＆Spa（ラヴィアンドスパ）",cast:"はづき",url:"https://x.com/q4ba67ewak33529?s=11"},
{industry:"メンズエステ",store:"Lavie＆Spa",cast:"めい",url:"https://x.com/mei_l_s?s=11"},
{industry:"メンズエステ",store:"広島メンズエステ La Paix",cast:"ふじ香",url:"https://x.com/fujikalapaix?s=11"},
{industry:"メンズエステ",store:"La Paix",cast:"世莉（ラペ）",url:"https://x.com/s7l5t15?s=11",accountName:"Lapaix_Seri"},
{industry:"デリヘル",store:"natural",cast:"はな",url:"https://x.com/natural_87_hana?s=11"},
{industry:"デリヘル",store:"natural",cast:"もね",url:"https://x.com/natural_mone?s=11"},
{industry:"デリヘル",store:"natural",cast:"もね",url:"https://x.com/mone_natural?s=11"},
{industry:"デリヘル",store:"natural",cast:"ななせ",url:"https://x.com/mone_natural?s=11"},
{industry:"デリヘル",store:"natural",cast:"みお",url:"https://x.com/mio4859?s=11"}
];
(()=>{
 const records=window.HIROSHIMA_X_LINKS||[];
 if(!records.length)return;
 const industries=["メンズエステ","デリヘル","ソープランド"];
 // 各サービスのホスト名から業種を確定し、他業種のアカウントを表示・紐付けしない
 const host=location.hostname.toLowerCase();
 const pageIndustry=host==="hiroshima-cast-ranking.onrender.com"?"デリヘル":
   host==="hiroshima-mens-esthe.onrender.com"?"メンズエステ":
   host==="hiroshima-soapland.onrender.com"?"ソープランド":null;
 const visibleRecords=pageIndustry?records.filter(r=>r.industry===pageIndustry):records;
 const norm=s=>String(s||"").replace(/[\s　]/g,"").toLowerCase();
 const cards=[...document.querySelectorAll("article.item")].map(card=>({
  card,cast:card.querySelector(".name")?.textContent?.trim()||"",
  store:card.querySelector(".sub")?.textContent||""
 })).filter(x=>x.cast);
 visibleRecords.forEach(r=>{
  const target=cards.find(c=>norm(c.cast)===norm(r.cast)&&c.store.includes(r.store));
  if(target&&!target.card.querySelector("[data-x-account-link]")){
   const a=document.createElement("a");a.dataset.xAccountLink="1";a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Xアカウント";
   a.style.cssText="display:inline-block;margin:6px 6px 0 0;color:#a5e2bd;font-size:12px";
   target.card.querySelector(".name")?.parentNode?.append(a);
  }
 });
 const panel=document.createElement("section");
 panel.style.cssText="margin:0 0 14px;padding:12px;background:#14251f;border:1px solid #52715e;border-radius:12px;color:#f4f7f5";
 const title=document.createElement("strong");title.textContent=pageIndustry?("Xアカウント｜"+pageIndustry):"Xアカウント｜業種別3分類";
 title.style.cssText="display:block;margin-bottom:10px;font-size:14px";panel.append(title);
 const tabs=document.createElement("div");tabs.style.cssText="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px";
 const body=document.createElement("div");panel.append(tabs,body);
 let active=pageIndustry||"デリヘル";
 const render=()=>{
  tabs.replaceChildren();body.replaceChildren();
  (pageIndustry?[pageIndustry]:industries).forEach(industry=>{
   const items=visibleRecords.filter(r=>r.industry===industry);
   const btn=document.createElement("button");btn.type="button";
   btn.textContent=industry+"（"+items.length+"）";
   btn.style.cssText="padding:9px 4px;border:1px solid #52715e;border-radius:8px;background:"+(active===industry?"#a5e2bd":"#1b3028")+";color:"+(active===industry?"#10251b":"#e4f4e9")+";font-size:11px;font-weight:700";
   btn.onclick=()=>{active=industry;render()};tabs.append(btn);
  });
  const items=visibleRecords.filter(r=>r.industry===active);
  if(!items.length){const empty=document.createElement("div");empty.textContent="この業種の登録アカウントは現在0件です。";empty.style.cssText="padding:12px;color:#bdcec4;font-size:12px";body.append(empty);return;}
  items.forEach(r=>{
   const row=document.createElement("div");row.style.cssText="font-size:12px;line-height:1.6;padding:8px 0;border-top:1px solid #385447";
   const label=document.createElement("div");label.textContent=r.store+"｜"+r.cast+(r.accountName?"（"+r.accountName+"）":"");row.append(label);
   const a=document.createElement("a");a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Xアカウントを開く";a.style.cssText="color:#a5e2bd;font-weight:700";row.append(a);
   if(r.instagram){const ig=document.createElement("div");ig.textContent="Instagram："+r.instagram;ig.style.color="#bdcec4";row.append(ig);}
   body.append(row);
  });
 };
 render();
 const notice=document.querySelector(".notice"),main=document.querySelector("main");
 if(notice&&notice.parentNode)notice.parentNode.insertBefore(panel,notice.nextSibling);else if(main)main.prepend(panel);
})();
