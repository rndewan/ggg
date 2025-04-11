document.addEventListener("DOMContentLoaded", () => {
    console.log("Toolbox Script: DOMContentLoaded event fired. v5.1 - Corrected Script"); // Update version marker

    // --- Global State/Refs ---
    let allRosters_data = []; // Holds roster data from SERVER
    let currentRosterName = null; let currentRosterId = null;
    // const ROSTERS_STORAGE_KEY = 'teacherToolboxRosters_LS_v4'; // REMOVED - Using server
    const SEATING_CHART_LAYOUT_PREFIX = 'seatingChartLayout_LS_v4_roster_'; // Keep LOCAL storage for layouts for now
    let absentStudents = new Set();
    let remainingNamesForPicker = [];
    let currentWarningLightLevel = 0; // 0, 1, 2, 3

    // --- Element References ---
    const tabNav_el = document.getElementById("tabNav");
    const toolPanels_el = document.querySelectorAll(".tool-panel");
    const nameListTextArea_el = document.getElementById("nameList");
    const rosterSelect_el = document.getElementById("rosterSelect");
    const rosterNameInput_el = document.getElementById("rosterNameInput");
    const saveNewRosterBtn_el = document.getElementById("saveNewRosterBtn");
    const updateRosterBtn_el = document.getElementById("updateRosterBtn");
    const deleteRosterBtn_el = document.getElementById("deleteRosterBtn");
    const makeAllPresentBtn_el = document.getElementById("makeAllPresentBtn");
    const studentPresenceGrid_el = document.getElementById("studentPresenceGrid");
    const pickNameBtn_el = document.getElementById("pickNameBtn");
    const randomNameDisplay_el = document.getElementById("randomNameDisplay");
    const pickAndRemoveBtn_el = document.getElementById("pickAndRemoveBtn");
    const resetPickAndRemoveBtn_el = document.getElementById("resetPickAndRemoveBtn");
    const remainingNamesCount_el = document.getElementById("remainingNamesCount");
    const removedNamesList_el = document.getElementById("removedNamesList");
    const slotMachineSectionHeader_el = document.getElementById('slotMachineSectionHeader');
    const slotMachineSectionContent_el = document.getElementById('slotMachineSectionContent');
    const nameSlotMachine_el = document.getElementById('nameSlotMachine');
    const spinSlotsBtn_el = document.getElementById('spinSlotsBtn');
    const groupMakerRosterSource_el = document.getElementById("groupMakerRosterSource");
    const makeGroupsBtn_el = document.getElementById("makeGroupsBtn");
    const numGroupsInput_el = document.getElementById("numGroups");
    const groupResultDisplay_el = document.getElementById("groupResultDisplay");
    const seatingChartRosterSource_el = document.getElementById("seatingChartRosterSource");
    const studentBank_el = document.getElementById('studentBank');
    const seatingChartCanvas_el = document.getElementById('seatingChartCanvas');
    const loadRosterForSeatingBtn_el = document.getElementById('loadRosterForSeatingBtn');
    const saveChartLayoutBtn_el = document.getElementById('saveChartLayoutBtn');
    const loadChartLayoutBtn_el = document.getElementById('loadChartLayoutBtn');
    const clearSeatingChartBtn_el = document.getElementById('clearSeatingChartBtn');
    const printSeatingChartBtn_el = document.getElementById('printSeatingChartBtn');
    const warningsContainer_el = document.getElementById('warningsContainer');
    // Ensure warningLights_el is defined correctly AFTER warningsContainer_el
    const warningLights_el = warningsContainer_el ? Array.from(warningsContainer_el.querySelectorAll('.warning-light')).reverse() : []; // Idx 0=Bottom(Y), 1=Mid(O), 2=Top(R)
    const timerMinutesInput_t=document.getElementById("timerMinutes"), timerSecondsInput_t=document.getElementById("timerSeconds"), timerDisplay_t=document.getElementById("timerDisplay"), timerStartBtn_t=document.getElementById("timerStartBtn"), timerPauseBtn_t=document.getElementById("timerPauseBtn"), timerResetBtn_t=document.getElementById("timerResetBtn");
    const disp_sw=document.getElementById("stopwatchDisplay"), start_sw=document.getElementById("stopwatchStartBtn"), stop_sw=document.getElementById("stopwatchStopBtn"), reset_sw=document.getElementById("stopwatchResetBtn");


    // --- Core Tab Switching ---
    try { const btns=tabNav_el?.querySelectorAll(".tab-button");if(tabNav_el&&btns?.length>0&&toolPanels_el.length>0){tabNav_el.addEventListener("click",e=>{if(e.target.tagName==="BUTTON"&&e.target.classList.contains("tab-button")){const t=e.target.dataset.target;if(!t)return;btns.forEach(b=>b.classList.remove("active"));e.target.classList.add("active");toolPanels_el.forEach(p=>p.classList.toggle("active",p.id===t))}})}else{console.error("Tab els missing.")}}catch(e){console.error("Tab Error:",e)}

    // --- Utility Functions ---
    function getPresentStudents() { if (!nameListTextArea_el) return []; return nameListTextArea_el.value.split('\n').map(n=>n.trim()).filter(n => n !== '' && !absentStudents.has(n)); }
    function getAllStudentsFromRoster() { if (!nameListTextArea_el) return []; return nameListTextArea_el.value.split('\n').map(n=>n.trim()).filter(n => n !== ''); }
    function shuffleArray_fn(a){let c=a.length,t,r;while(0!==c){r=Math.floor(Math.random()*c);c-=1;t=a[c];a[c]=a[r];a[r]=t;}return a;}

    // --- Vertical Warning Light Logic ---
     function updateWarningLights() { warningLights_el.forEach((l, i) => l.classList.toggle('active', i < currentWarningLightLevel)); }
     try { if (!warningsContainer_el || warningLights_el.length !== 3) throw Error("Warn els missing."); warningsContainer_el.addEventListener('click', e=>{if(e.target.classList.contains('warning-light')){if(currentWarningLightLevel<3){currentWarningLightLevel++;updateWarningLights();}}}); warningsContainer_el.addEventListener('contextmenu', e=>{if(e.target.classList.contains('warning-light')){e.preventDefault();if(currentWarningLightLevel>0){currentWarningLightLevel--;updateWarningLights();}}}); updateWarningLights(); console.log("Warnings init."); } catch (e) { console.error("Warn Error:", e); }

     // --- Random Name Picker (Slot Machine & Reset Function) ---
     function buildSlotReels(names, reelCount = 1) { if(!nameSlotMachine_el)return;nameSlotMachine_el.innerHTML='';if(names.length===0){nameSlotMachine_el.innerHTML='<p style="text-align:center;color:#6c757d;">No names</p>';return;}const rH=60;const extN=shuffleArray_fn([...names,...names,...names]);for(let i=0;i<reelCount;i++){const r=document.createElement('div');r.classList.add('single-slot-reel');const inner=document.createElement('div');inner.classList.add('single-slot-reel-inner');extN.forEach(n=>{const it=document.createElement('div');it.classList.add('single-slot-item');it.textContent=n;inner.appendChild(it);});r.appendChild(inner);nameSlotMachine_el.appendChild(r);}}
     function resetPickAndRemove() { remainingNamesForPicker=getPresentStudents();if(remainingNamesCount_el)remainingNamesCount_el.textContent=remainingNamesForPicker.length;if(removedNamesList_el)removedNamesList_el.innerHTML='';if(randomNameDisplay_el)randomNameDisplay_el.textContent='--';if(pickAndRemoveBtn_el)pickAndRemoveBtn_el.disabled=remainingNamesForPicker.length===0;buildSlotReels(remainingNamesForPicker);console.log("Pick/Remove reset.");}

    // --- Roster Management & Presence (Using Fetch) ---
    try {
        console.log("Init Roster & Presence (Server)...");
        if (!nameListTextArea_el || !rosterSelect_el || !rosterNameInput_el || !saveNewRosterBtn_el || !updateRosterBtn_el || !deleteRosterBtn_el || !studentPresenceGrid_el || !makeAllPresentBtn_el) { throw new Error("Roster/Presence elements missing."); }

        async function loadRostersList_fn() { console.log("Loading rosters..."); try { const r=await fetch('/api/rosters');if(!r.ok)throw Error(`HTTP ${r.status}`);allRosters_data=await r.json();console.log("Rosters received:",allRosters_data); rosterSelect_el.innerHTML='';if(allRosters_data.length===0){const o=document.createElement("option");o.value="";o.textContent="-- No rosters --";o.disabled=true;rosterSelect_el.appendChild(o);}else{allRosters_data.sort((a,b)=>a.name.localeCompare(b.name));allRosters_data.forEach(r=>{const o=document.createElement("option");o.value=r.id;o.textContent=r.name;rosterSelect_el.appendChild(o);});rosterSelect_el.selectedIndex=0;}loadSelectedRoster_fn();}catch(e){console.error("Load rosters error:",e);rosterSelect_el.innerHTML='<option value="" disabled>Error</option>';loadSelectedRoster_fn();}}
        function loadSelectedRoster_fn(){currentRosterId=rosterSelect_el.value;const r=allRosters_data.find(el=>el.id===currentRosterId);currentRosterName=null;if(r){nameListTextArea_el.value=r.data;rosterNameInput_el.value=r.name;updateRosterBtn_el.disabled=false;deleteRosterBtn_el.disabled=false;currentRosterName=r.name;}else{nameListTextArea_el.value="";rosterNameInput_el.value="";updateRosterBtn_el.disabled=true;deleteRosterBtn_el.disabled=true;}absentStudents.clear();populatePresenceGrid();updateSourceDisplays(currentRosterName);resetPickAndRemove();}
        function updateSourceDisplays(name){const dt="(No roster selected)";const st=name?`Using: ${name}`:dt;if(groupMakerRosterSource_el)groupMakerRosterSource_el.textContent=st;if(seatingChartRosterSource_el)seatingChartRosterSource_el.textContent=st;}
        function populatePresenceGrid(){studentPresenceGrid_el.innerHTML='';const names=getAllStudentsFromRoster();if(names.length===0){studentPresenceGrid_el.innerHTML='<div class="grid-placeholder">Empty...</div>';return;}names.forEach(n=>{const b=document.createElement('div');b.classList.add('presence-box');b.textContent=n;b.dataset.studentName=n;if(absentStudents.has(n))b.classList.add('absent');b.addEventListener('click',()=>toggleStudentAbsence(n,b));studentPresenceGrid_el.appendChild(b);});}
        function toggleStudentAbsence(name,box){if(absentStudents.has(name)){absentStudents.delete(name);box.classList.remove('absent');}else{absentStudents.add(name);box.classList.add('absent');}resetPickAndRemove();}
        makeAllPresentBtn_el.addEventListener('click',()=>{absentStudents.clear();populatePresenceGrid();resetPickAndRemove();console.log("All present.");});
        saveNewRosterBtn_el.addEventListener("click",async()=>{const n=rosterNameInput_el.value.trim();const d=nameListTextArea_el.value;if(!n)return;console.log(`Saving:${n}`);try{const r=await fetch('/api/rosters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,data:d})});if(r.ok){const nr=await r.json();console.log("Save ok.");await loadRostersList_fn();rosterSelect_el.value=nr.id;loadSelectedRoster_fn();}else{const eD=await r.json().catch(()=>({}));console.error(`Save Err ${r.status}: ${eD.error||r.statusText}`);}}catch(e){console.error("Fetch save err:",e);}});
        updateRosterBtn_el.addEventListener("click",async()=>{const id=currentRosterId;if(!id)return;const n=rosterNameInput_el.value.trim();const d=nameListTextArea_el.value;if(!n)return;console.log(`Updating:${id}`);try{const r=await fetch(`/api/rosters/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,data:d})});if(r.ok){console.log("Update ok.");const cId=rosterSelect_el.value;await loadRostersList_fn();rosterSelect_el.value=cId;loadSelectedRoster_fn();}else{const eD=await r.json().catch(()=>({}));console.error(`Update Err ${r.status}: ${eD.error||r.statusText}`);if(r.status===404)await loadRostersList_fn();}}catch(e){console.error("Fetch update err:",e);}});
        deleteRosterBtn_el.addEventListener("click",async()=>{const id=currentRosterId;const opt=rosterSelect_el.options[rosterSelect_el.selectedIndex];if(!id||!opt||opt.disabled)return;const nDel=opt.textContent;if(!confirm(`Delete "${nDel}"? Incl. layout?`))return;console.log(`Deleting:${id}`);try{const r=await fetch(`/api/rosters/${id}`,{method:'DELETE'});if(r.ok||r.status===204){console.log("Delete ok.");const ck=`${SEATING_CHART_LAYOUT_PREFIX}${id}`;localStorage.removeItem(ck);console.log(`Removed chart:${ck}`);await loadRostersList_fn();}else{const eD=await r.json().catch(()=>({}));console.error(`Delete Err ${r.status}: ${eD.error||r.statusText}`);if(r.status===404)await loadRostersList_fn();}}catch(e){console.error("Fetch delete err:",e);}});
        rosterSelect_el.addEventListener("change",loadSelectedRoster_fn);
        nameListTextArea_el.addEventListener("input",()=>{absentStudents.clear();populatePresenceGrid();resetPickAndRemove();});
        console.log("Roster & Presence Initialized (Server)."); loadRostersList_fn(); // Initial Load
    } catch (e) { console.error("Roster/Presence Error:", e); }


    // --- Random Name Picker Initialization ---
    try {
         console.log("Init RNP..."); if (!pickNameBtn_el||!randomNameDisplay_el||!pickAndRemoveBtn_el||!resetPickAndRemoveBtn_el||!remainingNamesCount_el||!removedNamesList_el||!slotMachineSectionHeader_el||!slotMachineSectionContent_el||!nameSlotMachine_el||!spinSlotsBtn_el)throw Error("RNP els missing.");
         pickNameBtn_el.addEventListener("click",()=>{const pS=getPresentStudents();randomNameDisplay_el.textContent=pS.length>0?pS[Math.floor(Math.random()*pS.length)]:"No present students!";});
         pickAndRemoveBtn_el.addEventListener("click",()=>{if(remainingNamesForPicker.length===0){randomNameDisplay_el.textContent="All picked!";pickAndRemoveBtn_el.disabled=true;return;}const i=Math.floor(Math.random()*remainingNamesForPicker.length);const n=remainingNamesForPicker.splice(i,1)[0];randomNameDisplay_el.textContent=n;remainingNamesCount_el.textContent=remainingNamesForPicker.length;const li=document.createElement('li');li.textContent=n;removedNamesList_el.appendChild(li);pickAndRemoveBtn_el.disabled=remainingNamesForPicker.length===0;buildSlotReels(remainingNamesForPicker);});
         resetPickAndRemoveBtn_el.addEventListener("click", resetPickAndRemove);
         slotMachineSectionHeader_el.addEventListener('click',()=>{slotMachineSectionContent_el.classList.toggle('hidden');slotMachineSectionHeader_el.classList.toggle('collapsed');});
         spinSlotsBtn_el.addEventListener('click',()=>{const names=remainingNamesForPicker.length>0?remainingNamesForPicker:getPresentStudents();if(names.length<1){console.warn("No names");return;}const reelInners=nameSlotMachine_el.querySelectorAll('.single-slot-reel-inner');if(reelInners.length===0){console.warn("No reels");buildSlotReels(names);return;}const reelHeight=60;const pickIdx=Math.floor(Math.random()*names.length);const pickedN=names[pickIdx];randomNameDisplay_el.textContent=`Spinning...`;spinSlotsBtn_el.disabled=true;reelInners.forEach((reel,rIdx)=>{const items=Array.from(reel.querySelectorAll('.single-slot-item'));let targetIdx=items.findIndex(item=>item.textContent===pickedN);if(targetIdx===-1)targetIdx=Math.floor(Math.random()*items.length);const targetPos=-(targetIdx*reelHeight);const randScrolls=(Math.floor(Math.random()*3)+4)*items.length*reelHeight;const finalPos=targetPos-randScrolls;reel.style.transition=`top ${2+rIdx*0.2}s cubic-bezier(0.25, 1, 0.5, 1)`;reel.style.top=`${finalPos}px`;setTimeout(()=>{reel.style.transition='none';const snapPos=targetPos%(items.length*reelHeight);reel.style.top=`${snapPos}px`;},2000+rIdx*200+100);});setTimeout(()=>{randomNameDisplay_el.textContent=pickedN;spinSlotsBtn_el.disabled=false;if(remainingNamesForPicker.includes(pickedN)){const idxW=remainingNamesForPicker.indexOf(pickedN);if(idxW>-1){remainingNamesForPicker.splice(idxW,1);remainingNamesCount_el.textContent=remainingNamesForPicker.length;const li=document.createElement('li');li.textContent=pickedN;removedNamesList_el.appendChild(li);pickAndRemoveBtn_el.disabled=remainingNamesForPicker.length===0;buildSlotReels(remainingNamesForPicker);}}},2300);});
         resetPickAndRemove(); console.log("RNP init.");
    } catch(e) { console.error("RNP Error:", e); }


    // --- Group Maker ---
    try { console.log("Init Groups..."); if (!makeGroupsBtn_el||!numGroupsInput_el||!groupResultDisplay_el)throw Error("Group els missing."); makeGroupsBtn_el.addEventListener("click",()=>{const pS=getPresentStudents();const nG=parseInt(numGroupsInput_el.value,10);if(pS.length===0){groupResultDisplay_el.innerHTML='<p style="color:red;">No present.</p>';return;}if(isNaN(nG)||nG<=0){groupResultDisplay_el.innerHTML='<p style="color:red;">Groups>0.</p>';return;}if(nG>pS.length){groupResultDisplay_el.innerHTML=`<p style="color:red;">Need ${pS.length}+ students.</p>`;return;}let nTg=shuffleArray_fn([...pS]);const grps=Array.from({length:nG},()=>[]);nTg.forEach((n,i)=>grps[i%nG].push(n));groupResultDisplay_el.innerHTML='';grps.forEach((g,i)=>{const b=document.createElement('div');b.classList.add('group-box');b.style.backgroundColor=(i%2===0)?'var(--group-bg-1)':'var(--group-bg-2)';const t=document.createElement('h4');t.textContent=`Group ${i+1}`;b.appendChild(t);const l=document.createElement('ul');g.forEach(n=>{const li=document.createElement('li');li.textContent=n;l.appendChild(li);});b.appendChild(l);groupResultDisplay_el.appendChild(b);});}); console.log("Groups init."); } catch (e) { console.error("Groups Error:", e); }


    // --- Seating Chart ---
    try {
        console.log("Init Seating Chart..."); if (!studentBank_el||!seatingChartCanvas_el||!loadRosterForSeatingBtn_el||!saveChartLayoutBtn_el||!loadChartLayoutBtn_el||!clearSeatingChartBtn_el||!printSeatingChartBtn_el) throw Error("Seat els missing.");
        let dragChart=null, offXChart=0, offYChart=0;
        function getKeyChart(){return currentRosterId?`${SEATING_CHART_LAYOUT_PREFIX}${currentRosterId}`:null;}
        function loadBankChart(){while(studentBank_el.firstChild&&studentBank_el.firstChild.nodeName!=='H4')studentBank_el.removeChild(studentBank_el.firstChild);studentBank_el.querySelectorAll('.student-item-draggable').forEach(i=>i.remove());const names=getAllStudentsFromRoster();const ph=studentBank_el.querySelector('.no-students');if(names.length===0){if(!ph){const p=document.createElement('span');p.textContent='(No students)';p.className='no-students';p.style.cssText='...';studentBank_el.appendChild(p);}return false;}else{if(ph)ph.remove();}names.forEach(n=>{const sd=createDraggableStudentChart(n);studentBank_el.appendChild(sd);});console.log(`${names.length} loaded to chart bank.`);return true;}
        function createDraggableStudentChart(name,points=0,id=null){const sd=document.createElement('div');sd.classList.add('student-item-draggable');sd.draggable=true;sd.id=id||`st-ch-${Date.now()}-${Math.random().toString(16).slice(2)}`;sd.dataset.studentName=name;sd.dataset.points=points;const nS=document.createElement('span');nS.classList.add('student-name-display');nS.textContent=name;sd.appendChild(nS);const pC=document.createElement('div');pC.classList.add('points-control');const mB=document.createElement('button');mB.classList.add('points-btn');mB.textContent='-';mB.addEventListener('click',e=>{e.stopPropagation();changePtsChart(sd,-1);});const pS=document.createElement('span');pS.classList.add('points-display');pS.textContent=points;const pB=document.createElement('button');pB.classList.add('points-btn');pB.textContent='+';pB.addEventListener('click',e=>{e.stopPropagation();changePtsChart(sd,1);});pC.appendChild(mB);pC.appendChild(pS);pC.appendChild(pB);sd.appendChild(pC);if(absentStudents.has(name)){sd.style.opacity='0.6';sd.style.fontStyle='italic';}sd.addEventListener('dragstart',dragStartChart);sd.addEventListener('dragend',dragEndChart);return sd;}
        function changePtsChart(el,delta){let pts=parseInt(el.dataset.points||'0',10)+delta;el.dataset.points=pts;el.querySelector('.points-display').textContent=pts;}
        function saveLayoutChart(){const key=getKeyChart();if(!key){console.warn("Save layout: No roster.");return;}const l={};seatingChartCanvas_el.querySelectorAll('.student-item-draggable').forEach(i=>{const n=i.dataset.studentName;if(n)l[n]={x:i.style.left,y:i.style.top,id:i.id,pts:i.dataset.points||0};});localStorage.setItem(key,JSON.stringify(l));console.log(`Layout saved for ${currentRosterId}.`);}
        function loadLayoutChart(){const key=getKeyChart();if(!key){console.warn("Load layout: No roster.");return;}const s=localStorage.getItem(key);if(!s){console.log(`No layout for ${currentRosterId}.`);return;}const l=JSON.parse(s);console.log(`Loading layout for ${currentRosterId}:`,l);const avail=loadBankChart();if(!avail){console.warn("No students in bank.");return;}clearChartCanvas();let p=0;Object.entries(l).forEach(([n,d])=>{const el=Array.from(studentBank_el.querySelectorAll('.student-item-draggable')).find(i=>i.dataset.studentName===n);if(el&&d.x&&d.y){el.style.left=d.x;el.style.top=d.y;changePtsChart(el,parseInt(d.pts||'0',10)-parseInt(el.dataset.points||'0',10));seatingChartCanvas_el.appendChild(el);p++;}else{console.warn(`Load issue: ${n}.`);}});console.log(`Placed ${p}.`);}
        function clearChartCanvas(){seatingChartCanvas_el.querySelectorAll('.student-item-draggable').forEach(i=>{i.style.left='';i.style.top='';changePtsChart(i,0-parseInt(i.dataset.points||'0',10));studentBank_el.appendChild(i);});console.log("Chart cleared.");}
        function dragStartChart(e){dragChart=e.target;const r=dragChart.getBoundingClientRect();offXChart=e.clientX-r.left;offYChart=e.clientY-r.top;e.dataTransfer.setData('text/plain',dragChart.id);e.dataTransfer.effectAllowed='move';setTimeout(()=>{if(dragChart)dragChart.classList.add('dragging');},0);}
        function dragEndChart(e){if(dragChart)dragChart.classList.remove('dragging');dragChart=null;offXChart=0;offYChart=0;seatingChartCanvas_el.classList.remove('drag-over');studentBank_el.classList.remove('drag-over');}
        function dragOverCanvasChart(e){e.preventDefault();e.dataTransfer.dropEffect='move';}
        function dragEnterCanvasChart(e){e.preventDefault();seatingChartCanvas_el.classList.add('drag-over');}
        function dragLeaveCanvasChart(e){if(e.target===seatingChartCanvas_el&&!seatingChartCanvas_el.contains(e.relatedTarget))seatingChartCanvas_el.classList.remove('drag-over');}
        function dropOnCanvasChart(e){e.preventDefault();seatingChartCanvas_el.classList.remove('drag-over');if(!dragChart||!dragChart.classList.contains('student-item-draggable'))return;const cR=seatingChartCanvas_el.getBoundingClientRect();let x=e.clientX-cR.left-offXChart+seatingChartCanvas_el.scrollLeft;let y=e.clientY-cR.top-offYChart+seatingChartCanvas_el.scrollTop;x=Math.max(0,Math.min(x,seatingChartCanvas_el.scrollWidth-dragChart.offsetWidth));y=Math.max(0,Math.min(y,seatingChartCanvas_el.scrollHeight-dragChart.offsetHeight));dragChart.style.left=`${x}px`;dragChart.style.top=`${y}px`;if(dragChart.parentElement!==seatingChartCanvas_el)seatingChartCanvas_el.appendChild(dragChart);}
        function dragEnterBankChart(e){e.preventDefault();studentBank_el.classList.add('drag-over');}
        function dragLeaveBankChart(e){if(e.target===studentBank_el&&!studentBank_el.contains(e.relatedTarget))studentBank_el.classList.remove('drag-over');}
        function dropOnBankChart(e){e.preventDefault();studentBank_el.classList.remove('drag-over');if(!dragChart||!dragChart.classList.contains('student-item-draggable'))return;dragChart.style.left='';dragChart.style.top='';studentBank_el.appendChild(dragChart);}
        printSeatingChartBtn_el.addEventListener('click',()=>{console.log("Printing chart...");window.print();});
        loadRosterForSeatingBtn_el.addEventListener('click',()=>{clearChartCanvas();const loaded=loadBankChart();const key=getKeyChart();if(loaded&&key&&localStorage.getItem(key))loadLayoutChart();else console.log("Students loaded/empty/no layout.");});
        saveChartLayoutBtn_el.addEventListener('click',saveLayoutChart);loadChartLayoutBtn_el.addEventListener('click',loadLayoutChart);clearSeatingChartBtn_el.addEventListener('click',clearChartCanvas);
        seatingChartCanvas_el.addEventListener('dragover',dragOverCanvasChart);seatingChartCanvas_el.addEventListener('dragenter',dragEnterCanvasChart);seatingChartCanvas_el.addEventListener('dragleave',dragLeaveCanvasChart);seatingChartCanvas_el.addEventListener('drop',dropOnCanvasChart);
        studentBank_el.addEventListener('dragover',dragOverCanvasChart);studentBank_el.addEventListener('dragenter',dragEnterBankChart);studentBank_el.addEventListener('dragleave',dragLeaveBankChart);studentBank_el.addEventListener('drop',dropOnBankChart);
        console.log("Seating Chart init.");
    } catch (e) { console.error("Seating Chart Error:", e); }


    // --- Timer (Minified) ---
    try { console.log("Init Timer..."); if(!timerMinutesInput_t||!timerSecondsInput_t||!timerDisplay_t||!timerStartBtn_t||!timerPauseBtn_t||!timerResetBtn_t)throw Error("Timer els missing");let iT=null,totT=0,remT=0,runT=false,initT=true,aCtxT=null; function fT(s){const v=Math.max(0,Number(s)||0);const m=Math.floor(v/60);const sec=v%60;return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`} function uT(){timerDisplay_t.textContent=fT(remT)} function sT(){const m=parseInt(timerMinutesInput_t.value,10)||0;const s=parseInt(timerSecondsInput_t.value,10)||0;totT=m*60+s;if(!runT||initT){remT=totT;uT()} initT=false} function pT(){try{if(!aCtxT)aCtxT=new(window.AudioContext||window.webkitAudioContext)();if(aCtxT){const c=aCtxT,o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type="sine";o.frequency.setValueAtTime(440,c.currentTime);g.gain.setValueAtTime(0.5,c.currentTime);g.gain.exponentialRampToValueAtTime(1e-4,c.currentTime+0.5);o.start(c.currentTime);o.stop(c.currentTime+0.5)}}catch(e){console.warn("Audio fail",e)}} function stT(){if(runT)return;if(initT||remT<=0){sT();if(totT<=0){initT=true;return}}runT=true;initT=false;timerStartBtn_t.disabled=true;timerPauseBtn_t.disabled=false;timerMinutesInput_t.disabled=true;timerSecondsInput_t.disabled=true;clearInterval(iT);iT=setInterval(()=>{remT--;uT();if(remT<=0){clearInterval(iT);runT=false;initT=true;timerStartBtn_t.disabled=false;timerPauseBtn_t.disabled=true;timerMinutesInput_t.disabled=false;timerSecondsInput_t.disabled=false;pT();console.log("Timer fin.");}},1000)} function paT(){if(!runT)return;clearInterval(iT);runT=false;timerStartBtn_t.disabled=false;timerPauseBtn_t.disabled=true} function reT(){clearInterval(iT);runT=false;initT=true;sT();timerStartBtn_t.disabled=false;timerPauseBtn_t.disabled=true;timerMinutesInput_t.disabled=false;timerSecondsInput_t.disabled=false;console.log("Timer reset.")} timerMinutesInput_t.addEventListener("input",sT);timerSecondsInput_t.addEventListener("input",sT);timerStartBtn_t.addEventListener("click",stT);timerPauseBtn_t.addEventListener("click",paT);timerResetBtn_t.addEventListener("click",reT); sT();timerPauseBtn_t.disabled=true;console.log("Timer init."); } catch(e){console.error("Timer Error:",e);}

    // --- Stopwatch (Minified) ---
    try { console.log("Init Stopwatch..."); if(!disp_sw||!start_sw||!stop_sw||!reset_sw)throw Error("Stopwatch els miss.");let iS=null,msS=0,stS=0,runS=false;function fS(ms){const t=Math.floor(ms/1000);const m=Math.floor(t/60);const s=t%60;const h=Math.floor((ms%1000)/10);return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(h).padStart(2,"0")}`} function uS(){const e=runS?(Date.now()-stS):msS;disp_sw.textContent=fS(e)} start_sw.addEventListener("click",()=>{if(runS)return;runS=true;start_sw.disabled=true;stop_sw.disabled=false;reset_sw.disabled=true;stS=Date.now()-msS;clearInterval(iS);iS=setInterval(uS,10)}); stop_sw.addEventListener("click",()=>{if(!runS)return;clearInterval(iS);runS=false;msS=Date.now()-stS;uS();start_sw.disabled=false;stop_sw.disabled=true;reset_sw.disabled=false}); reset_sw.addEventListener("click",()=>{clearInterval(iS);runS=false;msS=0;stS=0;uS();start_sw.disabled=false;stop_sw.disabled=true;reset_sw.disabled=true}); uS();stop_sw.disabled=true;reset_sw.disabled=true;console.log("Stopwatch init.");} catch(e){console.error("Stopwatch Error:",e);}

    console.log("Toolbox Script: All initializations attempted.");
}); // End of DOMContentLoaded listener