import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Posts from "../../services/posts.js";
import { store } from "../../state/store.js";
import Spinner from "../../components/spinner.js";
import "../../components/pagination.js"

requireAuth();

const FEED_URL = new URL("../feed/feed.html", import.meta.url).href;
const PROFILE_BASE = new URL("../profile/profile.html", import.meta.url);

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;","&gt;":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function profileUrl(name){const u=new URL(PROFILE_BASE);u.searchParams.set("u",name);return u.href;}
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn();}

const EMOJI=["👍","❤️","😂","😮","😢","🔥"];

function getLocalUserReactions(postId){
  const key=`reactions:${postId}`;
  try{return new Set(JSON.parse(localStorage.getItem(key)||"[]"))}catch{return new Set()}
}
function setLocalUserReactions(postId,set){
  const key=`reactions:${postId}`;
  localStorage.setItem(key,JSON.stringify([...set]));
}
function getDeltas(postId){
  const key=`reactions:delta:${postId}`;
  try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return{}}
}
function setDeltas(postId,d){
  const key=`reactions:delta:${postId}`;
  localStorage.setItem(key,JSON.stringify(d));
}
function ls(...keys){for(const k of keys){if(k){const v=localStorage.getItem(k);if(v)return v}}return null}

async function sendReaction(postId,symbol,currentlyReacted){
  try{
    const tokenKey=(window?.APP_CONFIG?.STORAGE?.TOKEN)||null;
    const apiKeyKey=(window?.APP_CONFIG?.STORAGE?.API_KEY)||null;
    const t=ls("social.token","SOCIAL.TOKEN",tokenKey);
    const k=ls("social.apiKey","social.apikey","SOCIAL.APIKEY",apiKeyKey);
    const headers={"Content-Type":"application/json"};
    if(t)headers.Authorization=`Bearer ${t}`;
    if(k)headers["X-Noroff-API-Key"]=k;
    const apiBase=window?.APP_CONFIG?.API_BASE||"";
    const method=currentlyReacted?"DELETE":"PUT";
    const url=`${apiBase}/social/posts/${postId}/react/${encodeURIComponent(symbol)}`;
    await fetch(url,{method,headers});
  }catch{}
}

function renderReactionsBarLocal(post){
  const baseCounts=new Map();
  if(Array.isArray(post.reactions)){for(const r of post.reactions)baseCounts.set(r.symbol,r.count)}
  for(const e of EMOJI)if(!baseCounts.has(e))baseCounts.set(e,0);
  const user=getLocalUserReactions(post.id);
  const deltas=getDeltas(post.id);
  const btns=EMOJI.map(sym=>{
    const base=Number.isFinite(baseCounts.get(sym))?baseCounts.get(sym):0;
    const delta=Number.isFinite(deltas[sym])?deltas[sym]:0;
    const shown=Math.max(0,base+delta);
    const active=user.has(sym);
    return `<button class="react-btn" data-sym="${sym}" data-count="${shown}" ${active?"data-active":""} aria-pressed="${active}">
      <span class="sym">${sym}</span><span class="cnt">${shown}</span>
    </button>`;
  }).join("");
  return `<div class="reactions" data-post="${post.id}" role="group" aria-label="Reactions">${btns}</div>`;
}

function wireReactionsLocal(root){
  root.addEventListener("click",async(e)=>{
    const btn=e.target.closest(".react-btn"); if(!btn)return;
    e.preventDefault(); e.stopPropagation();
    const wrap=btn.closest(".reactions"); if(!wrap)return;
    const postId=wrap.dataset.post; const sym=btn.dataset.sym;

    let prev=Number.parseInt(btn.dataset.count??"",10);
    if(!Number.isFinite(prev)) prev=Number.parseInt(btn.querySelector(".cnt")?.textContent??"0",10)||0;

    const wasActive=btn.hasAttribute("data-active");
    const next=wasActive?Math.max(0,prev-1):prev+1;

    btn.dataset.count=String(next);
    btn.querySelector(".cnt").textContent=String(next);
    btn.toggleAttribute("data-active");
    btn.setAttribute("aria-pressed",String(!wasActive));

    const sel=getLocalUserReactions(postId);
    if(wasActive)sel.delete(sym); else sel.add(sym);
    setLocalUserReactions(postId,sel);

    const deltas=getDeltas(postId);
    const cur=Number.isFinite(deltas[sym])?deltas[sym]:0;
    deltas[sym]=wasActive?cur-1:cur+1;
    setDeltas(postId,deltas);

    try{await sendReaction(postId,sym,wasActive)}catch{}
  });
}

