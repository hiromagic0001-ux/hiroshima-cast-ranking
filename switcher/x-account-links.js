/* Shared X-to-cast mappings for Hiroshima Cast Search. User-provided mappings; identity confirmation remains separate. */
window.HIROSHIMA_X_LINKS = [
{store:"サロンドニーナ",cast:"峰城",url:"https://x.com/salondo_m?s=11",status:"本人未確認"}
{store:"サロンドニーナ",cast:"未来（みらい）",url:"https://x.com/mirai__nina?s=11",status:"本人未確認"}
{store:"BODY spa Hiroshima",cast:"天使（あまつか）",url:"https://x.com/xamatsuka_2x?s=11",status:"本人未確認"}
{store:"Vivienne",cast:"ひな",url:"https://x.com/hinachansab?s=11",status:"本人未確認"}
{store:"Lavie＆Spa",cast:"早坂みゆう",url:"https://x.com/miyuu_salon?s=11",status:"本人未確認"}
{store:"サロンドニーナ",cast:"矢吹",url:"https://x.com/salondonina_y?s=11",status:"本人未確認"}
{store:"アガットテイク",cast:"花澤メイ",url:"https://x.com/agatetakemay?s=11",status:"本人未確認"}
{store:"ゆりかご広島",cast:"麗華",url:"https://x.com/reikayurikago?s=11",status:"本人未確認"}
{store:"7DREAM Este",cast:"奏もも",url:"https://x.com/7dreammomo?s=11",status:"本人未確認"}
{store:"Vivienne",cast:"美波",url:"https://x.com/vivienne_minami?s=11",status:"本人未確認"}
{store:"Lavie＆Spa",cast:"さわ",url:"https://x.com/sawa_laviespa?s=11",status:"本人未確認"}
{store:"Lavie＆Spa",cast:"いちか",url:"https://x.com/ichikatanlavie?s=11",instagram:"ichika_lav",status:"本人未確認"}
{store:"Lavie＆Spa",cast:"らな",url:"https://x.com/lavie__rana4?s=11",status:"本人未確認"}
{store:"広島メンズエステ La Paix",cast:"らぺ",url:"https://x.com/paix_la72927?s=11",status:"本人未確認"}
{store:"Queen",cast:"こころ",url:"https://x.com/queen_kokoro2?s=11",status:"本人未確認"}
{store:"Lavie＆Spa（ラヴィアンドスパ）",cast:"はづき",url:"https://x.com/q4ba67ewak33529?s=11",status:"本人未確認"}
{store:"Lavie＆Spa",cast:"めい",url:"https://x.com/mei_l_s?s=11",status:"本人未確認"}
{store:"広島メンズエステ La Paix",cast:"ふじ香",url:"https://x.com/fujikalapaix?s=11",status:"本人未確認"}
{store:"La Paix",cast:"世莉（ラペ）",url:"https://x.com/s7l5t15?s=11",accountName:"Lapaix_Seri",status:"本人未確認"}
{store:"natural",cast:"はな",url:"https://x.com/natural_87_hana?s=11",status:"本人未確認"}
{store:"natural",cast:"もね",url:"https://x.com/natural_mone?s=11",status:"本人未確認"}
{store:"natural",cast:"もね",url:"https://x.com/mone_natural?s=11",status:"本人未確認"}
{store:"natural",cast:"ななせ",url:"https://x.com/mone_natural?s=11",status:"本人未確認"}
{store:"natural",cast:"みお",url:"https://x.com/mio4859?s=11",status:"本人未確認"}
];

(()=> {
 const records=window.HIROSHIMA_X_LINKS||[];
 if(!records.length)return;
 const norm=s=>String(s||"").replace(/[\s　]/g,"").toLowerCase();
 const cards=[...document.querySelectorAll("article.item")].map(card=>{
  const cast=card.querySelector(".name")?.textContent?.trim()||"";
  const store=card.querySelector(".sub")?.textContent||"";
  return {card,cast,store};
 }).filter(x=>x.cast);
 const matched=new Set();
 const groups={"本人確認済み":[],"本人未確認":[],"X未発見（調査中）":[]};
 records.forEach(r=>{
  const status=groups[r.status]?r.status:"本人未確認";
  groups[status].push(r);
  const target=cards.find(c=>norm(c.cast)===norm(r.cast)&&c.store.includes(r.store));
  if(target){
   matched.add(target);
   if(!target.card.querySelector("[data-x-account-status]")){
    const badge=document.createElement("span");
    badge.dataset.xAccountStatus="1";
    badge.textContent="X："+status;
    badge.style.cssText="display:inline-block;margin:6px 6px 0 0;padding:4px 7px;border:1px solid #648c78;border-radius:7px;color:#d7f7e4;font-size:11px";
    target.card.querySelector(".name")?.parentNode?.append(badge);
   }
   if(!target.card.querySelector("[data-x-account-link]")){
    const a=document.createElement("a");a.dataset.xAccountLink="1";a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Xアカウント";a.style.cssText="display:inline-block;margin:6px 6px 0 0;color:#a5e2bd;font-size:12px";
    target.card.querySelector(".name")?.parentNode?.append(a);
   }
  }
 });
 cards.filter(c=>!matched.has(c)).forEach(c=>groups["X未発見（調査中）"].push({store:c.store.trim(),cast:c.cast,missing:true}));
 const panel=document.createElement("section");
 panel.style.cssText="margin:0 0 14px;padding:12px;background:#14251f;border:1px solid #52715e;border-radius:12px;color:#f4f7f5";
 const title=document.createElement("strong");title.textContent="Xアカウント分類";title.style.cssText="display:block;margin-bottom:9px;font-size:14px";
 panel.append(title);
 Object.entries(groups).forEach(([name,items])=>{
  const details=document.createElement("details");details.style.cssText="margin:7px 0;padding:8px 10px;background:#1b3028;border-radius:8px";
  const summary=document.createElement("summary");summary.textContent=name+"（"+items.length+"件）";summary.style.cssText="cursor:pointer;font-size:13px;font-weight:700;color:#d7f7e4";
  const list=document.createElement("div");list.style.cssText="display:grid;gap:7px;margin-top:9px";
  items.forEach(r=>{
   const row=document.createElement("div");row.style.cssText="font-size:12px;line-height:1.6;padding:6px 0;border-top:1px solid #385447";
   const label=document.createElement("div");label.textContent=(r.store?r.store+"｜":"")+r.cast+(r.accountName?"（"+r.accountName+"）":"");
   row.append(label);
   if(r.url){const a=document.createElement("a");a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Xアカウントを開く";a.style.cssText="color:#a5e2bd;font-weight:700";row.append(a);}
   else {const note=document.createElement("span");note.textContent="アカウント未発見・調査対象";note.style.color="#bdcec4";row.append(note);}
   if(r.instagram){const ig=document.createElement("div");ig.textContent="Instagram："+r.instagram;ig.style.color="#bdcec4";row.append(ig);}
   list.append(row);
  });
  if(!items.length){const empty=document.createElement("div");empty.textContent="現在該当データはありません。";empty.style.cssText="font-size:12px;color:#bdcec4;margin-top:8px";list.append(empty);}
  details.append(summary,list);panel.append(details);
 });
 const notice=document.querySelector(".notice"),main=document.querySelector("main");
 if(notice&&notice.parentNode)notice.parentNode.insertBefore(panel,notice.nextSibling);else if(main)main.prepend(panel);
})();
