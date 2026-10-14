const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const KEYS={tasks:"vibestudy-tasks-v3",subjects:"vibestudy-subjects-v2",notes:"vibestudy-notes-v1",study:"vibestudy-study-log-v1"};
const todayISO=()=>toISO(new Date());
function toISO(date){const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function id(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}
function load(key,fallback){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v)}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){console.error(e);notify("Could not save: browser storage may be full.");return false}}
let tasks=load(KEYS.tasks,[
{id:id(),title:"Review Differential Equations",subject:"PDB",priority:"high",completed:true,dueDate:todayISO()},
{id:id(),title:"Practice Statistics problems",subject:"Mestat 2",priority:"medium",completed:false,dueDate:todayISO()},
{id:id(),title:"Read Multivariable Calculus",subject:"KPB",priority:"low",completed:false,dueDate:todayISO()},
{id:id(),title:"Organize study notes",subject:"Personal",priority:"low",completed:true,dueDate:todayISO()}]);
let subjects=load(KEYS.subjects,[
{id:id(),name:"PDB",symbol:"∫",progress:65,color:"yellow"},
{id:id(),name:"Mestat 2",symbol:"σ",progress:48,color:"coral"},
{id:id(),name:"KPB",symbol:"∂",progress:72,color:"blue"}]);
let notes=load(KEYS.notes,[]);
let studyLog=load(KEYS.study,{});
let filter="all",toastTimeout, timerInterval=null, timerMode="focus", secondsLeft=1500, timerRunning=false;
let calendarMonth=new Date();calendarMonth.setDate(1);let selectedDate=todayISO();
const toast=$("#toast");
function notify(message){toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove("show"),2800)}
function updateDate(){const d=new Date();$("#current-date").textContent=new Intl.DateTimeFormat("en-US",{weekday:"long",month:"short",day:"numeric"}).format(d);$("#current-year").textContent=d.getFullYear()}
updateDate();

/* Navigation */
$("#menu-toggle").addEventListener("click",()=>{const open=$("#sidebar").classList.toggle("open");$("#menu-toggle").setAttribute("aria-expanded",String(open))});
$$("[data-page]").forEach(a=>a.addEventListener("click",()=>{const p=a.dataset.page;$$(".nav-link").forEach(n=>n.classList.toggle("active",n.dataset.page===p));$("#breadcrumb-page").textContent=({dashboard:"Dashboard",tasks:"My Tasks",subjects:"Subjects",focus:"Focus Room",calendar:"Calendar",notes:"Notes"})[p]||"Dashboard";$("#sidebar").classList.remove("open");if(p==="dashboard")window.scrollTo({top:0,behavior:"smooth"});else document.getElementById(p)?.scrollIntoView({behavior:"smooth",block:"start"})}));

