const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE_KEY = "branchmind-ai-v1";
let sessions = [];
let activeSessionId = null;
let branchParentId = null;
let showingTree = false;

function uid(){ return "n_" + Math.random().toString(36).slice(2,10); }
function createSession(){
  const session = {id:uid(), title:"Untitled conversation", createdAt:Date.now(), nodes:[], activeLeaf:null};
  sessions.unshift(session); activeSessionId=session.id; branchParentId=null; save(); render(); $("#promptInput").focus();
}
function activeSession(){ return sessions.find(s=>s.id===activeSessionId); }
function save(){ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(sessions));}catch(e){console.warn("Could not save locally",e);} }
function load(){ try{sessions=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");}catch(e){sessions=[];} if(!sessions.length)createSession();else{activeSessionId=sessions[0].id;render();} }
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addNode(role,content,parentId){
  const s=activeSession(); const node={id:uid(),role,content,parentId:parentId||null,createdAt:Date.now()};
  s.nodes.push(node); s.activeLeaf=node.id;
  if(s.title==="Untitled conversation"&&role==="user")s.title=content.slice(0,34)+(content.length>34?"…":"");
  save(); return node;
}
function currentPath(){
  const s=activeSession(); if(!s||!s.activeLeaf)return [];
  const map=new Map(s.nodes.map(n=>[n.id,n])); let node=map.get(s.activeLeaf), path=[], guard=0;
  while(node&&guard++<500){path.unshift(node);node=node.parentId?map.get(node.parentId):null;}
  return path;
}
function localReply(prompt){
  const p=prompt.toLowerCase();
  if(/hello|hi\b|hey/.test(p))return "Hello! 👋 I'm BranchMind's local demo assistant. What would you like to explore today? You can branch from any message to try a different direction.";
  if(/cloud computing/.test(p))return "Cloud computing delivers computing services—such as servers, storage, databases, and software—over the internet. For example, instead of buying a physical server for a college project, you can deploy the website on a cloud platform and access it online.\n\nA useful next branch could explore service models (IaaS, PaaS, SaaS) or deployment models (public, private, hybrid).";
  if(/portfolio|website/.test(p))return "Here's a simple portfolio roadmap:\n\n1. Define your goal and audience.\n2. Create sections for About, Skills, Projects, and Contact.\n3. Build a responsive layout with accessible navigation.\n4. Add project screenshots and clear descriptions.\n5. Deploy the site and test it on mobile.\n\nYou could branch from here to explore the design, the code structure, or deployment steps.";
  if(/project ideas|ideas for students/.test(p))return "Here are three student-friendly project ideas:\n\n1. Student Career Guidance Portal — skills assessment, career paths, and learning resources.\n2. Smart Expense Dashboard — categorize sample expenses and visualize monthly patterns.\n3. Campus Event Hub — publish events, manage registrations, and show schedules.\n\nChoose one direction and branch from this answer to plan its features, UI, or technology stack.";
  if(/help|how do i|how to/.test(p))return "Let's break it down into manageable steps. First, define the goal and what a successful result looks like. Next, list the requirements, build a small working version, test it, and improve it based on what you learn.\n\nThis is a local demonstration response, not a connected AI model. You can start a branch from this message to explore a specific step.";
  return "Thanks for your question! BranchMind is running in demo mode, so this response comes from a small set of local examples rather than a live AI model.\n\nTry asking about cloud computing, portfolio websites, or student project ideas. You can also use “Branch from here” on any message to explore a different question without losing this path.";
}
function sendMessage(text){
  const prompt=text.trim(); if(!prompt)return;
  if(!activeSession())createSession();
  const s=activeSession();
  const parent=branchParentId || s.activeLeaf;
  const user=addNode("user",prompt,parent);
  branchParentId=null; $("#branchNotice").classList.add("hidden");
  const reply=addNode("assistant",localReply(prompt),user.id);
  s.activeLeaf=reply.id; save(); $("#promptInput").value=""; resizeInput(); render();
}
function render(){
  const s=activeSession(); if(!s)return;
  $("#conversationTitle").textContent=s.title;
  $("#historyList").innerHTML=sessions.map(item=>`<button class="history-item ${item.id===activeSessionId?'selected':''}" data-session="${item.id}" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</button>`).join("");
  $$(".history-item").forEach(b=>b.addEventListener("click",()=>{activeSessionId=b.dataset.session;branchParentId=null;showingTree=false;render();}));
  const path=currentPath();
  $("#welcome").classList.toggle("hidden",path.length>0||showingTree);
  $("#conversation").classList.toggle("hidden",path.length===0||showingTree);
  $("#treePanel").classList.toggle("hidden",!showingTree);
  $("#messageCount").textContent=`${path.length} message${path.length===1?"":"s"}`;
  $("#messages").innerHTML=path.map(n=>`<article class="message ${n.role==='user'?'user':''}"><div class="message-head"><div class="message-avatar">${n.role==='user'?'Y':'✳'}</div><strong>${n.role==='user'?'You':'BranchMind'}</strong><small>${new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div><div class="message-content">${escapeHtml(n.content)}</div><div class="message-tools"><button data-branch="${n.id}">↳ Branch from here</button><button data-copy="${n.id}">Copy message</button></div></article>`).join("");
  $$("#messages [data-branch]").forEach(b=>b.addEventListener("click",()=>{branchParentId=b.dataset.branch;$("#branchNotice").classList.remove("hidden");$("#promptInput").focus();}));
  $$("#messages [data-copy]").forEach(b=>b.addEventListener("click",()=>{const node=s.nodes.find(n=>n.id===b.dataset.copy);if(node)navigator.clipboard?.writeText(node.content);b.textContent="Copied";setTimeout(()=>b.textContent="Copy message",1200);}));
  if(showingTree)renderTree();
}
function renderTree(){
  const s=activeSession(); const map=new Map(s.nodes.map(n=>[n.id,n]));
  $("#treeCanvas").innerHTML=s.nodes.length?s.nodes.map(n=>`<div class="tree-node ${n.role==='user'?'user-node':''}"><strong>${n.role==='user'?'YOU':'BRANCHMIND'} · ${n.id===s.activeLeaf?'ACTIVE END':'MESSAGE'}</strong><p>${escapeHtml(n.content.slice(0,180))}${n.content.length>180?'…':''}</p><div style="margin-top:8px"><button class="small-button" data-jump="${n.id}">Continue from here ↗</button></div></div>${s.nodes.some(child=>child.parentId===n.id)?'<div class="tree-connector">↓</div>':''}`).join(""):'<p>No messages yet. Start chatting to build your map.</p>';
  $$("#treeCanvas [data-jump]").forEach(b=>b.addEventListener("click",()=>{s.activeLeaf=b.dataset.jump;branchParentId=b.dataset.jump;showingTree=false;$("#branchNotice").classList.remove("hidden");render();$("#promptInput").focus();}));
}
function resizeInput(){const el=$("#promptInput");el.style.height="auto";el.style.height=Math.min(el.scrollHeight,130)+"px";}
$("#composer").addEventListener("submit",e=>{e.preventDefault();sendMessage($("#promptInput").value);});
$("#promptInput").addEventListener("input",resizeInput);
$("#promptInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#composer").requestSubmit();}});
$("#newChat").addEventListener("click",createSession);
$("#showTree").addEventListener("click",()=>{showingTree=true;render();});
$("#backToChat").addEventListener("click",()=>{showingTree=false;render();});
$("#cancelBranch").addEventListener("click",()=>{branchParentId=null;$("#branchNotice").classList.add("hidden");});
$("#clearBtn").addEventListener("click",()=>{if(!confirm("Clear this conversation?"))return;const s=activeSession();s.nodes=[];s.activeLeaf=null;s.title="Untitled conversation";branchParentId=null;showingTree=false;save();render();});
$("#exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(activeSession(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="branchmind-conversation.json";a.click();URL.revokeObjectURL(url);});
$$(".suggestion").forEach(b=>b.addEventListener("click",()=>sendMessage(b.dataset.prompt)));
load();