ready(()=>{
  const nav=document.querySelector("#nav");
  if(nav)mountNavbar(nav);

  const root=document.querySelector("#post-root");
  if(!root)return;

  const id=new URLSearchParams(location.search).get("id");
  if(!id){Spinner.show();location.replace(FEED_URL);return;}

  async function setEditing(enabled){
    const t=root.querySelector("h1");
    const b=root.querySelector("p[data-body]");
    t?.setAttribute("contenteditable", String(enabled));
    b?.setAttribute("contenteditable", String(enabled));
    // show only during edit
    root.querySelector("#edit")?.toggleAttribute("hidden", enabled);
    root.querySelector("#save")?.toggleAttribute("hidden", !enabled);
    root.querySelector("#cancel")?.toggleAttribute("hidden", !enabled);
    if(enabled) t?.focus();
  }

  async function load(){
    Spinner.show();
    try{
      const p=await Posts.get(id);
      const author=p?.author?.name||"unknown";
      const owner=author===store.user?.name;

      const imgBlock=p?.media?.url
        ? `<figure style="margin:.75rem 0">
             <img src="${p.media.url}" alt="${esc(p.media.alt||p.title||"")}" loading="eager" style="max-width:100%;height:auto;display:block;border-radius:.5rem">
             ${p.media?.alt?`<figcaption class="muted" style="font-size:.9rem">${esc(p.media.alt)}</figcaption>`:""}
           </figure>`:"";

      const reactionsHTML=renderReactionsBarLocal(p);

      root.innerHTML=`
        <article class="prose">
          <h1 contenteditable="false">${esc(p?.title||"(untitled)")}</h1>
          ${imgBlock}
          <p data-body contenteditable="false">${esc(p?.body||"")}</p>
          ${reactionsHTML}
          <small>by <a href="${author!=="unknown"?profileUrl(author):"#"}">@${esc(author)}</a></small>
          ${owner?`
            <div class="row" style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
              <button id="edit" class="btn">Edit</button>
              <button id="save" class="btn primary" hidden>Save</button>
              <button id="cancel" class="btn" hidden>Cancel</button>
              <button id="delete" class="btn danger">Delete</button>
            </div>`:""}
        </article>`;

      wireReactionsLocal(root);

      if(owner){
        const elEdit=root.querySelector("#edit");
        const elSave=root.querySelector("#save");
        const elCancel=root.querySelector("#cancel");
        const elDelete=root.querySelector("#delete");

        elEdit?.addEventListener("click",()=>setEditing(true));
        elCancel?.addEventListener("click",async()=>{ await load(); });
        elSave?.addEventListener("click",async()=>{
          Spinner.show();
          try{
            const title=root.querySelector("h1").innerText.trim();
            const body=root.querySelector("p[data-body]").innerText.trim();
            await Posts.update(id,{title,body});
            await load();
          }catch{alert("Save failed")}
          finally{Spinner.hide()}
        });
        elDelete?.addEventListener("click",async()=>{
          if(!confirm("Delete this post?"))return;
          Spinner.show();
          try{
            await Posts.remove(id);
            location.replace(FEED_URL);
          }catch{Spinner.hide();alert("Delete failed")}
        });
      }
    }catch(e){
      console.error(e);
      root.innerHTML=`<p>Could not load this post.</p>`;
    }finally{
      Spinner.hide();
    }
  }

  load();
});