/* Tasks: now include due dates and calendar integration */
function updateTaskStats(){const total=tasks.length,done=tasks.filter(t=>t.completed).length,p=total?Math.round(done/total*100):0;$("#completed-stat").textContent=String(done).padStart(2,"0");$("#total-stat").textContent=String(total).padStart(2,"0");$("#all-count").textContent=total;$(".nav-count").textContent=total;$("#task-progress").style.width=p+"%";$("#task-percentage").textContent=p+"% of your tasks";$("#task-summary").textContent=`${done} of ${total} tasks completed`;$("#sessions-stat").textContent=String((studyLog[todayISO()]?.sessions)||0).padStart(2,"0")}
function renderTasks(){
 const list=$("#task-list");list.replaceChildren();
 const visible=tasks.filter(t=>filter==="all"||(filter==="pending"&&!t.completed)||(filter==="completed"&&t.completed));
 visible.forEach(t=>{
  const row=document.createElement("div");row.className="task-item";
  const label=document.createElement("label");label.style.cssText="display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer";
  const input=document.createElement("input");input.type="checkbox";input.className="task-check";input.checked=!!t.completed;input.setAttribute("aria-label","Toggle "+t.title);
  input.addEventListener("change",()=>{tasks=tasks.map(x=>x.id===t.id?{...x,completed:input.checked}:x);save(KEYS.tasks,tasks);renderTasks();renderCalendar()});
  const custom=document.createElement("span");custom.className="custom-check";
  const copy=document.createElement("span");copy.className="task-copy";
  const title=document.createElement("strong");title.className="task-title";title.textContent=t.title;
  const meta=document.createElement("span");meta.className="task-meta";
  const priority=document.createElement("span");priority.className="priority "+t.priority;priority.textContent=({high:"● High priority",medium:"● Medium priority",low:"● Low priority"})[t.priority]||"● Medium priority";
  const status=document.createElement("span");status.textContent=t.completed?"✓ Completed":`◷ ${t.dueDate||"No date"}`;
  meta.append(priority,status);copy.append(title,meta);
  const tag=document.createElement("span");tag.className="task-tag";tag.textContent=t.subject||"Personal";if(t.subject==="Mestat 2")tag.classList.add("subject-blue");if(t.subject==="KPB")tag.classList.add("subject-coral");
  label.append(input,custom,copy,tag);row.append(label);
  const del=document.createElement("button");del.className="task-delete-button";del.type="button";del.textContent="×";del.title="Delete task";del.setAttribute("aria-label","Delete "+t.title);del.addEventListener("click",()=>{if(confirm(`Delete "${t.title}"?`)){tasks=tasks.filter(x=>x.id!==t.id);save(KEYS.tasks,tasks);renderTasks();renderCalendar();notify("Task deleted.")}});row.append(del);list.append(row)
 });
 $("#empty-state").hidden=visible.length>0;updateTaskStats()
}
function setFilter(f){filter=f;$$(".filter-button").forEach(b=>b.classList.toggle("active",b.dataset.filter===f));renderTasks()}
$$(".filter-button").forEach(b=>b.addEventListener("click",()=>setFilter(b.dataset.filter)));
$("#view-all-button").addEventListener("click",()=>{setFilter("all");notify("Showing all tasks.")});
function fillTaskSubjects(){const select=$("#task-subject-input"),old=select.value;select.replaceChildren();["Personal",...subjects.map(s=>s.name)].filter((v,i,a)=>a.indexOf(v)===i).forEach(n=>{const o=document.createElement("option");o.value=n;o.textContent=n;select.append(o)});if([...select.options].some(o=>o.value===old))select.value=old}
function fillFocusSubjects(){
 const select=$("#focus-subject-select"),old=select.value;select.replaceChildren();
 const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Choose a subject";select.append(placeholder);
 subjects.forEach(s=>{const option=document.createElement("option");option.value=s.name;option.textContent=s.name;select.append(option)});
 if([...select.options].some(o=>o.value===old))select.value=old;
}
$("#focus-subject-select").addEventListener("change",()=>{
 const name=$("#focus-subject-select").value;
 $("#focus-note").textContent=name?`Your next 25 minutes are for ${name}. Small, focused progress adds up.`:"Choose a subject, start the timer, and give yourself one distraction-free session.";
});
function openTaskDialog(date=selectedDate){
 $("#task-form").reset();fillTaskSubjects();
 $("#task-dialog").showModal();$("#task-title-input").focus();
 $("#task-due-date-input").value=date||todayISO();
 $("#task-dialog").querySelector(".dialog-header h2").textContent="Add a task";
}
$("#add-task-button").addEventListener("click",()=>openTaskDialog(todayISO()));
$("#calendar-add-task").addEventListener("click",()=>openTaskDialog(selectedDate));
$("#dialog-close").addEventListener("click",()=>$("#task-dialog").close());
$("#task-dialog").addEventListener("click",e=>{if(e.target===$("#task-dialog"))$("#task-dialog").close()});
$("#task-form").addEventListener("submit",e=>{e.preventDefault();const d=new FormData(e.currentTarget),title=String(d.get("title")||"").trim();if(!title)return;tasks.unshift({id:id(),title,subject:String(d.get("subject")||"Personal"),priority:String(d.get("priority")||"medium"),completed:false,dueDate:String(d.get("dueDate")||todayISO())});save(KEYS.tasks,tasks);setFilter("all");$("#task-dialog").close();renderCalendar();notify("Task scheduled!")});

/* Subject manager */
function renderSubjects(){const list=$("#subjects-list");list.replaceChildren();subjects.forEach(s=>{const row=document.createElement("div");row.className="subject-item";const symbol=document.createElement("div");symbol.className="subject-symbol subject-"+s.color;symbol.textContent=s.symbol||"∑";const info=document.createElement("div");info.className="subject-info";const nr=document.createElement("div");nr.className="subject-name-row";const name=document.createElement("strong");name.textContent=s.name;const pct=document.createElement("span");pct.textContent=s.progress+"%";nr.append(name,pct);const wrap=document.createElement("div");wrap.className="subject-progress "+(s.color==="coral"?"coral-progress":s.color==="blue"?"blue-progress":s.color==="green"?"green-progress":"");const bar=document.createElement("span");bar.style.width=s.progress+"%";wrap.append(bar);info.append(nr,wrap);const actions=document.createElement("div");actions.className="subject-row-actions";const edit=document.createElement("button");edit.type="button";edit.className="subject-action";edit.textContent="✎";edit.title="Edit "+s.name;edit.setAttribute("aria-label","Edit "+s.name);edit.addEventListener("click",()=>openSubject(s));const del=document.createElement("button");del.type="button";del.className="subject-action";del.textContent="×";del.title="Delete "+s.name;del.setAttribute("aria-label","Delete "+s.name);del.addEventListener("click",()=>deleteSubject(s));actions.append(edit,del);row.append(symbol,info,actions);list.append(row)});$("#subjects-summary").textContent=subjects.length+" subject"+(subjects.length===1?"":"s");$("#subjects-stat").textContent=String(subjects.length).padStart(2,"0")}
const subjectDialog=$("#subject-dialog"),subjectForm=$("#subject-form");
function openSubject(s=null){subjectForm.reset();$("#subject-id-input").value=s?.id||"";$("#subject-name-input").value=s?.name||"";$("#subject-symbol-input").value=s?.symbol||"∑";$("#subject-progress-input").value=s?.progress??0;$("#subject-progress-value").textContent=$("#subject-progress-input").value+"%";$("#subject-color-input").value=s?.color||"yellow";$("#subject-dialog-title").textContent=s?"Edit subject":"Add a subject";$("#subject-dialog-kicker").textContent=s?"UPDATE YOUR LEARNING PLAN":"BUILD YOUR SYLLABUS";$("#subject-submit-button").textContent=s?"Save changes ↗":"Add subject ↗";subjectDialog.showModal()}
$("#subject-progress-input").addEventListener("input",e=>$("#subject-progress-value").textContent=e.target.value+"%");
$("#add-subject-button").addEventListener("click",()=>openSubject());
$("#manage-subjects-button").addEventListener("click",()=>{document.getElementById("subjects").scrollIntoView({behavior:"smooth",block:"center"});openSubject()});
$("#subject-dialog-close").addEventListener("click",()=>subjectDialog.close());subjectDialog.addEventListener("click",e=>{if(e.target===subjectDialog)subjectDialog.close()});
subjectForm.addEventListener("submit",e=>{e.preventDefault();const d=new FormData(subjectForm),name=String(d.get("name")||"").trim(),oldId=String(d.get("id")||"");if(!name)return;if(subjects.some(s=>s.name.toLowerCase()===name.toLowerCase()&&s.id!==oldId)){notify("That subject already exists.");return}const oldName=subjects.find(s=>s.id===oldId)?.name;const item={id:oldId||id(),name,symbol:String(d.get("symbol")||"∑").trim()||"∑",progress:Number(d.get("progress")||0),color:String(d.get("color")||"yellow")};subjects=oldId?subjects.map(s=>s.id===oldId?item:s):[...subjects,item];if(oldName&&oldName!==name)tasks=tasks.map(t=>t.subject===oldName?{...t,subject:name}:t);save(KEYS.subjects,subjects);save(KEYS.tasks,tasks);fillTaskSubjects();fillFocusSubjects();fillNoteSubjects();renderSubjects();renderTasks();subjectDialog.close();notify(oldId?"Subject updated!":"Subject added!")});
function deleteSubject(s){const linked=tasks.filter(t=>t.subject===s.name).length;if(!confirm(`Delete "${s.name}"?${linked?` ${linked} task(s) will move to Personal.`:""}`))return;subjects=subjects.filter(x=>x.id!==s.id);tasks=tasks.map(t=>t.subject===s.name?{...t,subject:"Personal"}:t);save(KEYS.subjects,subjects);save(KEYS.tasks,tasks);fillTaskSubjects();fillFocusSubjects();fillNoteSubjects();renderSubjects();renderTasks();notify("Subject deleted.")}

/* Calendar: month navigation, select a day, see scheduled tasks */
function sameMonth(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()}
function renderCalendar(){
 const grid=$("#calendar-grid");grid.replaceChildren();
 $("#calendar-month-label").textContent=new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(calendarMonth);
 ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d=>{const el=document.createElement("div");el.className="calendar-weekday";el.textContent=d;grid.append(el)});
 const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1),start=new Date(first);start.setDate(first.getDate()-first.getDay());
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const iso=toISO(d),dayTasks=tasks.filter(t=>t.dueDate===iso);const b=document.createElement("button");b.type="button";b.className="calendar-day";b.textContent=d.getDate();b.setAttribute("aria-label",`${iso}${dayTasks.length?`, ${dayTasks.length} tasks`:""}`);if(!sameMonth(d,calendarMonth))b.classList.add("outside-month");if(iso===todayISO())b.classList.add("is-today");if(iso===selectedDate)b.classList.add("is-selected");if(dayTasks.length)b.classList.add("has-tasks");b.addEventListener("click",()=>{selectedDate=iso;renderCalendar()});grid.append(b)}
 const selected=new Date(`${selectedDate}T12:00:00`);$("#selected-date-label").textContent=new Intl.DateTimeFormat("en-US",{weekday:"long",month:"short",day:"numeric",year:"numeric"}).format(selected);
 const dayTasks=tasks.filter(t=>t.dueDate===selectedDate);$("#selected-date-count").textContent=dayTasks.length+" task"+(dayTasks.length===1?"":"s");
 const list=$("#calendar-day-tasks");list.replaceChildren();
 if(!dayTasks.length){const empty=document.createElement("div");empty.className="calendar-empty";empty.textContent="No tasks planned for this day. Add one to get started.";list.append(empty)}
 dayTasks.forEach(t=>{const row=document.createElement("div");row.className="calendar-task-row";const text=document.createElement("span");text.className="calendar-task-text"+(t.completed?" done":"");text.textContent=t.title;const toggle=document.createElement("button");toggle.type="button";toggle.textContent=t.completed?"↶":"✓";toggle.title=t.completed?"Mark as pending":"Mark complete";toggle.addEventListener("click",()=>{tasks=tasks.map(x=>x.id===t.id?{...x,completed:!x.completed}:x);save(KEYS.tasks,tasks);renderTasks();renderCalendar()});const del=document.createElement("button");del.type="button";del.textContent="×";del.title="Delete task";del.addEventListener("click",()=>{if(confirm(`Delete "${t.title}"?`)){tasks=tasks.filter(x=>x.id!==t.id);save(KEYS.tasks,tasks);renderTasks();renderCalendar();notify("Task deleted.")}});row.append(text,toggle,del);list.append(row)})
}
$("#calendar-prev").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar()});
$("#calendar-next").addEventListener("click",()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar()});
$("#calendar-today").addEventListener("click",()=>{calendarMonth=new Date();calendarMonth.setDate(1);selectedDate=todayISO();renderCalendar()});

/* Study log and GitHub-style past-year contribution heatmap.
   Each completed focus session records actual elapsed focus minutes.
   A day counts toward streak after at least one completed focus session. */
function recordStudy(minutes){
 const key=todayISO();if(!studyLog[key])studyLog[key]={minutes:0,sessions:0};
 studyLog[key].minutes+=minutes;studyLog[key].sessions+=1;save(KEYS.study,studyLog);renderContributions();updateTaskStats();resetStreakStat()
}
function streakAt(dateISO){
 let count=0;const d=new Date(`${dateISO}T12:00:00`);
 // If there has not been a session today, keep yesterday's streak alive until today ends.
 if(dateISO===todayISO()&&(!studyLog[dateISO]||!studyLog[dateISO].sessions))d.setDate(d.getDate()-1);
 while(true){const key=toISO(d),entry=studyLog[key];if(!entry||!entry.sessions)break;count++;d.setDate(d.getDate()-1)}
 return count
}
function renderContributions(){
 const graph=$("#contribution-graph");graph.replaceChildren();
 const end=new Date();end.setHours(12,0,0,0);const start=new Date(end);start.setDate(start.getDate()-364);start.setDate(start.getDate()-start.getDay());
 const totalMinutes=Object.entries(studyLog).reduce((sum,[date,e])=>{const d=new Date(`${date}T12:00:00`);return d>=new Date(`${toISO(new Date(end.getTime()-364*86400000))}T00:00:00`)&&d<=end?sum+(Number(e.minutes)||0):sum},0);
 const levels=minutes=>minutes<=0?0:minutes<15?1:minutes<30?2:minutes<60?3:4;
 for(let week=0;week<53;week++){for(let day=0;day<7;day++){const d=new Date(start);d.setDate(start.getDate()+week*7+day);if(d>end)continue;const key=toISO(d),entry=studyLog[key],mins=Number(entry?.minutes)||0;const cell=document.createElement("button");cell.type="button";cell.className=`contribution-cell level-${levels(mins)}`;cell.title=`${key}: ${mins} minutes studied`;cell.setAttribute("aria-label",cell.title);cell.addEventListener("click",()=>notify(`${key}: ${mins} minutes across ${entry?.sessions||0} completed focus session(s).`));graph.append(cell)}}
 const hours=totalMinutes/60;$("#year-study-hours").textContent=hours<10?hours.toFixed(1)+"h":Math.round(hours)+"h";
 const activeDays=Object.entries(studyLog).filter(([date,e])=>{const d=new Date(`${date}T12:00:00`);const delta=(end-d)/86400000;return delta>=0&&delta<365&&(e.minutes||0)>0}).length;
 $("#contribution-summary").textContent=`${activeDays} study day${activeDays===1?"":"s"} · ${Math.round(totalMinutes)} minutes in the past year`;
 $("#contribution-streak").textContent=`Current streak: ${streakAt(todayISO())} day${streakAt(todayISO())===1?"":"s"}`;
}
function resetStreakStat(){
 const streak=streakAt(todayISO());const card=$$(".stat-card").find(c=>c.querySelector(".stat-label")?.textContent.trim()==="Study streak");if(!card)return;
 const value=$(".stat-value",card);if(value)value.innerHTML=`${String(streak).padStart(2,"0")}<span class="stat-unit"> day${streak===1?"":"s"}</span>`;
 const footer=$(".stat-footer",card);if(footer)footer.textContent=streak?`Day ${streak} — keep showing up`:"Complete a focus session to start Day 1";
 const dots=$(".streak-dots",card);if(dots){dots.replaceChildren();for(let i=0;i<7;i++){const dot=document.createElement(i<Math.min(streak,7)?"span":"i");dots.append(dot)}dots.setAttribute("aria-label",`${streak} consecutive study days`)}
}
/* Focus timer */
const display=$("#timer-display"),circle=$("#timer-circle"),startButton=$("#start-focus-button"),modes=$$(".timer-mode");
function drawTimer(){display.textContent=String(Math.floor(secondsLeft/60)).padStart(2,"0")+":"+String(secondsLeft%60).padStart(2,"0");const total=timerMode==="focus"?1500:300,deg=Math.max(0,Math.min(360,(total-secondsLeft)/total*360)),color=timerMode==="focus"?"#f6c945":"#9bc8d5";circle.style.background=`conic-gradient(${color} 0deg ${deg}deg,#fffaf2 ${deg}deg 360deg)`}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;timerRunning=false;startButton.innerHTML="<span>▶</span> Start focusing"}
function chooseMode(m){stopTimer();timerMode=m;secondsLeft=m==="focus"?1500:300;modes.forEach(b=>b.classList.toggle("active",b.dataset.mode===m));$("#timer-label").textContent=m==="focus"?"FOCUS SESSION":"SHORT BREAK";$("#timer-caption").textContent=m==="focus"?"minutes of focus":"rest and recharge";drawTimer()}
modes.forEach(b=>b.addEventListener("click",()=>chooseMode(b.dataset.mode)));
startButton.addEventListener("click",()=>{
 if(timerRunning){stopTimer();$("#focus-note").textContent="Timer paused. Take a breath, then resume when you're ready.";notify("Timer paused.");return}
 if(secondsLeft<=0)chooseMode(timerMode);
 if(timerMode==="focus"&&!$("#focus-subject-select").value) {
   const proceed=confirm("You haven't selected a subject. Start an unassigned focus session anyway?");
   if(!proceed){$("#focus-subject-select").focus();return}
 }
 timerRunning=true;startButton.innerHTML="<span>Ⅱ</span> Pause timer";
 $("#live-focus-status")?.remove();
 $("#focus-note").textContent=$("#focus-subject-select").value?`Locked in on ${$("#focus-subject-select").value}. You've got this!`:"Focus session running. You can choose a subject any time.";
 const startedAt=Date.now();let lastTick=startedAt;
 timerInterval=setInterval(()=>{
  const now=Date.now();const elapsed=Math.max(1,Math.round((now-lastTick)/1000));lastTick=now;secondsLeft-=elapsed;drawTimer();
  if(secondsLeft<=0){stopTimer();if(timerMode==="focus"){recordStudy(25);$("#focus-note").textContent="Session complete! Your study time has been added to your yearly graph.";notify("Focus complete! +25 study minutes recorded.");}else {$("#focus-note").textContent="Break complete. Ready for another focused round?";notify("Break complete! Ready to focus again?")}}
 },1000);
});
$("#reset-timer-button").addEventListener("click",()=>{chooseMode(timerMode);$("#focus-note").textContent="Timer reset. Choose a subject and start a fresh session.";notify("Timer reset.")});

/* Notes: create, edit, search, delete; all stored locally */
const noteDialog=$("#note-dialog"),noteForm=$("#note-form");
function fillNoteSubjects(){const s=$("#note-subject-input"),old=s.value;s.replaceChildren();["General",...subjects.map(x=>x.name)].filter((v,i,a)=>a.indexOf(v)===i).forEach(n=>{const o=document.createElement("option");o.value=n;o.textContent=n;s.append(o)});if([...s.options].some(o=>o.value===old))s.value=old}
function openNote(note=null){noteForm.reset();fillNoteSubjects();$("#note-id-input").value=note?.id||"";$("#note-title-input").value=note?.title||"";$("#note-content-input").value=note?.content||"";$("#note-subject-input").value=note?.subject||"General";$("#note-dialog-title").textContent=note?"Edit note":"New study note";$("#note-submit-button").textContent=note?"Save changes ↗":"Save note ↗";noteDialog.showModal();$("#note-title-input").focus()}
function renderNotes(){
 const list=$("#notes-list");list.replaceChildren();const query=$("#notes-search").value.trim().toLowerCase();
 const filtered=notes.filter(n=>`${n.title} ${n.content} ${n.subject}`.toLowerCase().includes(query)).sort((a,b)=>(b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||""));
 filtered.forEach(n=>{const card=document.createElement("article");card.className="note-card";const header=document.createElement("div");header.className="note-card-header";const titleWrap=document.createElement("div");const title=document.createElement("h3");title.textContent=n.title;const meta=document.createElement("div");meta.className="note-card-meta";meta.textContent=`${n.subject||"General"} · Updated ${new Date(n.updatedAt||n.createdAt).toLocaleDateString()}`;titleWrap.append(title,meta);const actions=document.createElement("div");actions.className="note-card-actions";const edit=document.createElement("button");edit.type="button";edit.textContent="✎";edit.title="Edit note";edit.setAttribute("aria-label","Edit note "+n.title);edit.addEventListener("click",()=>openNote(n));const del=document.createElement("button");del.type="button";del.textContent="×";del.title="Delete note";del.setAttribute("aria-label","Delete note "+n.title);del.addEventListener("click",()=>{if(confirm(`Delete note "${n.title}"?`)){notes=notes.filter(x=>x.id!==n.id);save(KEYS.notes,notes);renderNotes();notify("Note deleted.")}});actions.append(edit,del);header.append(titleWrap,actions);const content=document.createElement("p");content.className="note-card-content";content.textContent=n.content;card.append(header,content);list.append(card)});
 $("#notes-empty").hidden=filtered.length>0
}
$("#add-note-button").addEventListener("click",()=>openNote());
$("#note-dialog-close").addEventListener("click",()=>noteDialog.close());
noteDialog.addEventListener("click",e=>{if(e.target===noteDialog)noteDialog.close()});
$("#notes-search").addEventListener("input",renderNotes);
noteForm.addEventListener("submit",e=>{e.preventDefault();const d=new FormData(noteForm),title=String(d.get("title")||"").trim(),content=String(d.get("content")||"").trim(),oldId=String(d.get("id")||"");if(!title||!content)return;const now=new Date().toISOString(),existing=notes.find(n=>n.id===oldId);const note={id:oldId||id(),title,content,subject:String(d.get("subject")||"General"),createdAt:existing?.createdAt||now,updatedAt:now};notes=oldId?notes.map(n=>n.id===oldId?note:n):[note,...notes];save(KEYS.notes,notes);renderNotes();noteDialog.close();notify(oldId?"Note updated!":"Note saved!")});

/* Startup */
fillTaskSubjects();fillFocusSubjects();fillNoteSubjects();renderSubjects();renderTasks();renderCalendar();renderNotes();drawTimer();renderContributions();resetStreakStat();
