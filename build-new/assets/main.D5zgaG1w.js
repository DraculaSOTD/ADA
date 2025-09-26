var it=(i,e)=>()=>(e||i((e={exports:{}}).exports,e),e.exports);var wa=it((ka,K)=>{(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(a){if(a.ep)return;a.ep=!0;const s=t(a);fetch(a.href,s)}})();const Fe={costs:{basic:10,moderate:25,complex:50,condition:5,action:10,apiCall:15,modelInference:30},calculateRulesCost(i,e,t="basic"){let n=this.costs[t]||this.costs.basic,a=i*this.costs.condition,s=e*this.costs.action,o=1;return t==="moderate"?o=1.5:t==="complex"&&(o=2),Math.round((n+a+s)*o)},calculateModelCost(i,e,t){const n={train:100,predict:10,evaluate:20},a={simple:1,neural_network:2,deep_learning:3,transformer:5},s=n[e]||10,o=a[i]||1,l=Math.ceil(t/10);return Math.round(s*o*l)},calculateDataGenerationCost(i,e,t="basic"){const a={basic:.1,moderate:.5,complex:1,advanced:2}[t]||.1,s=Math.ceil(i*e/1e3);return Math.round(s*a*10)},calculateGenerationCost(i,e="ctgan",t={}){const n={ctgan:50,timegan:100,vae:30,basic:10};let a=1;t.differentialPrivacy&&(a*=1.5),t.hierarchicalRelations&&(a*=1.3),t.industryTemplate&&(a*=1.2),t.advancedAnonymization&&(a*=1.4);const s=n[e]||n.basic,o=Math.ceil(i/1e3);return Math.round(s*o*a)},formatTokens(i){return i>=1e6?`${(i/1e6).toFixed(2)}M`:i>=1e3?`${(i/1e3).toFixed(1)}K`:i.toLocaleString()},hasSufficientTokens(i,e){return e>=i},getEstimate(i,e={}){let t=0,n={};switch(i){case"rule":t=this.calculateRulesCost(e.conditions||0,e.actions||0,e.complexity||"basic"),n={base:this.costs[e.complexity||"basic"],conditions:(e.conditions||0)*this.costs.condition,actions:(e.actions||0)*this.costs.action};break;case"model":t=this.calculateModelCost(e.modelType||"simple",e.operation||"predict",e.dataSize||1),n={operation:e.operation,modelType:e.modelType,dataSize:`${e.dataSize}MB`};break;case"data":t=this.calculateDataGenerationCost(e.rows||100,e.columns||10,e.complexity||"basic"),n={rows:e.rows||100,columns:e.columns||10,complexity:e.complexity||"basic"};break;default:t=this.costs.basic,n={base:this.costs.basic}}return{total:t,breakdown:n,formatted:this.formatTokens(t)}}};typeof window<"u"&&(window.tokenService=Fe);typeof K<"u"&&K.exports&&(K.exports=Fe);class ot{constructor(e,t={}){this.container=e,this.options={onTabChange:t.onTabChange||(()=>{}),activeTab:t.activeTab||0,...t},this.tabs=[],this.init()}init(){this.container&&(this.render(),this.attachEventListeners())}setTabs(e){this.tabs=e,this.render()}render(){this.container&&(this.container.innerHTML=`
            <div class="tab-navigation">
                ${this.tabs.map((e,t)=>`
                    <button class="tab-button ${t===this.options.activeTab?"active":""}" 
                            data-tab="${e.id||t}"
                            data-index="${t}">
                        ${e.icon?`<i class="${e.icon}"></i>`:""}
                        ${e.label}
                    </button>
                `).join("")}
            </div>
        `)}attachEventListeners(){this.container.addEventListener("click",e=>{const t=e.target.closest(".tab-button");if(!t)return;const n=parseInt(t.dataset.index),a=t.dataset.tab;this.setActiveTab(n),this.options.onTabChange(a,n)})}setActiveTab(e){this.options.activeTab=e,this.container.querySelectorAll(".tab-button").forEach((n,a)=>{a===e?n.classList.add("active"):n.classList.remove("active")})}getActiveTab(){return this.options.activeTab}}function $e(){if(document.querySelector('link[href*="shared/index.css"]'))return;const i=document.createElement("link");i.rel="stylesheet",i.href="/src/components/shared/index.css",document.head.appendChild(i)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",$e):$e();class se{constructor(){this.tabNavigation=null,this.init()}init(){this.initializeTabNavigation(),this.loadInitialContent()}initializeTabNavigation(){const e=document.getElementById("allModelsTabContainer");e&&(this.tabNavigation=new ot(e,{activeTab:0,onTabChange:(t,n)=>this.handleTabChange(t,n)}),this.tabNavigation.setTabs([{id:"all-models",label:"All Models",icon:"fas fa-list"},{id:"community",label:"Community Models",icon:"fas fa-users"},{id:"pretrained",label:"Pretrained Models",icon:"fas fa-check-circle"}]))}handleTabChange(e,t){document.querySelectorAll(".tab-panel").forEach(s=>s.classList.remove("active"));const a=document.querySelector(`[data-panel="${e}"]`);a&&(a.classList.add("active"),this.loadTabContent(e))}loadInitialContent(){this.loadTabContent("all-models")}async loadTabContent(e){const t=document.querySelector(`[data-panel="${e}"]`);if(t&&t.dataset.loaded!=="true")try{let n;switch(e){case"all-models":n="AllModelsOverviewTabContent.html";break;case"community":n="CommunityModelsTabContent.html";break;case"pretrained":n="PretrainedModelsTabContent.html";break;default:return}const a=await fetch(`/src/components/AllModelsPage/${n}`);if(a.ok){const s=await a.text();t.innerHTML=s,t.dataset.loaded="true",this.initializeTabFeatures(e)}}catch(n){console.error("Error loading tab content:",n),t.innerHTML='<div class="empty-state">Error loading content. Please try again.</div>'}}async initializeTabFeatures(e){switch(e){case"all-models":await this.loadAllModelsData();break;case"community":await this.loadCommunityModelsData();break;case"pretrained":await this.loadPretrainedModelsData();break}}async loadAllModelsData(){if(typeof loadAllModels=="function")await loadAllModels();else{console.log("loadAllModels function not found, loading mock data");const e=document.querySelector('[data-panel="all-models"]');if(e&&e.querySelector(".card")&&typeof renderModelTable=="function"){const n=[...this.getMockModels()];renderModelTable(n,'.tab-panel[data-panel="all-models"] .card',"all")}}}async loadCommunityModelsData(){typeof loadCommunityModels=="function"?await loadCommunityModels():console.log("loadCommunityModels function not found")}async loadPretrainedModelsData(){typeof loadPretrainedModels=="function"?await loadPretrainedModels():console.log("loadPretrainedModels function not found")}getMockModels(){return[{id:1,name:"Sentiment Analysis",description:"Analyzes text sentiment",type:"Classification",status:"active",user_id:1,created_at:new Date().toISOString(),performance:{accuracy:.92}},{id:2,name:"Sales Forecaster",description:"Forecasts sales trends",type:"Regression",status:"active",user_id:1,created_at:new Date().toISOString(),performance:{accuracy:.88}}]}}window.AllModelsPage=se;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{window.allModelsPage||(window.allModelsPage=new se)}):window.allModelsPage||(window.allModelsPage=new se);let ie=class{constructor(){this.selectedTier=null,this.uploadedFile=null,this.uploadedData=null,this.columnNames=[],this.init()}init(){this.initializeEventListeners(),this.loadInitialContent()}initializeEventListeners(){const e=document.getElementById("csv-upload"),t=document.getElementById("upload-button"),n=document.getElementById("file-name");e&&e.addEventListener("change",l=>{const r=l.target.files[0];r&&(this.uploadedFile=r,n&&(n.textContent=r.name),this.updateCostCalculator(r),(r.type==="text/csv"||r.name.endsWith(".csv"))&&this.handleFileUpload(r))}),t&&t.addEventListener("click",()=>{this.uploadedFile&&this.processFile(this.uploadedFile)}),e&&e.addEventListener("click",()=>{e.value=""}),document.querySelectorAll(".tier-card").forEach(l=>{l.addEventListener("click",()=>this.selectTier(l.dataset.tier))});const s=document.getElementById("differential-privacy");s&&s.addEventListener("change",l=>{const r=document.querySelector(".privacy-options");r&&(r.style.display=l.target.checked?"block":"none"),this.calculateAccurateCostSummary()});const o=document.getElementById("epsilon");o&&o.addEventListener("input",this.updatePrivacyLevel.bind(this))}clearFile(){this.uploadedFile=null,this.uploadedData=null,this.columnNames=[];const e=document.getElementById("csv-upload"),t=document.getElementById("file-name"),n=document.getElementById("profilingResults");e&&(e.value=""),t&&(t.textContent="No file chosen"),n&&(n.style.display="none"),this.resetCostCalculator()}handleFileUpload(e){if(!e)return;const t=new FileReader;t.onload=n=>{const a=n.target.result,s=this.parseCSVData(a);if(s){this.uploadedData=s;const o=this.detectColumns(s);this.displayDetectedColumns(o);const l=this.performInitialAnalysis(s,o);this.displayInitialAnalysis(l,s),this.processFile(e)}},t.readAsText(e)}parseCSVData(e){const t=e.split(/\r?\n/).filter(r=>r.trim());if(t.length===0)return null;const n=r=>{const c=[];let d="",u=!1;for(let m=0;m<r.length;m++){const p=r[m],h=r[m+1];p==='"'||p==="'"?u&&p==='"'&&h==='"'?(d+='"',m++):u=!u:(p===","||p===";"||p==="	")&&!u?(c.push(d.trim()),d=""):d+=p}return c.push(d.trim()),c},a=n(t[0]),s=a.some(r=>{const c=r.replace(/['"]/g,"");return isNaN(parseFloat(c))||c.length>20||/[a-zA-Z]{2,}/.test(c)});s?this.columnNames=a.map(r=>r.replace(/['"]/g,"")||`Column${a.indexOf(r)+1}`):this.columnNames=a.map((r,c)=>`Column${c+1}`);const o=s?1:0,l=[];for(let r=o;r<Math.min(t.length,100);r++)if(t[r].trim()){const c=n(t[r]);l.push(c)}return{headers:this.columnNames,data:l,rowCount:t.length-(s?1:0)}}processFile(e){this.uploadedFile=e;const t=document.getElementById("progress-bar"),n=document.getElementById("upload-status");t&&(t.style.width="0%",t.classList.add("uploading")),n&&(n.textContent="Processing..."),this.simulateUpload();const a=e.name,s=this.formatFileSize(e.size);console.log(`Processing file: ${a} (${s})`),setTimeout(()=>{this.showProfilingResults()},2e3)}simulateUpload(){let e=0;const t=document.getElementById("progress-bar"),n=document.getElementById("upload-status"),a=document.getElementById("eta"),s=setInterval(()=>{if(e+=10,t&&(t.style.width=`${e}%`),n&&(n.textContent=`Processing... ${e}%`),a&&e<100){const o=Math.ceil((100-e)/10*.2);a.textContent=`ETA: ${o}s`}e>=100&&(clearInterval(s),t&&(t.classList.remove("uploading"),t.classList.add("complete")),n&&(n.textContent="Complete"),a&&(a.textContent=""),setTimeout(()=>{t&&(t.style.width="0%",t.classList.remove("complete")),n&&(n.textContent="")},1500))},200)}showProfilingResults(){const e=document.getElementById("profilingResults");if(e){if(e.style.display="block",this.uploadedData){document.getElementById("totalRows").textContent=this.uploadedData.rowCount.toLocaleString(),document.getElementById("totalColumns").textContent=this.columnNames.length;const t=this.calculateDataQuality();document.getElementById("qualityScore").textContent=`${t}%`;const n=document.getElementById("data-quality-score");n&&(n.textContent=`${t}%`)}else{document.getElementById("totalRows").textContent="10,000",document.getElementById("totalColumns").textContent="15",document.getElementById("qualityScore").textContent="87%";const t=document.getElementById("data-quality-score");t&&(t.textContent="87%")}this.generateColumnProfiles(),this.selectedTier&&this.calculateAccurateCostSummary()}}calculateDataQuality(){if(!this.uploadedData||!this.uploadedData.data||this.uploadedData.data.length===0)return 0;let e=0,t=0;this.uploadedData.data.forEach(a=>{a.forEach(s=>{t++,(!s||s===""||s.toLowerCase()==="null"||s.toLowerCase()==="nan")&&e++})});const n=t>0?(t-e)/t*100:0;return Math.round(n)}generateColumnProfiles(){const e=document.getElementById("columnProfiles");if(!e)return;let t;this.columnNames&&this.columnNames.length>0?t=this.columnNames.map((n,a)=>{let s=0,o=new Set,l=!0;this.uploadedData&&this.uploadedData.data&&this.uploadedData.data.forEach(d=>{const u=d[a];!u||u===""?s++:(o.add(u),isNaN(parseFloat(u))&&(l=!1))});const r=this.uploadedData?(s/this.uploadedData.data.length*100).toFixed(1):(Math.random()*5).toFixed(1),c=this.uploadedData?(o.size/this.uploadedData.data.length*100).toFixed(0):(50+Math.random()*50).toFixed(0);return{name:n,type:l?"Numeric":"String",nulls:r,unique:c}}):t=[{name:"customer_id",type:"ID",nulls:0,unique:100},{name:"name",type:"String",nulls:2.3,unique:98.5},{name:"email",type:"Email",nulls:1.5,unique:99.8},{name:"age",type:"Integer",nulls:5.2,unique:45},{name:"purchase_date",type:"Date",nulls:.8,unique:35}],e.innerHTML=`
            <h3>Column Analysis</h3>
            <div class="column-grid">
                ${t.slice(0,10).map(n=>`
                    <div class="column-card">
                        <h4>${n.name}</h4>
                        <div class="column-stats">
                            <span>Type: ${n.type}</span>
                            <span>Null: ${n.nulls}%</span>
                            <span>Unique: ${n.unique}%</span>
                        </div>
                    </div>
                `).join("")}
                ${t.length>10?`
                    <div class="column-card more-columns">
                        <p>+${t.length-10} more columns</p>
                    </div>
                `:""}
            </div>
        `}selectTier(e){this.selectedTier=e,document.querySelectorAll(".tier-card").forEach(a=>{a.dataset.tier===e?a.classList.add("selected"):a.classList.remove("selected")});const n=document.getElementById("cleaningOptions");n&&(n.style.display="block",this.loadCleaningOptions(e)),this.calculateAccurateCostSummary()}loadCleaningOptions(e){const t=document.getElementById("cleaningOptionsContent");if(!t)return;let n=[];switch(e){case"basic":n=["Remove duplicate rows","Standardize data formats","Handle missing values","Validate data types"];break;case"advanced":n=["AI-powered anomaly detection","Fuzzy matching for duplicates","Statistical outlier removal","Smart column mapping","Cross-field validation"];break;case"ai-powered":n=["GPT-4 data correction","Industry-specific ML models","Predictive quality assessment","Synthetic data generation for missing values","Context-aware data enrichment"];break}t.innerHTML=n.map(s=>`
            <div class="cleaning-option">
                <label>
                    <input type="checkbox" checked class="cleaning-option-checkbox"> ${s}
                </label>
            </div>
        `).join(""),t.querySelectorAll(".cleaning-option-checkbox").forEach(s=>{s.addEventListener("change",()=>{this.calculateAccurateCostSummary()})})}updatePrivacyLevel(e){const t=parseFloat(e.target.value),n=document.getElementById("epsilon-value"),a=document.getElementById("privacy-level");n&&(n.textContent=t.toFixed(1)),a&&(t<1?(a.textContent="Very High",a.className="level-very-high"):t<3?(a.textContent="High",a.className="level-high"):t<5?(a.textContent="Medium",a.className="level-medium"):(a.textContent="Low",a.className="level-low")),this.updatePrivacyMetrics(t)}updatePrivacyMetrics(e){const t=document.getElementById("reidentification-risk"),n=document.getElementById("attribute-risk"),a=document.getElementById("utility-score");if(t){const s=Math.min(.5,.01*e).toFixed(2);t.textContent=`Low (< ${s}%)`}if(n&&(n.textContent=e<3?"Low":"Medium"),a){const s=Math.max(85,100-e*3);a.textContent=`${s}%`}this.calculateAccurateCostSummary()}formatFileSize(e){if(e===0)return"0 Bytes";const t=1024,n=["Bytes","KB","MB","GB"],a=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,a)).toFixed(2))+" "+n[a]}startCleaning(){if(!this.uploadedFile||!this.selectedTier){alert("Please upload a file and select a cleaning tier");return}const e=document.getElementById("processingModal");e&&(e.classList.add("active"),this.simulateProcessing())}simulateProcessing(){console.log("Starting data cleaning process...");const e=this.parsedData?this.parsedData.length:1e3,t=Math.floor(e*.85),n=Math.floor(e*.05),a=Math.floor(e*2.5),s=this.selectedTier==="ai-powered"?95:this.selectedTier==="advanced"?85:75;setTimeout(()=>{this.updateCleaningMetrics(t,n,a,s)},2e3),setTimeout(()=>{const o=document.getElementById("processingModal");o&&o.classList.remove("active"),this.showNotification("Data cleaning completed successfully!","success")},5e3)}updateCostCalculator(e){if(e)if(this.uploadedFile=e,this.selectedTier)this.calculateAccurateCostSummary();else{const t=document.getElementById("total-data-size");t&&(t.textContent=this.formatFileSize(e.size))}}resetCostCalculator(){Object.entries({"total-data-size":"0 MB","total-token-cost":"0 tokens","estimated-time":"< 1 minute","quality-improvement":"+0%","data-quality-score":"0%","cleaned-rows":"0","removed-rows":"0","changed-values":"0"}).forEach(([t,n])=>{const a=document.getElementById(t);a&&(a.textContent=n)})}updateCleaningMetrics(e,t,n,a){const s={"cleaned-rows":e||0,"removed-rows":t||0,"changed-values":n||0,"data-quality-score":a?`${a}%`:"0%"};Object.entries(s).forEach(([o,l])=>{const r=document.getElementById(o);r&&(r.textContent=typeof l=="number"?l.toLocaleString():l)})}calculateAccurateCostSummary(){var S;if(!this.uploadedFile)return;const e=this.parsedData?this.parsedData.length:this.uploadedData?this.uploadedData.rowCount:1e3;this.columnNames&&this.columnNames.length;const t=this.uploadedFile.size/(1024*1024),a=this.getCheckedCleaningOptions().length,o=((S=document.getElementById("differential-privacy"))==null?void 0:S.checked)||!1?1.5:1,r={basic:1,advanced:3,"ai-powered":5}[this.selectedTier]||1,c=1+a*.1,d=e/1e6,u=Math.ceil(r*d*c*o*1e3),m=document.getElementById("total-token-cost");m&&(m.textContent=`${u.toLocaleString()} tokens`);const p=t/10,h={basic:1,advanced:1.5,"ai-powered":2}[this.selectedTier]||1,g=Math.ceil(p*h*c*o),y=document.getElementById("estimated-time");if(y)if(g<1)y.textContent="< 1 minute";else if(g<60)y.textContent=`${g} minute${g>1?"s":""}`;else{const E=Math.floor(g/60),I=g%60;y.textContent=`${E}h ${I}m`}if(this.dataAnalysis){const E=this.dataAnalysis.formatIssues+this.dataAnalysis.inconsistencies+this.dataAnalysis.missingValues,I={basic:.7,advanced:.85,"ai-powered":.95}[this.selectedTier]||.7,x=Math.min(1,I*c),M=Math.floor(e-this.dataAnalysis.duplicates),_=this.dataAnalysis.duplicates,z=Math.floor(E*x),$=this.calculateDataQuality(),D=Math.min(100,$+x*(100-$)),q=Math.round(D-$);this.updateCleaningMetrics(M,_,z,Math.round(D));const B=document.getElementById("quality-improvement");B&&(B.textContent=`+${q}%`)}const v=document.getElementById("total-data-size");v&&(v.textContent=this.formatFileSize(this.uploadedFile.size))}getCheckedCleaningOptions(){const e=document.querySelectorAll('.cleaning-option input[type="checkbox"]:checked');return Array.from(e).map(t=>t.parentElement.textContent.trim())}detectColumns(e){return!e||e.length===0?[]:Object.keys(e[0]).map(a=>{const s=e.slice(0,Math.min(100,e.length)).map(r=>r[a]),o=this.detectDataType(s),l=s.filter(r=>!r||r===""||r==="null"||r==="NULL").length;return{name:a,type:o,nullCount:l,totalRows:e.length,sampleValues:s.filter(r=>r&&r!=="").slice(0,5)}})}detectDataType(e){const t=e.filter(o=>o&&o!==""&&o!=="null"&&o!=="NULL");if(t.length===0)return"Unknown";const n=["true","false","1","0","yes","no","y","n"];if(t.every(o=>n.includes(String(o).toLowerCase())))return"Boolean";const a=[/^\d{4}-\d{2}-\d{2}$/,/^\d{2}\/\d{2}\/\d{4}$/,/^\d{2}-\d{2}-\d{4}$/];if(t.every(o=>{const l=String(o);return a.some(r=>r.test(l))||!isNaN(Date.parse(l))}))return"Date";if(t.every(o=>!isNaN(o)&&!isNaN(parseFloat(o))))return t.every(o=>Number.isInteger(Number(o)))?"Integer":"Float";const s=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;return t.filter(o=>s.test(String(o))).length>t.length*.8?"Email":"String"}displayDetectedColumns(e){const t=document.getElementById("detected-columns-content"),n=document.getElementById("detectedColumns");if(!t||!e||e.length===0)return;n.style.display="block";let a=`
            <div class="template-mapping">
                <div class="mapping-header">
                    <h4>Detected ${e.length} columns from your file:</h4>
                </div>
        `;e.forEach(s=>{const o=(s.nullCount/s.totalRows*100).toFixed(1),l=s.nullCount>0?`${s.nullCount} missing values (${o}%)`:"No missing values";a+=`
                <div class="mapping-row">
                    <div class="csv-column-select">
                        <span class="column-name">${s.name}</span>
                    </div>
                    <span class="arrow">→</span>
                    <div class="required-field">
                        <span class="field-type">${s.type}</span>
                        <span>${l}</span>
                    </div>
                </div>
            `}),a+="</div>",t.innerHTML=a}performInitialAnalysis(e,t){const n={formatIssues:0,inconsistencies:0,missingValues:0,duplicates:0,details:[]};t.forEach(o=>{if(n.missingValues+=o.nullCount,o.nullCount>0){const l=(o.nullCount/o.totalRows*100).toFixed(1);n.details.push({type:"missing",column:o.name,message:`${o.nullCount} missing values (${l}%)`,severity:o.nullCount>o.totalRows*.3?"error":"warning"})}});const a=new Set;let s=0;return e.forEach(o=>{const l=JSON.stringify(o);a.has(l)&&s++,a.add(l)}),n.duplicates=s,s>0&&n.details.push({type:"duplicates",column:"All columns",message:`${s} duplicate rows found`,severity:"info"}),t.forEach(o=>{const l=e.map(c=>c[o.name]).filter(c=>c&&c!=="");if(l.length===0)return;const r=new Set;if(l.forEach(c=>{!isNaN(c)&&!isNaN(parseFloat(c))?r.add("number"):isNaN(Date.parse(c))?r.add("string"):r.add("date")}),r.size>1&&(n.inconsistencies++,n.details.push({type:"inconsistency",column:o.name,message:"Mixed data types detected",severity:"warning"})),o.type==="Date"){const c=l.filter(d=>isNaN(Date.parse(d)));c.length>0&&(n.formatIssues+=c.length,n.details.push({type:"format",column:o.name,message:`${c.length} invalid date formats`,severity:"error"}))}else if(o.type==="Email"){const c=/^[^\s@]+@[^\s@]+\.[^\s@]+$/,d=l.filter(u=>!c.test(String(u)));d.length>0&&(n.formatIssues+=d.length,n.details.push({type:"format",column:o.name,message:`${d.length} invalid email formats`,severity:"error"}))}}),n}displayInitialAnalysis(e,t){const n=document.getElementById("initialAnalysis");if(n&&(this.dataAnalysis=e,n.style.display="block",document.getElementById("format-issues").textContent=e.formatIssues.toLocaleString(),document.getElementById("inconsistencies").textContent=e.inconsistencies.toLocaleString(),document.getElementById("missing-values").textContent=e.missingValues.toLocaleString(),document.getElementById("duplicates").textContent=e.duplicates.toLocaleString(),this.calculateAccurateCostSummary(),e.details.length>0)){const a=document.getElementById("issueDetails"),s=a.querySelector(".issues-list");if(s){let o="";e.details.forEach(l=>{const r=l.severity==="error"?"exclamation-triangle":l.severity==="warning"?"exclamation-circle":"info-circle";o+=`
                        <div class="issue-item">
                            <i class="fas fa-${r}"></i>
                            <strong>${l.column}:</strong> ${l.message}
                        </div>
                    `}),s.innerHTML=o,a.style.display="block"}}}showNotification(e,t="info"){const n=document.createElement("div");n.className=`notification ${t} show`,n.innerHTML=`
            <i class="fas fa-${t==="success"?"check-circle":"info-circle"}"></i>
            <span>${e}</span>
        `,document.body.appendChild(n),setTimeout(()=>{n.classList.remove("show"),setTimeout(()=>n.remove(),300)},3e3)}loadInitialContent(){console.log("Data Cleaning Page initialized")}};window.DataCleaningPage=ie;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{window.dataCleaningPage||(window.dataCleaningPage=new ie)}):window.dataCleaningPage||(window.dataCleaningPage=new ie);class w{constructor(e,t={}){this.container=e,this.options={id:t.id||"dropdown-"+Date.now(),label:t.label||"",placeholder:t.placeholder||"Select an option",helperText:t.helperText||"",options:t.options||[],value:t.value||null,onChange:t.onChange||(()=>{}),disabled:t.disabled||!1,loading:t.loading||!1,searchable:t.searchable||!1},this.selectedOption=null,this.isOpen=!1,this.focusedIndex=-1,this.init()}init(){this.render(),this.attachEventListeners(),this.options.value&&this.setValue(this.options.value)}render(){const e=`
            <div class="styled-dropdown-container">
                ${this.options.label?`<label class="dropdown-label" id="dropdown-label-${this.options.id}">${this.options.label}</label>`:""}
                <div class="dropdown-wrapper">
                    <div class="dropdown-trigger ${this.options.disabled?"disabled":""} ${this.options.loading?"loading":""}" 
                         tabindex="${this.options.disabled?-1:0}" 
                         role="button" 
                         aria-haspopup="listbox" 
                         aria-expanded="false" 
                         aria-labelledby="dropdown-label-${this.options.id}"
                         data-placeholder="true">
                        <div class="selected-option">
                            <i class="option-icon fas"></i>
                            <span class="option-text">${this.options.placeholder}</span>
                        </div>
                        <i class="fas fa-chevron-down dropdown-arrow"></i>
                    </div>
                    <div class="dropdown-menu" role="listbox" aria-labelledby="dropdown-label-${this.options.id}">
                        ${this.renderOptions()}
                    </div>
                </div>
                ${this.options.helperText?`<small class="dropdown-helper-text">${this.options.helperText}</small>`:""}
            </div>
        `;this.container.innerHTML=e,this.trigger=this.container.querySelector(".dropdown-trigger"),this.menu=this.container.querySelector(".dropdown-menu"),this.selectedText=this.container.querySelector(".option-text"),this.selectedIcon=this.container.querySelector(".option-icon")}renderOptions(){return this.options.options.map((e,t)=>`
            <div class="dropdown-option" 
                 role="option" 
                 tabindex="-1" 
                 data-value="${e.value}"
                 data-index="${t}">
                ${e.icon?`<i class="dropdown-option-icon ${e.icon}"></i>`:""}
                <div class="dropdown-option-content">
                    <div class="dropdown-option-title">${e.title}</div>
                    ${e.description?`<div class="dropdown-option-description">${e.description}</div>`:""}
                </div>
                ${e.badge?`<span class="dropdown-option-badge">${e.badge}</span>`:""}
            </div>
        `).join("")}attachEventListeners(){this.trigger.addEventListener("click",()=>this.toggle()),this.trigger.addEventListener("keydown",e=>this.handleTriggerKeydown(e)),this.menu.addEventListener("click",e=>{const t=e.target.closest(".dropdown-option");if(t){const n=t.dataset.value;this.selectOption(n)}}),document.addEventListener("click",e=>{this.container.contains(e.target)||this.close()}),this.menu.addEventListener("keydown",e=>this.handleMenuKeydown(e))}handleTriggerKeydown(e){switch(e.key){case"Enter":case" ":e.preventDefault(),this.toggle();break;case"ArrowDown":e.preventDefault(),this.open(),this.focusOption(0);break;case"ArrowUp":e.preventDefault(),this.open(),this.focusOption(this.options.options.length-1);break;case"Escape":this.close();break}}handleMenuKeydown(e){switch(e.key){case"ArrowDown":e.preventDefault(),this.focusOption(this.focusedIndex+1);break;case"ArrowUp":e.preventDefault(),this.focusOption(this.focusedIndex-1);break;case"Enter":case" ":if(e.preventDefault(),this.focusedIndex>=0){const t=this.options.options[this.focusedIndex];this.selectOption(t.value)}break;case"Escape":this.close(),this.trigger.focus();break;case"Tab":this.close();break}}focusOption(e){const t=this.menu.querySelectorAll(".dropdown-option");e<0&&(e=t.length-1),e>=t.length&&(e=0),this.focusedIndex=e,t[e].focus()}toggle(){this.options.disabled||this.options.loading||(this.isOpen?this.close():this.open())}open(){if(!(this.options.disabled||this.options.loading))if(this.isOpen=!0,this.trigger.classList.add("active"),this.trigger.setAttribute("aria-expanded","true"),this.menu.classList.add("active"),this.selectedOption){const e=this.options.options.findIndex(t=>t.value===this.selectedOption.value);this.focusOption(e)}else this.focusOption(0)}close(){this.isOpen=!1,this.trigger.classList.remove("active"),this.trigger.setAttribute("aria-expanded","false"),this.menu.classList.remove("active"),this.focusedIndex=-1}selectOption(e){const t=this.options.options.find(n=>n.value===e);t&&(this.selectedOption=t,this.updateDisplay(),this.close(),this.trigger.focus(),this.options.onChange(e,t))}updateDisplay(){this.selectedOption&&(this.selectedText.textContent=this.selectedOption.title,this.trigger.removeAttribute("data-placeholder"),this.selectedOption.icon?(this.selectedIcon.className=`option-icon ${this.selectedOption.icon}`,this.selectedIcon.style.display="block"):this.selectedIcon.style.display="none",this.menu.querySelectorAll(".dropdown-option").forEach(e=>{e.dataset.value===this.selectedOption.value?(e.classList.add("selected"),e.setAttribute("aria-selected","true")):(e.classList.remove("selected"),e.setAttribute("aria-selected","false"))}))}setValue(e){this.selectOption(e)}getValue(){return this.selectedOption?this.selectedOption.value:null}setOptions(e){this.options.options=e,this.menu.innerHTML=this.renderOptions(),this.selectedOption&&(e.find(n=>n.value===this.selectedOption.value)?this.updateDisplay():this.reset())}setLoading(e){this.options.loading=e,e?(this.trigger.classList.add("loading"),this.trigger.setAttribute("tabindex","-1")):(this.trigger.classList.remove("loading"),this.trigger.setAttribute("tabindex","0"))}setDisabled(e){this.options.disabled=e,e?(this.trigger.classList.add("disabled"),this.trigger.setAttribute("tabindex","-1"),this.close()):(this.trigger.classList.remove("disabled"),this.trigger.setAttribute("tabindex","0"))}reset(){this.selectedOption=null,this.selectedText.textContent=this.options.placeholder,this.trigger.setAttribute("data-placeholder","true"),this.selectedIcon.style.display="none",this.menu.querySelectorAll(".dropdown-option").forEach(e=>{e.classList.remove("selected"),e.setAttribute("aria-selected","false")})}destroy(){this.container.innerHTML=""}}class oe{constructor(){this.rules=[],this.filteredRules=[],this.filters={status:"",trigger:"",sort:"created_desc"},this.searchTerm="",this.statusDropdown=null,this.triggerDropdown=null,this.sortDropdown=null,this.init()}init(){this.loadDropdownStyles(),this.initializeSearchBar(),this.initializeFilters(),this.loadRules(),this.updateStats()}loadDropdownStyles(){if(!document.querySelector('link[href*="StyledDropdown.css"]')){const t=document.createElement("link");t.rel="stylesheet",t.href="/src/components/StyledDropdown/StyledDropdown.css",document.head.appendChild(t)}}initializeSearchBar(){const e=document.getElementById("rules-search-input"),t=document.getElementById("rules-search-button");e&&(e.addEventListener("input",n=>{this.searchTerm=n.target.value,this.handleSearch(this.searchTerm)}),e.addEventListener("keypress",n=>{n.key==="Enter"&&this.handleSearch(this.searchTerm)})),t&&t.addEventListener("click",()=>{this.handleSearch(this.searchTerm)})}initializeFilters(){console.log("Initializing RulesListPage filters...");const e=document.getElementById("status-filter-container");console.log("Status container found:",!!e),e&&(this.statusDropdown=new w(e,{id:"status-filter",placeholder:"All Status",options:[{value:"",title:"All Status",icon:"fas fa-list"},{value:"active",title:"Active",icon:"fas fa-check-circle"},{value:"inactive",title:"Inactive",icon:"fas fa-times-circle"}],value:"",onChange:a=>{this.filters.status=a,this.applyFilters()}}));const t=document.getElementById("trigger-filter-container");t&&(this.triggerDropdown=new w(t,{id:"trigger-filter",placeholder:"All Triggers",options:[{value:"",title:"All Triggers",icon:"fas fa-bolt"},{value:"manual",title:"Manual",icon:"fas fa-hand-pointer"},{value:"schedule",title:"Scheduled",icon:"fas fa-clock"},{value:"event",title:"Event-based",icon:"fas fa-calendar-check"},{value:"model_complete",title:"Model Completion",icon:"fas fa-robot"},{value:"webhook",title:"Webhook",icon:"fas fa-link"}],value:"",onChange:a=>{this.filters.trigger=a,this.applyFilters()}}));const n=document.getElementById("sort-filter-container");n&&(this.sortDropdown=new w(n,{id:"sort-filter",placeholder:"Newest First",options:[{value:"created_desc",title:"Newest First",icon:"fas fa-sort-amount-down"},{value:"created_asc",title:"Oldest First",icon:"fas fa-sort-amount-up"},{value:"name_asc",title:"Name (A-Z)",icon:"fas fa-sort-alpha-down"},{value:"name_desc",title:"Name (Z-A)",icon:"fas fa-sort-alpha-up"},{value:"executions",title:"Most Executed",icon:"fas fa-fire"}],value:"created_desc",onChange:a=>{this.filters.sort=a,this.applyFilters()}}))}loadRules(){this.rules=this.generateMockRules(),this.filteredRules=[...this.rules],this.renderRules()}generateMockRules(){return[{id:1,name:"Data Quality Check",description:"Validates incoming data against quality thresholds",status:"active",trigger:"schedule",schedule:"Every 6 hours",executions:1542,successRate:98.5,lastRun:"2 hours ago"},{id:2,name:"Customer Segmentation",description:"Automatically segments customers based on behavior patterns",status:"active",trigger:"event",event:"New customer signup",executions:3287,successRate:99.2,lastRun:"5 minutes ago"},{id:3,name:"Fraud Detection Alert",description:"Monitors transactions for suspicious patterns",status:"active",trigger:"real-time",executions:8921,successRate:97.8,lastRun:"1 minute ago"},{id:4,name:"Weekly Report Generation",description:"Generates and distributes weekly performance reports",status:"inactive",trigger:"schedule",schedule:"Every Monday at 9 AM",executions:52,successRate:100,lastRun:"3 days ago"},{id:5,name:"Model Retraining Pipeline",description:"Automatically retrains ML models when performance drops",status:"active",trigger:"model_complete",threshold:"Accuracy < 95%",executions:28,successRate:96.4,lastRun:"1 week ago"}]}handleSearch(e){if(!e)this.filteredRules=[...this.rules];else{const t=e.toLowerCase();this.filteredRules=this.rules.filter(n=>n.name.toLowerCase().includes(t)||n.description.toLowerCase().includes(t)||n.trigger.toLowerCase().includes(t))}this.applyFilters()}clearSearch(){this.filteredRules=[...this.rules],this.applyFilters()}applyFilters(){let e=[...this.filteredRules];this.filters.status&&(e=e.filter(t=>t.status===this.filters.status)),this.filters.trigger&&(e=e.filter(t=>t.trigger===this.filters.trigger)),e=this.sortRules(e,this.filters.sort),this.renderRules(e),this.updateStats(e)}sortRules(e,t){const n=[...e];switch(t){case"created_desc":return n.reverse();case"created_asc":return n;case"name_asc":return n.sort((a,s)=>a.name.localeCompare(s.name));case"name_desc":return n.sort((a,s)=>s.name.localeCompare(a.name));case"executions":return n.sort((a,s)=>s.executions-a.executions);default:return n}}renderRules(e=this.filteredRules){const t=document.getElementById("rules-grid"),n=document.getElementById("empty-state");if(!t)return;if(e.length===0){t.innerHTML="",n&&(n.style.display="block");return}n&&(n.style.display="none"),t.innerHTML=e.map(s=>`
            <div class="rule-card" data-rule-id="${s.id}">
                <div class="rule-header">
                    <h3 class="rule-title">${s.name}</h3>
                    <span class="rule-status ${s.status}">${s.status}</span>
                </div>
                <p class="rule-description">${s.description}</p>
                <div class="rule-meta">
                    <div class="meta-item">
                        <i class="fas fa-${this.getTriggerIcon(s.trigger)}"></i>
                        <span>${this.getTriggerLabel(s)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${s.lastRun}</span>
                    </div>
                </div>
                <div class="rule-stats">
                    <div class="stat-item">
                        <div class="stat-item-value">${s.executions.toLocaleString()}</div>
                        <div class="stat-item-label">Executions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-value">${s.successRate}%</div>
                        <div class="stat-item-label">Success Rate</div>
                    </div>
                </div>
                <div class="rule-actions">
                    <button class="secondary-button" onclick="rulesListPage.editRule(${s.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="secondary-button" onclick="rulesListPage.viewHistory(${s.id})">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button class="auth-button" onclick="rulesListPage.runRule(${s.id})">
                        <i class="fas fa-play"></i> Run Now
                    </button>
                </div>
            </div>
        `).join(""),t.querySelectorAll(".rule-card").forEach(s=>{s.addEventListener("click",o=>{if(!o.target.closest("button")){const l=s.dataset.ruleId;this.viewRuleDetails(l)}})})}getTriggerIcon(e){return{schedule:"calendar-alt",event:"bolt",manual:"hand-pointer",model_complete:"check-circle",webhook:"link","real-time":"sync"}[e]||"cog"}getTriggerLabel(e){switch(e.trigger){case"schedule":return e.schedule||"Scheduled";case"event":return e.event||"Event-based";case"model_complete":return e.threshold||"Model trigger";default:return e.trigger.replace("_"," ").charAt(0).toUpperCase()+e.trigger.slice(1).replace("_"," ")}}updateStats(e=this.filteredRules){const t=document.getElementById("total-rules");t&&(t.textContent=this.rules.length);const n=document.getElementById("active-rules");if(n){const o=this.rules.filter(l=>l.status==="active").length;n.textContent=o}const a=document.getElementById("total-executions");if(a){const o=this.rules.reduce((l,r)=>l+r.executions,0);a.textContent=o.toLocaleString()}const s=document.getElementById("success-rate");if(s){const o=this.rules.reduce((l,r)=>l+r.successRate,0)/this.rules.length;s.textContent=`${o.toFixed(1)}%`}}viewRuleDetails(e){console.log("Viewing details for rule:",e),window.location.hash=`#rule-details/${e}`}editRule(e){console.log("Editing rule:",e),window.location.hash=`#rules-engine/${e}`}viewHistory(e){console.log("Viewing history for rule:",e),this.showHistoryModal(e)}runRule(e){const t=this.rules.find(n=>n.id===parseInt(e));t&&(console.log("Running rule:",t.name),this.showNotification(`Rule "${t.name}" is now running...`,"info"),setTimeout(()=>{this.showNotification(`Rule "${t.name}" completed successfully!`,"success"),t.lastRun="Just now",t.executions++,this.renderRules()},2e3))}showHistoryModal(e){const t=this.rules.find(a=>a.id===parseInt(e));if(!t)return;const n=document.createElement("div");n.className="modal active",n.innerHTML=`
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Execution History - ${t.name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="history-list">
                        ${this.generateHistoryItems(t)}
                    </div>
                </div>
            </div>
        `,document.body.appendChild(n)}generateHistoryItems(e){const t=[],n=["success","success","success","failed","success"];for(let a=0;a<10;a++){const s=n[a%n.length],o=new Date;o.setHours(o.getHours()-a*3),t.push(`
                <div class="history-item">
                    <div class="history-status ${s}">
                        <i class="fas fa-${s==="success"?"check":"times"}"></i>
                    </div>
                    <div class="history-details">
                        <div class="history-time">${o.toLocaleString()}</div>
                        <div class="history-info">
                            ${s==="success"?"Completed successfully":"Failed with errors"}
                            - Duration: ${Math.floor(Math.random()*60)+10}s
                        </div>
                    </div>
                </div>
            `)}return t.join("")}showNotification(e,t="info"){const n=document.createElement("div");n.className=`notification ${t} show`,n.innerHTML=`
            <i class="fas fa-${this.getNotificationIcon(t)}"></i>
            <span>${e}</span>
        `,document.body.appendChild(n),setTimeout(()=>{n.classList.remove("show"),setTimeout(()=>n.remove(),300)},3e3)}getNotificationIcon(e){return{success:"check-circle",error:"exclamation-circle",warning:"exclamation-triangle",info:"info-circle"}[e]||"info-circle"}}window.RulesListPage=oe;window.initializeRulesListPage=function(){setTimeout(()=>{window.rulesListPage?window.rulesListPage=new oe:window.rulesListPage=new oe},100)};async function L(i,e){try{const t=i.includes("/")?`/src/components/${i}.html`:`/src/components/${i}/${i}.html`,n=await fetch(t);if(!n.ok)throw new Error(`HTTP error! status: ${n.status}`);const a=await n.text();document.querySelector(e).innerHTML=a}catch(t){console.error(`Failed to load ${i} component:`,t)}}function k(i){let e=i;if(!i.startsWith("/")&&!i.startsWith("src/")?e=`/src/components/${i}.css`:i.startsWith("/")||(e=`/${i}`),!document.querySelector(`link[href="${e}"]`)){const t=document.createElement("link");t.rel="stylesheet",t.href=e,document.head.appendChild(t)}}async function Q(i,e={}){try{console.log(`API Request: ${e.method||"GET"} ${i}`),e.body&&console.log("Request body:",e.body);const t=await fetch(i,e),n=t.headers.get("content-type"),a=n&&n.includes("application/json");if(!t.ok){let s=null,o=`HTTP error! status: ${t.status}`;if(a)try{s=await t.json(),o=(s==null?void 0:s.detail)||(s==null?void 0:s.message)||o}catch{}if(console.error(`API Error (${t.status}):`,o),t.status===401){if(i.includes("/api/login"))throw new Error(o);const l=localStorage.getItem("loginTime"),r=Date.now();throw(l?r-parseInt(l):1/0)<5e3?(console.warn("401 error shortly after login, might be a timing issue"),new Error("Authentication error - please try again")):(localStorage.removeItem("token"),localStorage.removeItem("user"),localStorage.removeItem("loginTime"),window.location.hash="#login",new Error("Authentication failed. Please login again."))}if(t.status===500&&!i.includes("/api/login")&&o&&(o.includes("401")||o.includes("credentials")))throw console.warn("500 error appears to be auth-related, redirecting to login"),localStorage.removeItem("token"),localStorage.removeItem("user"),localStorage.removeItem("loginTime"),window.location.hash="#login",new Error("Session expired. Please login again.");if(t.status===422)return console.warn(`API returned 422 for ${i} - returning empty result`),a?[]:null;throw new Error(o)}return a?await t.json():await t.text()}catch(t){throw console.error(`Failed to fetch data from ${i}:`,t),t}}async function f(i,e={}){const t=localStorage.getItem("token");if(!t)return console.error("No token found, redirecting to login."),null;const n={...e.headers,Authorization:`Bearer ${t}`};return Q(i,{...e,headers:n})}function lt(){const i=document.getElementById("sign-in-form"),e=document.getElementById("sign-up-form"),t=document.querySelector('.auth-tab[data-tab="sign-in"]'),n=document.querySelector('.auth-tab[data-tab="sign-up"]');i&&e&&(i.classList.add("active-form"),e.classList.remove("active-form")),t&&n&&(t.addEventListener("click",()=>{t.classList.add("active"),n.classList.remove("active"),i.classList.add("active-form"),e.classList.remove("active-form"),i.style.display="block",e.style.display="none"}),n.addEventListener("click",()=>{n.classList.add("active"),t.classList.remove("active"),e.classList.add("active-form"),i.classList.remove("active-form"),e.style.display="block",i.style.display="none"})),document.querySelectorAll(".password-toggle").forEach(a=>{a.addEventListener("click",()=>{const o=a.closest(".password-input-wrapper").querySelector('input[type="password"], input[type="text"]'),l=a.querySelector("i");o.type==="password"?(o.type="text",l.classList.remove("fa-eye"),l.classList.add("fa-eye-slash")):(o.type="password",l.classList.remove("fa-eye-slash"),l.classList.add("fa-eye"))})}),i&&i.addEventListener("submit",async a=>{a.preventDefault();const s=i.querySelector("#email").value.trim(),o=i.querySelector("#password").value.trim();if(!s||!o){alert("Please enter both email and password");return}console.log("Login attempt with email:",s),console.log("Password length:",o.length);const l=new URLSearchParams;l.append("username",s),l.append("password",o),console.log("Sending login request with form data:",l.toString());const r=await Q("/api/login",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:l});if(r&&r.error)alert(`Login failed: ${r.message}`);else if(r&&r.access_token){localStorage.setItem("token",r.access_token);const c={email:s,token_balance:0};localStorage.setItem("user",JSON.stringify(c)),localStorage.setItem("loginTime",Date.now().toString());try{const d=await fetchAuthenticatedData("/api/tokens/balance");d&&d.current_balance!==void 0&&(c.token_balance=d.current_balance,localStorage.setItem("user",JSON.stringify(c)))}catch(d){console.error("Failed to fetch initial token balance:",d)}R("DashboardPage")}else alert("Login failed! Please check your credentials.")}),e&&e.addEventListener("submit",async a=>{a.preventDefault();const s=e.querySelector("#full-name").value,o=e.querySelector("#signup-email").value,l=e.querySelector("#phone-number").value,r=e.querySelector("#signup-password").value;if(await Q("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:s,email:o,phone_number:l,password:r})})){const d=new URLSearchParams;d.append("username",o),d.append("password",r);const u=await Q("/api/login",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:d});if(u&&u.access_token){localStorage.setItem("token",u.access_token);const m={email:o,full_name:s,token_balance:1e3};localStorage.setItem("user",JSON.stringify(m)),localStorage.setItem("loginTime",Date.now().toString());try{const p=await fetchAuthenticatedData("/api/tokens/balance");p&&p.current_balance!==void 0&&(m.token_balance=p.current_balance,localStorage.setItem("user",JSON.stringify(m)))}catch(p){console.error("Failed to fetch initial token balance:",p)}R("DashboardPage")}else alert("Registration succeeded, but login failed."),R("AuthPage")}else alert("Registration failed!")})}let le=null,re=null,ce="all",de="30",ue=[];async function rt(){const i=await f("/api/tokens/usage");i?(ue=i,Y(),ct()):(ue=[],Y())}function ct(){const i=document.getElementById("filter-dropdown-container"),e=document.getElementById("time-dropdown-container");i&&!le&&(k("src/components/StyledDropdown/StyledDropdown.css"),le=new w(i,{id:"token-filter",placeholder:"All Transactions",options:[{value:"all",title:"All Transactions",icon:"fas fa-list"},{value:"generation",title:"Data Generation",icon:"fas fa-database"},{value:"training",title:"Model Training",icon:"fas fa-brain"},{value:"prediction",title:"Predictions",icon:"fas fa-chart-line"},{value:"purchase",title:"Purchases",icon:"fas fa-plus-circle"},{value:"bonus",title:"Bonuses",icon:"fas fa-gift"}],value:"all",onChange:t=>{ce=t,Y()}})),e&&!re&&(re=new w(e,{id:"time-filter",placeholder:"Last 30 days",options:[{value:"7",title:"Last 7 days",icon:"fas fa-calendar-week"},{value:"30",title:"Last 30 days",icon:"fas fa-calendar-alt"},{value:"90",title:"Last 90 days",icon:"fas fa-calendar"},{value:"all",title:"All time",icon:"fas fa-infinity"}],value:"30",onChange:t=>{de=t,Y()}}))}function Y(){let i=[...ue];if(ce!=="all"&&(i=i.filter(e=>{var n;const t=((n=e.reason)==null?void 0:n.toLowerCase())||"";switch(ce){case"generation":return t.includes("generat");case"training":return t.includes("train")||t.includes("model");case"prediction":return t.includes("predict");case"purchase":return e.change>0&&t.includes("purchase");case"bonus":return e.change>0&&(t.includes("bonus")||t.includes("reward"));default:return!0}})),de!=="all"){const e=parseInt(de),t=new Date;t.setDate(t.getDate()-e),i=i.filter(n=>new Date(n.created_at)>=t)}dt(i)}function dt(i){let e=i.reduce((s,o)=>s+(o.change||0),0);const t=document.querySelector(".balance-items"),n=document.querySelector(".balance-amount"),a=document.querySelector(".price-breakdown");t&&(t.innerHTML="",i.length===0?t.innerHTML='<div class="empty-state">No transactions found for the selected filters</div>':i.forEach(s=>{const o=document.createElement("div");o.classList.add("balance-item","card");const l=s.change>0,r=ut(s.reason),c=new Date(s.created_at).toLocaleDateString();o.innerHTML=`
                    <div class="item-details">
                        <div class="item-header">
                            <i class="${r} item-icon"></i>
                            <span class="item-name">${s.reason}</span>
                        </div>
                        <span class="item-date">${c}</span>
                    </div>
                    <div class="item-amount ${l?"positive":"negative"}">
                        ${l?"+":""}${De(s.change)}
                    </div>
                `,t.appendChild(o)})),n&&(n.textContent=De(e)),a&&(a.innerHTML=`
            <p>Base Price: <span>$${e.toFixed(2)}</span></p>
            <p>Taxes: <span>$0.00</span></p>
            <p class="total">Total: <span>$${e.toFixed(2)}</span></p>
        `)}function ut(i){const e=(i==null?void 0:i.toLowerCase())||"";return e.includes("generat")?"fas fa-database":e.includes("train")||e.includes("model")?"fas fa-brain":e.includes("predict")?"fas fa-chart-line":e.includes("purchase")?"fas fa-shopping-cart":e.includes("bonus")||e.includes("reward")?"fas fa-gift":"fas fa-coins"}function De(i){const e=Math.abs(i);return e===0?"0":e>9999?`${Math.floor(e/1e3)}k`:e.toString()}async function mt(){const i=await f("/api/models/me");if(i){const e=document.querySelector(".model-performance-card .performance-list");e.innerHTML="",i.forEach(t=>{const n=t.performance&&t.performance.accuracy?t.performance.accuracy*100:0,a=document.createElement("div");a.classList.add("performance-item"),t.type==="rules_engine"?a.innerHTML=`
                    <span class="model-name">${t.name} <span style="font-size: 0.75em; color: #666;">[Rules Engine]</span></span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 100%; background-color: #4CAF50;"></div>
                    </div>
                    <span class="percentage">Active</span>
                `:a.innerHTML=`
                    <span class="model-name">${t.name}</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${n}%;"></div>
                    </div>
                    <span class="percentage">${n.toFixed(0)}%</span>
                `,e.appendChild(a)})}}async function pt(){const i=await f("/api/notifications/");if(i){const e=document.querySelector(".notifications-alerts-card .alerts-list");e.innerHTML="",i.forEach(t=>{const n=document.createElement("div");n.classList.add("alert-item"),n.innerHTML=`
                <div class="alert-dot"></div>
                <div class="alert-content">
                    <span class="alert-title">${t.title}</span>
                    <span class="alert-description">${t.message}</span>
                </div>
                <span class="alert-time">${new Date(t.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
            `,e.appendChild(n)})}}async function ht(){if(document.getElementById("tokenUsageTrackerContainer"))if(await L("TokenUsageTracker","#tokenUsageTrackerContainer"),k("src/components/TokenUsageTracker/TokenUsageTracker.css"),window.TokenUsageTracker)window.tokenUsageTracker?window.tokenUsageTracker.destroy():window.tokenUsageTracker=new TokenUsageTracker,await window.tokenUsageTracker.initialize("tokenUsageTrackerContainer");else{const e=document.createElement("script");e.src="src/components/TokenUsageTracker/TokenUsageTracker.js",e.onload=async()=>{window.tokenUsageTracker||(window.tokenUsageTracker=new TokenUsageTracker),await window.tokenUsageTracker.initialize("tokenUsageTrackerContainer")},document.body.appendChild(e)}}async function Le(){const i=await f("/api/models/me");if(i){const e=document.querySelector(".all-models-tab-content .model-list");e.innerHTML="",i.forEach(n=>{const a=document.createElement("div");a.classList.add("model-card","card"),a.dataset.modelId=n.id,a.innerHTML=`
                <div class="model-header">
                    <span class="model-name">${n.name}</span>
                    <button class="remove-model-button" style="display: none;"><i class="fas fa-times"></i></button>
                </div>
                <div class="model-details">
                    <p>Description: <span class="detail-value">${n.description}</span></p>
                    <p>Type: <span class="detail-value">${n.type}</span></p>
                    <p>Visibility: <span class="detail-value">${n.visibility}</span></p>
                    <p>Status: <span class="detail-value">${n.status}</span></p>
                </div>
            `,e.appendChild(a)});const t=document.querySelector('.tab-item[data-tab="my-models"]');t&&t.classList.contains("active")&&document.querySelectorAll(".remove-model-button").forEach(n=>{n.style.display="block"}),document.querySelectorAll(".remove-model-button").forEach(n=>{n.addEventListener("click",async a=>{a.stopPropagation();const s=a.target.closest(".model-card"),o=s.dataset.modelId;confirm("Are you sure you want to remove this model?")&&(await f(`/api/models/${o}`,{method:"DELETE"})?s.remove():alert("Failed to remove model."))})})}}async function Ne(){var t;const i=document.querySelector(".in-progress-tab-content .model-list");if(!i)return;i.innerHTML="";const e=localStorage.getItem("activeGeneration");if(e){const n=JSON.parse(e),a=Math.floor((Date.now()-n.startTime)/1e3),s=document.createElement("div");s.classList.add("model-card","card"),s.innerHTML=`
            <div class="model-header">
                <h3><i class="fas fa-database"></i> Data Generation</h3>
                <span class="job-type-badge generation">Generation</span>
            </div>
            <div class="model-details">
                <p>Job ID: <span class="detail-value">#${n.id}</span></p>
                <p>Status: <span class="detail-value status-active">${n.currentStage||n.status}</span></p>
                <p>Rows Generated: <span class="detail-value">${n.rows||0} / ${((t=n.settings)==null?void 0:t.rows)||1e3}</span></p>
                <p>Time Elapsed: <span class="detail-value">${gt(a)}</span></p>
            </div>
            <div class="progress-section">
                <span class="progress-label">Progress:</span>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${n.progress||0}%;">${Math.round(n.progress||0)}%</div>
                </div>
            </div>
            <div class="model-actions">
                <button class="view-button" onclick="window.location.href='/data-generator'">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="cancel-button" onclick="cancelGeneration('${n.id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        `,i.appendChild(s)}try{const n=await f("/api/models/in-progress");n&&n.length>0&&n.forEach(a=>{const s=document.createElement("div");s.classList.add("model-card","card"),s.innerHTML=`
                <div class="model-header">
                    <h3><i class="fas fa-brain"></i> ${a.name}</h3>
                    <span class="job-type-badge training">Training</span>
                </div>
                <div class="model-details">
                    <p>Model Type: <span class="detail-value">${a.type||"Neural Network"}</span></p>
                    <p>Status: <span class="detail-value">${a.status}</span></p>
                    <p>Time Elapsed: <span class="detail-value">${a.elapsed||"N/A"}</span></p>
                    <p>Token Cost: <span class="detail-value">${a.tokenCost||"N/A"}</span></p>
                </div>
                <div class="progress-section">
                    <span class="progress-label">Training Progress:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${a.progress||50}%;">${a.progress||50}%</div>
                    </div>
                </div>
                <div class="model-actions">
                    <button class="pause-button">
                        <i class="fas fa-pause"></i> Pause
                    </button>
                    <button class="cancel-button">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            `,i.appendChild(s)})}catch(n){console.warn("Failed to load in-progress models:",n)}i.children.length===0&&(i.innerHTML=`
            <div class="empty-state">
                <i class="fas fa-tasks fa-3x"></i>
                <h3>No Active Jobs</h3>
                <p>Your data generation and model training jobs will appear here when in progress.</p>
                <div class="empty-actions">
                    <button class="auth-button" onclick="window.location.href='/data-generator'">
                        <i class="fas fa-database"></i> Generate Data
                    </button>
                    <button class="auth-button" onclick="window.location.href='/model-editor'">
                        <i class="fas fa-brain"></i> Train Model
                    </button>
                </div>
            </div>
        `)}function gt(i){const e=Math.floor(i/3600),t=Math.floor(i%3600/60),n=i%60;return e>0?`${e}h ${t}m`:t>0?`${t}m ${n}s`:`${n}s`}window.cancelGeneration=function(i){confirm("Are you sure you want to cancel this generation job?")&&(localStorage.removeItem("activeGeneration"),Ne())};async function ft(){try{const i=await f("/api/models/active");if(i&&i.length>0){const e=document.querySelector(".active-models-tab-content .model-list");e.innerHTML="",i.forEach(t=>{const n=document.createElement("div");n.classList.add("model-card","card"),n.innerHTML=`
                <div class="model-header">
                    <span class="model-name">${t.name}</span>
                </div>
                <div class="model-details">
                    <p>Description: <span class="detail-value">${t.description}</span></p>
                    <p>Type: <span class="detail-value">${t.type}</span></p>
                    <p>Visibility: <span class="detail-value">${t.visibility}</span></p>
                    <p>Status: <span class="detail-value">${t.status}</span></p>
                </div>
            `,e.appendChild(n)})}}catch(i){console.warn("Failed to load active models:",i);const e=document.querySelector(".active-models-tab-content .model-list");e&&(e.innerHTML='<div class="empty-state">No active models available</div>')}}async function yt(){L("DashboardTabs",".dashboard-tabs"),k("src/components/DashboardTabs/DashboardTabs.css"),L("ModelPerformance",".model-performance-section"),k("src/components/ModelPerformance/ModelPerformance.css"),L("NotificationsAlerts",".notifications-alerts-section"),k("src/components/NotificationsAlerts/NotificationsAlerts.css"),await bt(),L("AllModelsTabContent",".tab-content"),k("src/components/AllModelsTabContent/AllModelsTabContent.css"),document.querySelector(".dashboard-tabs").addEventListener("click",async i=>{const e=i.target.closest(".tab-item");if(e){const t=e.dataset.tab;document.querySelectorAll(".tab-item").forEach(a=>a.classList.remove("active")),e.classList.add("active");const n=document.querySelector(".tab-content");switch(n.innerHTML="",t){case"tokens":if(await L("TokensTabContent",".tab-content"),k("src/components/TokensTabContent/TokensTabContent.css"),le=null,re=null,window.tokenSyncService){await window.tokenSyncService.forceUpdate();const a=document.querySelectorAll("[data-token-balance]"),s=localStorage.getItem("user");if(s)try{const o=JSON.parse(s),l=window.tokenSyncService.formatTokenAmount(o.token_balance||0);a.forEach(r=>{r.textContent=l})}catch(o){console.error("Failed to parse user data:",o)}}await rt(),await ht(),vt();break;case"my-models":await L("AllModelsTabContent",".tab-content"),k("src/components/AllModelsTabContent/AllModelsTabContent.css"),Le();break;case"in-progress":await L("InProgressTabContent",".tab-content"),k("src/components/InProgressTabContent/InProgressTabContent.css"),Ne();break;case"active-models":await L("ActiveModelsTabContent",".tab-content"),k("src/components/ActiveModelsTabContent/ActiveModelsTabContent.css"),ft();break;default:console.warn("Unknown tab:",t)}}}),mt(),pt(),Le()}function vt(){const i=setInterval(()=>{if(window.tokenUsageTracker){clearInterval(i);const e=window.tokenUsageTracker,t=document.getElementById("avgDailyUsage");if(t){const o=new Date(e.startDate||Date.now()),l=Math.max(1,Math.ceil((Date.now()-o)/(1e3*60*60*24))),r=Math.round(e.usedTokens/l);t.textContent=e.formatNumber(r)}const n=document.getElementById("projectedMonthly");if(n){const o=new Date(e.startDate||Date.now()),l=Math.max(1,Math.ceil((Date.now()-o)/(1e3*60*60*24))),r=e.usedTokens/l,c=Math.round(r*30);n.textContent=e.formatNumber(c),c>e.monthlyLimit?(n.classList.add("danger"),n.classList.remove("warning","success")):c>e.monthlyLimit*.8?(n.classList.add("warning"),n.classList.remove("danger","success")):(n.classList.add("success"),n.classList.remove("danger","warning"))}const a=document.getElementById("daysRemaining");if(a){const o=new Date,l=new Date(e.renewalDate),r=Math.ceil((l-o)/(1e3*60*60*24));a.textContent=r>0?r:0}const s=document.getElementById("usageStatus");if(s){const o=e.usedTokens/e.monthlyLimit*100;o>=95?(s.textContent="Critical",s.classList.add("danger"),s.classList.remove("warning","success")):o>=80?(s.textContent="High",s.classList.add("warning"),s.classList.remove("danger","success")):(s.textContent="Normal",s.classList.add("success"),s.classList.remove("danger","warning"))}}},100);setTimeout(()=>clearInterval(i),5e3)}async function bt(){k("src/components/DashboardTokenWidget/DashboardTokenWidget.css");const i=document.createElement("script");return i.src="src/components/DashboardTokenWidget/DashboardTokenWidget.js",i.type="module",new Promise(e=>{i.onload=()=>{const t=new window.DashboardTokenWidget;t.initialize("dashboard-token-widget"),window.dashboardTokenWidget=t,e()},document.body.appendChild(i)})}class Me{constructor(e,t={}){this.container=e,this.options={columns:t.columns||[],data:t.data||[],sortable:t.sortable!==!1,filterable:t.filterable!==!1,paginated:t.paginated!==!1,pageSize:t.pageSize||10,selectable:t.selectable||!1,actions:t.actions||[],emptyMessage:t.emptyMessage||"No data available",loading:t.loading||!1,striped:t.striped!==!1,hoverable:t.hoverable!==!1,compact:t.compact||!1,onRowClick:t.onRowClick||null,onSort:t.onSort||null,onFilter:t.onFilter||null,onPageChange:t.onPageChange||null,onSelectionChange:t.onSelectionChange||null,...t},this.state={sortColumn:null,sortDirection:"asc",filterText:"",currentPage:1,selectedRows:new Set},this.init()}init(){this.render(),this.attachEventListeners()}render(){const e=`
            <div class="data-table-wrapper ${this.options.compact?"compact":""}">
                ${this.renderFilter()}
                <div class="data-table-container">
                    ${this.options.loading?this.renderLoading():this.renderTable()}
                </div>
                ${this.renderPagination()}
            </div>
        `;this.container.innerHTML=e}renderFilter(){return this.options.filterable?`
            <div class="data-table-filter">
                <div class="filter-input-wrapper">
                    <i class="fas fa-search"></i>
                    <input 
                        type="text" 
                        class="filter-input" 
                        placeholder="Search..." 
                        value="${this.state.filterText}"
                    >
                </div>
            </div>
        `:""}renderTable(){const e=this.getFilteredData(),t=this.getPaginatedData(e);return e.length===0?`
                <div class="data-table-empty">
                    <i class="fas fa-inbox"></i>
                    <p>${this.options.emptyMessage}</p>
                </div>
            `:`
            <table class="data-table ${this.options.striped?"striped":""} ${this.options.hoverable?"hoverable":""}">
                <thead>
                    <tr>
                        ${this.options.selectable?'<th class="checkbox-column"><input type="checkbox" class="select-all"></th>':""}
                        ${this.renderHeaders()}
                        ${this.options.actions.length>0?'<th class="actions-column">Actions</th>':""}
                    </tr>
                </thead>
                <tbody>
                    ${t.map(n=>this.renderRow(n)).join("")}
                </tbody>
            </table>
        `}renderHeaders(){return this.options.columns.map(e=>{const t=this.options.sortable&&e.sortable!==!1,n=this.state.sortColumn===e.key,a=n?this.state.sortDirection==="asc"?"fa-sort-up":"fa-sort-down":"fa-sort";return`
                <th 
                    class="${t?"sortable":""} ${n?"sorted":""}"
                    data-column="${e.key}"
                    style="${e.width?`width: ${e.width}`:""}"
                >
                    <div class="th-content">
                        <span>${e.label}</span>
                        ${t?`<i class="fas ${a}"></i>`:""}
                    </div>
                </th>
            `}).join("")}renderRow(e,t){const n=e.id||t,a=this.state.selectedRows.has(n);return`
            <tr 
                class="${a?"selected":""} ${this.options.onRowClick?"clickable":""}"
                data-row-id="${n}"
            >
                ${this.options.selectable?`
                    <td class="checkbox-column">
                        <input type="checkbox" class="row-select" ${a?"checked":""}>
                    </td>
                `:""}
                ${this.renderCells(e)}
                ${this.renderActions(e)}
            </tr>
        `}renderCells(e){return this.options.columns.map(t=>{let n=this.getNestedValue(e,t.key);return t.render?n=t.render(n,e):t.type==="date"&&n?n=new Date(n).toLocaleDateString():t.type==="datetime"&&n?n=new Date(n).toLocaleString():t.type==="boolean"?n=n?'<i class="fas fa-check text-success"></i>':'<i class="fas fa-times text-danger"></i>':t.type==="badge"&&n&&(n=`<span class="badge badge-${t.badgeClass?t.badgeClass(n):"primary"}">${n}</span>`),`<td class="${t.className||""}">${n||"-"}</td>`}).join("")}renderActions(e){return this.options.actions.length===0?"":`<td class="actions-column">${this.options.actions.map(n=>{if(n.condition&&!n.condition(e))return"";const a=n.className||"btn-sm btn-secondary",s=n.icon?`<i class="${n.icon}"></i>`:"",o=n.label||"";return`
                <button 
                    class="btn ${a} action-btn" 
                    data-action="${n.key}"
                    title="${n.tooltip||o}"
                >
                    ${s} ${o}
                </button>
            `}).filter(Boolean).join("")}</td>`}renderPagination(){if(!this.options.paginated)return"";const e=this.getFilteredData(),t=Math.ceil(e.length/this.options.pageSize);if(t<=1)return"";const n=this.getPaginationPages(t);return`
            <div class="data-table-pagination">
                <div class="pagination-info">
                    Showing ${this.getPaginationInfo(e.length)}
                </div>
                <div class="pagination-controls">
                    <button 
                        class="btn btn-sm btn-secondary" 
                        data-page="prev"
                        ${this.state.currentPage===1?"disabled":""}
                    >
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    ${n.map(a=>a==="..."?'<span class="pagination-ellipsis">...</span>':`
                            <button 
                                class="btn btn-sm ${a===this.state.currentPage?"btn-primary":"btn-secondary"}" 
                                data-page="${a}"
                            >
                                ${a}
                            </button>
                        `).join("")}
                    
                    <button 
                        class="btn btn-sm btn-secondary" 
                        data-page="next"
                        ${this.state.currentPage===t?"disabled":""}
                    >
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `}renderLoading(){return`
            <div class="data-table-loading">
                <div class="spinner-border" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p>Loading data...</p>
            </div>
        `}attachEventListeners(){const e=this.container.querySelector(".filter-input");if(e&&e.addEventListener("input",this.debounce(t=>{this.state.filterText=t.target.value,this.state.currentPage=1,this.render(),this.options.onFilter&&this.options.onFilter(this.state.filterText)},300)),this.container.querySelectorAll("th.sortable").forEach(t=>{t.addEventListener("click",()=>{const n=t.dataset.column;this.state.sortColumn===n?this.state.sortDirection=this.state.sortDirection==="asc"?"desc":"asc":(this.state.sortColumn=n,this.state.sortDirection="asc"),this.render(),this.options.onSort&&this.options.onSort(this.state.sortColumn,this.state.sortDirection)})}),this.options.onRowClick&&this.container.querySelectorAll("tbody tr").forEach(t=>{t.addEventListener("click",n=>{if(n.target.closest(".actions-column")||n.target.closest(".checkbox-column"))return;const a=t.dataset.rowId,s=this.options.data.find(o=>(o.id||this.options.data.indexOf(o))==a);this.options.onRowClick(s,n)})}),this.options.selectable){const t=this.container.querySelector(".select-all");t&&t.addEventListener("change",n=>{const a=n.target.checked;this.getPaginatedData(this.getFilteredData()).forEach(o=>{const l=o.id||this.options.data.indexOf(o);a?this.state.selectedRows.add(l):this.state.selectedRows.delete(l)}),this.render(),this.options.onSelectionChange&&this.options.onSelectionChange(Array.from(this.state.selectedRows))}),this.container.querySelectorAll(".row-select").forEach(n=>{n.addEventListener("change",a=>{const s=a.target.closest("tr"),o=parseInt(s.dataset.rowId);a.target.checked?this.state.selectedRows.add(o):this.state.selectedRows.delete(o),this.render(),this.options.onSelectionChange&&this.options.onSelectionChange(Array.from(this.state.selectedRows))})})}this.container.querySelectorAll(".action-btn").forEach(t=>{t.addEventListener("click",n=>{n.stopPropagation();const a=t.dataset.action,o=t.closest("tr").dataset.rowId,l=this.options.data.find(c=>(c.id||this.options.data.indexOf(c))==o),r=this.options.actions.find(c=>c.key===a);r&&r.handler&&r.handler(l,n)})}),this.container.querySelectorAll("[data-page]").forEach(t=>{t.addEventListener("click",()=>{const n=t.dataset.page,a=Math.ceil(this.getFilteredData().length/this.options.pageSize);n==="prev"&&this.state.currentPage>1?this.state.currentPage--:n==="next"&&this.state.currentPage<a?this.state.currentPage++:isNaN(n)||(this.state.currentPage=parseInt(n)),this.render(),this.options.onPageChange&&this.options.onPageChange(this.state.currentPage)})})}getFilteredData(){if(!this.state.filterText)return this.options.data;const e=this.state.filterText.toLowerCase();return this.options.data.filter(t=>this.options.columns.some(n=>{const a=this.getNestedValue(t,n.key);return a&&a.toString().toLowerCase().includes(e)}))}getPaginatedData(e){if(!this.options.paginated)return e;const t=(this.state.currentPage-1)*this.options.pageSize,n=t+this.options.pageSize;return e.slice(t,n)}getSortedData(e){if(!this.state.sortColumn)return e;const t=this.options.columns.find(n=>n.key===this.state.sortColumn);return t?[...e].sort((n,a)=>{let s=this.getNestedValue(n,t.key),o=this.getNestedValue(a,t.key);return t.type==="number"?(s=parseFloat(s)||0,o=parseFloat(o)||0):t.type==="date"||t.type==="datetime"?(s=new Date(s).getTime(),o=new Date(o).getTime()):(s=(s||"").toString().toLowerCase(),o=(o||"").toString().toLowerCase()),s<o?this.state.sortDirection==="asc"?-1:1:s>o?this.state.sortDirection==="asc"?1:-1:0}):e}getNestedValue(e,t){return t.split(".").reduce((n,a)=>n&&n[a],e)}getPaginationPages(e){const t=this.state.currentPage,n=[];if(e<=7)for(let a=1;a<=e;a++)n.push(a);else if(t<=4){for(let a=1;a<=5;a++)n.push(a);n.push("...",e)}else if(t>=e-3){n.push(1,"...");for(let a=e-4;a<=e;a++)n.push(a)}else{n.push(1,"...");for(let a=t-1;a<=t+1;a++)n.push(a);n.push("...",e)}return n}getPaginationInfo(e){const t=(this.state.currentPage-1)*this.options.pageSize+1,n=Math.min(t+this.options.pageSize-1,e);return`${t}-${n} of ${e} items`}debounce(e,t){let n;return function(...s){const o=()=>{clearTimeout(n),e(...s)};clearTimeout(n),n=setTimeout(o,t)}}updateData(e){this.options.data=e,this.state.currentPage=1,this.render()}updateColumns(e){this.options.columns=e,this.render()}setLoading(e){this.options.loading=e,this.render()}getSelectedRows(){return Array.from(this.state.selectedRows).map(e=>this.options.data.find(t=>(t.id||this.options.data.indexOf(t))==e)).filter(Boolean)}clearSelection(){this.state.selectedRows.clear(),this.render()}refresh(){this.render()}}class O{constructor(e={}){this.options={title:e.title||"",content:e.content||"",size:e.size||"medium",centered:e.centered!==!1,backdrop:e.backdrop!==!1,keyboard:e.keyboard!==!1,closeButton:e.closeButton!==!1,footer:e.footer||null,footerButtons:e.footerButtons||[],onShow:e.onShow||null,onShown:e.onShown||null,onHide:e.onHide||null,onHidden:e.onHidden||null,animate:e.animate!==!1,...e},this.isOpen=!1,this.modalElement=null,this.backdropElement=null,this.init()}init(){this.createModal(),this.attachEventListeners()}createModal(){this.backdropElement=document.createElement("div"),this.backdropElement.className="modal-backdrop",this.options.animate&&this.backdropElement.classList.add("fade"),this.backdropElement.style.position="fixed",this.backdropElement.style.top="0",this.backdropElement.style.left="0",this.backdropElement.style.width="100%",this.backdropElement.style.height="100%",this.backdropElement.style.backgroundColor="rgba(0, 0, 0, 0.5)",this.backdropElement.style.zIndex="1040",this.modalElement=document.createElement("div"),this.modalElement.className=`modal ${this.options.animate?"fade":""}`,this.modalElement.setAttribute("tabindex","-1"),this.modalElement.setAttribute("role","dialog"),this.modalElement.setAttribute("aria-hidden","true"),this.modalElement.style.position="fixed",this.modalElement.style.top="0",this.modalElement.style.left="0",this.modalElement.style.width="100%",this.modalElement.style.height="100%",this.modalElement.style.zIndex="1050",this.modalElement.style.overflow="auto";const e=document.createElement("div");e.className=`modal-dialog modal-${this.options.size} ${this.options.centered?"modal-dialog-centered":""}`,e.setAttribute("role","document"),e.style.position="relative",e.style.margin="1.75rem auto",e.style.pointerEvents="none",e.style.display="flex",e.style.alignItems="center",e.style.minHeight="calc(100% - 3.5rem)",e.style.maxWidth=this.options.size==="large"?"800px":"500px";const t=document.createElement("div");t.className="modal-content",t.style.position="relative",t.style.display="flex",t.style.flexDirection="column",t.style.width="100%",t.style.pointerEvents="auto",t.style.backgroundColor="#ffffff",t.style.border="1px solid #e0e0e0",t.style.borderRadius="8px",t.style.boxShadow="0 10px 25px rgba(0, 0, 0, 0.1)",t.style.outline="0",t.innerHTML=`
            ${this.renderHeader()}
            ${this.renderBody()}
            ${this.renderFooter()}
        `,e.appendChild(t),this.modalElement.appendChild(e)}renderHeader(){return!this.options.title&&!this.options.closeButton?"":`
            <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0;">
                ${this.options.title?`<h5 class="modal-title" style="margin: 0; font-size: 1.25rem; font-weight: 500;">${this.options.title}</h5>`:""}
                ${this.options.closeButton?`
                    <button type="button" class="modal-close" aria-label="Close" style="padding: 0; background: transparent; border: 0; font-size: 1.5rem; font-weight: 700; line-height: 1; color: #999; cursor: pointer;">
                        <span aria-hidden="true">&times;</span>
                    </button>
                `:""}
            </div>
        `}renderBody(){return`
            <div class="modal-body" style="padding: 1.5rem;">
                ${this.options.content}
            </div>
        `}renderFooter(){if(!this.options.footer&&this.options.footerButtons.length===0)return"";const e=this.options.footerButtons.map(t=>{const n=t.class||"btn-secondary",a=t.text||"Button",s=t.id||`modal-btn-${Date.now()}`;return`
                <button 
                    type="button" 
                    class="btn ${n}" 
                    id="${s}"
                    ${t.disabled?"disabled":""}
                    style="padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.95rem; ${n.includes("primary")?"background: #6a5acd; color: white; border: none;":"background: #f0f2f5; color: #333; border: 1px solid #e0e0e0;"}"
                >
                    ${t.icon?`<i class="${t.icon}"></i> `:""}
                    ${a}
                </button>
            `}).join("");return`
            <div class="modal-footer" style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; padding: 1rem 1.5rem; border-top: 1px solid #e0e0e0;">
                ${this.options.footer||""}
                ${e}
            </div>
        `}attachEventListeners(){const e=this.modalElement.querySelector(".modal-close");e&&e.addEventListener("click",()=>this.hide()),this.options.backdrop&&this.modalElement.addEventListener("click",t=>{t.target===this.modalElement&&this.hide()}),this.options.keyboard&&(this.handleKeyboard=t=>{t.key==="Escape"&&this.isOpen&&this.hide()}),this.options.footerButtons.forEach(t=>{if(t.handler){const n=this.modalElement.querySelector(`#${t.id||`modal-btn-${Date.now()}`}`);n&&n.addEventListener("click",a=>{t.handler(a,this)})}})}show(){this.isOpen||(this.options.onShow&&this.options.onShow(this),document.body.appendChild(this.backdropElement),document.body.appendChild(this.modalElement),this.options.animate&&(this.modalElement.offsetHeight,this.backdropElement.offsetHeight),requestAnimationFrame(()=>{document.body.classList.add("modal-open"),this.backdropElement.classList.add("show"),this.modalElement.classList.add("show"),this.modalElement.style.display="block",this.modalElement.setAttribute("aria-hidden","false");const e=this.modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');e&&e.focus(),this.isOpen=!0,this.handleKeyboard&&document.addEventListener("keydown",this.handleKeyboard),this.options.animate?setTimeout(()=>{this.options.onShown&&this.options.onShown(this)},150):this.options.onShown&&this.options.onShown(this)}))}hide(){if(!this.isOpen)return;this.options.onHide&&this.options.onHide(this),this.modalElement.classList.remove("show"),this.backdropElement.classList.remove("show"),this.modalElement.setAttribute("aria-hidden","true");const e=()=>{this.modalElement.style.display="none",document.body.classList.remove("modal-open"),this.backdropElement.parentNode&&this.backdropElement.parentNode.removeChild(this.backdropElement),this.modalElement.parentNode&&this.modalElement.parentNode.removeChild(this.modalElement),this.isOpen=!1,this.handleKeyboard&&document.removeEventListener("keydown",this.handleKeyboard),this.options.onHidden&&this.options.onHidden(this)};this.options.animate?setTimeout(e,150):e()}toggle(){this.isOpen?this.hide():this.show()}setTitle(e){this.options.title=e;const t=this.modalElement.querySelector(".modal-title");t&&(t.textContent=e)}setContent(e){this.options.content=e;const t=this.modalElement.querySelector(".modal-body");t&&(t.innerHTML=e)}setFooter(e){this.options.footer=e;const t=this.modalElement.querySelector(".modal-footer");t&&(t.innerHTML=e)}static confirm(e={}){const t=new O({title:e.title||"Confirm",content:e.message||"Are you sure?",size:e.size||"small",footerButtons:[{text:e.cancelText||"Cancel",class:"btn-secondary",handler:(n,a)=>{a.hide(),e.onCancel&&e.onCancel()}},{text:e.confirmText||"Confirm",class:e.confirmClass||"btn-primary",handler:(n,a)=>{a.hide(),e.onConfirm&&e.onConfirm()}}]});return t.show(),t}static alert(e={}){const t=new O({title:e.title||"Alert",content:e.message||"",size:e.size||"small",footerButtons:[{text:e.okText||"OK",class:"btn-primary",handler:(n,a)=>{a.hide(),e.onOk&&e.onOk()}}]});return t.show(),t}static prompt(e={}){const t=`modal-prompt-${Date.now()}`,n=new O({title:e.title||"Input",content:`
                <div class="form-group">
                    ${e.label?`<label for="${t}">${e.label}</label>`:""}
                    <input 
                        type="${e.type||"text"}" 
                        class="form-control" 
                        id="${t}"
                        placeholder="${e.placeholder||""}"
                        value="${e.defaultValue||""}"
                    >
                </div>
            `,size:e.size||"small",footerButtons:[{text:e.cancelText||"Cancel",class:"btn-secondary",handler:(a,s)=>{s.hide(),e.onCancel&&e.onCancel()}},{text:e.submitText||"Submit",class:"btn-primary",handler:(a,s)=>{const l=s.modalElement.querySelector(`#${t}`).value;s.hide(),e.onSubmit&&e.onSubmit(l)}}]});return n.show(),setTimeout(()=>{const a=n.modalElement.querySelector(`#${t}`);a&&(a.focus(),a.select())},150),n}}class j{constructor(e={}){this.options={message:e.message||"",type:e.type||"info",duration:e.duration||3e3,position:e.position||"top-right",animate:e.animate!==!1,autoHide:e.autoHide!==!1,closeButton:e.closeButton!==!1,icon:e.icon||null,progress:e.progress!==!1,onClick:e.onClick||null,onClose:e.onClose||null,...e},this.container=null,this.toastElement=null,this.progressElement=null,this.hideTimeout=null,this.startTime=null,this.remainingTime=this.options.duration,this.init()}init(){this.ensureContainer(),this.createElement(),this.show()}ensureContainer(){const e=`toast-container-${this.options.position}`;this.container=document.getElementById(e),this.container||(this.container=document.createElement("div"),this.container.id=e,this.container.className=`toast-container toast-${this.options.position}`,document.body.appendChild(this.container))}createElement(){this.toastElement=document.createElement("div"),this.toastElement.className=`toast toast-${this.options.type} ${this.options.animate?"toast-animate":""}`;const e=this.getIcon();this.toastElement.innerHTML=`
            <div class="toast-content">
                ${e?`<div class="toast-icon">${e}</div>`:""}
                <div class="toast-body">
                    <div class="toast-message">${this.options.message}</div>
                </div>
                ${this.options.closeButton?`
                    <button class="toast-close" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                `:""}
            </div>
            ${this.options.progress&&this.options.autoHide?`
                <div class="toast-progress">
                    <div class="toast-progress-bar"></div>
                </div>
            `:""}
        `,this.attachEventListeners()}getIcon(){return this.options.icon?`<i class="${this.options.icon}"></i>`:{success:'<i class="fas fa-check-circle"></i>',error:'<i class="fas fa-exclamation-circle"></i>',warning:'<i class="fas fa-exclamation-triangle"></i>',info:'<i class="fas fa-info-circle"></i>'}[this.options.type]||""}attachEventListeners(){const e=this.toastElement.querySelector(".toast-close");e&&e.addEventListener("click",t=>{t.stopPropagation(),this.hide()}),this.options.onClick&&(this.toastElement.style.cursor="pointer",this.toastElement.addEventListener("click",()=>{this.options.onClick(this)})),this.options.autoHide&&(this.toastElement.addEventListener("mouseenter",()=>{this.pauseTimer()}),this.toastElement.addEventListener("mouseleave",()=>{this.resumeTimer()}))}show(){this.container.appendChild(this.toastElement),this.options.animate&&this.toastElement.offsetHeight,requestAnimationFrame(()=>{this.toastElement.classList.add("show"),this.options.autoHide&&this.startTimer()})}hide(){if(!this.toastElement)return;this.clearTimer(),this.toastElement.classList.remove("show");const e=()=>{this.toastElement&&this.toastElement.parentNode&&this.toastElement.parentNode.removeChild(this.toastElement),this.container&&this.container.children.length===0&&this.container.parentNode.removeChild(this.container),this.options.onClose&&this.options.onClose(this)};this.options.animate?(this.toastElement.addEventListener("transitionend",e,{once:!0}),setTimeout(e,300)):e()}startTimer(){this.options.autoHide&&(this.startTime=Date.now(),this.progressElement=this.toastElement.querySelector(".toast-progress-bar"),this.progressElement&&(this.progressElement.style.transition=`width ${this.options.duration}ms linear`,this.progressElement.style.width="0%"),this.hideTimeout=setTimeout(()=>{this.hide()},this.options.duration))}pauseTimer(){if(this.hideTimeout&&(clearTimeout(this.hideTimeout),this.progressElement)){const e=Date.now()-this.startTime,t=e/this.options.duration*100;this.remainingTime=this.options.duration-e,this.progressElement.style.transition="none",this.progressElement.style.width=`${t}%`}}resumeTimer(){!this.options.autoHide||this.remainingTime<=0||(this.startTime=Date.now(),this.progressElement&&(this.progressElement.style.transition=`width ${this.remainingTime}ms linear`,this.progressElement.style.width="0%"),this.hideTimeout=setTimeout(()=>{this.hide()},this.remainingTime))}clearTimer(){this.hideTimeout&&(clearTimeout(this.hideTimeout),this.hideTimeout=null)}update(e={}){if(e.message){const t=this.toastElement.querySelector(".toast-message");t&&(t.textContent=e.message)}if(e.type&&e.type!==this.options.type){this.toastElement.classList.remove(`toast-${this.options.type}`),this.toastElement.classList.add(`toast-${e.type}`),this.options.type=e.type;const t=this.toastElement.querySelector(".toast-icon");t&&(t.innerHTML=this.getIcon())}}static success(e,t={}){return new j({...t,message:e,type:"success"})}static error(e,t={}){return new j({...t,message:e,type:"error",duration:t.duration||5e3})}static warning(e,t={}){return new j({...t,message:e,type:"warning"})}static info(e,t={}){return new j({...t,message:e,type:"info"})}static clearAll(){document.querySelectorAll(".toast-container").forEach(e=>{e.remove()})}}class wt{constructor(e={}){this.options={maxToasts:e.maxToasts||5,newestOnTop:e.newestOnTop!==!1,preventDuplicates:e.preventDuplicates||!1,...e},this.toasts=new Map}show(e,t="info",n={}){if(this.options.preventDuplicates){for(const[s,o]of this.toasts)if(o.options.message===e&&o.options.type===t)return o}if(this.toasts.size>=this.options.maxToasts){const s=this.toasts.keys().next().value,o=this.toasts.get(s);o&&(o.hide(),this.toasts.delete(s))}const a=new j({...n,message:e,type:t,onClose:s=>{this.toasts.delete(s.id),n.onClose&&n.onClose(s)}});return a.id=Date.now(),this.toasts.set(a.id,a),a}success(e,t={}){return this.show(e,"success",t)}error(e,t={}){return this.show(e,"error",t)}warning(e,t={}){return this.show(e,"warning",t)}info(e,t={}){return this.show(e,"info",t)}clear(){this.toasts.forEach(e=>e.hide()),this.toasts.clear()}}const A=new wt;function ee(i,e,t="all"){const n=document.querySelector(e);if(!n){console.error(`Container not found: ${e}`);return}n._models=i,n._tableType=t,n.innerHTML=`
        <div class="models-wrapper">
            <div class="models-header">
                <div class="search-bar-container">
                    <input type="text" id="model-search-${t}" placeholder="Search models..." class="search-input">
                    <button class="search-button"><i class="fas fa-search"></i></button>
                    <button class="btn btn-primary" id="refresh-models-${t}">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            <div id="models-container-${t}" class="models-container">
                <!-- Model cards will be rendered here -->
            </div>
        </div>
    `,Be(i,`#models-container-${t}`,t);const a=document.getElementById(`model-search-${t}`);a&&a.addEventListener("input",o=>{const l=o.target.value.toLowerCase(),r=i.filter(c=>c.name.toLowerCase().includes(l)||c.description&&c.description.toLowerCase().includes(l)||c.username&&c.username.toLowerCase().includes(l));Be(r,`#models-container-${t}`,t)});const s=document.getElementById(`refresh-models-${t}`);s&&s.addEventListener("click",me)}function me(){const i=document.querySelector(".all-models-tabs-container .tab-item.active");i&&i.click()}function Be(i,e,t="all"){const n=document.querySelector(e);if(!n){console.error(`Container not found: ${e}`);return}if(i.length===0){n.innerHTML='<div class="empty-state">No models found</div>';return}const a=`<div class="models-grid">${Et(i)}</div>`;n.innerHTML=a,setTimeout(()=>Ct(n),0)}function Et(i,e){return i.length===0?"":i.map(t=>{let n=t.username||`User ${t.user_id}`;t.name==="Community Sentiment Analyzer"?n="Jeff":t.name==="DataPulse NLP Core"&&(n="DataPulse");const a=t.type==="rules_engine"?'<span class="badge badge-success">Rules Engine</span>':'<span class="badge badge-info">Model</span>';return`
            <div class="model-card card" data-model-id="${t.id}">
                <div class="model-card-header">
                    <div class="model-title-row">
                        <h4 class="model-name">${t.name}</h4>
                        ${a}
                    </div>
                    <div class="model-creator">
                        <i class="fas fa-user"></i> ${n}
                    </div>
                </div>
                
                <div class="model-card-body">
                    <p class="model-description">${t.description||"No description available"}</p>
                    
                    <div class="model-stats">
                        <div class="stat-item">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-bookmark"></i>
                            <span>${t.added_to_library||0} libraries</span>
                        </div>
                    </div>
                </div>
                
                <div class="model-card-footer">
                    <div class="vote-section">
                        <button class="vote-btn upvote-btn" data-model-id="${t.id}" data-vote-type="upvote">
                            <i class="fas fa-thumbs-up"></i> ${t.upvotes||0}
                        </button>
                        <button class="vote-btn downvote-btn" data-model-id="${t.id}" data-vote-type="downvote">
                            <i class="fas fa-thumbs-down"></i> ${t.downvotes||0}
                        </button>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info view-btn" data-model-id="${t.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${t.type==="rules_engine"?`
                            <button class="btn btn-sm btn-warning edit-rule-btn" data-rule-id="${t.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        `:`
                            <button class="btn btn-sm btn-secondary add-to-library-btn" data-model-id="${t.id}">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `}).join("")}function Ct(i,e){i.querySelectorAll(".vote-btn").forEach(t=>{t.addEventListener("click",async n=>{n.stopPropagation();const a=t.dataset.modelId,s=t.dataset.voteType;try{await f("/api/votes/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model_id:parseInt(a),vote_type:s})}),A.success(`Vote ${s}d successfully`),me()}catch{A.error("Failed to vote")}})}),i.querySelectorAll(".view-btn").forEach(t=>{t.addEventListener("click",async n=>{n.stopPropagation();const a=t.dataset.modelId,l=(i.closest(".models-wrapper").parentElement._models||[]).find(r=>r.id==a);l&&kt(l)})}),i.querySelectorAll(".add-to-library-btn").forEach(t=>{t.addEventListener("click",async n=>{n.stopPropagation();const a=t.dataset.modelId;try{await f("/api/models/library",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model_id:parseInt(a)})}),A.success("Model added to library"),me()}catch{A.error("Failed to add model to library")}})}),i.querySelectorAll(".edit-rule-btn").forEach(t=>{t.addEventListener("click",n=>{n.stopPropagation();const a=t.dataset.ruleId;window.location.hash=`#rules-engine?edit=${a}`})})}async function kt(i){let e=i;try{const t=await f(`/api/models/${i.id}`);t&&(e={...i,...t})}catch(t){console.error("Failed to fetch model details:",t)}O.alert({title:e.name,size:"large",message:`
            <div class="model-details-modal">
                <div class="model-header-section">
                    <div class="model-type-badge">
                        <span class="badge badge-${e.type==="rules_engine"?"success":"info"}">
                            ${e.type==="rules_engine"?"Rules Engine":"Model"}
                        </span>
                    </div>
                    <div class="model-stats">
                        <div class="stat">
                            <i class="fas fa-thumbs-up text-success"></i>
                            <span>${e.upvotes||0}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-thumbs-down text-danger"></i>
                            <span>${e.downvotes||0}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-bookmark text-info"></i>
                            <span>${e.added_to_library||0}</span>
                        </div>
                    </div>
                </div>
                
                <div class="model-info-section">
                    <h4>Description</h4>
                    <p>${e.description||"No description available"}</p>
                </div>
                
                <div class="model-details-grid">
                    <div class="detail-item">
                        <label>Created By:</label>
                        <span>${e.username||`User ${e.user_id}`}</span>
                    </div>
                    <div class="detail-item">
                        <label>Created On:</label>
                        <span>${new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-${e.status||"active"}">${e.status||"Active"}</span>
                    </div>
                    <div class="detail-item">
                        <label>Visibility:</label>
                        <span>${e.visibility||"Public"}</span>
                    </div>
                </div>
                
                ${e.performance?`
                    <div class="model-performance-section">
                        <h4>Performance Metrics</h4>
                        <div class="performance-grid">
                            ${Object.entries(e.performance).map(([t,n])=>`
                                <div class="metric-item">
                                    <label>${t.charAt(0).toUpperCase()+t.slice(1)}:</label>
                                    <span>${typeof n=="number"?(n*100).toFixed(1)+"%":n}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `:""}
                
                <div class="model-actions-section">
                    <button class="btn btn-primary" onclick="window.location.hash='#model-details/${e.id}'">
                        <i class="fas fa-external-link-alt"></i> Open Full Details
                    </button>
                    ${e.type!=="rules_engine"?`
                        <button class="btn btn-secondary" onclick="toastManager.info('Test feature coming soon!')">
                            <i class="fas fa-play"></i> Test Model
                        </button>
                    `:""}
                </div>
            </div>
        `})}async function Re(){try{await new Promise(d=>setTimeout(d,100));const i=f("/api/models/community").catch(()=>He()),e=f("/api/models/pretrained").catch(()=>Ue()),t=f("/api/models/me").catch(()=>It()),[n,a,s]=await Promise.all([i,e,t]),o=[...n||[],...a||[],...s||[]],l=Array.from(new Map(o.map(d=>[d.id,d])).values()),r=document.querySelector('[data-panel="all-models"]');(r==null?void 0:r.querySelector(".all-models-overview-tab-content .card"))?ee(l,'[data-panel="all-models"] .all-models-overview-tab-content .card',"all"):(console.error("Container not found for all models overview"),A.error("Failed to load models view"))}catch(i){console.error("Error fetching models:",i),A.error("Failed to load models");const e=document.querySelector('[data-panel="all-models"]'),t=e==null?void 0:e.querySelector(".all-models-overview-tab-content .card");t&&(t.innerHTML='<h3>All Models Overview</h3><div class="empty-state">Failed to load models. Please try again.</div>')}}async function ze(){try{await new Promise(n=>setTimeout(n,100));const i=await f("/api/models/community").catch(()=>He()),e=document.querySelector('[data-panel="community"]');(e==null?void 0:e.querySelector(".community-models-tab-content .card"))?ee(i||[],'[data-panel="community"] .community-models-tab-content .card',"community"):(console.error("Container not found for community models"),A.error("Failed to load community models view"))}catch(i){console.error("Error fetching community models:",i),A.error("Failed to load community models");const e=document.querySelector('[data-panel="community"]'),t=e==null?void 0:e.querySelector(".community-models-tab-content .card");t&&(t.innerHTML='<h3>Community Models</h3><div class="empty-state">Failed to load community models. Please try again.</div>')}}async function Oe(){try{await new Promise(n=>setTimeout(n,100));const i=await f("/api/models/pretrained").catch(()=>Ue()),e=document.querySelector('[data-panel="pretrained"]');(e==null?void 0:e.querySelector(".pretrained-models-tab-content .card"))?ee(i||[],'[data-panel="pretrained"] .pretrained-models-tab-content .card',"pretrained"):(console.error("Container not found for pretrained models"),A.error("Failed to load pretrained models view"))}catch(i){console.error("Error fetching pretrained models:",i),A.error("Failed to load pretrained models");const e=document.querySelector('[data-panel="pretrained"]'),t=e==null?void 0:e.querySelector(".pretrained-models-tab-content .card");t&&(t.innerHTML='<h3>Pretrained Models</h3><div class="empty-state">Failed to load pretrained models. Please try again.</div>')}}async function St(){const i=document.querySelectorAll(".all-models-tabs-container .tab-item");document.querySelector(".tab-content"),i.forEach(t=>{t.addEventListener("click",async function(){switch(i.forEach(a=>a.classList.remove("active")),this.classList.add("active"),this.getAttribute("data-tab")){case"all-models-overview":await ae("AllModelsOverviewTabContent"),await Re();break;case"community-models":await ae("CommunityModelsTabContent"),await ze();break;case"pretrained-models":await ae("PretrainedModelsTabContent"),await Oe();break}})});const e=document.querySelector('.all-models-tabs-container .tab-item[data-tab="all-models-overview"]');e&&e.click()}async function ae(i,e){await L(`AllModelsPage/${i}`,".tab-content")}function He(){return[{id:101,name:"Community Sentiment Analyzer",description:"Analyzes text for positive, negative, or neutral sentiment",type:"NLP",visibility:"community",status:"active",user_id:1,username:"Jeff",created_at:new Date().toISOString(),performance:{accuracy:.85},upvotes:42,downvotes:3,added_to_library:15},{id:102,name:"Customer Churn Predictor",description:"Predicts customer churn based on behavior patterns",type:"Classification",visibility:"community",status:"active",user_id:2,username:"Sarah",created_at:new Date().toISOString(),performance:{accuracy:.89},upvotes:38,downvotes:2,added_to_library:12}]}function Ue(){return[{id:201,name:"DataPulse NLP Core",description:"Official model for natural language processing",type:"NLP",visibility:"pretrained",status:"active",user_id:0,username:"DataPulse",created_at:new Date().toISOString(),performance:{accuracy:.98},upvotes:150,downvotes:1,added_to_library:89},{id:202,name:"Image Classification Pro",description:"Advanced image classification with 1000+ categories",type:"Classification",visibility:"pretrained",status:"active",user_id:0,username:"DataPulse",created_at:new Date().toISOString(),performance:{accuracy:.95},upvotes:128,downvotes:5,added_to_library:67}]}function It(){return[{id:1,name:"Sales Forecaster",description:"A model to forecast sales",type:"Regression",visibility:"private",status:"active",user_id:1,created_at:new Date().toISOString(),performance:{accuracy:.88},upvotes:0,downvotes:0,added_to_library:0},{id:2,name:"Customer Segmentation",description:"Segments customers into different groups",type:"Clustering",visibility:"private",status:"in-progress",user_id:1,created_at:new Date().toISOString(),performance:{accuracy:.92},upvotes:0,downvotes:0,added_to_library:0}]}window.loadAllModels=Re;window.loadCommunityModels=ze;window.loadPretrainedModels=Oe;window.renderModelTable=ee;const N=window.tokenService;class Tt{constructor(){this.dropdowns={},this.trainFields=0,this.predictFields=0,this.baseCost=500,this.fieldCost=50}async initialize(){k("src/components/StyledDropdown/StyledDropdown.css"),this.setupDropdowns(),this.setupEventListeners(),this.updateTokenCost()}setupDropdowns(){const e=document.getElementById("model-data-description-train");if(e){const s=document.createElement("div");s.className="dropdown-container",e.parentNode.replaceChild(s,e),this.dropdowns.trainDescription=new w(s,{id:"train-description",placeholder:"Select train data description",options:[{value:"customer_data",title:"Customer Data",icon:"fas fa-users"},{value:"sales_data",title:"Sales Data",icon:"fas fa-chart-line"},{value:"product_data",title:"Product Data",icon:"fas fa-box"},{value:"transaction_data",title:"Transaction Data",icon:"fas fa-exchange-alt"}],onChange:()=>this.updateTokenCost()})}const t=document.getElementById("model-data-description-predict");if(t){const s=document.createElement("div");s.className="dropdown-container",t.parentNode.replaceChild(s,t),this.dropdowns.predictDescription=new w(s,{id:"predict-description",placeholder:"Select predict data description",options:[{value:"churn_probability",title:"Churn Probability",icon:"fas fa-percentage"},{value:"sales_forecast",title:"Sales Forecast",icon:"fas fa-chart-bar"},{value:"category_prediction",title:"Category Prediction",icon:"fas fa-tags"},{value:"value_estimation",title:"Value Estimation",icon:"fas fa-dollar-sign"}],onChange:()=>this.updateTokenCost()})}const n=document.getElementById("model-algorithm");if(n){const s=document.createElement("div");s.className="dropdown-container",n.parentNode.replaceChild(s,n),this.dropdowns.algorithm=new w(s,{id:"algorithm",placeholder:"Select algorithm",options:[{value:"neural_network",title:"Neural Network",icon:"fas fa-brain",description:"+200 tokens"},{value:"random_forest",title:"Random Forest",icon:"fas fa-tree",description:"+150 tokens"},{value:"svm",title:"Support Vector Machine",icon:"fas fa-vector-square",description:"+180 tokens"},{value:"linear_regression",title:"Linear Regression",icon:"fas fa-chart-line",description:"+100 tokens"}],onChange:()=>this.updateTokenCost()})}const a=document.getElementById("model-type");if(a){const s=document.createElement("div");s.className="dropdown-container",a.parentNode.replaceChild(s,a),this.dropdowns.modelType=new w(s,{id:"model-type",placeholder:"Select model type",options:[{value:"classification",title:"Classification",icon:"fas fa-tags"},{value:"regression",title:"Regression",icon:"fas fa-chart-line"},{value:"clustering",title:"Clustering",icon:"fas fa-project-diagram"},{value:"nlp",title:"Natural Language Processing",icon:"fas fa-language",description:"+300 tokens"}],onChange:()=>this.updateTokenCost()})}}setupEventListeners(){const e=document.querySelector(".form-group:nth-child(2) .minus-button"),t=document.querySelector(".form-group:nth-child(2) .plus-button"),n=document.querySelector(".form-group:nth-child(2) .number-input-group span");e&&t&&n&&(e.addEventListener("click",()=>{this.trainFields>0&&(this.trainFields--,n.textContent=this.trainFields,this.updateTokenCost())}),t.addEventListener("click",()=>{this.trainFields++,n.textContent=this.trainFields,this.updateTokenCost()}));const a=document.querySelector(".form-group:nth-child(5) .minus-button"),s=document.querySelector(".form-group:nth-child(5) .plus-button"),o=document.querySelector(".form-group:nth-child(5) .number-input-group span");a&&s&&o&&(a.addEventListener("click",()=>{this.predictFields>0&&(this.predictFields--,o.textContent=this.predictFields,this.updateTokenCost())}),s.addEventListener("click",()=>{this.predictFields++,o.textContent=this.predictFields,this.updateTokenCost()})),this.styleButtons()}styleButtons(){document.querySelectorAll(".minus-button, .plus-button").forEach(t=>{t.className=t.classList.contains("minus-button")?"btn btn-sm btn-secondary minus-button":"btn btn-sm btn-secondary plus-button"}),document.querySelectorAll(".custom-model-creation-container button").forEach(t=>{(t.textContent.includes("Create")||t.textContent.includes("Train"))&&(t.className="btn btn-primary",t.innerHTML='<i class="fas fa-rocket"></i> Create & Train Model')})}updateTokenCost(){let e=this.baseCost;if(e+=(this.trainFields+this.predictFields)*this.fieldCost,this.dropdowns.algorithm){const n=this.dropdowns.algorithm.getValue();e+={neural_network:200,random_forest:150,svm:180,linear_regression:100}[n]||0}this.dropdowns.modelType&&this.dropdowns.modelType.getValue()==="nlp"&&(e+=300);let t=document.getElementById("token-cost-display");if(t){t.textContent=`${e} tokens`;const n=document.querySelector(".cost-item:nth-child(2) span:last-child");n&&(n.textContent=`${(this.trainFields+this.predictFields)*this.fieldCost} tokens`);const a=document.getElementById("algorithm-cost-item"),s=document.getElementById("algorithm-cost");if(this.dropdowns.algorithm){const r=this.dropdowns.algorithm.getValue(),d={neural_network:200,random_forest:150,svm:180,linear_regression:100}[r]||0;d>0&&a&&s&&(a.style.display="flex",s.textContent=`${d} tokens`)}const o=document.getElementById("model-type-cost-item"),l=document.getElementById("model-type-cost");this.dropdowns.modelType&&o&&l&&(this.dropdowns.modelType.getValue()==="nlp"?(o.style.display="flex",l.textContent="300 tokens"):o.style.display="none")}else{const n=document.querySelector(".form-section");if(n){const a=document.createElement("div");a.className="cost-calculation card",a.innerHTML=`
                    <h3>Token Cost Calculation</h3>
                    <div class="cost-breakdown">
                        <div class="cost-item">
                            <span>Base Model Cost:</span>
                            <span>${this.baseCost} tokens</span>
                        </div>
                        <div class="cost-item">
                            <span>Data Fields (${this.trainFields+this.predictFields} × ${this.fieldCost}):</span>
                            <span>${(this.trainFields+this.predictFields)*this.fieldCost} tokens</span>
                        </div>
                        <div class="cost-item" id="algorithm-cost-item" style="display: none;">
                            <span>Algorithm Cost:</span>
                            <span id="algorithm-cost">0 tokens</span>
                        </div>
                        <div class="cost-item" id="model-type-cost-item" style="display: none;">
                            <span>Model Type Cost:</span>
                            <span id="model-type-cost">0 tokens</span>
                        </div>
                        <div class="cost-item total">
                            <span>Total Cost:</span>
                            <span id="token-cost-display">${e} tokens</span>
                        </div>
                    </div>
                `,n.appendChild(a),t=document.getElementById("token-cost-display")}}}}const Ve=new Tt;window.modelCreationPage=Ve;async function xt(){await Ve.initialize()}class $t{constructor(){this.dropdowns={},this.modelHistoryVersions=0,this.processingUnits=1,this.tokenCosts={versionCost:0,trainingBaseCost:0,processingUnitCost:500},this.uploadedData=null,this.selectedFile=null,this.columnNames=[],this.dataMetrics={accuracy:0,dataQuality:0,modelComplexity:0,modelQuality:0},this.modelType=null,this.selectedModelId=null,this.requiredColumns=[],this.trainingColumns=[],this.predictionColumns=[],this.selectedAlgorithm=null,this.algorithmConfigs=this.getAlgorithmConfigs(),this.preprocessingEnabled=!1,this.preprocessingConfig={numericalMethod:"zscore",columnTypes:{},columnTransformers:{},statistics:{}},this.originalData=null,this.transformedData=null}async initialize(){k("src/components/StyledDropdown/StyledDropdown.css"),this.setupDropdowns(),this.setupEventListeners(),this.calculateDynamicVersionCost(),this.initializeMetricsDisplay()}setupDropdowns(){const e=document.querySelector(".model-selector-container");e&&(e.innerHTML='<div id="model-selector-dropdown"></div>',this.dropdowns.modelSelector=new w(document.getElementById("model-selector-dropdown"),{id:"model-selector",placeholder:"Search or select a model...",searchable:!0,options:[{value:"model1",title:"Customer Churn Predictor",icon:"fas fa-chart-line"},{value:"model2",title:"Sales Forecast Model",icon:"fas fa-chart-bar"},{value:"model3",title:"Sentiment Analyzer",icon:"fas fa-brain"},{value:"new",title:"Create New Model",icon:"fas fa-plus"}],onChange:a=>this.loadModelData(a)}));const t=document.getElementById("testing-data-unit-container");t&&(this.dropdowns.testingUnit=new w(t,{id:"testing-unit",placeholder:"Percentage",options:[{value:"percentage",title:"Percentage",icon:"fas fa-percentage"},{value:"rows",title:"Rows",icon:"fas fa-table"}],value:"percentage"}));const n=document.getElementById("testing-data-from-container");n&&(this.dropdowns.testingFrom=new w(n,{id:"testing-from",placeholder:"Random Selection",options:[{value:"random",title:"Random Selection",icon:"fas fa-random"},{value:"first",title:"First Rows",icon:"fas fa-arrow-up"},{value:"last",title:"Last Rows",icon:"fas fa-arrow-down"}],value:"random"}))}setupEventListeners(){const e=document.querySelector(".model-history .history-controls");if(e){const r=e.querySelector(".minus-button"),c=e.querySelector(".plus-button"),d=e.querySelector("span:nth-child(2)");r.addEventListener("click",()=>{this.modelHistoryVersions>0&&(this.modelHistoryVersions--,d.textContent=this.modelHistoryVersions,this.updateCostCalculations())}),c.addEventListener("click",()=>{this.modelHistoryVersions++,d.textContent=this.modelHistoryVersions,this.updateCostCalculations()})}const t=document.querySelector(".processing-units .history-controls");if(t){const r=t.querySelector(".minus-button"),c=t.querySelector(".plus-button"),d=t.querySelector("span:nth-child(2)"),u=t.querySelector(".gpu-info");r.addEventListener("click",()=>{this.processingUnits>1&&(this.processingUnits--,d.textContent=this.processingUnits,this.updateProcessingUnitsDisplay(u),this.updateCostCalculations())}),c.addEventListener("click",()=>{this.processingUnits<10&&(this.processingUnits++,d.textContent=this.processingUnits,this.updateProcessingUnitsDisplay(u),this.updateCostCalculations())})}["epoch","hidden-layers","batch-size","model-name","model-description"].forEach(r=>{const c=document.getElementById(r);c&&(c.addEventListener("input",()=>{this.updateMetricsDisplay()}),c.addEventListener("change",()=>{this.updateMetricsDisplay()}))});const a=document.getElementById("model-algorithm");a&&a.addEventListener("change",r=>{this.selectedAlgorithm=r.target.value,this.updateParameterFields(r.target.value),this.updateMetricsDisplay()});const s=document.getElementById("csv-upload");s&&s.addEventListener("change",r=>{const c=r.target.files[0];if(c&&(c.type==="text/csv"||c.name.endsWith(".csv")||c.type==="text/plain"||c.type===""||c.name.endsWith(".xlsx")||c.name.endsWith(".xls")||c.name.endsWith(".json"))){this.selectedFile=c;const d=document.getElementById("file-name");d&&(d.textContent=c.name);const u=document.getElementById("upload-button");u&&(u.style.display="inline-block");const m=document.getElementById("clear-file-btn");m&&(m.style.display="inline-block"),console.log("File selected:",c.name)}});const o=document.getElementById("clear-file-btn");o&&o.addEventListener("click",()=>this.clearFile());const l=document.getElementById("upload-button");l&&l.addEventListener("click",()=>{if(!this.selectedModelId){const r=document.getElementById("model-selector-dropdown");this.highlightField(r,"Please select a model from the dropdown in the top right before uploading data.");return}if(!this.selectedFile){const r=document.querySelector(".uploaded-data");this.highlightField(r,"Please select a file first.");return}this.handleFileUpload(this.selectedFile)}),this.updateButtonStyles(),this.setupPreprocessingListeners()}setupPreprocessingListeners(){const e=document.getElementById("enable-preprocessing");e&&e.addEventListener("change",s=>{this.preprocessingEnabled=s.target.checked;const o=document.getElementById("preprocessing-options");o&&(o.style.display=this.preprocessingEnabled?"block":"none"),this.preprocessingEnabled&&this.uploadedData?(this.detectColumnTypes(),this.applyTransformations()):!this.preprocessingEnabled&&this.originalData&&(this.uploadedData=JSON.parse(JSON.stringify(this.originalData)),this.analyzeDataQuality(),this.updateMetricsDisplay())});const t=document.getElementById("numerical-method");t&&t.addEventListener("change",s=>{this.preprocessingConfig.numericalMethod=s.target.value,Object.keys(this.preprocessingConfig.columnTypes).forEach(o=>{this.preprocessingConfig.columnTypes[o]==="numerical"&&(this.preprocessingConfig.columnTransformers[o]=s.target.value)}),this.updatePreprocessingColumnsDisplay(),this.preprocessingEnabled&&this.applyTransformations()});const n=document.getElementById("auto-detect-types");n&&n.addEventListener("click",()=>{if(!this.uploadedData){alert("Please upload data first");return}this.detectColumnTypes();const s=document.getElementById("preprocessing-stats");s&&(this.updateStatisticsDisplay(),s.style.display="block")});const a=document.getElementById("preview-transformation");a&&a.addEventListener("click",()=>{this.showTransformationPreview()})}updateStatisticsDisplay(){const e=document.querySelector("#preprocessing-stats .stats-grid");if(!e||!this.uploadedData)return;let t="";this.columnNames.forEach((n,a)=>{if(this.preprocessingConfig.columnTypes[n]==="numerical"){const s=this.calculateColumnStatistics(a);s&&(t+=`
                        <div class="stat-card">
                            <h5>${n}</h5>
                            <div class="stat-details">
                                <span>Count: ${s.count}</span>
                                <span>Mean: ${s.mean.toFixed(2)}</span>
                                <span>Std: ${s.std.toFixed(2)}</span>
                                <span>Min: ${s.min.toFixed(2)}</span>
                                <span>Max: ${s.max.toFixed(2)}</span>
                            </div>
                        </div>
                    `)}}),t===""&&(t="<p>No numerical columns detected</p>"),e.innerHTML=t}updateButtonStyles(){const e=document.querySelector(".back-button"),t=document.querySelector(".finish-button");e&&(e.className="btn btn-secondary",e.innerHTML='<i class="fas fa-arrow-left"></i> Back'),t&&(t.className="btn btn-primary",t.innerHTML='<i class="fas fa-check"></i> Finish & Train Model');const n=document.querySelector(".upload-button");n&&(n.className="btn btn-primary",n.innerHTML='<i class="fas fa-upload"></i> Upload'),document.querySelectorAll(".minus-button, .plus-button").forEach(a=>{a.className=a.classList.contains("minus-button")?"btn btn-sm btn-secondary minus-button":"btn btn-sm btn-secondary plus-button"})}initializeMetricsDisplay(){this.dataMetrics={accuracy:0,dataQuality:0,modelComplexity:0,modelQuality:0},this.updateCostSummary();const e=document.querySelector(".model-history .cost");e&&(e.innerHTML="Cost: <strong>0</strong> tokens per version")}updateProcessingUnitsDisplay(e){const a=this.processingUnits*8,s=this.processingUnits*4;e&&(e.textContent=`GPU: ${a}GB Memory, ${s} Cores`)}updateCostCalculations(){this.calculateDynamicVersionCost();const e=this.modelHistoryVersions*this.tokenCosts.versionCost,t=document.querySelector(".model-history .cost");t&&(t.innerHTML=`Cost: <strong>${e.toLocaleString()}</strong> tokens per version`),this.updateMetricsDisplay()}loadModelData(e){this.selectedModelId=e,e==="new"?(this.modelType="new",this.clearForm(),this.initializeTaggedDataSection()):(this.modelType="template",this.loadTemplateRequirements(e),console.log("Loading template model:",e))}clearForm(){document.getElementById("model-name").value="",document.getElementById("model-description").value="",document.getElementById("model-function").value="",document.getElementById("epoch").value="",document.getElementById("hidden-layers").value="",document.getElementById("batch-size").value=""}initializeTaggedDataSection(){const e=document.getElementById("tagged-data-content");if(e){if(e.innerHTML="",!this.uploadedData||!this.columnNames||this.columnNames.length===0){e.innerHTML=`
                <div class="placeholder-message">
                    <i class="fas fa-database"></i>
                    <p>${this.modelType?"Upload a CSV file to configure column mappings":"Select a model and upload data to configure column mappings"}</p>
                </div>
            `;return}this.modelType==="template"?this.buildTemplateColumnMapping(e):this.modelType==="new"&&this.buildCustomColumnSelector(e)}}buildTemplateColumnMapping(e){const t=`
            <div class="template-mapping">
                <div class="mapping-header">
                    <h4>Map CSV columns to required fields</h4>
                </div>
                <div class="mapping-rows">
                    ${this.requiredColumns.map((n,a)=>`
                        <div class="mapping-row">
                            <div class="csv-column-select" id="template-map-${a}"></div>
                            <span class="arrow">→</span>
                            <div class="required-field">
                                <input type="text" readonly value="${n.name}" />
                                <span class="field-type">${n.type||"Any"}</span>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;e.innerHTML=t,this.requiredColumns.forEach((n,a)=>{const s=document.getElementById(`template-map-${a}`);if(s){const o=this.columnNames.map((l,r)=>({value:`col_${r}`,title:l,icon:"fas fa-columns"}));this.dropdowns[`template-map-${a}`]=new w(s,{id:`template-map-${a}`,placeholder:"Select CSV column",options:o,size:"small",onChange:()=>this.updateMetricsDisplay()})}})}buildCustomColumnSelector(e){const t=`
            <div class="column-builder">
                <div class="column-section training-section">
                    <h4>Training Columns</h4>
                    <div class="column-list" id="training-column-list">
                        ${this.trainingColumns.length>0?this.trainingColumns.map(n=>this.createColumnItem(n,"training")).join(""):'<p class="no-columns">No columns selected. Add columns from available list.</p>'}
                    </div>
                    <button class="btn btn-sm btn-secondary add-column-btn" onclick="modelEditorPage.showColumnSelector('training')">
                        <i class="fas fa-plus"></i> Add Column
                    </button>
                </div>
                
                <div class="column-section prediction-section">
                    <h4>Prediction Columns</h4>
                    <div class="column-list" id="prediction-column-list">
                        ${this.predictionColumns.length>0?this.predictionColumns.map(n=>this.createColumnItem(n,"prediction")).join(""):'<p class="no-columns">No columns selected. Add columns from available list.</p>'}
                    </div>
                    <button class="btn btn-sm btn-secondary add-column-btn" onclick="modelEditorPage.showColumnSelector('prediction')">
                        <i class="fas fa-plus"></i> Add Column
                    </button>
                </div>
            </div>
            
            <div class="available-columns">
                <h4>Available Columns</h4>
                <div class="column-chips">
                    ${this.columnNames.map((n,a)=>{const s=this.trainingColumns.includes(n)||this.predictionColumns.includes(n);return`
                            <div class="column-chip ${s?"used":""}" data-column="${n}">
                                <span>${n}</span>
                                ${s?'<span class="used-label">In use</span>':`
                                    <button class="add-to-training" onclick="modelEditorPage.addColumnToSection('training', '${n}')">
                                        <i class="fas fa-plus"></i> Train
                                    </button>
                                    <button class="add-to-prediction" onclick="modelEditorPage.addColumnToSection('prediction', '${n}')">
                                        <i class="fas fa-plus"></i> Predict
                                    </button>
                                `}
                            </div>
                        `}).join("")}
                </div>
            </div>
        `;e.innerHTML=t}createColumnItem(e,t){return`
            <div class="column-item" data-column="${e}" data-section="${t}">
                <i class="fas fa-columns"></i>
                <span class="column-name">${e}</span>
                <button class="remove-btn" onclick="modelEditorPage.removeColumnFromSection('${t}', '${e}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `}addColumnToSection(e,t){e==="training"?this.trainingColumns.includes(t)||this.trainingColumns.push(t):e==="prediction"&&(this.predictionColumns.includes(t)||this.predictionColumns.push(t)),this.initializeTaggedDataSection(),this.updateMetricsDisplay()}removeColumnFromSection(e,t){e==="training"?this.trainingColumns=this.trainingColumns.filter(n=>n!==t):e==="prediction"&&(this.predictionColumns=this.predictionColumns.filter(n=>n!==t)),this.initializeTaggedDataSection(),this.updateMetricsDisplay()}showColumnSelector(e){const t=document.querySelector(".available-columns");t&&t.scrollIntoView({behavior:"smooth"})}loadTemplateRequirements(e){const n={model1:{name:"Customer Churn Predictor",description:"Predicts customer churn probability based on purchase history and behavior patterns",modelFunction:"Binary Classification (Logistic Regression)",epoch:50,hiddenLayers:3,batchSize:32,requiredColumns:[{name:"Customer ID",type:"ID",required:!0},{name:"Purchase Amount",type:"Number",required:!0},{name:"Product Category",type:"Category",required:!0},{name:"Date",type:"Date",required:!0}]},model2:{name:"Sales Forecast Model",description:"Forecasts future sales based on historical data and seasonal patterns using time series analysis",modelFunction:"Time Series Regression (LSTM)",epoch:100,hiddenLayers:4,batchSize:64,requiredColumns:[{name:"Sales Date",type:"Date",required:!0},{name:"Revenue",type:"Number",required:!0},{name:"Region",type:"Category",required:!0}]},model3:{name:"Sentiment Analyzer",description:"Analyzes text sentiment and classifies as positive, negative, or neutral using NLP",modelFunction:"Multi-class Classification (BERT)",epoch:30,hiddenLayers:12,batchSize:16,requiredColumns:[{name:"Text Content",type:"Text",required:!0},{name:"Sentiment Score",type:"Number",required:!1}]}}[e];n&&(this.populateFormWithTemplate(n),this.requiredColumns=n.requiredColumns||[],this.initializeTaggedDataSection())}populateFormWithTemplate(e){const t=document.getElementById("model-name"),n=document.getElementById("model-description"),a=document.getElementById("model-function"),s=document.getElementById("epoch"),o=document.getElementById("hidden-layers"),l=document.getElementById("batch-size");t&&(t.value=e.name||""),n&&(n.value=e.description||""),a&&(a.value=e.modelFunction||""),s&&(s.value=e.epoch||""),o&&(o.value=e.hiddenLayers||""),l&&(l.value=e.batchSize||""),this.updateMetricsDisplay(),console.log("Template loaded:",e.name)}parseCSVData(e){const t=e.split(/\r?\n/).filter(r=>r.trim());if(t.length===0)return null;const n=r=>{const c=[];let d="",u=!1;for(let m=0;m<r.length;m++){const p=r[m],h=r[m+1];p==='"'||p==="'"?u&&p==='"'&&h==='"'?(d+='"',m++):u=!u:(p===","||p===";"||p==="	")&&!u?(c.push(d.trim()),d=""):d+=p}return c.push(d.trim()),c},a=n(t[0]),s=a.some(r=>{const c=r.replace(/['"]/g,"");return isNaN(parseFloat(c))||c.length>20||/[a-zA-Z]{2,}/.test(c)});s?this.columnNames=a.map(r=>r.replace(/['"]/g,"")||`Column${a.indexOf(r)+1}`):this.columnNames=a.map((r,c)=>`Column${c+1}`);const o=s?1:0,l=[];for(let r=o;r<Math.min(t.length,100);r++)if(t[r].trim()){const c=n(t[r]);l.push(c)}return this.uploadedData={headers:this.columnNames,data:l,rowCount:t.length-(s?1:0)},console.log("Parsed CSV:",{columns:this.columnNames.length,rows:this.uploadedData.rowCount,headers:this.columnNames}),this.uploadedData}analyzeDataQuality(){if(!this.uploadedData||!this.uploadedData.data||this.uploadedData.data.length===0)return this.dataMetrics.dataQuality=0,this.dataMetrics.accuracy=0,this.dataMetrics;let e=0,t=0,n=0,a=0;this.columnNames.forEach((l,r)=>{let c=!0;this.uploadedData.data.forEach(d=>{t++;const u=d[r];!u||u===""||u.toLowerCase()==="null"||u.toLowerCase()==="nan"?e++:isNaN(parseFloat(u))&&(c=!1)}),c?n++:a++});const s=t>0?(t-e)/t*100:0,o=n>0&&a>0?15:5;return this.dataMetrics.dataQuality=Math.min(100,Math.round(s*.8+o)),this.calculateAccuracy(),this.dataMetrics}calculateAccuracy(){let e=0;if(this.uploadedData&&this.uploadedData.rowCount>0){const t=Math.min(40,this.dataMetrics.dataQuality*.4);e+=t}if(this.dataMetrics.modelComplexity>0){const t=Math.min(30,this.dataMetrics.modelComplexity*.3);e+=t}if(this.dataMetrics.modelQuality>0){const t=Math.min(30,this.dataMetrics.modelQuality*.3);e+=t}this.dataMetrics.accuracy=Math.round(e)}calculateModelComplexity(){var c,d,u;const e=(c=document.getElementById("epoch"))==null?void 0:c.value,t=(d=document.getElementById("hidden-layers"))==null?void 0:d.value,n=(u=document.getElementById("batch-size"))==null?void 0:u.value;if(!e&&!t&&!n)return this.dataMetrics.modelComplexity=0,this.dataMetrics.modelQuality=this.dataMetrics.dataQuality?Math.round(this.dataMetrics.dataQuality*.3):0,this.dataMetrics;const a=parseInt(e)||0,s=parseInt(t)||0,o=parseInt(n)||0;let l=0;if(a>0&&(l+=Math.min(35,a/2)),s>0&&(l+=Math.min(35,s*7)),o>0){const m=Math.max(0,30-Math.abs(o-48)*.5);l+=Math.min(30,m)}this.dataMetrics.modelComplexity=Math.round(l);const r=this.getDropdownSelectionBonus();return this.dataMetrics.modelQuality=Math.round(this.dataMetrics.modelComplexity*.3+this.dataMetrics.dataQuality*.5+r*.2),this.dataMetrics}getDropdownSelectionBonus(){let e=0,t=0;return Object.keys(this.dropdowns).forEach(n=>{if(n.startsWith("dropdown-")){t++;const a=this.dropdowns[n];a&&a.getValue&&a.getValue()&&e++}}),t>0?e/t*100:0}updateDropdownsWithColumns(){!this.columnNames||this.columnNames.length===0||(this.initializeTaggedDataSection(),this.updateMetricsDisplay())}calculateDynamicTokenCost(){var s,o,l;let e=0;this.uploadedData&&this.uploadedData.rowCount>0&&(e+=Math.round(this.uploadedData.rowCount*.1));const t=(s=document.getElementById("epoch"))==null?void 0:s.value,n=(o=document.getElementById("hidden-layers"))==null?void 0:o.value,a=(l=document.getElementById("batch-size"))==null?void 0:l.value;return t&&t!==""&&(e+=parseInt(t)*50),n&&n!==""&&(e+=parseInt(n)*100),a&&a!==""&&(e+=parseInt(a)*5),this.tokenCosts.trainingBaseCost=e,e}calculateDynamicVersionCost(){var a,s;let e=0;e=50;const t=(a=document.getElementById("epoch"))==null?void 0:a.value,n=(s=document.getElementById("hidden-layers"))==null?void 0:s.value;return t&&t!==""&&(e+=parseInt(t)*10),n&&n!==""&&(e+=parseInt(n)*20),this.uploadedData&&this.uploadedData.rowCount>0&&(e+=Math.round(this.uploadedData.rowCount*.01)),this.tokenCosts.versionCost=e,e}updateMetricsDisplay(){this.calculateModelComplexity(),this.calculateAccuracy(),this.calculateDynamicTokenCost(),this.calculateDynamicVersionCost(),this.updateCostSummary()}updateCostSummary(){const e=this.calculateDynamicTokenCost(),t=this.modelHistoryVersions*this.tokenCosts.versionCost,n=e*this.processingUnits+t;let a="0 MB";if(this.uploadedData&&this.uploadedData.rowCount>0){const r=this.uploadedData.rowCount*this.columnNames.length*50;a=this.formatFileSize(r)}let s=0;this.uploadedData&&this.uploadedData.rowCount>0&&(s+=Math.round(this.uploadedData.rowCount/100)+5),this.dataMetrics.modelComplexity>0&&(s+=Math.round(this.dataMetrics.modelComplexity*1.2));let o=s>0?Math.max(1,Math.round(s/this.processingUnits)):0;const l=(r,c)=>{const d=document.getElementById(r);d&&(d.textContent=c)};l("total-data-size",a),l("total-token-cost",`${n.toLocaleString()} tokens`),l("predicted-accuracy",`${this.dataMetrics.accuracy}%`),l("data-quality",`${this.dataMetrics.dataQuality}%`),l("model-complexity",`${this.dataMetrics.modelComplexity}%`),l("model-quality",`${this.dataMetrics.modelQuality}%`),l("training-time",`${o} min`),l("model-versions",`${this.modelHistoryVersions} versions`),console.log("Cost Summary updated:",{dataSize:a,totalCost:n,accuracy:this.dataMetrics.accuracy,dataQuality:this.dataMetrics.dataQuality,modelComplexity:this.dataMetrics.modelComplexity,modelQuality:this.dataMetrics.modelQuality,trainingTime:o,versions:this.modelHistoryVersions})}formatFileSize(e){if(e===0)return"0 MB";const t=1024,n=["Bytes","KB","MB","GB"],a=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,a)).toFixed(2))+" "+n[a]}handleFileUpload(e){if(!e)return;const t=document.getElementById("progress-bar");document.getElementById("upload-status"),document.getElementById("eta"),t&&(t.style.width="0%",t.style.backgroundColor="var(--primary-color)"),this.processFileUpload(e)}processFileUpload(e){const t=document.getElementById("progress-bar"),n=document.getElementById("upload-status"),a=document.getElementById("eta");let s=0;const o=setInterval(()=>{if(s+=10,t&&(t.style.width=`${s}%`),n&&(n.textContent=`Processing... ${s}%`),a&&s<100){const l=Math.ceil((100-s)/10*.2);a.textContent=`ETA: ${l}s`}s>=100&&(clearInterval(o),n&&(n.textContent="Complete"),a&&(a.textContent=""),t&&(t.style.backgroundColor="var(--success-color, #4caf50)"),this.readAndParseFile(e))},200)}readAndParseFile(e){const t=new FileReader;t.onload=n=>{const a=n.target.result;this.parseCSVData(a)&&(this.analyzeDataQuality(),this.updateDropdownsWithColumns(),this.updateMetricsDisplay(),console.log("Parsed columns:",this.columnNames),console.log("Data metrics:",this.dataMetrics))},t.onerror=()=>{const n=document.getElementById("upload-status");n&&(n.textContent="Error reading file");const a=document.getElementById("progress-bar");a&&(a.style.backgroundColor="var(--error-color, #f44336)")},t.readAsText(e)}getAlgorithmConfigs(){return{random_forest_clf:{name:"Random Forest Classifier",params:{n_estimators:{label:"Number of Trees",type:"number",default:100,min:10,max:1e3},max_depth:{label:"Max Depth",type:"number",default:10,min:1,max:50},min_samples_split:{label:"Min Samples Split",type:"number",default:2,min:2,max:20}}},svm_clf:{name:"Support Vector Machine",params:{kernel:{label:"Kernel",type:"select",options:["linear","rbf","poly","sigmoid"],default:"rbf"},C:{label:"C Parameter",type:"number",default:1,min:.01,max:100,step:.01},gamma:{label:"Gamma",type:"select",options:["scale","auto"],default:"scale"}}},logistic_regression:{name:"Logistic Regression",params:{penalty:{label:"Penalty",type:"select",options:["l1","l2","elasticnet","none"],default:"l2"},C:{label:"Inverse Regularization",type:"number",default:1,min:.01,max:100,step:.01},max_iter:{label:"Max Iterations",type:"number",default:100,min:50,max:1e3}}},neural_network_clf:{name:"Neural Network Classifier",params:{hidden_layers:{label:"Hidden Layers",type:"number",default:2,min:1,max:10},neurons_per_layer:{label:"Neurons per Layer",type:"number",default:128,min:16,max:512},learning_rate:{label:"Learning Rate",type:"number",default:.001,min:1e-4,max:.1,step:1e-4},activation:{label:"Activation",type:"select",options:["relu","sigmoid","tanh"],default:"relu"}}},xgboost_clf:{name:"XGBoost Classifier",params:{n_estimators:{label:"Number of Boosting Rounds",type:"number",default:100,min:10,max:1e3},max_depth:{label:"Max Depth",type:"number",default:6,min:1,max:20},learning_rate:{label:"Learning Rate",type:"number",default:.3,min:.01,max:1,step:.01}}},linear_regression:{name:"Linear Regression",params:{fit_intercept:{label:"Fit Intercept",type:"checkbox",default:!0},normalize:{label:"Normalize",type:"checkbox",default:!1}}},random_forest_reg:{name:"Random Forest Regressor",params:{n_estimators:{label:"Number of Trees",type:"number",default:100,min:10,max:1e3},max_depth:{label:"Max Depth",type:"number",default:10,min:1,max:50}}},kmeans:{name:"K-Means Clustering",params:{n_clusters:{label:"Number of Clusters",type:"number",default:3,min:2,max:20},max_iter:{label:"Max Iterations",type:"number",default:300,min:100,max:1e3}}},lstm:{name:"LSTM Network",params:{lstm_units:{label:"LSTM Units",type:"number",default:50,min:10,max:200},dropout:{label:"Dropout Rate",type:"number",default:.2,min:0,max:.5,step:.1},lookback:{label:"Lookback Period",type:"number",default:10,min:1,max:100}}}}}updateParameterFields(e){const t=document.getElementById("algorithm-params-row");if(!t||!e)return;const n=this.algorithmConfigs[e];if(!n)return;t.innerHTML="";let a=0;for(const[s,o]of Object.entries(n.params)){if(a>=2)break;const l=document.createElement("div");l.className="form-group";const r=document.createElement("label");r.setAttribute("for",`param-${s}`),r.textContent=o.label+":",l.appendChild(r);let c;o.type==="select"?(c=document.createElement("select"),o.options.forEach(d=>{const u=document.createElement("option");u.value=d,u.textContent=d,d===o.default&&(u.selected=!0),c.appendChild(u)})):o.type==="checkbox"?(c=document.createElement("input"),c.type="checkbox",c.checked=o.default):(c=document.createElement("input"),c.type="number",c.placeholder=o.default,c.value=o.default,c.min=o.min,c.max=o.max,o.step&&(c.step=o.step)),c.id=`param-${s}`,c.className="algorithm-param",c.addEventListener("change",()=>this.updateMetricsDisplay()),c.addEventListener("input",()=>this.updateMetricsDisplay()),l.appendChild(c),t.appendChild(l),a++}if(e.includes("neural_network")||e==="lstm"){const s=document.createElement("div");s.className="form-group",s.innerHTML=`
                <label for="epoch">Epochs:</label>
                <input type="number" id="epoch" placeholder="10" min="1" max="1000" value="10">
            `;const o=document.createElement("div");o.className="form-group",o.innerHTML=`
                <label for="batch-size">Batch Size:</label>
                <input type="number" id="batch-size" placeholder="32" min="1" max="512" value="32">
            `,a<2&&(t.appendChild(s),a++),a<2&&t.appendChild(o);const l=s.querySelector("#epoch"),r=o.querySelector("#batch-size");l&&(l.addEventListener("change",()=>this.updateMetricsDisplay()),l.addEventListener("input",()=>this.updateMetricsDisplay())),r&&(r.addEventListener("change",()=>this.updateMetricsDisplay()),r.addEventListener("input",()=>this.updateMetricsDisplay()))}}highlightField(e,t){if(!e)return;if(this.clearValidationErrors(),e.classList.add("validation-error"),t){const a=document.createElement("div");a.className="validation-message",a.textContent=t;const s=e.closest(".form-group")||e.closest(".card")||e;s.parentNode.insertBefore(a,s.nextSibling)}e.scrollIntoView({behavior:"smooth",block:"center"}),(e.tagName==="INPUT"||e.tagName==="SELECT"||e.tagName==="TEXTAREA")&&setTimeout(()=>e.focus(),300);const n=()=>{e.classList.remove("validation-error");const a=e.parentNode.querySelector(".validation-message");a&&a.remove(),e.removeEventListener("input",n),e.removeEventListener("change",n)};e.addEventListener("input",n),e.addEventListener("change",n)}clearValidationErrors(){document.querySelectorAll(".validation-error").forEach(e=>{e.classList.remove("validation-error")}),document.querySelectorAll(".validation-message").forEach(e=>{e.remove()})}createModel(){var a,s,o,l,r,c,d;const e=(a=document.getElementById("model-name"))==null?void 0:a.value,t=(s=document.getElementById("model-algorithm"))==null?void 0:s.value;if(!e||e.trim()===""){const u=document.getElementById("model-name");this.highlightField(u,"Please enter a model name");return}if(!t||t===""){const u=document.getElementById("model-algorithm");this.highlightField(u,"Please select an ML algorithm");return}if(!this.uploadedData||this.columnNames.length===0){const u=document.querySelector(".uploaded-data");this.highlightField(u,"Please upload training data");return}if(this.modelType==="new"&&this.trainingColumns.length===0){const u=document.querySelector(".tagged-data");this.highlightField(u,"Please select at least one training column");return}const n={name:e,description:((o=document.getElementById("model-description"))==null?void 0:o.value)||"",algorithm:t,epochs:parseInt((l=document.getElementById("epoch"))==null?void 0:l.value)||10,hiddenLayers:parseInt((r=document.getElementById("hidden-layers"))==null?void 0:r.value)||2,batchSize:parseInt((c=document.getElementById("batch-size"))==null?void 0:c.value)||32,trainingColumns:this.trainingColumns,predictionColumns:this.predictionColumns,dataSize:((d=this.uploadedData)==null?void 0:d.rowCount)||0,modelVersions:this.modelHistoryVersions,totalTokenCost:this.calculateDynamicTokenCost(),estimatedAccuracy:this.dataMetrics.accuracy,modelComplexity:this.dataMetrics.modelComplexity,dataQuality:this.dataMetrics.dataQuality,preprocessingEnabled:this.preprocessingEnabled,preprocessingConfig:this.preprocessingEnabled?{numericalMethod:this.preprocessingConfig.numericalMethod,columnTypes:this.preprocessingConfig.columnTypes,columnTransformers:this.preprocessingConfig.columnTransformers,statistics:this.preprocessingConfig.statistics}:null};this.showProgressModal(n)}showProgressModal(e){const t=document.getElementById("progress-modal");if(!t)return;t.style.display="flex";const n=document.getElementById("total-epochs");n&&(n.textContent=e.epochs);const a=document.getElementById("continue-background");a&&(a.onclick=()=>{const o={id:Date.now(),type:"model_training",modelName:e.name,algorithm:e.algorithm,startTime:Date.now(),status:"in_progress",progress:this.currentProgress||0,currentStage:this.currentStage||"validating"};localStorage.setItem("activeTraining",JSON.stringify(o)),t.style.display="none",window.location.hash="#dashboard?tab=in-progress"}),t.querySelectorAll(".close-modal").forEach(o=>{o.onclick=()=>{t.style.display="none"}}),this.simulateTrainingProgress(e)}simulateTrainingProgress(e){const t=["validating","initializing","training","evaluating","finalizing"];let n=0,a=0,s=0;const o=Date.now(),l=()=>{a<20?n=0:a<30?n=1:a<70?(n=2,s=Math.floor((a-30)/40*e.epochs)):a<90?n=3:n=4,document.querySelectorAll(".stage-item").forEach((v,S)=>{S<n?(v.classList.add("completed"),v.classList.remove("active")):S===n?(v.classList.add("active"),v.classList.remove("completed")):v.classList.remove("active","completed")});const c=document.getElementById("generation-progress-fill"),d=document.querySelector(".progress-percentage");c&&(c.style.width=`${a}%`),d&&(d.textContent=`${a}%`);const u=document.getElementById("training-progress");u&&(u.textContent=s);const m=Date.now()-o,p=Math.floor(m/6e4),h=Math.floor(m%6e4/1e3),g=document.getElementById("time-elapsed");if(g&&(g.textContent=`${p}:${h.toString().padStart(2,"0")}`),a>0){const S=m/(a/100)-m,E=Math.floor(S/6e4),I=Math.floor(S%6e4/1e3),x=document.getElementById("eta-remaining");x&&(x.textContent=`${E}:${I.toString().padStart(2,"0")}`)}const y=document.getElementById("status-message");if(y){const v={validating:"Validating training data and configuration...",initializing:"Initializing neural network architecture...",training:`Training model (Epoch ${s}/${e.epochs})...`,evaluating:"Evaluating model performance on test data...",finalizing:"Finalizing model and preparing for download..."};y.textContent=v[t[n]]}a<100?(a+=Math.random()*3+1,a=Math.min(a,100),setTimeout(l,500)):this.completeTraining(e,o)};l()}completeTraining(e,t){const n=document.getElementById("completion-section"),a=document.querySelector(".current-status");n&&(n.style.display="block"),a&&(a.style.display="none");const s=document.getElementById("final-accuracy");s&&(s.textContent=e.estimatedAccuracy);const o=Date.now()-t,l=Math.floor(o/6e4),r=Math.floor(o%6e4/1e3),c=document.getElementById("total-time");c&&(c.textContent=`${l}:${r.toString().padStart(2,"0")}`);const d=document.getElementById("model-size");d&&(d.textContent=`${(Math.random()*50+10).toFixed(1)} MB`);const u=document.getElementById("download-model");u&&(u.onclick=()=>{alert(`Downloading model: ${e.name}.pkl`)});const m=document.getElementById("view-metrics");m&&(m.onclick=()=>{alert(`Model Metrics:

Accuracy: ${e.estimatedAccuracy}%
Precision: ${(e.estimatedAccuracy*.95).toFixed(1)}%
Recall: ${(e.estimatedAccuracy*.93).toFixed(1)}%
F1 Score: ${(e.estimatedAccuracy*.94).toFixed(1)}%`)})}detectColumnTypes(){if(!(!this.uploadedData||!this.uploadedData.data||this.uploadedData.data.length===0))return this.preprocessingConfig.columnTypes={},this.columnNames.forEach((e,t)=>{let n=!0,a=new Set,s=0;this.uploadedData.data.forEach(o=>{const l=o[t];l&&l!==""&&l.toLowerCase()!=="null"&&l.toLowerCase()!=="nan"&&(s++,a.add(l),isNaN(parseFloat(l))&&(n=!1))}),n&&s>0?(this.preprocessingConfig.columnTypes[e]="numerical",this.preprocessingConfig.columnTransformers[e]=this.preprocessingConfig.numericalMethod):a.size<20&&a.size>1?(this.preprocessingConfig.columnTypes[e]="categorical",this.preprocessingConfig.columnTransformers[e]="label_encode"):(this.preprocessingConfig.columnTypes[e]="text",this.preprocessingConfig.columnTransformers[e]="none")}),this.updatePreprocessingColumnsDisplay(),this.preprocessingConfig.columnTypes}calculateColumnStatistics(e){if(!this.uploadedData||!this.uploadedData.data)return null;const t=[];if(this.uploadedData.data.forEach(s=>{const o=parseFloat(s[e]);isNaN(o)||t.push(o)}),t.length===0)return null;t.sort((s,o)=>s-o);const n={count:t.length,mean:t.reduce((s,o)=>s+o,0)/t.length,min:t[0],max:t[t.length-1],median:t[Math.floor(t.length/2)],q1:t[Math.floor(t.length*.25)],q3:t[Math.floor(t.length*.75)]},a=t.map(s=>Math.pow(s-n.mean,2));return n.std=Math.sqrt(a.reduce((s,o)=>s+o,0)/t.length),n.iqr=n.q3-n.q1,n}standardizeZScore(e,t){return!t||t.std===0?e:e.map(n=>n===null||n===""||isNaN(n)?n:(parseFloat(n)-t.mean)/t.std)}standardizeMinMax(e,t){if(!t||t.max===t.min)return e;const n=t.max-t.min;return e.map(a=>a===null||a===""||isNaN(a)?a:(parseFloat(a)-t.min)/n)}standardizeRobust(e,t){return!t||t.iqr===0?e:e.map(n=>n===null||n===""||isNaN(n)?n:(parseFloat(n)-t.median)/t.iqr)}standardizeLog(e){return e.map(t=>{if(t===null||t===""||isNaN(t))return t;const n=parseFloat(t);return n>0?Math.log(n+1):0})}applyTransformations(){if(!(!this.uploadedData||!this.preprocessingEnabled))return this.originalData||(this.originalData=JSON.parse(JSON.stringify(this.uploadedData))),this.transformedData={headers:[...this.uploadedData.headers],data:this.uploadedData.data.map(e=>[...e]),rowCount:this.uploadedData.rowCount},this.columnNames.forEach((e,t)=>{const n=this.preprocessingConfig.columnTypes[e],a=this.preprocessingConfig.columnTransformers[e];if(n==="numerical"&&a!=="none"){const s=this.calculateColumnStatistics(t);this.preprocessingConfig.statistics[e]=s;const o=this.transformedData.data.map(r=>r[t]);let l;switch(a){case"zscore":l=this.standardizeZScore(o,s);break;case"minmax":l=this.standardizeMinMax(o,s);break;case"robust":l=this.standardizeRobust(o,s);break;case"log":l=this.standardizeLog(o);break;default:l=o}l.forEach((r,c)=>{this.transformedData.data[c][t]=r})}}),this.uploadedData=this.transformedData,this.analyzeDataQuality(),this.updateMetricsDisplay(),this.transformedData}updatePreprocessingColumnsDisplay(){const e=document.getElementById("preprocessing-columns");if(!e||this.columnNames.length===0)return;let t='<h4>Column Configuration</h4><div class="columns-grid">';this.columnNames.forEach(n=>{const a=this.preprocessingConfig.columnTypes[n]||"unknown",s=this.preprocessingConfig.columnTransformers[n]||"none";t+=`
                <div class="column-config" data-column="${n}">
                    <div class="column-header">
                        <span class="column-name">${n}</span>
                        <span class="column-type-badge ${a}">${a}</span>
                    </div>
                    <div class="column-transformer">
                        <select class="column-transformer-select" data-column="${n}">
                            ${a==="numerical"?`
                                <option value="none" ${s==="none"?"selected":""}>No Transform</option>
                                <option value="zscore" ${s==="zscore"?"selected":""}>Z-Score</option>
                                <option value="minmax" ${s==="minmax"?"selected":""}>Min-Max</option>
                                <option value="robust" ${s==="robust"?"selected":""}>Robust</option>
                                <option value="log" ${s==="log"?"selected":""}>Log</option>
                            `:a==="categorical"?`
                                <option value="none" ${s==="none"?"selected":""}>No Transform</option>
                                <option value="label_encode" ${s==="label_encode"?"selected":""}>Label Encode</option>
                                <option value="one_hot" ${s==="one_hot"?"selected":""}>One-Hot Encode</option>
                            `:`
                                <option value="none">No Transform</option>
                            `}
                        </select>
                    </div>
                </div>
            `}),t+="</div>",e.innerHTML=t,e.querySelectorAll(".column-transformer-select").forEach(n=>{n.addEventListener("change",a=>{const s=a.target.dataset.column;this.preprocessingConfig.columnTransformers[s]=a.target.value,this.preprocessingEnabled&&this.applyTransformations()})})}showTransformationPreview(){if(!this.uploadedData||this.columnNames.length===0){alert("Please upload data first");return}const e=5,t=this.originalData||this.uploadedData,n=this.preprocessingEnabled;this.preprocessingEnabled=!0,this.applyTransformations();const a=this.transformedData;this.preprocessingEnabled=n;let s=`
            <div class="transformation-preview-modal">
                <h3>Data Transformation Preview</h3>
                <div class="preview-comparison">
                    <div class="preview-section">
                        <h4>Original Data (First ${e} rows)</h4>
                        <table class="preview-table">
                            <thead>
                                <tr>${this.columnNames.map(l=>`<th>${l}</th>`).join("")}</tr>
                            </thead>
                            <tbody>
        `;for(let l=0;l<Math.min(e,t.data.length);l++)s+="<tr>",t.data[l].forEach(r=>{s+=`<td>${r}</td>`}),s+="</tr>";s+=`
                            </tbody>
                        </table>
                    </div>
                    <div class="preview-section">
                        <h4>Transformed Data (First ${e} rows)</h4>
                        <table class="preview-table">
                            <thead>
                                <tr>${this.columnNames.map(l=>`<th>${l}</th>`).join("")}</tr>
                            </thead>
                            <tbody>
        `;for(let l=0;l<Math.min(e,a.data.length);l++)s+="<tr>",a.data[l].forEach((r,c)=>{const u=this.preprocessingConfig.columnTypes[this.columnNames[c]]==="numerical"&&this.preprocessingConfig.columnTransformers[this.columnNames[c]]!=="none",m=typeof r=="number"?r.toFixed(4):r;s+=`<td class="${u?"transformed-cell":""}">${m}</td>`}),s+="</tr>";s+=`
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="preview-stats">
                    <h4>Column Statistics</h4>
                    <div class="stats-table">
        `,this.columnNames.forEach((l,r)=>{if(this.preprocessingConfig.columnTypes[l]==="numerical"){const c=this.calculateColumnStatistics(r);c&&(s+=`
                        <div class="stat-row">
                            <strong>${l}:</strong>
                            Mean: ${c.mean.toFixed(2)}, 
                            Std: ${c.std.toFixed(2)}, 
                            Min: ${c.min.toFixed(2)}, 
                            Max: ${c.max.toFixed(2)}
                        </div>
                    `)}}),s+=`
                    </div>
                </div>
                <button onclick="this.parentElement.remove()" class="btn btn-primary">Close</button>
            </div>
        `;const o=document.createElement("div");o.className="preprocessing-preview-overlay",o.innerHTML=s,document.body.appendChild(o)}clearFile(){this.selectedFile=null,this.uploadedData=null,this.originalData=null,this.transformedData=null,this.preprocessingConfig.columnTypes={},this.preprocessingConfig.columnTransformers={},this.preprocessingConfig.statistics={};const e=document.getElementById("csv-upload"),t=document.getElementById("file-name"),n=document.getElementById("progress-bar"),a=document.getElementById("upload-status"),s=document.getElementById("eta"),o=document.getElementById("upload-button"),l=document.getElementById("clear-file-btn");e&&(e.value=""),t&&(t.textContent="No file chosen"),n&&(n.style.width="0%"),a&&(a.textContent=""),s&&(s.textContent=""),l&&(l.style.display="none"),o&&(o.style.display="inline-block");const r=document.getElementById("tagged-data-content");r&&(r.innerHTML='<div class="placeholder-message"><i class="fas fa-cloud-upload-alt"></i><p>Upload data to see tagged fields</p></div>'),this.dataMetrics={accuracy:0,dataQuality:0,modelComplexity:0,modelQuality:0},this.columnNames=[],this.updateMetricsDisplay()}}const Z=new $t;window.modelEditorPage=Z;window.clearFile=()=>Z.clearFile();let G=null,T=null,H="ctgan",F={};async function Dt(){console.log("Setting up advanced data generator..."),document.readyState!=="complete"&&(console.log("Waiting for DOM to be ready..."),await new Promise(s=>{window.addEventListener("load",s)})),k("src/components/StyledDropdown/StyledDropdown.css"),k("src/components/GeneratePredictionsPage/ModelEditorStyles.css"),await Pt(),At(),fn(),vn(),Wt(),Tn(),Lt(),je(),Bt();let i=document.getElementById("generate-from-pattern");const e=document.getElementById("generate-manual"),t=document.getElementById("generate-multi-table"),n=document.getElementById("clear-template-btn");i||(console.log("Generate button not found, retrying..."),setTimeout(()=>{i=document.getElementById("generate-from-pattern"),i&&(console.log("Found button on retry!"),i.addEventListener("click",J),i.onclick=function(){console.log("Button clicked via onclick (retry)!"),J()})},500)),i?(console.log("Adding click listener to generate button..."),i.addEventListener("click",J),console.log("Click listener added successfully"),i.onclick=function(){console.log("Button clicked via onclick!"),J()}):console.error("Generate button not found on initial check!"),e&&e.addEventListener("click",pn),t&&t.addEventListener("click",Mn),n&&(n.addEventListener("click",ge),n.onclick=ge);const a=document.getElementById("clear-file-btn");a&&(a.addEventListener("click",pe),a.onclick=pe),gn(),yn(),Hn(),C(),Un()}function Lt(){const i=document.getElementById("gen-format");if(i){const a=document.createElement("div");a.className="dropdown-container",i.parentNode.replaceChild(a,i),F.outputFormat=new w(a,{id:"gen-format",placeholder:"Select output format",options:[{value:"csv",title:"CSV",icon:"fas fa-file-csv"},{value:"json",title:"JSON",icon:"fas fa-file-code"},{value:"excel",title:"Excel",icon:"fas fa-file-excel"},{value:"parquet",title:"Parquet",icon:"fas fa-database"}],value:"csv",onChange:s=>{console.log("Output format changed to:",s),V()}})}const e=document.getElementById("data-type");if(e){const a=document.createElement("div");a.className="dropdown-container",e.parentNode.replaceChild(a,e),F.dataType=new w(a,{id:"data-type",placeholder:"Select data type",searchable:!0,options:[{value:"people",title:"People Data (names, demographics)",icon:"fas fa-users"},{value:"numeric",title:"Numeric Data (measurements, values)",icon:"fas fa-chart-line"},{value:"timeseries",title:"Time Series Data",icon:"fas fa-clock"},{value:"categorical",title:"Categorical Data",icon:"fas fa-tags"},{value:"mixed",title:"Mixed Types",icon:"fas fa-random"}],value:"people",onChange:s=>{console.log("Data type changed to:",s),updateColumnTemplates(s)}})}const t=document.getElementById("manual-format");if(t){const a=document.createElement("div");a.className="dropdown-container",t.parentNode.replaceChild(a,t),F.manualFormat=new w(a,{id:"manual-format",placeholder:"Select output format",options:[{value:"csv",title:"CSV",icon:"fas fa-file-csv"},{value:"json",title:"JSON",icon:"fas fa-file-code"},{value:"excel",title:"Excel",icon:"fas fa-file-excel"},{value:"parquet",title:"Parquet",icon:"fas fa-database"}],value:"csv",onChange:s=>{console.log("Manual output format changed to:",s),updateManualEstimates()}})}const n=document.getElementById("multi-table-format");if(n){const a=document.createElement("div");a.className="dropdown-container",n.parentNode.replaceChild(a,n),F.multiTableFormat=new w(a,{id:"multi-table-format",placeholder:"Select output format",options:[{value:"sql",title:"SQL Script",icon:"fas fa-database"},{value:"csv-zip",title:"CSV Files (ZIP)",icon:"fas fa-file-archive"},{value:"json",title:"JSON",icon:"fas fa-file-code"},{value:"sqlite",title:"SQLite Database",icon:"fas fa-server"}],value:"sql",onChange:s=>{console.log("Multi-table output format changed to:",s),U()}})}Mt()}function Mt(){document.querySelectorAll(".column-type:not([data-converted])").forEach((e,t)=>{const n=document.createElement("div");n.className="dropdown-container column-type-dropdown",e.parentNode.replaceChild(n,e);const a=e.value||"string",o=e.closest(".table-definition")!==null?[{value:"id",title:"ID (Primary Key)",icon:"fas fa-key"},{value:"string",title:"String",icon:"fas fa-font"},{value:"integer",title:"Integer",icon:"fas fa-hashtag"},{value:"float",title:"Float",icon:"fas fa-percentage"},{value:"date",title:"Date",icon:"fas fa-calendar"},{value:"boolean",title:"Boolean",icon:"fas fa-toggle-on"}]:[{value:"string",title:"Text",icon:"fas fa-font"},{value:"integer",title:"Integer",icon:"fas fa-hashtag"},{value:"float",title:"Decimal",icon:"fas fa-percentage"},{value:"date",title:"Date",icon:"fas fa-calendar"},{value:"boolean",title:"Boolean",icon:"fas fa-toggle-on"},{value:"category",title:"Category",icon:"fas fa-tags"}];new w(n,{id:`column-type-${Date.now()}-${t}`,placeholder:"Select type",options:o,value:a,size:"small",onChange:l=>{console.log("Column type changed to:",l),V()}}),n.setAttribute("data-converted","true")})}function je(){const i=document.querySelectorAll(".method-card"),e=window.tokenUsageTracker?window.tokenUsageTracker.tier:"developer";i.forEach(t=>{const n=t.dataset.method;t.classList.remove("disabled"),t.style.opacity="1",t.style.cursor="pointer",e==="developer"?n!=="ctgan"&&(t.classList.add("disabled"),t.style.opacity="0.5",t.style.cursor="not-allowed"):e==="professional"&&n==="timegan"&&(t.classList.add("disabled"),t.style.opacity="0.5",t.style.cursor="not-allowed")})}function Bt(){const i=document.getElementById("gen-rows"),e=document.getElementById("manual-rows"),t=document.getElementById("row-limit-hint"),n=window.tokenUsageTracker?window.tokenUsageTracker.tier:"developer",a={developer:1e3,professional:1e5,business:1e7,enterprise:1/0},s={developer:"Developer",professional:"Professional",business:"Business",enterprise:"Enterprise"},o=a[n];if(i&&(i.max=o,parseInt(i.value)>o&&(i.value=o)),e&&(e.max=o,parseInt(e.value)>o&&(e.value=o)),t){const l=o===1/0?"Unlimited":o.toLocaleString();t.querySelector("span").textContent=`${s[n]} plan limit: ${l} rows per generation`}}async function Pt(){try{const e=await(await fetch("/src/components/IndustryTemplateSelector/IndustryTemplateSelector.html")).text(),t=document.getElementById("generatorIndustryTemplateContainer");if(t){if(t.innerHTML=e,!document.querySelector('link[href*="IndustryTemplateSelector.css"]')){const n=document.createElement("link");n.rel="stylesheet",n.href="/src/components/IndustryTemplateSelector/IndustryTemplateSelector.css",document.head.appendChild(n)}if(window.IndustryTemplateSelector)window.generatorIndustrySelector=new IndustryTemplateSelector,window.generatorIndustrySelector.initialize("generatorIndustryTemplateContainer",{onTemplateSelect:(n,a)=>{Pe(n,a)}});else{const n=document.createElement("script");n.src="/src/components/IndustryTemplateSelector/IndustryTemplateSelector.js",n.onload=()=>{window.IndustryTemplateSelector&&(window.generatorIndustrySelector=new IndustryTemplateSelector,window.generatorIndustrySelector.initialize("generatorIndustryTemplateContainer",{onTemplateSelect:(a,s)=>{Pe(a,s)}}))},document.body.appendChild(n)}}}catch(i){console.error("Error loading industry template selector:",i)}}function At(){const i=document.getElementById("csv-upload"),e=document.getElementById("upload-button"),t=document.getElementById("file-name"),n=document.getElementById("upload-progress-row");i&&i.addEventListener("change",a=>{const s=a.target.files;if(s.length>0){if(s.length>1)qt(s),t&&(t.textContent=`${s.length} files selected`);else if(G=s[0],t){const o=(s[0].size/1048576).toFixed(2);t.textContent=`${s[0].name} (${o} MB)`}C()}else t&&(t.textContent="No file chosen"),G=null}),e&&e.addEventListener("click",()=>{if(G)n&&(n.style.display="block"),Ge(G);else{const a=document.querySelector(".uploaded-data");P(a,"Please select a file first")}}),i&&i.addEventListener("click",()=>{i.value="";const a=document.getElementById("progress-bar"),s=document.getElementById("upload-status"),o=document.getElementById("upload-progress-row");a&&(a.style.width="0%",a.className="progress-bar",a.removeAttribute("data-progress")),s&&(s.textContent=""),o&&(o.style.display="none")})}async function _t(i){if(!["text/csv","application/json","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(i.type)&&!i.name.match(/\.(csv|json|xlsx|xls)$/i)){const n=document.querySelector(".uploaded-data");P(n,"Please upload a CSV, JSON, or Excel file.");return}G=i,displayFileInfo(i);const t=document.querySelector(".generation-options-section");t&&(t.style.display="none"),fe("single"),await Ge(i)}async function qt(i){const e=document.querySelector(".generation-options-section");e&&(e.style.display="none");const n=Array.from(i).filter(s=>["text/csv","application/json","application/vnd.ms-excel"].includes(s.type)||s.name.match(/\.(csv|json|xlsx|xls)$/i));if(n.length===0){const s=document.querySelector(".uploaded-data");P(s,"Please upload valid CSV, JSON, or Excel files.");return}if(Bn(n)||n.length>1){fe("multi"),Nt(n);for(const s of n)await Ft(s)}else _t(n[0])}async function Ft(i){try{const e=new FormData;e.append("file",i);const t=await fetch("/api/generator/analyze-relationships",{method:"POST",headers:{Authorization:`Bearer ${localStorage.getItem("token")}`},body:e});if(t.ok){const n=await t.json();n.relationships&&zt(n.relationships)}}catch(e){console.error("Error analyzing file relationships:",e)}}function Nt(i){const e=document.getElementById("tables-container");if(!e)return;e.innerHTML="",i.forEach((n,a)=>{const s=n.name.replace(/\.[^/.]+$/,""),o=Rt(s,a===0);e.appendChild(o)});const t=document.getElementById("relationships-container");t&&i.length>1&&(t.style.display="block")}function Rt(i,e){const t=document.createElement("div");return t.className=e?"table-definition primary-table":"table-definition",t.dataset.tableId=i,t.innerHTML=`
        <div class="table-header">
            <input type="text" class="table-name" value="${i}">
            <span class="table-type-badge ${e?"primary":"foreign"}">${e?"Primary":"Related"}</span>
        </div>
        <div class="table-columns">
            <div class="columns-loading">
                <i class="fas fa-spinner fa-spin"></i> Analyzing columns...
            </div>
        </div>
        <div class="table-row-config">
            <label>Rows to Generate:</label>
            <input type="number" class="table-rows" value="1000" min="1" max="1000000">
        </div>
    `,t}function zt(i){const e=document.getElementById("relationships-list");e&&(e.innerHTML="",i.forEach(t=>{const n=document.createElement("div");n.className="relationship-item",n.innerHTML=`
            <div class="relationship-selects">
                <span>${t.fromTable}.${t.fromColumn}</span>
                <span class="relationship-type">→</span>
                <span>${t.toTable}.${t.toColumn}</span>
            </div>
            <span class="relationship-type">${t.type}</span>
        `,e.appendChild(n)}))}function pe(){G=null,T=null;const i=document.getElementById("csv-upload"),e=document.getElementById("file-name"),t=document.getElementById("analysis-results"),n=document.getElementById("multi-table-section"),a=document.querySelector(".generation-options-section"),s=document.querySelector(".or-divider"),o=document.getElementById("clear-file-btn"),l=document.getElementById("progress-bar"),r=document.getElementById("upload-status"),c=document.getElementById("eta");i&&(i.value=""),e&&(e.textContent="No file chosen"),l&&(l.style.width="0%"),r&&(r.textContent=""),c&&(c.textContent=""),t&&(t.style.display="none"),n&&(n.style.display="none"),a&&(a.style.display="block"),s&&(s.style.display="flex"),o&&(o.style.display="none"),fe("none"),An()}window.clearFile=pe;function Ot(i){const t=["text/csv","application/json","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];return i.size>104857600?{valid:!1,error:"File size exceeds 100MB limit"}:!t.includes(i.type)&&!i.name.match(/\.(csv|json|xlsx|xls)$/i)?{valid:!1,error:"Invalid file type. Please upload CSV, JSON, or Excel files"}:i.size===0?{valid:!1,error:"File is empty"}:{valid:!0}}async function Ge(i){const e=document.getElementById("analysis-results"),t=e.querySelector(".analysis-loading"),n=e.querySelector(".analysis-content"),a=document.getElementById("progress-bar"),s=document.getElementById("upload-status"),o=document.getElementById("upload-progress-row"),l=document.querySelector(".generation-options-section"),r=document.querySelector(".or-divider"),c=document.getElementById("clear-file-btn");l&&(l.style.display="none"),r&&(r.style.display="none"),c&&(c.style.display="inline-block");const d=Ot(i);if(!d.valid){alert(d.error),l&&(l.style.display="block"),r&&(r.style.display="flex"),c&&(c.style.display="none");return}o&&(o.style.display="block"),e.style.display="block",t.style.display="block",n.style.display="none",a&&(a.style.width="0%",a.classList.add("uploading")),s&&(s.textContent="Uploading...",s.style.color="var(--primary-color)");const u=new XMLHttpRequest,m=new FormData;m.append("file",i),u.upload.addEventListener("progress",h=>{if(h.lengthComputable){const g=Math.round(h.loaded/h.total*100);if(a&&(a.style.width=g+"%",a.setAttribute("data-progress",g)),s){const y=(h.loaded/1048576).toFixed(1),v=(h.total/(1024*1024)).toFixed(1);s.textContent=`Uploading: ${y}MB / ${v}MB (${g}%)`}}}),u.addEventListener("load",()=>{if(u.status===200)try{T=JSON.parse(u.responseText),Je(T),a&&(a.classList.remove("uploading"),a.classList.add("complete"),a.style.width="100%",a.setAttribute("data-progress","100")),s&&(s.textContent="Analysis complete!",s.style.color="var(--success-color)");const h=document.getElementById("upload-button");h&&(h.style.display="none"),setTimeout(()=>{o&&(o.style.display="none")},2e3)}catch(h){console.error("Error parsing response:",h),p("Invalid response from server",!0)}else u.status===500?(console.warn("Server analysis failed, using client-side fallback"),a&&(a.classList.remove("uploading"),a.classList.add("complete"),a.style.width="100%"),s&&(s.textContent="Server analysis failed, using local processing...",s.style.color="var(--warning-color, #ff9800)"),setTimeout(()=>{Ht(i)},1e3)):p(`Upload failed with status: ${u.status}`,!1)}),u.addEventListener("error",()=>{p("Network error occurred during upload")}),u.addEventListener("abort",()=>{a&&(a.classList.remove("uploading"),a.style.width="0%"),s&&(s.textContent="Upload cancelled",s.style.color="var(--error-color)"),e.style.display="none"}),u.addEventListener("timeout",()=>{p("Upload timed out")});function p(h,g=!0){console.error("Upload error:",h),a&&(a.classList.remove("uploading"),a.classList.add("error")),s&&(s.innerHTML=g?`${h} <button class="retry-btn" onclick="document.getElementById('upload-button').click()">Retry</button>`:h,s.style.color="var(--error-color)");const y=document.getElementById("upload-button");y&&g&&(y.style.display="inline-block",y.textContent="Retry Analysis")}u.open("POST","/api/generator/analyze"),u.setRequestHeader("Authorization",`Bearer ${localStorage.getItem("token")}`),u.timeout=6e4,u.send(m)}async function Ht(i){const e=document.getElementById("analysis-results"),t=e.querySelector(".analysis-loading"),n=e.querySelector(".analysis-content"),a=document.getElementById("upload-status"),s=document.getElementById("upload-progress-row");e.style.display="block",t.style.display="block",n.style.display="none";try{const o=i.type||i.name.split(".").pop().toLowerCase();let l=null;if(i.type==="text/csv"||i.name.endsWith(".csv")){const d=await i.text();l=Ut(d)}else if(i.type==="application/json"||i.name.endsWith(".json")){const d=await i.text();l=JSON.parse(d),Array.isArray(l)&&(l={columns:l.length>0?Object.keys(l[0]):[],rows:l,row_count:l.length})}else throw new Error("Unsupported file type for client-side parsing");const r={columns:l.columns,row_count:l.rows.length,patterns:Vt(l),preview:{columns:l.columns,rows:l.rows.slice(0,100),total_rows:l.rows.length}};window.analysisResult=r,Je(r),a&&(a.textContent="Local analysis complete!",a.style.color="var(--success-color)");const c=document.getElementById("upload-button");c&&(c.style.display="none"),setTimeout(()=>{s&&(s.style.display="none")},2e3)}catch(o){console.error("Client-side analysis error:",o),a&&(a.innerHTML=`Local analysis failed: ${o.message}. Please try a different file or format.`,a.style.color="var(--error-color)"),e.style.display="none"}}function Ut(i){const e=i.split(`
`).filter(s=>s.trim());if(e.length===0)throw new Error("Empty CSV file");const t=s=>{const o=[];let l="",r=!1;for(let c=0;c<s.length;c++){const d=s[c],u=s[c+1];d==='"'?r&&u==='"'?(l+='"',c++):r=!r:d===","&&!r?(o.push(l.trim()),l=""):l+=d}return o.push(l.trim()),o},n=t(e[0]),a=[];for(let s=1;s<Math.min(e.length,1001);s++){const o=t(e[s]);if(o.length===n.length){const l={};n.forEach((r,c)=>{l[r]=o[c]}),a.push(l)}}return{columns:n,rows:a,row_count:e.length-1}}function Vt(i){const e={};return i.columns.forEach(t=>{const n=i.rows.map(o=>o[t]).filter(o=>o!==null&&o!==""),a=[...new Set(n)];let s="string";n.every(o=>!isNaN(o)&&!isNaN(parseFloat(o)))?s=n.every(o=>Number.isInteger(parseFloat(o)))?"integer":"float":n.every(o=>/^\d{4}-\d{2}-\d{2}/.test(o))?s="date":n.every(o=>o==="true"||o==="false"||o==="0"||o==="1")?s="boolean":n.every(o=>/^[\w._%+-]+@[\w.-]+\.[A-Z]{2,}$/i.test(o))&&(s="email"),e[t]={data_type:s,unique_count:a.length,null_count:i.rows.length-n.length,sample_values:a.slice(0,5),is_categorical:a.length<n.length*.5}}),e}function Je(i){const e=document.querySelector(".analysis-loading"),t=document.querySelector(".analysis-content");e.style.display="none",t.style.display="block",i.preview&&jt(i.preview),i.patterns&&Gt(i.patterns);const n=document.getElementById("generation-config");if(n&&(n.style.display="block"),i.columns&&i.columns.length>0){W(i.columns);const s=document.getElementById("detected-columns-section");s&&(s.style.display="block");const o=document.getElementById("manual-config-section");o&&(o.style.display="none")}const a=document.querySelector(".generation-method-section");a&&(a.style.display="block"),C(),i.columns&&(i.columns,void 0)}function jt(i){const e=document.getElementById("preview-table");e.innerHTML="";const t=document.createElement("thead"),n=document.createElement("tr");i.columns.forEach(s=>{const o=document.createElement("th");o.textContent=s,n.appendChild(o)}),t.appendChild(n),e.appendChild(t);const a=document.createElement("tbody");if(i.rows.slice(0,5).forEach(s=>{const o=document.createElement("tr");i.columns.forEach(l=>{const r=document.createElement("td");r.textContent=s[l]||"",o.appendChild(r)}),a.appendChild(o)}),i.total_rows>5){const s=document.createElement("tr"),o=document.createElement("td");o.colSpan=i.columns.length,o.textContent=`... and ${i.total_rows-5} more rows`,o.style.textAlign="center",o.style.fontStyle="italic",s.appendChild(o),a.appendChild(s)}e.appendChild(a)}function Gt(i){const e=document.getElementById("patterns-container");e.innerHTML="",Object.entries(i).forEach(([t,n])=>{const a=Jt(t,n);e.appendChild(a)})}function Jt(i,e){var o,l,r,c,d,u,m,p;const t=document.createElement("div");t.className="pattern-card";const n=document.createElement("h5");n.innerHTML=`<i class="fas fa-chart-bar"></i> ${i}`,t.appendChild(n);const a=document.createElement("div");a.className="pattern-info";const s=[{label:"Type",value:e.type,icon:"fa-tag"},{label:"Unique Values",value:(o=e.unique_count)==null?void 0:o.toLocaleString(),icon:"fa-fingerprint"},{label:"Null Count",value:(l=e.null_count)==null?void 0:l.toLocaleString(),icon:"fa-times-circle"}];return e.type==="integer"||e.type==="float"?s.push({label:"Min",value:(r=e.min)==null?void 0:r.toFixed(2),icon:"fa-arrow-down"},{label:"Max",value:(c=e.max)==null?void 0:c.toFixed(2),icon:"fa-arrow-up"},{label:"Mean",value:(d=e.mean)==null?void 0:d.toFixed(2),icon:"fa-chart-line"},{label:"Distribution",value:e.distribution||"unknown",icon:"fa-chart-area"}):e.type==="categorical"?(s.push({label:"Top Value",value:e.top_value,icon:"fa-trophy"},{label:"Frequency",value:`${(e.top_frequency*100).toFixed(1)}%`,icon:"fa-percentage"}),e.categories&&Object.keys(e.categories).length<=10&&s.push({label:"Categories",value:Object.keys(e.categories).join(", "),icon:"fa-list"})):e.type==="datetime"?s.push({label:"Format",value:e.format,icon:"fa-calendar"},{label:"Min Date",value:(u=e.min_date)==null?void 0:u.substring(0,10),icon:"fa-calendar-minus"},{label:"Max Date",value:(m=e.max_date)==null?void 0:m.substring(0,10),icon:"fa-calendar-plus"}):e.type==="text"&&(s.push({label:"Avg Length",value:(p=e.avg_length)==null?void 0:p.toFixed(0),icon:"fa-ruler"},{label:"Max Length",value:e.max_length,icon:"fa-expand"}),e.detected_patterns&&e.detected_patterns.length>0&&s.push({label:"Patterns",value:e.detected_patterns.join(", "),icon:"fa-search"})),s.forEach(h=>{if(h.value!==void 0&&h.value!==null){const g=document.createElement("div");g.className="pattern-item",g.innerHTML=`<strong>${h.label}:</strong> <span>${h.value}</span>`,a.appendChild(g)}}),t.appendChild(a),t}function Wt(){const i=document.getElementById("add-column"),e=document.getElementById("columns-container");!i||!e||(i.addEventListener("click",()=>{const t=We();e.appendChild(t)}),Qt())}function We(){const i=document.createElement("div");i.className="column-item";const e=document.createElement("input");e.type="text",e.placeholder="Column name",e.className="column-name",i.appendChild(e);const t=document.createElement("div");t.className="dropdown-container column-type-dropdown",i.appendChild(t),new w(t,{id:`column-type-${Date.now()}`,placeholder:"Select type",options:[{value:"string",title:"Text",icon:"fas fa-font"},{value:"integer",title:"Integer",icon:"fas fa-hashtag"},{value:"float",title:"Decimal",icon:"fas fa-percentage"},{value:"date",title:"Date",icon:"fas fa-calendar"},{value:"boolean",title:"Boolean",icon:"fas fa-toggle-on"},{value:"category",title:"Category",icon:"fas fa-tags"}],value:"string",size:"small",onChange:a=>{console.log("New column type:",a),updateManualEstimates()}});const n=document.createElement("button");return n.className="remove-column",n.innerHTML="×",n.addEventListener("click",()=>i.remove()),i.appendChild(n),i}function Qt(){document.querySelectorAll(".remove-column").forEach(i=>{i.addEventListener("click",e=>{e.target.closest(".column-item").remove()})})}function Xt(){var e,t,n,a,s,o,l,r,c,d,u,m,p,h;const i={rows:parseInt((e=document.getElementById("gen-rows"))==null?void 0:e.value)||1e3,format:Qe("gen-format")||"csv",mode:te(),method:H||"ctgan",method_settings:Kt(),template:null,industry:null,template_config:null,patterns:null,columns:Yt(),privacy:{differential_privacy:((t=document.getElementById("differential-privacy"))==null?void 0:t.checked)||!1,epsilon:parseFloat((n=document.getElementById("epsilon"))==null?void 0:n.value)||1,k_anonymity:((a=document.getElementById("k-anonymity"))==null?void 0:a.checked)||!1,l_diversity:((s=document.getElementById("l-diversity"))==null?void 0:s.checked)||!1,t_closeness:((o=document.getElementById("t-closeness"))==null?void 0:o.checked)||!1,data_masking:((l=document.getElementById("data-masking"))==null?void 0:l.checked)||!1},compliance:{gdpr:((r=document.getElementById("gdpr-compliant"))==null?void 0:r.checked)||!1,hipaa:((c=document.getElementById("hipaa-compliant"))==null?void 0:c.checked)||!1,pci:((d=document.getElementById("pci-compliant"))==null?void 0:d.checked)||!1},options:{preserve_relationships:((u=document.getElementById("preserve-relationships"))==null?void 0:u.checked)||!1,include_outliers:((m=document.getElementById("include-outliers"))==null?void 0:m.checked)||!1,add_missing:((p=document.getElementById("add-missing"))==null?void 0:p.checked)||!1,hierarchical:((h=document.getElementById("hierarchical"))==null?void 0:h.checked)||!1},multi_table:Zt(),name:en(),description:tn()};return i.mode==="template"&&window.currentTemplate.industry?(i.industry=window.currentTemplate.industry,i.template_config={columns:window.currentTemplate.columns,relationships:window.currentTemplate.settings.relationships},window.currentTemplate.settings.privacyRequired&&(i.privacy.differential_privacy=!0,i.privacy.k_anonymity=!0,i.privacy.l_diversity=!0,i.privacy.data_masking=!0)):i.mode==="pattern"&&T&&(i.patterns=T.patterns),i.anonymization={k_anonymity:i.privacy.k_anonymity,l_diversity:i.privacy.l_diversity,t_closeness:i.privacy.t_closeness,data_masking:i.privacy.data_masking},i.differential_privacy=i.privacy.differential_privacy,i.epsilon=i.privacy.epsilon,i}function Kt(){var e,t,n,a,s,o;const i={};return H==="ctgan"?(i.epochs=parseInt((e=document.getElementById("ctgan-epochs"))==null?void 0:e.value)||300,i.batch_size=parseInt((t=document.getElementById("ctgan-batch"))==null?void 0:t.value)||500):H==="timegan"?(i.sequence_length=parseInt((n=document.getElementById("timegan-seq"))==null?void 0:n.value)||24,i.hidden_dim=parseInt((a=document.getElementById("timegan-hidden"))==null?void 0:a.value)||24):H==="vae"&&(i.latent_dim=parseInt((s=document.getElementById("vae-latent"))==null?void 0:s.value)||128,i.learning_rate=parseFloat((o=document.getElementById("vae-lr"))==null?void 0:o.value)||.001),i}function te(){var i,e,t,n,a;return(i=window.currentTemplate)!=null&&i.industry&&((t=(e=window.currentTemplate)==null?void 0:e.columns)==null?void 0:t.length)>0?"template":T&&T.patterns?"pattern":((a=(n=window.multiTableConfig)==null?void 0:n.tables)==null?void 0:a.length)>1?"multi-table":"manual"}function Yt(){var t;if(window.detectedColumns&&window.detectedColumns.length>0)return window.detectedColumns;if((t=window.currentTemplate)!=null&&t.columns&&window.currentTemplate.columns.length>0)return window.currentTemplate.columns;const i=[];return document.querySelectorAll("#columns-container .column-item").forEach(n=>{var o,l;const a=(o=n.querySelector(".column-name"))==null?void 0:o.value,s=(l=n.querySelector(".column-type"))==null?void 0:l.value;a&&i.push({name:a,type:s||"string"})}),i.length===0&&document.querySelectorAll(".column-config-item").forEach(a=>{var r;const s=(r=a.querySelector(".column-name"))==null?void 0:r.textContent,o=a.querySelector(".column-type-select"),l=Qe(o==null?void 0:o.id)||"string";s&&i.push({name:s,type:l})}),i}function Zt(){return!window.multiTableConfig||!window.multiTableConfig.tables?null:{tables:window.multiTableConfig.tables,relationships:window.multiTableConfig.relationships||[]}}function en(){var t;const i=new Date().toISOString().replace(/[:.]/g,"-"),e=te();return e==="template"&&((t=window.currentTemplate)!=null&&t.industry)?`${window.currentTemplate.industry}_data_${i}`:e==="pattern"&&(T!=null&&T.file_name)?`${T.file_name.replace(/\.[^/.]+$/,"")}_synthetic_${i}`:`generated_data_${i}`}function tn(){var t,n,a,s;const i=te(),e=parseInt((t=document.getElementById("gen-rows"))==null?void 0:t.value)||1e3;return i==="template"?`${((n=window.currentTemplate)==null?void 0:n.industry)||"Template"} data with ${e} rows`:i==="pattern"?`Synthetic data based on ${(T==null?void 0:T.file_name)||"uploaded file"} with ${e} rows`:i==="multi-table"?`Multi-table dataset with ${((s=(a=window.multiTableConfig)==null?void 0:a.tables)==null?void 0:s.length)||0} tables and ${e} total rows`:`Manually configured dataset with ${e} rows`}function Qe(i){if(!i)return null;for(const t in F)if(F[t]&&F[t].container){const n=F[t].container;if(n.id===i||n.querySelector(`#${i}`))return F[t].getValue()}const e=document.getElementById(i);return e?e.value:null}function P(i,e){if(!i)return;if(nn(),i.classList.add("validation-error"),e){const n=document.createElement("div");n.className="validation-message",n.textContent=e;const a=i.closest(".form-group")||i.closest(".card")||i;a.parentNode.insertBefore(n,a.nextSibling)}i.scrollIntoView({behavior:"smooth",block:"center"}),(i.tagName==="INPUT"||i.tagName==="SELECT"||i.tagName==="TEXTAREA")&&setTimeout(()=>i.focus(),300);const t=()=>{i.classList.remove("validation-error");const n=i.parentNode.querySelector(".validation-message");n&&n.remove(),i.removeEventListener("input",t),i.removeEventListener("change",t)};i.addEventListener("input",t),i.addEventListener("change",t)}function nn(){document.querySelectorAll(".validation-error").forEach(i=>{i.classList.remove("validation-error")}),document.querySelectorAll(".validation-message").forEach(i=>{i.remove()})}function an(i){var e,t,n;if(!i.rows||i.rows<1){const a=document.getElementById("gen-rows");return P(a,"Please specify the number of rows to generate (minimum 1)"),{valid:!1}}if(i.rows>1e6){const a=document.getElementById("gen-rows");return P(a,"Maximum row limit is 1,000,000. Please reduce the number of rows."),{valid:!1}}if(i.mode==="manual"){if(!i.columns||i.columns.length===0){const a=document.getElementById("columns-container")||document.querySelector(".columns-config");return P(a,"Please define at least one column for manual generation"),{valid:!1}}}else if(i.mode==="pattern"){if(!i.patterns){const a=document.querySelector(".uploaded-data");return P(a,"Please upload and analyze a file first"),{valid:!1}}}else if(i.mode==="template"){if(!i.industry&&!((e=window.currentTemplate)!=null&&e.industry)){const a=document.querySelector(".generation-options-section");return P(a,"Please select an industry template"),{valid:!1}}!i.template_config&&((t=window.currentTemplate)!=null&&t.columns)&&(i.template_config={columns:window.currentTemplate.columns,relationships:((n=window.currentTemplate.settings)==null?void 0:n.relationships)||[]},i.industry=window.currentTemplate.industry)}else if(i.mode==="multi-table"&&(!i.multi_table||!i.multi_table.tables||i.multi_table.tables.length<2)){const a=document.getElementById("multi-table-section");return P(a,"Please configure at least 2 tables for multi-table generation"),{valid:!1}}if(i.privacy.differential_privacy&&(!i.privacy.epsilon||i.privacy.epsilon<=0)){const a=document.getElementById("epsilon");return P(a,"Please specify a valid privacy budget (ε > 0) for differential privacy"),{valid:!1}}return{valid:!0}}function sn(i){var t,n,a;if(!window.tokenService)return 100;const e={differentialPrivacy:i.privacy.differential_privacy,hierarchicalRelations:i.options.hierarchical,industryTemplate:i.mode==="template",advancedAnonymization:i.privacy.k_anonymity||i.privacy.l_diversity||i.privacy.t_closeness};if(i.mode==="template")return window.tokenService.calculateGenerationCost(i.rows,"ctgan",e);if(i.mode==="multi-table"){const s=window.tokenService.calculateGenerationCost(i.rows,i.method,e),o=((n=(t=i.multi_table)==null?void 0:t.tables)==null?void 0:n.length)||1;return Math.round(s*(1+(o-1)*.3))}else{const s=((a=i.columns)==null?void 0:a.length)||10;return window.tokenService.calculateDataGenerationCost(i.rows,s,"moderate")}}function on(i){if(!window.tokenUsageTracker)return!0;if(!window.tokenUsageTracker.useTokens(i,"generation")){const t=window.tokenUsageTracker.getAvailableTokens();return alert(`Insufficient tokens. Required: ${i}, Available: ${t}. Please purchase more tokens.`),!1}return!0}async function Xe(){console.log("Starting handleGenerateData...");try{const i=Xt();console.log("Collected settings:",i);const e=an(i);if(console.log("Validation result:",e),!e.valid){console.error("Validation failed");return}const t=sn(i);if(console.log("Token cost calculated:",t),!on(t)){console.log("Insufficient tokens");return}i.token_cost=t,console.log("Creating generation job..."),await ln(i,t)}catch(i){console.error("Error in handleGenerateData:",i),console.error("Error stack:",i.stack),alert("Failed to start data generation: "+i.message)}}async function ln(i,e){console.log("Creating job with settings:",i);try{const t=document.getElementById("progress-modal");t?(t.style.display="flex",console.log("Progress modal shown")):console.error("Progress modal not found!"),console.log("Starting direct generation (bypassing job queue for now)..."),await cn(i,e)}catch(t){console.error("Failed to create generation job:",t),console.error("Error details:",t.stack);const n=document.getElementById("progress-modal");throw n&&(n.style.display="none"),window.tokenUsageTracker&&window.tokenUsageTracker.refundTokens(e,"generation_failed"),t}}class rn{constructor(e){this.totalRows=e,this.currentRows=0,this.startTime=Date.now(),this.currentStage="validating",this.stages=["validating","initializing","generating","privacy","finalizing"],this.stageProgress={validating:0,initializing:0,generating:0,privacy:0,finalizing:0},this.isComplete=!1,this.downloadUrl=null,this.fileSize=0}updateStage(e,t=100){this.currentStage=e,this.stageProgress[e]=t,this.updateUI()}updateRows(e){this.currentRows=e,this.stageProgress.generating=e/this.totalRows*100,this.updateUI()}calculateETA(){const e=(Date.now()-this.startTime)/1e3,t=this.getOverallProgress();if(t===0)return"Calculating...";const a=e/(t/100)-e;if(a<60)return`${Math.round(a)}s`;{const s=Math.floor(a/60),o=Math.round(a%60);return`${s}m ${o}s`}}getOverallProgress(){const e={validating:5,initializing:10,generating:70,privacy:10,finalizing:5};let t=0,n=this.stages.indexOf(this.currentStage);for(let a=0;a<n;a++)t+=e[this.stages[a]];return this.currentStage&&e[this.currentStage]&&(t+=this.stageProgress[this.currentStage]/100*e[this.currentStage]),Math.min(t,100)}formatTime(e){const t=Math.floor(e/60),n=Math.round(e%60);return`${t}:${n.toString().padStart(2,"0")}`}updateUI(){this.stages.forEach(u=>{const m=document.querySelector(`.stage-item[data-stage="${u}"]`);if(m){const p=this.stages.indexOf(u),h=this.stages.indexOf(this.currentStage);m.classList.remove("active","completed"),p<h?m.classList.add("completed"):p===h&&m.classList.add("active")}});const e=document.getElementById("generation-progress-fill"),t=document.querySelector(".progress-percentage"),n=this.getOverallProgress();e&&(e.style.width=`${n}%`),t&&(t.textContent=`${Math.round(n)}%`);const a=document.getElementById("rows-generated"),s=document.getElementById("total-rows-target");a&&(a.textContent=this.currentRows.toLocaleString()),s&&(s.textContent=this.totalRows.toLocaleString());const o=(Date.now()-this.startTime)/1e3,l=document.getElementById("time-elapsed"),r=document.getElementById("eta-remaining");l&&(l.textContent=this.formatTime(o)),r&&(r.textContent=this.calculateETA());const c={validating:"Validating configuration and checking resources...",initializing:"Initializing AI model and preparing data pipeline...",generating:`Generating synthetic data (${this.currentRows}/${this.totalRows} rows)...`,privacy:"Applying privacy protection and compliance standards...",finalizing:"Finalizing dataset and preparing for download..."},d=document.getElementById("status-message");d&&(d.textContent=c[this.currentStage]||"Processing...")}complete(e){this.isComplete=!0,this.downloadUrl=e.url||"#",this.fileSize=e.fileSize||0,this.stages.forEach(o=>{const l=document.querySelector(`.stage-item[data-stage="${o}"]`);l&&(l.classList.remove("active"),l.classList.add("completed"))});const t=document.getElementById("generation-progress-fill"),n=document.querySelector(".progress-percentage");t&&(t.style.width="100%"),n&&(n.textContent="100%");const a=document.getElementById("completion-section");if(a){a.style.display="block";const o=document.getElementById("final-rows"),l=document.getElementById("total-time"),r=document.getElementById("file-size");o&&(o.textContent=this.totalRows.toLocaleString());const c=(Date.now()-this.startTime)/1e3;l&&(l.textContent=this.formatTime(c)),r&&(r.textContent=ne(this.fileSize))}const s=document.querySelector(".current-status");s&&(s.style.display="none"),this.sendDashboardNotification()}sendDashboardNotification(){const e=JSON.parse(localStorage.getItem("dashboardNotifications")||"[]");e.push({id:Date.now(),type:"success",title:"Data Generation Complete",message:`Successfully generated ${this.totalRows.toLocaleString()} rows of synthetic data`,timestamp:new Date().toISOString(),action:{label:"Download",url:this.downloadUrl},read:!1}),localStorage.setItem("dashboardNotifications",JSON.stringify(e)),window.dispatchEvent(new CustomEvent("newNotification",{detail:{type:"data-generation-complete",rows:this.totalRows,downloadUrl:this.downloadUrl}}))}}async function cn(i,e){console.log("Starting direct generation with settings:",i);const t=document.getElementById("progress-modal"),n=i.rows||1e3,a=new rn(n);t&&(t.style.display="flex");const s=document.getElementById("continue-background");s&&(s.onclick=()=>{const l={id:Date.now(),type:"data_generation",settings:i,startTime:a.startTime,status:"in_progress",progress:a.getOverallProgress(),currentStage:a.currentStage,rows:a.currentRows};localStorage.setItem("activeGeneration",JSON.stringify(l)),t.style.display="none",window.location.hash="#dashboard?tab=in-progress"});const o=document.getElementById("download-generated-data");o&&(o.onclick=()=>{const l=new Blob([JSON.stringify(i)],{type:"application/json"}),r=URL.createObjectURL(l),c=document.createElement("a");c.href=r,c.download=`generated_data_${Date.now()}.json`,c.click(),URL.revokeObjectURL(r)});try{a.updateStage("validating"),await new Promise(d=>setTimeout(d,500)),a.updateStage("initializing"),await new Promise(d=>setTimeout(d,800)),a.updateStage("generating");const l=Math.ceil(n/10);for(let d=l;d<=n;d+=l)a.updateRows(Math.min(d,n)),await new Promise(u=>setTimeout(u,200));a.updateStage("privacy"),await new Promise(d=>setTimeout(d,600)),a.updateStage("finalizing"),await new Promise(d=>setTimeout(d,400));const r={url:"#",fileSize:n*50*10};a.complete(r);const c=document.querySelector(".close-modal");c&&(c.onclick=()=>{t.style.display="none"})}catch(l){throw console.error("Generation failed:",l),t&&(t.style.display="none"),window.tokenUsageTracker&&e&&window.tokenUsageTracker.refundTokens(e,"generation_failed"),l}}async function J(){return console.log("=== handlePatternBasedGeneration called ==="),console.log("Current template:",window.currentTemplate),Xe()}function dn(i){var l,r,c,d,u,m,p,h,g,y,v,S,E,I;if(!i||i===0)return 0;const e=document.querySelectorAll(".table-definition"),t=e.length>1;let n=.1;switch(H){case"ctgan":n=.12;break;case"timegan":n=.15;break;case"vae":n=.08;break}let a=i*n;if((l=document.getElementById("differential-privacy"))!=null&&l.checked){const x=parseFloat((r=document.getElementById("epsilon"))==null?void 0:r.value)||1,M=x<=.5?1.5:x<=1?1.3:x<=5?1.2:1.1;a*=M}(c=document.getElementById("k-anonymity"))!=null&&c.checked&&(a*=1.1),(d=document.getElementById("l-diversity"))!=null&&d.checked&&(a*=1.1),(u=document.getElementById("t-closeness"))!=null&&u.checked&&(a*=1.1),(m=document.getElementById("data-masking"))!=null&&m.checked&&(a*=1.05),(p=document.getElementById("gdpr-compliant"))!=null&&p.checked&&(a*=1.15),(h=document.getElementById("hipaa-compliant"))!=null&&h.checked&&(a*=1.15),(g=document.getElementById("pci-compliant"))!=null&&g.checked&&(a*=1.15),(y=document.getElementById("preserve-relationships"))!=null&&y.checked&&(a*=1.2),(v=document.getElementById("include-outliers"))!=null&&v.checked&&(a*=1.05),(S=document.getElementById("add-missing"))!=null&&S.checked&&(a*=1.05),((E=document.getElementById("hierarchical"))!=null&&E.checked||t)&&(a*=1.2);const s=un();s>0&&(a*=1+s*.03);const o=mn();return o>0&&(a*=1+o*.05),(I=window.currentTemplate)!=null&&I.industry&&(a*=1.1),t&&(a*=1+(e.length-1)*.2),Math.ceil(a)}function un(){const i=["email","phone","address","name","uuid","url"];let e=0;return window.detectedColumns&&window.detectedColumns.forEach(t=>{i.includes(t.type)&&e++}),document.querySelectorAll(".column-data-type").forEach(t=>{i.includes(t.value)&&e++}),e}function mn(){let i=0;return document.querySelectorAll(".column-unique:checked").forEach(()=>i++),window.detectedColumns&&window.detectedColumns.forEach(e=>{e.unique&&i++}),i}async function pn(){const i=[];if(document.querySelectorAll(".column-item").forEach(t=>{const n=t.querySelector(".column-name").value,a=t.querySelector(".column-type").value;n&&i.push({name:n,type:a})}),i.length===0){const t=document.getElementById("columns-container");P(t,"Please add at least one column.");return}const e={name:document.getElementById("instance-name").value||"Generated Data",description:document.getElementById("instance-description").value||"",data_type:document.getElementById("data-type").value,rows:parseInt(document.getElementById("manual-rows").value),format:document.getElementById("manual-format").value,columns:i};await Ke(e,"manual")}async function Ke(i,e){const t=document.getElementById("progress-modal"),n=t.querySelector(".progress-fill");t.querySelector(".progress-text");const a=document.getElementById("rows-generated"),s=document.getElementById("time-elapsed");t.style.display="flex",n.style.width="0%";const o=Date.now();let l;window.currentTemplate.industry&&window.currentTemplate.columns.length>0&&(e="template",i.industry=window.currentTemplate.industry,i.template_config={columns:window.currentTemplate.columns,relationships:window.currentTemplate.settings.relationships},window.currentTemplate.settings.privacyRequired&&(i.anonymization={k_anonymity:!0,l_diversity:!0,data_masking:!0}));try{l=setInterval(()=>{const m=((Date.now()-o)/1e3).toFixed(1);s.textContent=`${m}s`},100);const r=i.rows;let c=0;const d=setInterval(()=>{c=Math.min(c+Math.floor(r*.1),r),a.textContent=c.toLocaleString(),n.style.width=`${c/r*100}%`,c>=r&&clearInterval(d)},200),u=await f("/api/generator/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...i,mode:e})});if(clearInterval(d),clearInterval(l),u.error)throw new Error(u.error);if(hn(u),addToHistory(u),window.tokenSyncService){await window.tokenSyncService.forceUpdate();const m=u.tokens_used||i.token_cost||0;m>0&&window.tokenSyncService.trackUsage("data_generation",m,{rows:i.rows,columns:i.columns||Object.keys(i.columns||{}).length,mode:e})}}catch(r){console.error("Generation error:",r),alert(`Failed to generate data: ${r.message}`)}finally{clearInterval(l),t.style.display="none"}}function hn(i){const e=document.getElementById("success-modal"),t=e.querySelector(".success-message"),n=document.getElementById("download-data"),a=document.getElementById("preview-data"),s=e.querySelector(".close-modal");t.textContent=`Successfully generated ${i.rows} rows of data (${ne(i.file_size)})`,n.onclick=()=>Ye(i.id),a.onclick=()=>Ze(i.id),s.onclick=()=>{e.style.display="none"},e.style.display="flex"}async function Ye(i){try{const e=await fetch(`/api/generator/download/${i}`,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(!e.ok)throw new Error("Download failed");const t=await e.blob(),n=window.URL.createObjectURL(t),a=document.createElement("a");a.href=n,a.download=`generated_data_${i}.${e.headers.get("content-type").includes("json")?"json":"csv"}`,document.body.appendChild(a),a.click(),window.URL.revokeObjectURL(n),document.body.removeChild(a)}catch(e){console.error("Download error:",e),alert("Failed to download data.")}}async function Ze(i){try{const e=await f(`/api/generator/preview/${i}`);if(e.error)throw new Error(e.error);console.log("Preview data:",e),alert("Preview functionality coming soon!")}catch(e){console.error("Preview error:",e),alert("Failed to preview data.")}}function gn(){const i=document.getElementById("gen-rows"),e=document.getElementById("gen-file-size"),t=document.getElementById("gen-time");i&&i.addEventListener("input",()=>{var r;const o=parseInt(i.value)||0,l=((r=T==null?void 0:T.columns)==null?void 0:r.length)||10;V(o,l,e,t),et()});const n=document.getElementById("manual-rows"),a=document.getElementById("manual-file-size"),s=document.getElementById("manual-gen-time");n&&n.addEventListener("input",()=>{const o=parseInt(n.value)||0,l=document.querySelectorAll(".column-item").length||1;V(o,l,a,s)})}function V(i,e,t,n){const a=i*e*50,s=ne(a),o=i<1e4?"&lt; 1 second":i<1e5?"2-5 seconds":i<1e6?"10-30 seconds":"1-2 minutes";t&&(t.textContent=s),n&&(n.textContent=o)}function ne(i){if(i===0)return"0 Bytes";const e=1024,t=["Bytes","KB","MB","GB"],n=Math.floor(Math.log(i)/Math.log(e));return parseFloat((i/Math.pow(e,n)).toFixed(2))+" "+t[n]}function fn(){var e;const i=document.querySelectorAll(".method-card");i.forEach(t=>{t.addEventListener("click",()=>{if(t.classList.contains("disabled")){alert("This generation method is not available in your current plan. Please upgrade to access advanced methods.");return}i.forEach(n=>n.classList.remove("selected")),t.classList.add("selected"),H=t.getAttribute("data-method"),et()})}),(e=document.querySelector('[data-method="ctgan"]'))==null||e.classList.add("selected"),je()}function yn(){["preserve-relationships","include-outliers","add-missing","hierarchical"].forEach(e=>{const t=document.getElementById(e);t&&t.addEventListener("change",()=>{C()})})}function vn(){const i=document.getElementById("differential-privacy"),e=document.querySelector(".privacy-options"),t=document.getElementById("epsilon"),n=document.getElementById("epsilon-value");i&&e&&i.addEventListener("change",()=>{e.style.display=i.checked?"block":"none",C(),he()}),t&&n&&t.addEventListener("input",()=>{n.textContent=t.value,bn(t.value),he(),C()}),wn(),Cn()}function bn(i){const e=document.getElementById("privacy-level");e&&(i<=.5?(e.textContent="Maximum",e.className="level-high"):i<=1?(e.textContent="Stronger",e.className="level-high"):i<=5?(e.textContent="Moderate",e.className="level-medium"):(e.textContent="Basic",e.className="level-low"))}function he(){var s,o;const i=parseFloat(((s=document.getElementById("epsilon"))==null?void 0:s.value)||1),e=(o=document.getElementById("differential-privacy"))==null?void 0:o.checked,t=document.getElementById("reidentification-risk");t&&(e?i<=1?(t.textContent="Low (< 0.1%)",t.className="metric-value low"):i<=5?(t.textContent="Medium (0.1% - 1%)",t.className="metric-value medium"):(t.textContent="Higher (> 1%)",t.className="metric-value high"):(t.textContent="Unknown",t.className="metric-value medium"));const n=document.getElementById("attribute-risk");n&&(e?i<=1?(n.textContent="Low",n.className="metric-value low"):i<=5?(n.textContent="Medium",n.className="metric-value medium"):(n.textContent="High",n.className="metric-value high"):(n.textContent="Unknown",n.className="metric-value medium"));const a=document.getElementById("utility-score");if(a)if(!e)a.textContent="100%",a.className="metric-value high";else{const l=Math.max(70,100-i*5);a.textContent=`${Math.round(l)}%`,a.className=l>=90?"metric-value high":l>=80?"metric-value medium":"metric-value low"}}function wn(){["gdpr-compliant","hipaa-compliant","pci-compliant"].forEach(e=>{const t=document.getElementById(e);t&&t.addEventListener("change",()=>{C(),En(e,t.checked)})})}function En(i,e){if(e){switch(i){case"gdpr-compliant":document.getElementById("data-masking").checked=!0,document.getElementById("k-anonymity").checked=!0;break;case"hipaa-compliant":document.getElementById("differential-privacy").checked=!0,document.getElementById("data-masking").checked=!0,document.getElementById("k-anonymity").checked=!0,document.getElementById("l-diversity").checked=!0;break;case"pci-compliant":document.getElementById("data-masking").checked=!0;break}he()}}function Cn(){["k-anonymity","l-diversity","t-closeness","data-masking"].forEach(e=>{const t=document.getElementById(e);t&&t.addEventListener("change",()=>{C()})})}function et(){C()}window.currentTemplate={industry:null,columns:[],settings:{}};function ge(){console.log("Clear template selection called");const i=document.getElementById("clear-template-btn");i&&(i.style.display="none");const e=document.getElementById("generatorIndustryTemplateContainer");if(e){const s=e.querySelector("#selectedTemplatePreview"),o=e.querySelector(".template-grid");console.log("Preview found:",s),console.log("Grid found:",o),s&&(s.style.display="none"),o&&(o.style.display="grid"),e.querySelectorAll(".template-card").forEach(r=>r.classList.remove("selected"))}if(window.generatorIndustrySelector){window.generatorIndustrySelector.selectedTemplate=null;try{window.generatorIndustrySelector.showTemplateGrid()}catch(s){console.error("Error calling showTemplateGrid:",s)}}const t=document.getElementById("generation-config");t&&(t.style.display="none");const n=document.getElementById("detected-columns-container");n&&(n.innerHTML="");const a=document.getElementById("detected-columns-section");if(a){a.style.display="none";const s=a.querySelector("h3");s&&(s.textContent="Detected Columns & Configuration")}window.detectedColumns=null,window.currentTemplate={industry:null,columns:[],settings:{}},C(),console.log("Template selection cleared")}window.clearTemplateSelection=ge;function Pe(i,e){console.log("Applying generator template:",i,e);const t=document.getElementById("clear-template-btn");t&&(t.style.display="inline-block"),window.currentTemplate.industry=i;let n=[];i==="healthcare"?n=[{name:"patient_id",type:"account",unique:!0,nullable:!1,pattern:"uuid"},{name:"patient_name",type:"name",unique:!1,nullable:!1},{name:"age",type:"integer",min:1,max:100,nullable:!1},{name:"gender",type:"category",categories:["Male","Female","Other"],nullable:!1},{name:"diagnosis_code",type:"string",pattern:"icd10"},{name:"admission_date",type:"date",minDate:"2020-01-01",maxDate:"2024-12-31"},{name:"discharge_date",type:"date",minDate:"2020-01-01",maxDate:"2024-12-31"},{name:"treatment_cost",type:"currency",min:100,max:1e5},{name:"insurance_provider",type:"category",categories:["BlueCross","Aetna","United","Kaiser","Other"]},{name:"doctor_name",type:"name",nullable:!1}]:i==="finance"?n=[{name:"transaction_id",type:"account",unique:!0,nullable:!1,pattern:"uuid"},{name:"account_number",type:"account",unique:!1,nullable:!1,length:10},{name:"customer_name",type:"name",nullable:!1},{name:"transaction_amount",type:"currency",min:.01,max:1e4},{name:"transaction_date",type:"datetime",nullable:!1},{name:"transaction_type",type:"category",categories:["Debit","Credit","Transfer","ATM"]},{name:"merchant_name",type:"string",pattern:"company"},{name:"merchant_category",type:"category",categories:["Retail","Food","Travel","Entertainment","Services","Other"]},{name:"balance_after",type:"currency",min:0,max:1e5},{name:"location",type:"address",addressType:"city-state"}]:i==="retail"?n=[{name:"order_id",type:"account",unique:!0,nullable:!1,pattern:"uuid"},{name:"customer_id",type:"account",unique:!1,nullable:!1,length:8},{name:"customer_name",type:"name",nullable:!1},{name:"customer_email",type:"email",unique:!0,nullable:!1},{name:"product_id",type:"string",pattern:"sku"},{name:"product_name",type:"string",pattern:"product"},{name:"price",type:"currency",min:.99,max:999.99},{name:"quantity",type:"integer",min:1,max:20},{name:"category",type:"category",categories:["Electronics","Clothing","Home","Food","Sports","Books","Toys"]},{name:"order_date",type:"datetime",nullable:!1},{name:"shipping_address",type:"address",addressType:"full"},{name:"payment_method",type:"category",categories:["Credit Card","Debit Card","PayPal","Cash"]}]:i==="insurance"?n=[{name:"policy_id",type:"account",unique:!0,nullable:!1,pattern:"uuid"},{name:"policy_number",type:"string",unique:!0,nullable:!1,pattern:"policy"},{name:"policyholder_name",type:"name",nullable:!1},{name:"policy_type",type:"category",categories:["Life","Auto","Home","Health","Business","Travel"],nullable:!1},{name:"premium_amount",type:"currency",min:50,max:5e3,nullable:!1},{name:"deductible",type:"currency",min:100,max:1e4,nullable:!1},{name:"coverage_limit",type:"currency",min:1e4,max:1e6,nullable:!1},{name:"start_date",type:"date",nullable:!1,minDate:"2020-01-01",maxDate:"2024-12-31"},{name:"end_date",type:"date",nullable:!1,minDate:"2024-01-01",maxDate:"2029-12-31"},{name:"claim_history",type:"integer",min:0,max:10,nullable:!1},{name:"risk_score",type:"float",min:0,max:100,nullable:!1},{name:"agent_name",type:"name",nullable:!1}]:i==="manufacturing"?n=[{name:"product_id",type:"account",unique:!0,nullable:!1,pattern:"sku"},{name:"batch_number",type:"string",unique:!0,nullable:!1,pattern:"batch"},{name:"production_date",type:"datetime",nullable:!1},{name:"production_line",type:"category",categories:["Line A","Line B","Line C","Line D","Line E"],nullable:!1},{name:"quantity_produced",type:"integer",min:1,max:1e4,nullable:!1},{name:"defect_count",type:"integer",min:0,max:100,nullable:!1},{name:"quality_score",type:"float",min:0,max:100,nullable:!1},{name:"operator_id",type:"account",nullable:!1,length:6},{name:"raw_material_batch",type:"string",nullable:!1,pattern:"batch"},{name:"warehouse_location",type:"string",nullable:!1,pattern:"warehouse"},{name:"shipment_status",type:"category",categories:["Pending","In Transit","Delivered","Delayed"],nullable:!1},{name:"unit_cost",type:"currency",min:.1,max:1e3,nullable:!1}]:i==="custom"?n=[{name:"record_id",type:"account",unique:!0,nullable:!1,pattern:"uuid"},{name:"text_field",type:"string",nullable:!1},{name:"number_field",type:"integer",min:0,max:1e3,nullable:!1},{name:"decimal_field",type:"float",min:0,max:100,nullable:!1},{name:"date_field",type:"date",nullable:!1},{name:"datetime_field",type:"datetime",nullable:!1},{name:"category_field",type:"category",categories:["Option A","Option B","Option C","Other"],nullable:!1},{name:"email_field",type:"email",unique:!0,nullable:!0},{name:"phone_field",type:"phone",nullable:!0},{name:"boolean_field",type:"boolean",nullable:!1},{name:"currency_field",type:"currency",min:0,max:1e4,nullable:!0}]:e&&e.name==="Customer Data"&&(n=[{name:"customer_id",type:"account",unique:!0,nullable:!1,length:10},{name:"first_name",type:"name",nullable:!1,nameType:"first"},{name:"last_name",type:"name",nullable:!1,nameType:"last"},{name:"email",type:"email",unique:!0,nullable:!1},{name:"phone",type:"phone",unique:!0,nullable:!1,format:"us"},{name:"age",type:"integer",min:18,max:80,nullable:!1},{name:"address",type:"address",addressType:"full",nullable:!1},{name:"city",type:"address",addressType:"city",nullable:!1},{name:"state",type:"address",addressType:"state",nullable:!1},{name:"zip_code",type:"string",pattern:"zipcode",nullable:!1},{name:"registration_date",type:"date",nullable:!1},{name:"loyalty_points",type:"integer",min:0,max:1e4}]),window.currentTemplate.columns=n,window.currentTemplate.settings={privacyRequired:i==="healthcare"||i==="finance"||i==="insurance",complianceType:i==="healthcare"?"HIPAA":i==="finance"?"PCI":i==="insurance"?"State Insurance Regulations":null,defaultRows:i==="retail"?1e4:i==="manufacturing"?5e4:i==="custom"?1e3:5e3,relationships:kn(i)},Sn(n),C();const a=e?e.name:i;In(`${a} template applied`,"success")}function kn(i){return{healthcare:[{type:"dependent",source:"admission_date",target:"discharge_date"}],finance:[{type:"calculation",source:"transaction_amount",target:"balance_after"}],retail:[{type:"lookup",source:"product_id",target:"product_name"},{type:"calculation",source:"price,quantity",target:"total"}],insurance:[{type:"dependent",source:"start_date",target:"end_date"},{type:"calculation",source:"risk_score",target:"premium_amount"}],manufacturing:[{type:"calculation",source:"quantity_produced,defect_count",target:"quality_score"},{type:"dependent",source:"production_date",target:"batch_number"}],custom:[]}[i]||[]}function Sn(i){window.detectedColumns=i;const e=document.getElementById("generation-config");e&&(e.style.display="block");const t=document.getElementById("detected-columns-section");if(t){t.style.display="block";const s=t.querySelector("h3");s&&(s.textContent="Template Columns & Configuration")}const n=document.getElementById("manual-config-section");n&&(n.style.display="none");const a=document.querySelector(".generation-method-section");a&&(a.style.display="none"),W(i)}function In(i,e="info"){const t=document.createElement("div");t.className=`notification ${e}`,t.innerHTML=`
        <i class="fas fa-${e==="success"?"check-circle":e==="error"?"exclamation-circle":"info-circle"}"></i>
        <span>${i}</span>
    `,document.body.appendChild(t),setTimeout(()=>t.classList.add("show"),10),setTimeout(()=>{t.classList.remove("show"),setTimeout(()=>t.remove(),300)},3e3)}function Tn(){let i=1;const e=document.getElementById("add-table");e&&e.addEventListener("click",()=>{i++;const t=xn(i);document.getElementById("tables-container").appendChild(t),i>1&&(document.getElementById("relationships-container").style.display="block",nt()),U()}),tt(document.querySelector(".table-definition")),document.getElementById("tables-container").addEventListener("input",U),document.getElementById("multi-table-format").addEventListener("change",U)}function xn(i){const e=document.createElement("div");return e.className="table-definition",e.dataset.tableId=`table${i}`,e.innerHTML=`
        <div class="table-header">
            <input type="text" class="table-name" placeholder="Table Name" value="table_${i}">
            <span class="table-type-badge foreign">Related</span>
            <button class="remove-table"><i class="fas fa-trash"></i></button>
        </div>
        <div class="table-columns">
            <div class="column-item">
                <input type="text" class="column-name" placeholder="Column name" value="${$n()}_id">
                <select class="column-type">
                    <option value="foreign_key" selected>Foreign Key</option>
                    <option value="string">String</option>
                    <option value="integer">Integer</option>
                    <option value="float">Float</option>
                    <option value="date">Date</option>
                </select>
                <button class="remove-column"><i class="fas fa-times"></i></button>
            </div>
            <div class="column-item">
                <input type="text" class="column-name" placeholder="Column name">
                <select class="column-type">
                    <option value="string">String</option>
                    <option value="integer">Integer</option>
                    <option value="float">Float</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                </select>
                <button class="remove-column"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <button class="add-column-btn"><i class="fas fa-plus"></i> Add Column</button>
        <div class="table-row-config">
            <label>Rows to Generate:</label>
            <input type="number" class="table-rows" value="5000" min="1" max="1000000">
        </div>
    `,tt(e),Dn(i),e}function tt(i){const e=i.querySelector(".add-column-btn");e&&e.addEventListener("click",()=>{const n=i.querySelector(".table-columns"),a=We();n.appendChild(a),U()}),i.querySelectorAll(".remove-column").forEach(n=>{n.addEventListener("click",a=>{a.target.closest(".column-item").remove(),U()})});const t=i.querySelector(".remove-table");t&&t.addEventListener("click",()=>{const n=i.dataset.tableId;i.remove(),document.querySelectorAll(`.relationship-item[data-from="${n}"], .relationship-item[data-to="${n}"]`).forEach(a=>a.remove()),nt(),U(),document.querySelectorAll(".table-definition").length<=1&&(document.getElementById("relationships-container").style.display="none")})}function $n(){const i=document.querySelector(".table-name");return i&&i.value||"parent"}function Dn(i){const e=document.getElementById("relationships-list"),t=document.querySelector(".primary-table"),n=document.createElement("div");n.className="relationship-item",n.dataset.from=i,n.dataset.to=t.dataset.tableId,n.innerHTML=`
        <div class="relationship-selects">
            <select class="from-table">
                <option value="${i}">table_${i.replace("table","")}</option>
            </select>
            <span class="relationship-type">has many</span>
            <select class="to-table">
                <option value="${t.dataset.tableId}">${t.querySelector(".table-name").value}</option>
            </select>
        </div>
        <button class="remove-relationship"><i class="fas fa-times"></i></button>
    `,n.querySelector(".remove-relationship").addEventListener("click",()=>{n.remove()}),e.appendChild(n)}function nt(){const i=document.querySelectorAll(".table-definition"),e=Array.from(i).map(t=>({id:t.dataset.tableId,name:t.querySelector(".table-name").value||`Table ${t.dataset.tableId.replace("table","")}`}));document.querySelectorAll(".from-table, .to-table").forEach(t=>{const n=t.value;t.innerHTML=e.map(a=>`<option value="${a.id}" ${a.id===n?"selected":""}>${a.name}</option>`).join("")})}function U(){C()}function Ln(i){let e=0;const t=i.length>1;return i.forEach(n=>{const a=parseInt(n.querySelector(".table-rows").value)||0,s=N.calculateGenerationCost(a,"ctgan",{hierarchicalRelations:t});e+=s}),t&&(e=Math.ceil(e*1.2)),e}async function Mn(){const i=[],e=[];document.querySelectorAll(".table-definition").forEach(a=>{const s=[];a.querySelectorAll(".column-item").forEach(o=>{s.push({name:o.querySelector(".column-name").value,type:o.querySelector(".column-type").value})}),i.push({id:a.dataset.tableId,name:a.querySelector(".table-name").value,rows:parseInt(a.querySelector(".table-rows").value),columns:s,isPrimary:a.classList.contains("primary-table")})}),document.querySelectorAll(".relationship-item").forEach(a=>{e.push({from:a.dataset.from,to:a.dataset.to,type:"one-to-many"})});const t=Ln(document.querySelectorAll(".table-definition"));if(window.tokenUsageTracker&&!window.tokenUsageTracker.useTokens(t,"multi-table-generation"))return;const n={tables:i,relationships:e,format:document.getElementById("multi-table-format").value,options:{maintainReferentialIntegrity:document.getElementById("maintain-referential-integrity").checked,generateRealisticDistributions:document.getElementById("generate-realistic-distributions").checked,hierarchicalGeneration:document.getElementById("hierarchical-generation").checked}};await Ke(n,"multi-table")}function Bn(i){if(i.length<2||!i.every(a=>a.name.endsWith(".csv")||a.name.endsWith(".json")||a.name.endsWith(".xlsx")))return!1;const t=i.map(a=>a.name);return Pn(t).length>2}function Pn(i){if(i.length===0)return"";let e=i[0];for(let t=1;t<i.length;t++)for(;i[t].indexOf(e)!==0;)if(e=e.substring(0,e.length-1),e==="")return"";return e}function C(){var h,g,y,v,S,E,I,x,M,_,z;const i=((h=document.getElementById("gen-format"))==null?void 0:h.value)||"csv",e=te();let t=0,n=10,a="";const s=((g=document.getElementById("manual-config-section"))==null?void 0:g.style.display)!=="none",o=((y=document.getElementById("multi-table-section"))==null?void 0:y.style.display)!=="none";e==="template"?(a=`Template: ${window.currentTemplate.industry}`,t=parseInt(((v=document.getElementById("gen-rows"))==null?void 0:v.value)||0),n=window.detectedColumns?window.detectedColumns.length:10):e==="pattern"?(a="Uploaded File",t=parseInt(((S=document.getElementById("gen-rows"))==null?void 0:S.value)||0),n=((E=T==null?void 0:T.columns)==null?void 0:E.length)||10):e==="manual"&&s?(a="Manual Configuration",t=parseInt(((I=document.getElementById("manual-rows"))==null?void 0:I.value)||0),n=document.querySelectorAll("#columns-container .column-item").length||1):e==="multi-table"||o?(a="Multi-Table",document.querySelectorAll(".table-definition").forEach(D=>{var B;const q=parseInt(((B=D.querySelector(".table-rows"))==null?void 0:B.value)||0);t+=q,n=Math.max(n,D.querySelectorAll(".column-item").length||5)})):(a="No data source selected",t=parseInt(((x=document.getElementById("gen-rows"))==null?void 0:x.value)||0),n=0);let l=document.getElementById("data-source-status");if(!l){const $=document.querySelector(".cost-calculator h2");$&&(l=document.createElement("span"),l.id="data-source-status",l.style.fontSize="0.8rem",l.style.marginLeft="10px",l.style.color="var(--text-color-secondary)",$.appendChild(l))}if(l&&(l.textContent=a?`(${a})`:""),n===0){const $=document.getElementById("total-data-size"),D=document.getElementById("total-token-cost"),q=document.getElementById("total-rows"),B=document.getElementById("generation-time");$&&($.textContent="0 MB"),D&&(D.textContent="0 tokens"),q&&(q.textContent="0"),B&&(B.textContent="N/A");return}const r=Vn(t,n,i),c=document.getElementById("total-data-size");c&&(c.textContent=ne(r));const d=document.getElementById("total-rows");d&&(d.textContent=t.toLocaleString());const u=dn(t),m=document.getElementById("total-token-cost");if(m){const $=m.textContent,D=`${u.toLocaleString()} tokens`;$!==D&&(m.textContent=D,m.style.transition="transform 0.3s ease, color 0.3s ease",m.style.transform="scale(1.1)",m.style.color="#6366f1",setTimeout(()=>{m.style.transform="scale(1)",m.style.color=""},300))}const p=document.getElementById("generation-time");if(p){(M=document.getElementById("differential-privacy"))!=null&&M.checked||(_=document.getElementById("k-anonymity"))!=null&&_.checked||((z=document.getElementById("data-masking"))==null||z.checked);const $=jn(t,H);p.textContent=$}}function An(){Object.entries({"total-data-size":"0 MB","total-token-cost":"0 tokens","generation-time":"< 1 minute","total-rows":"0"}).forEach(([e,t])=>{const n=document.getElementById(e);n&&(n.textContent=t)})}function fe(i){const e=document.querySelector(".generation-options-section"),t=document.getElementById("generation-config"),n=document.getElementById("multi-table-section"),a=document.getElementById("detected-columns-section"),s=document.getElementById("manual-config-section"),o=document.querySelector(".generation-method-section");switch(i){case"none":e&&(e.style.display="block"),t&&(t.style.display="none"),n&&(n.style.display="none"),a&&(a.style.display="none"),s&&(s.style.display="block"),o&&(o.style.display="none");break;case"single":e&&(e.style.display="none"),t&&(t.style.display="block"),n&&(n.style.display="none"),a&&(a.style.display="block"),s&&(s.style.display="none");break;case"multi":e&&(e.style.display="none"),t&&(t.style.display="none"),n&&(n.style.display="block"),a&&(a.style.display="none"),s&&(s.style.display="none"),o&&(o.style.display="none"),zn();break;case"template":e&&(e.style.display="block"),t&&(t.style.display="block"),n&&(n.style.display="none"),a&&(a.style.display="block"),s&&(s.style.display="none"),o&&(o.style.display="none");break}}function W(i){const e=document.getElementById("detected-columns-container");if(!e)return;window.detectedColumns=i.map(s=>typeof s=="string"?{name:s,type:"string",nullable:!0}:s);let t=`
        <div class="columns-toolbar">
            <button class="btn btn-primary add-column-btn" onclick="addNewDetectedColumn()">
                <i class="fas fa-plus"></i> Add Column
            </button>
        </div>
        <div class="detected-columns-grid">
    `;window.detectedColumns.forEach((s,o)=>{const l=s.name||s,r=_n(s),c=qn(r);t+=`
            <div class="column-config-item" data-column="${l}" data-index="${o}">
                <div class="column-row-wrapper">
                    <div class="column-info-section">
                        <div class="column-header">
                            <strong class="column-name">${l}</strong>
                            <button class="remove-column-btn" onclick="removeDetectedColumn(${o})" title="Remove column">×</button>
                        </div>
                    </div>
                    
                    <div class="column-settings-row">
                        <div class="setting-item">
                            <label>Type:</label>
                            <select class="column-data-type compact" data-column="${l}" data-index="${o}">
                                <option value="string" ${r==="string"?"selected":""}>String</option>
                                <option value="integer" ${r==="integer"?"selected":""}>Integer</option>
                                <option value="float" ${r==="float"?"selected":""}>Float</option>
                                <option value="date" ${r==="date"?"selected":""}>Date</option>
                                <option value="datetime" ${r==="datetime"?"selected":""}>DateTime</option>
                                <option value="boolean" ${r==="boolean"?"selected":""}>Boolean</option>
                                <option value="email" ${r==="email"?"selected":""}>Email</option>
                                <option value="phone" ${r==="phone"?"selected":""}>Phone</option>
                                <option value="name" ${r==="name"?"selected":""}>Name</option>
                                <option value="address" ${r==="address"?"selected":""}>Address</option>
                                <option value="account" ${r==="account"?"selected":""}>Account</option>
                                <option value="currency" ${r==="currency"?"selected":""}>Currency</option>
                                <option value="category" ${r==="category"?"selected":""}>Category</option>
                            </select>
                        </div>
                        
                        <div class="setting-item checkbox-group">
                            <label class="checkbox-inline">
                                <input type="checkbox" class="column-unique" data-column="${l}" ${s.unique?"checked":""}>
                                Unique
                            </label>
                            <label class="checkbox-inline">
                                <input type="checkbox" class="column-nullable" data-column="${l}" ${s.nullable!==!1?"checked":""}>
                                Nullable
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <label>Missing:</label>
                            <select class="missing-strategy compact" data-column="${s.name}">
                                ${c}
                            </select>
                        </div>
                        
                        ${Fn(r,s)||""}
                        
                        <div class="column-stats-inline">
                            <span class="stat-badge" title="Null values">${s.nullCount||0}</span>
                            <span class="stat-badge" title="Unique values">${s.uniqueCount||"—"}</span>
                        </div>
                    </div>
                </div>
            </div>
        `}),t+="</div>",e.innerHTML=t,e.querySelectorAll(".column-data-type").forEach(s=>{s.addEventListener("change",Nn)}),e.querySelectorAll(".missing-strategy").forEach(s=>{s.addEventListener("change",Rn)}),e.querySelectorAll(".column-unique, .column-nullable").forEach(s=>{s.addEventListener("change",On)});const n=document.querySelector(".generation-method-section"),a=document.getElementById("detected-columns-section");if(n&&a){const s=a.querySelector("h3");s&&s.textContent!=="Template Columns & Configuration"&&(n.style.display="block")}}function _n(i){const e=(typeof i=="string"?i:i.name||"").toLowerCase();if(e.includes("email")||e.includes("mail"))return"email";if(e.includes("phone")||e.includes("tel")||e.includes("mobile"))return"phone";if(e.includes("name")&&(e.includes("first")||e.includes("last")||e.includes("full")))return"name";if(e.includes("address")||e.includes("street")||e.includes("city"))return"address";if(e.includes("date")||e.includes("time")||e.includes("created")||e.includes("updated"))return"date";if(e.includes("id")||e.includes("account")||e.includes("number"))return"account";if(e.includes("price")||e.includes("amount")||e.includes("cost")||e.includes("salary"))return"currency";if(i.samples&&i.samples.length>0){const t=i.samples[0];if(typeof t=="number")return parseFloat(t)%1===0?"integer":"float";if(typeof t=="boolean")return"boolean";if(!isNaN(Date.parse(t)))return"date"}return"string"}function qn(i){const e={numeric:`
            <option value="random-range">Random between min/max in data</option>
            <option value="custom-range">Random between custom range</option>
            <option value="mean">Mean imputation</option>
            <option value="median">Median imputation</option>
            <option value="mode">Mode imputation</option>
            <option value="forward-fill">Forward fill</option>
            <option value="backward-fill">Backward fill</option>
        `,categorical:`
            <option value="mode">Most frequent value</option>
            <option value="random-existing">Random from existing values</option>
            <option value="custom-value">Custom value</option>
            <option value="forward-fill">Forward fill</option>
            <option value="backward-fill">Backward fill</option>
        `,temporal:`
            <option value="forward-fill">Forward fill</option>
            <option value="backward-fill">Backward fill</option>
            <option value="interpolate">Interpolate</option>
            <option value="current-date">Current date</option>
        `,identifier:`
            <option value="generate-unique">Generate unique ID</option>
            <option value="sequential">Sequential numbering</option>
            <option value="uuid">UUID</option>
        `};return["integer","float","currency"].includes(i)?e.numeric:["date","datetime"].includes(i)?e.temporal:["id","account"].includes(i)?e.identifier:e.categorical}function Fn(i,e){switch(i){case"name":return`
                <div class="setting-item">
                    <label>Format:</label>
                    <select class="name-generation compact">
                        <option value="realistic">Realistic</option>
                        <option value="pattern">Pattern</option>
                        <option value="random">Random</option>
                    </select>
                </div>
            `;case"email":return`
                <div class="setting-item">
                    <label>Format:</label>
                    <select class="email-format compact">
                        <option value="firstname.lastname">First.Last</option>
                        <option value="initials">F.Last</option>
                        <option value="random">Random</option>
                    </select>
                </div>
            `;case"phone":return`
                <div class="setting-item">
                    <label>Format:</label>
                    <select class="phone-format compact">
                        <option value="us">(XXX) XXX-XXXX</option>
                        <option value="intl">+1-XXX-XXX-XXXX</option>
                        <option value="simple">XXXXXXXXXX</option>
                    </select>
                </div>
            `;case"account":return`
                <div class="setting-item">
                    <label>Length:</label>
                    <input type="number" class="compact-input account-length" value="10" min="4" max="20">
                </div>
            `;case"address":return`
                <div class="setting-item">
                    <label>Address:</label>
                    <select class="address-type compact">
                        <option value="full">Full</option>
                        <option value="street">Street</option>
                        <option value="city-state">City/State</option>
                    </select>
                </div>
            `;case"currency":return`
                <div class="setting-item range-group">
                    <label>Range:</label>
                    <input type="number" class="compact-input currency-min" placeholder="Min" value="0">
                    <span class="range-separator">to</span>
                    <input type="number" class="compact-input currency-max" placeholder="Max" value="10000">
                </div>
            `;case"integer":case"float":return`
                <div class="setting-item range-group">
                    <label>Range:</label>
                    <input type="number" class="compact-input num-min" placeholder="Min" value="0">
                    <span class="range-separator">to</span>
                    <input type="number" class="compact-input num-max" placeholder="Max" value="100">
                </div>
            `;case"date":case"datetime":return`
                <div class="setting-item">
                    <label>Period:</label>
                    <select class="date-range compact">
                        <option value="last-year">Last Year</option>
                        <option value="last-5-years">Last 5 Years</option>
                        <option value="future">Future Dates</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
            `;case"category":return`
                <div class="setting-item">
                    <label>Categories:</label>
                    <input type="text" class="compact-input category-list" placeholder="A, B, C..." value="${e.categories?e.categories.join(", "):""}">
                </div>
            `;default:return""}}function Nn(i){const e=i.target.value;i.target.dataset.column;const t=parseInt(i.target.dataset.index);window.detectedColumns&&window.detectedColumns[t]&&(window.detectedColumns[t].type=e,W(window.detectedColumns),C())}function Rn(i){const e=i.target.value;i.target.dataset.column;const n=i.target.closest(".column-settings-row").querySelector(".custom-missing-input");if(n&&n.remove(),e==="custom-range"){const a=document.createElement("div");a.className="setting-item range-group custom-missing-input",a.innerHTML=`
            <label>Values:</label>
            <input type="number" class="compact-input range-min" placeholder="Min">
            <span class="range-separator">to</span>
            <input type="number" class="compact-input range-max" placeholder="Max">
        `,i.target.parentElement.insertAdjacentElement("afterend",a)}else if(e==="custom-value"){const a=document.createElement("div");a.className="setting-item custom-missing-input",a.innerHTML=`
            <label>Value:</label>
            <input type="text" class="compact-input custom-value" placeholder="Custom value">
        `,i.target.parentElement.insertAdjacentElement("afterend",a)}V(),C()}function zn(){console.log("Detecting table relationships...")}window.toggleMethodDetails=function(i){const e=document.getElementById(`${i}-details`),t=e.parentElement.querySelector(".method-expand-btn i");e.style.display==="none"?(e.style.display="block",t.className="fas fa-chevron-up"):(e.style.display="none",t.className="fas fa-chevron-down")};window.togglePrivacySettings=function(){const i=document.getElementById("privacy-content"),e=document.querySelector(".privacy-section .method-expand-btn i");i&&e&&(i.style.display==="none"?(i.style.display="block",e.className="fas fa-chevron-up"):(i.style.display="none",e.className="fas fa-chevron-down"))};window.addNewDetectedColumn=function(){window.detectedColumns||(window.detectedColumns=[]);const i={name:`new_column_${window.detectedColumns.length+1}`,type:"string",nullable:!0,unique:!1,samples:[],nullCount:0,uniqueCount:"N/A"};window.detectedColumns.push(i),W(window.detectedColumns),C(),setTimeout(()=>{const e=document.querySelector(".column-config-item:last-child .column-name");e&&at(e)},100)};window.removeDetectedColumn=function(i){window.detectedColumns&&window.detectedColumns[i]&&(window.detectedColumns.splice(i,1),W(window.detectedColumns),V(),C())};function at(i){const e=i.textContent,t=document.createElement("input");t.type="text",t.value=e,t.className="column-name-input",i.replaceWith(t),t.focus(),t.select();const n=()=>{const a=t.value.trim();if(a){const s=parseInt(t.closest(".column-config-item").dataset.index);window.detectedColumns[s]&&(window.detectedColumns[s].name=a);const o=document.createElement("span");o.className="column-name",o.textContent=a,o.onclick=()=>at(o),t.replaceWith(o)}};t.addEventListener("blur",n),t.addEventListener("keypress",a=>{a.key==="Enter"&&n()})}function On(i){const e=i.target.dataset.column,t=i.target.classList.contains("column-unique"),n=window.detectedColumns.find(a=>a.name===e);n&&(t?n.unique=i.target.checked:n.nullable=i.target.checked),V(),C()}function Hn(){["gen-rows","manual-rows"].forEach(e=>{const t=document.getElementById(e);t&&t.addEventListener("input",C)}),document.addEventListener("input",e=>{e.target.classList.contains("table-rows")&&C()}),document.addEventListener("change",e=>{const t=e.target;t.classList.contains("column-data-type")&&C(),(t.classList.contains("column-unique")||t.classList.contains("column-nullable"))&&C(),t.classList.contains("missing-strategy")&&C()}),document.addEventListener("click",e=>{e.target.closest(".method-card")&&setTimeout(C,100)})}function Un(){const i={"privacy-noise":"Adds carefully calibrated random noise to your synthetic data to protect individual records while preserving overall data patterns and statistics. Lower values provide stronger privacy but may reduce data accuracy. This is the gold standard for privacy-preserving data generation.","gdpr-compliance":"Ensures your synthetic data meets European Union privacy regulations (General Data Protection Regulation). Automatically enables anonymization techniques, prevents re-identification of individuals, and ensures the right to be forgotten is maintained. Essential for any data used in EU contexts.","hipaa-compliance":"Applies US healthcare data privacy and security standards. Automatically removes all 18 HIPAA identifiers including names, geographic data, dates, contact info, SSN, medical record numbers, and biometric data. Ensures medical data cannot be traced back to specific patients.","pci-compliance":"Implements Payment Card Industry Data Security Standard requirements. Masks all card numbers (keeping only last 4 digits), removes CVV codes, tokenizes transaction IDs, and ensures all payment-related data meets industry security standards for financial data.","k-anonymity":"Groups records together so each individual appears with at least k-1 other similar records (default k=5). This makes it impossible to identify specific individuals. For example, with k=5, any combination of attributes will match at least 5 people in the dataset.","l-diversity":'Ensures sensitive attributes (like medical conditions or salaries) have diverse values within each k-anonymous group. This prevents attackers from inferring sensitive information even if they know someone is in the dataset. Each group will have at least "l" different values for sensitive fields.',"t-closeness":'Maintains similar statistical distributions of sensitive attributes between groups and the overall dataset. This prevents inference attacks where attackers use statistical patterns to guess sensitive values. The distribution in any group stays within threshold "t" of the overall distribution.',"data-masking":"Replaces real sensitive data with realistic but fictitious values. Names become fake names, SSNs become valid-format fake SSNs, addresses become real but different addresses. Maintains data format and validity while removing all real personal information."},e=document.getElementById("tooltip-container"),t=e==null?void 0:e.querySelector(".tooltip-text");let n=null,a=null;document.querySelectorAll(".help-icon").forEach(l=>{const r=l.dataset.tooltip;!r||!i[r]||(l.addEventListener("mouseenter",c=>{clearTimeout(a),s(c.currentTarget,i[r])}),l.addEventListener("mouseleave",()=>{o()}),l.addEventListener("click",c=>{c.preventDefault(),c.stopPropagation(),n===r?o():s(c.currentTarget,i[r])}))}),document.addEventListener("click",l=>{l.target.closest(".help-icon")||o()});function s(l,r){if(!e||!t)return;const c=l.getBoundingClientRect();n=l.dataset.tooltip,t.textContent=r,e.style.display="block";const d=e.getBoundingClientRect();let u=c.left+c.width/2-d.width/2,m=c.top-d.height-10;if(u<10&&(u=10),u+d.width>window.innerWidth-10&&(u=window.innerWidth-d.width-10),m<10){m=c.bottom+10;const p=e.querySelector(".tooltip-arrow");p&&(p.style.borderWidth="0 6px 6px 6px",p.style.borderColor="transparent transparent #2d3748 transparent",p.style.top="-6px",p.style.bottom="auto")}else{const p=e.querySelector(".tooltip-arrow");p&&(p.style.borderWidth="6px 6px 0 6px",p.style.borderColor="#2d3748 transparent transparent transparent",p.style.bottom="-6px",p.style.top="auto")}e.style.left=`${u}px`,e.style.top=`${m}px`}function o(){e&&(a=setTimeout(()=>{e.style.display="none",n=null},100))}}function Vn(i,e,t){var o,l;if(!i||!e)return 0;let n=0,a=0;switch(t){case"csv":n=12,a=e*20;break;case"json":n=25,a=i*4+100;break;case"excel":n=8,a=5e3;break;case"parquet":n=5,a=1e3;break;default:n=12,a=100}let s=i*e*n+a;return(o=document.getElementById("differential-privacy"))!=null&&o.checked&&(s*=1.1),(l=document.getElementById("data-masking"))!=null&&l.checked&&(s*=1.05),Math.round(s)}function jn(i,e,t){var o,l,r;if(!i)return"< 1 second";let n=0;switch(e){case"ctgan":n=2;break;case"timegan":n=3;break;case"vae":n=1;break;default:n=1.5}let a=i/1e3*n;(o=document.getElementById("differential-privacy"))!=null&&o.checked&&(a*=1.5),(l=document.getElementById("k-anonymity"))!=null&&l.checked&&(a*=1.2),(r=document.getElementById("data-masking"))!=null&&r.checked&&(a*=1.1);const s=document.querySelectorAll(".table-definition");if(s.length>1&&(a*=1+(s.length-1)*.3),a<1)return"< 1 second";if(a<60)return`${Math.round(a)} seconds`;if(a<300){const c=Math.floor(a/60),d=Math.round(a%60);return`${c}m ${d}s`}else return`~${Math.round(a/60)} minutes`}window.downloadGeneratedData=Ye;window.previewGeneratedData=Ze;window.handlePatternBasedGeneration=J;window.handleGenerateData=Xe;window.testGenerateButton=function(){alert("Button is working! Now testing generation..."),console.log("Test button click successful"),J()};class Gn{constructor(){this.initialized=!1,this.hasUnsavedChanges=!1,this.ruleData={name:"",description:"",triggers:{type:"manual",config:{}},apiConfig:{inputs:{webhook:{enabled:!1,url:"",token:"",auth:{type:"none",config:{}}},schema:[],mapping:{}},outputs:[]},conditions:{id:"root",type:"group",operator:"AND",children:[]},actions:[],settings:{executionMode:"sequential",errorHandling:"stop",maxRetries:3}},this.availableModels=[],this.conditionIdCounter=0,this.actionIdCounter=0,this.schemaFieldIdCounter=0,this.outputIdCounter=0,this.defaultFields=[{value:"input.field1",label:"Input Field 1"},{value:"model.output",label:"Model Output"},{value:"model.confidence",label:"Model Confidence"},{value:"context.user_id",label:"User ID"},{value:"context.timestamp",label:"Timestamp"}],this.availableFields=[...this.defaultFields]}saveState(){const e={ruleData:this.ruleData,conditionIdCounter:this.conditionIdCounter,actionIdCounter:this.actionIdCounter,schemaFieldIdCounter:this.schemaFieldIdCounter,outputIdCounter:this.outputIdCounter,ruleId:this.ruleId};sessionStorage.setItem("rulesEngineState",JSON.stringify(e)),this.hasUnsavedChanges=!0}restoreState(){const e=sessionStorage.getItem("rulesEngineState");if(e)try{const t=JSON.parse(e);return this.ruleData=t.ruleData||this.ruleData,this.conditionIdCounter=t.conditionIdCounter||0,this.actionIdCounter=t.actionIdCounter||0,this.schemaFieldIdCounter=t.schemaFieldIdCounter||0,this.outputIdCounter=t.outputIdCounter||0,this.ruleId=t.ruleId,console.log("✅ Restored previous rules engine state"),!0}catch(t){console.error("Failed to restore state:",t),sessionStorage.removeItem("rulesEngineState")}return!1}destroy(){console.log("🧹 Destroying rules engine instance");const e=s=>{this.hasUnsavedChanges&&(s.preventDefault(),s.returnValue="You have unsaved changes. Are you sure you want to leave?")};window.removeEventListener("beforeunload",e),this.updateInterval&&clearInterval(this.updateInterval),this.initialized=!1,this.hasUnsavedChanges=!1;const t=document.getElementById("trigger-type");t&&t.replaceWith(t.cloneNode(!0));const n=document.getElementById("execution-mode");n&&n.replaceWith(n.cloneNode(!0));const a=document.getElementById("error-handling");a&&a.replaceWith(a.cloneNode(!0)),console.log("✅ Rules engine instance destroyed")}async init(){console.log("🚀 Initializing Advanced Rules Engine"),this.initialized=!1,console.log("📄 Document ready state:",document.readyState),console.log("🌐 DOM loaded:",document.body?"Yes":"No");const e=["trigger-container","api-inputs-container","api-outputs-container","conditions-container","actions-container"];let t=[];e.forEach(o=>{const l=document.getElementById(o);l?console.log(`✅ Container found: ${o}`,l):(console.error(`❌ Container missing: ${o}`),t.push(o))}),t.length>0&&(console.error("❌ Critical: Missing containers will prevent rendering:",t),console.log("🔍 Available elements in document:",Array.from(document.querySelectorAll("[id]")).map(o=>o.id)),console.log("🔍 Searching for container elements..."),e.forEach(o=>{const l=document.querySelectorAll(`[id*="${o}"]`);l.length>0&&console.log(`🔍 Found similar elements for ${o}:`,Array.from(l).map(r=>r.id))})),this.setupEventListeners();const n=this.restoreState();console.log("🎨 Rendering UI immediately (before API calls)..."),this.renderRule(),n&&this.updateFormFields(),this.initialized=!0,this.initializeFormFields(),console.log("🌐 Loading API data in background..."),this.loadAvailableModelsAsync(),this.loadRulesListAsync(),this.loadAPIEndpointsAsync();const s=new URLSearchParams(window.location.hash.split("?")[1]||"").get("edit");s&&!n&&this.loadRuleAsync(s),console.log("✅ Rules engine initialization complete"),window.addEventListener("beforeunload",o=>{this.hasUnsavedChanges&&(o.preventDefault(),o.returnValue="You have unsaved changes. Are you sure you want to leave?")})}initializeFormFields(){console.log("📝 Initializing form fields...");const e=document.getElementById("rule-name"),t=document.getElementById("rule-description");e&&(e.value=this.ruleData.name||"",e.addEventListener("input",o=>{this.ruleData.name=o.target.value,this.saveState()})),t&&(t.value=this.ruleData.description||"",t.addEventListener("input",o=>{this.ruleData.description=o.target.value,this.saveState()}));const n=document.getElementById("execution-mode"),a=document.getElementById("error-handling"),s=document.getElementById("max-retries");n&&(n.value=this.ruleData.settings.executionMode||"sequential",n.addEventListener("change",o=>{this.ruleData.settings.executionMode=o.target.value,this.saveState(),this.updateTokenCost()})),a&&(a.value=this.ruleData.settings.errorHandling||"stop",a.addEventListener("change",o=>{this.ruleData.settings.errorHandling=o.target.value,this.saveState(),this.updateTokenCost()})),s&&(s.value=this.ruleData.settings.maxRetries||3,s.addEventListener("input",o=>{this.ruleData.settings.maxRetries=parseInt(o.target.value)||0,this.saveState(),this.updateTokenCost()})),console.log("✅ Form fields initialized")}async loadAvailableModelsAsync(){try{console.log("📡 Fetching available models...");const e=await f("/api/models/me");this.availableModels=e||[],console.log("✅ Models loaded:",this.availableModels.length),this.updateModelDependentSections()}catch(e){console.error("⚠️ Failed to load models (UI still functional):",e),this.availableModels=[]}}async loadRulesListAsync(){try{console.log("📡 Fetching existing rules...");const e=await f("/api/rules");e&&e.length>0&&(console.log("✅ Rules loaded:",e.length),this.updateRuleDependentSections(e))}catch(e){console.error("⚠️ Failed to load rules list:",e)}}async loadAPIEndpointsAsync(){try{console.log("📡 Fetching API endpoints...");const e=await f("/api/endpoints");e&&(console.log("✅ API endpoints loaded"),this.updateAPIEndpointSuggestions(e))}catch(e){console.error("⚠️ Failed to load API endpoints:",e)}}updateRuleDependentSections(e){console.log("🔄 Updating rule-dependent sections")}updateAPIEndpointSuggestions(e){console.log("🔄 Updating API endpoint suggestions")}async loadRuleAsync(e){try{await this.loadRule(e),this.renderRule()}catch(t){console.error("⚠️ Failed to load rule (UI still functional):",t)}}updateModelDependentSections(){console.log("🔄 Updating model-dependent sections...");try{this.renderTriggerConfig(),document.querySelectorAll(".action-item").forEach(t=>{if(t.querySelector(".model-select")){const a=t.dataset.id,s=this.ruleData.actions.find(o=>o.id===a);if(s){const o=t.querySelector(".action-config");o.innerHTML=this.renderActionConfig(s)}}}),console.log("✅ Model-dependent sections updated")}catch(e){console.error("⚠️ Error updating model-dependent sections:",e)}}async loadAvailableModels(){try{const e=await f("/api/models/me");this.availableModels=e||[]}catch(e){console.error("Failed to load models:",e),this.availableModels=[]}}async loadRule(e){try{const t=await f(`/api/rules/${e}`);if(t&&!t.error){this.ruleId=e,this.ruleData.name=t.rule_name||"",this.ruleData.description=t.description||"",t.logic_json&&(this.ruleData.triggers=t.logic_json.triggers||this.ruleData.triggers,this.ruleData.apiConfig=t.logic_json.apiConfig||this.ruleData.apiConfig,this.ruleData.conditions=t.logic_json.conditions||this.ruleData.conditions,this.ruleData.actions=t.logic_json.actions||[],this.ruleData.settings=t.logic_json.settings||this.ruleData.settings),t.trigger_config&&(this.ruleData.triggers=t.trigger_config),t.execution_mode&&(this.ruleData.settings.executionMode=t.execution_mode),t.error_handling&&(this.ruleData.settings.errorHandling=t.error_handling.strategy||"stop",this.ruleData.settings.maxRetries=t.error_handling.maxRetries||3);const n=document.getElementById("rule-name");n&&(n.value=this.ruleData.name);const a=document.getElementById("rule-description");a&&(a.value=this.ruleData.description);const s=document.getElementById("execution-mode");s&&(s.value=this.ruleData.settings.executionMode);const o=document.getElementById("error-handling");o&&(o.value=this.ruleData.settings.errorHandling);const l=document.getElementById("max-retries");l&&(l.value=this.ruleData.settings.maxRetries)}}catch(t){console.error("Failed to load rule:",t),alert("Failed to load rule. Creating a new rule instead.")}}updateFormFields(){const e=document.getElementById("rule-name");e&&(e.value=this.ruleData.name);const t=document.getElementById("rule-description");t&&(t.value=this.ruleData.description);const n=document.getElementById("execution-mode");n&&(n.value=this.ruleData.settings.executionMode);const a=document.getElementById("error-handling");a&&(a.value=this.ruleData.settings.errorHandling);const s=document.getElementById("max-retries");s&&(s.value=this.ruleData.settings.maxRetries);const o=document.getElementById("trigger-type");o&&(o.value=this.ruleData.triggers.type)}setupEventListeners(){const e=document.getElementById("rule-name"),t=document.getElementById("rule-description");e&&e.addEventListener("input",u=>{this.ruleData.name=u.target.value,this.saveState()}),t&&t.addEventListener("input",u=>{this.ruleData.description=u.target.value,this.saveState()});const n=document.getElementById("add-condition-btn");n&&n.addEventListener("click",()=>{this.addCondition(this.ruleData.conditions),this.renderConditions()});const a=document.getElementById("add-action-btn");a&&a.addEventListener("click",()=>{this.addAction(),this.renderActions()});const s=document.getElementById("save-rule-btn");s&&s.addEventListener("click",()=>this.saveRule());const o=document.getElementById("test-rule-btn");o&&o.addEventListener("click",()=>this.testRule());const l=document.getElementById("trigger-type");l&&l.addEventListener("change",u=>{this.ruleData.triggers.type=u.target.value,this.saveState(),this.updateTokenCost(),this.renderTriggerConfig()});const r=document.getElementById("execution-mode");r&&r.addEventListener("change",u=>{this.ruleData.settings.executionMode=u.target.value});const c=document.getElementById("error-handling");c&&c.addEventListener("change",u=>{this.ruleData.settings.errorHandling=u.target.value});const d=document.getElementById("max-retries");d&&d.addEventListener("input",u=>{this.ruleData.settings.maxRetries=parseInt(u.target.value)||3})}addCondition(e,t=null){const n=t||{id:`condition_${this.conditionIdCounter++}`,type:"condition",field:"",operator:"equals",value:"",connector:e.children&&e.children.length>0?"AND":null};return e.children||(e.children=[]),e.children.push(n),this.saveState(),this.updateTokenCost(),n}addConditionGroup(e){const t={id:`group_${this.conditionIdCounter++}`,type:"group",operator:"AND",children:[],connector:e.children&&e.children.length>0?"AND":null};return e.children||(e.children=[]),e.children.push(t),this.saveState(),this.updateTokenCost(),t}removeCondition(e,t){e.children=e.children.filter(n=>n.id!==t),this.saveState(),this.updateTokenCost()}addAction(){const e={id:`action_${this.actionIdCounter++}`,type:"trigger_model",config:{}};return this.initializeActionConfig(e),this.ruleData.actions.push(e),this.saveState(),this.updateTokenCost(),e}initializeActionConfig(e){switch(e.type){case"trigger_model":e.config={modelId:"",inputMapping:{},outputVariable:""};break;case"send_notification":e.config={notificationType:"email",recipients:"",messageTemplate:""};break;case"webhook":e.config={url:"",method:"POST",payload:{}};break;case"trigger_rule":e.config={ruleId:"",passData:{}};break;case"store_data":e.config={storageType:"database",key:"",data:{}};break;case"transform_data":e.config={transformType:"jmespath",expression:"",outputVariable:""};break;default:e.config={}}}removeAction(e){this.ruleData.actions=this.ruleData.actions.filter(t=>t.id!==e),this.saveState(),this.updateTokenCost()}renderRule(){console.log("🎯 Starting renderRule()");try{console.log("🔥 Rendering triggers..."),this.renderTriggers(),console.log("🌐 Rendering API config..."),this.renderApiConfig(),console.log("🎛️ Rendering conditions..."),this.renderConditions(),console.log("⚡ Rendering actions..."),this.renderActions(),console.log("💰 Updating token cost..."),this.updateTokenCost(),console.log("✅ Rules engine render complete")}catch(e){console.error("❌ Error during renderRule:",e)}}renderTriggers(){console.log("🔥 renderTriggers() called");try{const e=document.getElementById("trigger-container");if(!e){console.error("❌ Trigger container not found - DOM element missing");return}console.log("✅ Trigger container found:",e);const t={manual:"Manual Trigger",schedule:"Scheduled",event:"Event-based",model_complete:"Model Completion",webhook:"Webhook"};console.log("🔧 Setting trigger container innerHTML..."),console.log("📝 Previous trigger content length:",e.innerHTML.length),e.innerHTML=`
                <div class="trigger-section">
                    <h3>Trigger Configuration</h3>
                    <div class="form-group">
                        <label>Trigger Type</label>
                        <select id="trigger-type" class="form-control">
                            ${Object.entries(t).map(([n,a])=>`<option value="${n}" ${this.ruleData.triggers.type===n?"selected":""}>${a}</option>`).join("")}
                        </select>
                    </div>
                    <div id="trigger-config"></div>
                </div>
            `,console.log("✅ Trigger innerHTML set successfully"),this.renderTriggerConfig(),this.attachTriggerTypeListener(),console.log("✅ renderTriggers() completed successfully")}catch(e){console.error("❌ Error in renderTriggers():",e)}}attachTriggerTypeListener(){const e=document.getElementById("trigger-type");e&&e.addEventListener("change",t=>{this.ruleData.triggers.type=t.target.value,this.saveState(),this.updateTokenCost(),this.renderTriggerConfig()})}renderTriggerConfig(){const e=document.getElementById("trigger-config");if(!e)return;let t="";switch(this.ruleData.triggers.type){case"schedule":t=`
                    <div class="form-group">
                        <label>Cron Expression</label>
                        <input type="text" id="trigger-cron" class="form-control" placeholder="0 0 * * *" value="${this.ruleData.triggers.config.cron||""}">
                        <small>Run daily at midnight: 0 0 * * *</small>
                    </div>
                `;break;case"event":t=`
                    <div class="form-group">
                        <label>Event Type</label>
                        <select id="trigger-event-type" class="form-control">
                            <option value="data_upload" ${this.ruleData.triggers.config.eventType==="data_upload"?"selected":""}>Data Upload</option>
                            <option value="model_trained" ${this.ruleData.triggers.config.eventType==="model_trained"?"selected":""}>Model Trained</option>
                            <option value="prediction_complete" ${this.ruleData.triggers.config.eventType==="prediction_complete"?"selected":""}>Prediction Complete</option>
                        </select>
                    </div>
                `;break;case"model_complete":t=`
                    <div class="form-group">
                        <label>Model</label>
                        <select id="trigger-model" class="form-control">
                            <option value="">Select a model</option>
                            ${this.availableModels.map(a=>`<option value="${a.id}" ${this.ruleData.triggers.config.modelId==a.id?"selected":""}>${a.name}</option>`).join("")}
                        </select>
                    </div>
                `;break;case"webhook":const n=this.generateWebhookUrl();t=`
                    <div class="form-group">
                        <label>Webhook Endpoint</label>
                        <div class="webhook-url-display">
                            <input type="text" class="form-control" readonly value="${n}">
                            <button class="copy-button" onclick="copyToClipboard('${n}')">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                        <small>POST data to this endpoint to trigger the rule</small>
                    </div>
                `;break}e.innerHTML=t,this.attachTriggerEventListeners()}attachTriggerEventListeners(){switch(this.ruleData.triggers.type){case"schedule":const e=document.getElementById("trigger-cron");e&&e.addEventListener("input",a=>{this.ruleData.triggers.config.cron=a.target.value});break;case"event":const t=document.getElementById("trigger-event-type");t&&t.addEventListener("change",a=>{this.ruleData.triggers.config.eventType=a.target.value});break;case"model_complete":const n=document.getElementById("trigger-model");n&&n.addEventListener("change",a=>{this.ruleData.triggers.config.modelId=a.target.value});break}}renderApiConfig(){console.log("🌐 renderApiConfig() called");try{const e=document.getElementById("api-inputs-container"),t=document.getElementById("api-outputs-container");if(!e)console.error("❌ API inputs container not found - DOM element missing");else{console.log("✅ API inputs container found, rendering inputs...");try{this.renderApiInputs(e),console.log("✅ API inputs rendered successfully")}catch(a){console.error("❌ Error rendering API inputs:",a)}}if(!t)console.error("❌ API outputs container not found - DOM element missing");else{console.log("✅ API outputs container found, rendering outputs...");try{this.renderApiOutputs(t),console.log("✅ API outputs rendered successfully")}catch(a){console.error("❌ Error rendering API outputs:",a)}}const n=document.querySelectorAll(".api-tabs .tab-button");console.log("🔗 Setting up API tab switching for",n.length,"buttons"),n.forEach(a=>{a.addEventListener("click",s=>{const o=s.target.dataset.tab;console.log("🔄 API Tab clicked:",o),document.querySelectorAll(".api-tabs .tab-button").forEach(r=>r.classList.remove("active")),s.target.classList.add("active"),document.querySelectorAll(".api-config-section .tab-pane").forEach(r=>r.classList.remove("active"));const l=document.getElementById(`api-${o}-tab`);l?(console.log("✅ Switching to API tab pane:",l),l.classList.add("active")):console.error("❌ API Tab pane not found:",`api-${o}-tab`)})}),console.log("✅ renderApiConfig() completed successfully")}catch(e){console.error("❌ Error in renderApiConfig():",e)}}renderApiInputs(e){console.log("🌐 renderApiInputs() called with container:",e),console.log("📝 Previous API inputs content length:",e.innerHTML.length);const t=this.generateWebhookUrl();e.innerHTML=`
            <div class="api-input-config">
                <div class="webhook-config">
                    <h4>Webhook Configuration</h4>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="webhook-enabled" ${this.ruleData.apiConfig.inputs.webhook.enabled?"checked":""}>
                            Enable Webhook Input
                        </label>
                    </div>
                    <div class="webhook-url-display">
                        <input type="text" class="webhook-url" value="${t}" readonly>
                        <button class="copy-button" onclick="copyToClipboard('${t}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <div class="form-group">
                        <label>Authentication Type</label>
                        <select id="webhook-auth-type" class="form-control">
                            <option value="none">None</option>
                            <option value="token">Bearer Token</option>
                            <option value="api_key">API Key</option>
                            <option value="basic">Basic Auth</option>
                        </select>
                    </div>
                </div>
                
                <div class="schema-builder">
                    <h4>Input Schema</h4>
                    <div id="input-schema-fields">
                        ${this.renderInputSchemaFields()}
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="window.rulesEngine.addSchemaField()">
                        <i class="fas fa-plus"></i> Add Field
                    </button>
                </div>
                
                <div class="form-group">
                    <label>Sample Input Payload</label>
                    <textarea class="form-control" id="sample-input" rows="5" readonly>${this.generateSamplePayload()}</textarea>
                </div>
            </div>
        `,this.attachApiInputEventListeners()}attachApiInputEventListeners(){const e=document.getElementById("webhook-enabled");e&&e.addEventListener("change",a=>{this.ruleData.apiConfig.inputs.webhook.enabled=a.target.checked,this.updateTokenCost()});const t=document.getElementById("webhook-auth-type");t&&t.addEventListener("change",a=>{this.ruleData.apiConfig.inputs.webhook.auth.type=a.target.value}),document.querySelectorAll(".schema-field").forEach(a=>{const s=parseInt(a.dataset.fieldIndex),o=this.ruleData.apiConfig.inputs.schema[s];if(!o)return;const l=a.querySelector(".field-name");l&&l.addEventListener("input",u=>{o.name=u.target.value,this.updateFieldOptions()});const r=a.querySelector(".field-type");r&&r.addEventListener("change",u=>{o.type=u.target.value});const c=a.querySelector(".field-required");c&&c.addEventListener("change",u=>{o.required=u.target.checked});const d=a.querySelector(".field-default");d&&d.addEventListener("input",u=>{o.default=u.target.value})});const n=document.getElementById("sample-input");n&&(n.value=this.generateSamplePayload())}renderInputSchemaFields(){return this.ruleData.apiConfig.inputs.schema.length===0?'<div class="empty-schema">No fields defined. Add fields to define your input structure.</div>':this.ruleData.apiConfig.inputs.schema.map((e,t)=>`
            <div class="schema-field" data-field-id="${e.id}" data-field-index="${t}">
                <input type="text" class="field-name" placeholder="Field name" value="${e.name||""}" data-field="name">
                <select class="field-type" data-field="type">
                    <option value="string" ${e.type==="string"?"selected":""}>String</option>
                    <option value="number" ${e.type==="number"?"selected":""}>Number</option>
                    <option value="boolean" ${e.type==="boolean"?"selected":""}>Boolean</option>
                    <option value="array" ${e.type==="array"?"selected":""}>Array</option>
                    <option value="object" ${e.type==="object"?"selected":""}>Object</option>
                </select>
                <label>
                    <input type="checkbox" class="field-required" ${e.required?"checked":""} data-field="required">
                    Required
                </label>
                <input type="text" class="field-default" placeholder="Default value" value="${e.default||""}" data-field="default">
                <button class="btn-remove" onclick="window.rulesEngine.removeSchemaField('${e.id}')">×</button>
            </div>
        `).join("")}renderApiOutputs(e){console.log("🌐 renderApiOutputs() called with container:",e),console.log("📝 Previous API outputs content length:",e.innerHTML.length),e.innerHTML=`
            <div class="api-output-config">
                <div class="output-destinations">
                    ${this.renderOutputDestinations()}
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.rulesEngine.addOutputDestination()">
                    <i class="fas fa-plus"></i> Add Output Destination
                </button>
            </div>
        `,this.attachApiOutputEventListeners()}attachApiOutputEventListeners(){document.querySelectorAll(".output-destination").forEach(e=>{const t=parseInt(e.dataset.outputIndex),n=this.ruleData.apiConfig.outputs[t];if(!n)return;const a=e.querySelector(".output-name");a&&a.addEventListener("input",o=>{n.name=o.target.value});const s=e.querySelector(".output-type");if(s&&s.addEventListener("change",o=>{n.type=o.target.value,this.renderApiOutputs(document.getElementById("api-outputs-container"))}),n.type==="webhook"){const o=e.querySelector(".output-url");o&&o.addEventListener("input",d=>{n.config.url=d.target.value});const l=e.querySelector(".output-method");l&&l.addEventListener("change",d=>{n.config.method=d.target.value});const r=e.querySelector(".output-timing");r&&r.addEventListener("change",d=>{n.timing=d.target.value,this.renderApiOutputs(document.getElementById("api-outputs-container"))});const c=e.querySelector(".output-schedule");c&&c.addEventListener("input",d=>{n.config.schedule=d.target.value})}})}renderOutputDestinations(){return this.ruleData.apiConfig.outputs.length===0?'<div class="empty-outputs">No output destinations configured. Add destinations to send your rule results.</div>':this.ruleData.apiConfig.outputs.map((e,t)=>`
            <div class="output-destination" data-output-id="${e.id}" data-output-index="${t}">
                <div class="destination-header">
                    <div class="destination-type">
                        <div class="destination-icon">
                            <i class="fas ${this.getOutputIcon(e.type)}"></i>
                        </div>
                        <div>
                            <input type="text" class="output-name form-control" placeholder="Output name" value="${e.name||""}" data-output-id="${e.id}">
                            <select class="output-type form-control" data-output-id="${e.id}">
                                <option value="webhook" ${e.type==="webhook"?"selected":""}>Webhook</option>
                                <option value="database" ${e.type==="database"?"selected":""}>Database</option>
                                <option value="model" ${e.type==="model"?"selected":""}>Model</option>
                                <option value="storage" ${e.type==="storage"?"selected":""}>Cloud Storage</option>
                                <option value="email" ${e.type==="email"?"selected":""}>Email</option>
                                <option value="queue" ${e.type==="queue"?"selected":""}>Message Queue</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn-remove" onclick="window.rulesEngine.removeOutputDestination('${e.id}')">×</button>
                </div>
                <div class="destination-config">
                    ${this.renderOutputConfig(e)}
                </div>
            </div>
        `).join("")}renderOutputConfig(e){switch(e.type){case"webhook":return`
                    <div class="form-group">
                        <label>Endpoint URL</label>
                        <input type="text" class="form-control output-url" data-output-id="${e.id}" 
                            placeholder="https://api.example.com/webhook" value="${e.config.url||""}">
                    </div>
                    <div class="form-group">
                        <label>Method</label>
                        <select class="form-control output-method" data-output-id="${e.id}">
                            <option value="POST" ${e.config.method==="POST"?"selected":""}>POST</option>
                            <option value="PUT" ${e.config.method==="PUT"?"selected":""}>PUT</option>
                            <option value="PATCH" ${e.config.method==="PATCH"?"selected":""}>PATCH</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Timing</label>
                        <select class="form-control output-timing" data-output-id="${e.id}">
                            <option value="immediate" ${e.timing==="immediate"?"selected":""}>Immediate</option>
                            <option value="scheduled" ${e.timing==="scheduled"?"selected":""}>Scheduled</option>
                            <option value="batched" ${e.timing==="batched"?"selected":""}>Batched</option>
                        </select>
                    </div>
                    ${e.timing==="scheduled"?`
                        <div class="form-group">
                            <label>Schedule (Cron Expression)</label>
                            <input type="text" class="form-control output-schedule" data-output-id="${e.id}" 
                                placeholder="0 */6 * * *" value="${e.config.schedule||""}">
                        </div>
                    `:""}
                `;default:return'<div class="config-placeholder">Configuration for this output type coming soon</div>'}}renderConditions(){console.log("🎛️ renderConditions() called");try{const e=document.getElementById("conditions-container");if(!e){console.error("❌ Conditions container not found - DOM element missing");return}console.log("✅ Conditions container found:",e),console.log("🔧 Setting conditions container innerHTML..."),console.log("📝 Previous conditions content length:",e.innerHTML.length),e.innerHTML=`
                <div class="conditions-section">
                    <div class="section-header">
                        <h3>Conditions</h3>
                        <div class="button-group">
                            <button id="add-condition-btn" class="btn btn-sm btn-primary">+ Add Condition</button>
                            <button id="add-group-btn" class="btn btn-sm btn-secondary">+ Add Group</button>
                        </div>
                    </div>
                    <div class="conditions-tree">
                        ${this.renderConditionGroup(this.ruleData.conditions)}
                    </div>
                </div>
            `,console.log("✅ Conditions innerHTML set successfully"),this.attachConditionEventListeners(),this.initializeSortable(),console.log("✅ renderConditions() completed successfully")}catch(e){console.error("❌ Error in renderConditions():",e)}}renderConditionGroup(e,t=0){if(e.type!=="group")return"";const n=t*20,a=e.children&&e.children.length>0;return`
            <div class="condition-group" data-id="${e.id}" style="margin-left: ${n}px">
                ${t>0?`
                    <div class="group-header">
                        <span class="group-label">Group (${e.operator})</span>
                        <button class="btn-remove" data-id="${e.id}">×</button>
                    </div>
                `:""}
                <div class="group-children sortable-container" data-group-id="${e.id}">
                    ${a?e.children.map((s,o)=>{let l="";return o>0&&s.connector&&(l+=`
                                <div class="condition-connector" style="margin-left: ${(t+1)*20}px">
                                    <select class="connector-operator" data-id="${s.id}">
                                        <option value="AND" ${s.connector==="AND"?"selected":""}>AND</option>
                                        <option value="OR" ${s.connector==="OR"?"selected":""}>OR</option>
                                    </select>
                                </div>
                            `),s.type==="group"?l+=this.renderConditionGroup(s,t+1):l+=this.renderConditionItem(s,o,t+1),l}).join(""):'<div class="empty-group">No conditions. Add a condition or group.</div>'}
                </div>
                <div class="group-actions" style="margin-left: ${(t+1)*20}px; margin-top: 10px;">
                    <button class="btn btn-sm btn-secondary add-condition-to-group" data-group-id="${e.id}">+ Add Condition</button>
                    <button class="btn btn-sm btn-secondary add-group-to-group" data-group-id="${e.id}">+ Add Group</button>
                </div>
            </div>
        `}renderConditionItem(e,t,n=0){const a=n*20,s={equals:"Equals",not_equals:"Not Equals",greater_than:"Greater Than",less_than:"Less Than",greater_equal:"Greater or Equal",less_equal:"Less or Equal",contains:"Contains",starts_with:"Starts With",ends_with:"Ends With",in_list:"In List",not_in_list:"Not In List",is_empty:"Is Empty",is_not_empty:"Is Not Empty"},o=[...this.availableFields];return`
            <div class="condition-item sortable-item" data-id="${e.id}" style="margin-left: ${a}px">
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <select class="condition-field" data-id="${e.id}">
                    <option value="">Select field</option>
                    ${o.map(l=>`<option value="${l.value}" ${e.field===l.value?"selected":""}>${l.label}</option>`).join("")}
                </select>
                <select class="condition-operator" data-id="${e.id}">
                    ${Object.entries(s).map(([l,r])=>`<option value="${l}" ${e.operator===l?"selected":""}>${r}</option>`).join("")}
                </select>
                <input type="text" class="condition-value" data-id="${e.id}" 
                    placeholder="Value" value="${e.value||""}">
                <button class="btn-remove" data-id="${e.id}">×</button>
            </div>
        `}initializeSortable(){console.log("🔄 Initializing sortable functionality..."),document.querySelectorAll(".sortable-container").forEach(t=>{const n=t.dataset.groupId;Sortable.create(t,{group:"conditions",animation:150,handle:".drag-handle",ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",onEnd:a=>{console.log("🔄 Drag ended:",a),this.handleConditionReorder(a,n)}})}),console.log("✅ Sortable initialization complete")}handleConditionReorder(e,t){console.log("🔄 Handling condition reorder for group:",t);const n=this.findConditionById(this.ruleData.conditions,t);if(!n||!n.children){console.error("❌ Group not found or has no children:",t);return}const a=e.item.dataset.id,s=e.oldIndex,o=e.newIndex;console.log(`Moving item ${a} from index ${s} to ${o}`);const l=n.children.splice(s,1)[0];n.children.splice(o,0,l),n.children.forEach((r,c)=>{c>0&&!r.connector&&(r.connector="AND")}),this.saveState(),console.log("✅ Condition reorder complete")}renderActions(){console.log("⚡ renderActions() called");try{const e=document.getElementById("actions-container");if(!e){console.error("❌ Actions container not found - DOM element missing");return}console.log("✅ Actions container found:",e);const t={trigger_model:"Trigger Model",send_notification:"Send Notification",webhook:"Call Webhook",store_data:"Store Data",transform_data:"Transform Data",conditional_action:"Conditional Action",loop:"Loop Over Data",trigger_rule:"Trigger Another Rule"};console.log("🔧 Setting actions container innerHTML..."),console.log("📝 Previous actions content length:",e.innerHTML.length),e.innerHTML=`
                <div class="actions-section">
                    <div class="section-header">
                        <h3>Actions</h3>
                        <button id="add-action-btn" class="btn btn-sm btn-primary">+ Add Action</button>
                    </div>
                    <div class="actions-pipeline">
                        ${this.ruleData.actions.length>0?this.ruleData.actions.map((n,a)=>`
                                <div class="action-item" data-id="${n.id}">
                                    <div class="action-header">
                                        <span class="action-number">${a+1}</span>
                                        <select class="action-type" data-id="${n.id}">
                                            ${Object.entries(t).map(([s,o])=>`<option value="${s}" ${n.type===s?"selected":""}>${o}</option>`).join("")}
                                        </select>
                                        <button class="btn-remove" data-action-id="${n.id}">×</button>
                                    </div>
                                    <div class="action-config">
                                        ${this.renderActionConfig(n)}
                                    </div>
                                    ${a<this.ruleData.actions.length-1?'<div class="action-arrow">↓</div>':""}
                                </div>
                            `).join(""):'<div class="empty-actions">No actions defined. Add an action to get started.</div>'}
                    </div>
                </div>
            `,console.log("✅ Actions innerHTML set successfully"),this.attachActionEventListeners(),console.log("✅ renderActions() completed successfully")}catch(e){console.error("❌ Error in renderActions():",e)}}renderActionConfig(e){switch(e.type){case"trigger_model":return`
                    <div class="form-group">
                        <label>Select Model</label>
                        <select class="form-control model-select" data-action-id="${e.id}">
                            <option value="">Choose a model</option>
                            ${this.availableModels.map(t=>`<option value="${t.id}" ${e.config.modelId===t.id?"selected":""}>${t.name}</option>`).join("")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Input Mapping</label>
                        <textarea class="form-control input-mapping" data-action-id="${e.id}" 
                            placeholder='{"field1": "{{input.data}}", "field2": "{{context.user_id}}"}'>${JSON.stringify(e.config.inputMapping||{},null,2)}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Output Variable Name</label>
                        <input type="text" class="form-control output-variable" data-action-id="${e.id}" 
                            placeholder="model_result" value="${e.config.outputVariable||""}">
                    </div>
                `;case"send_notification":return`
                    <div class="form-group">
                        <label>Notification Type</label>
                        <select class="form-control notification-type" data-action-id="${e.id}">
                            <option value="email" ${e.config.notificationType==="email"?"selected":""}>Email</option>
                            <option value="sms" ${e.config.notificationType==="sms"?"selected":""}>SMS</option>
                            <option value="in_app" ${e.config.notificationType==="in_app"?"selected":""}>In-App</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Recipients</label>
                        <input type="text" class="form-control notification-recipients" data-action-id="${e.id}" 
                            placeholder="user@example.com" value="${e.config.recipients||""}">
                    </div>
                    <div class="form-group">
                        <label>Message Template</label>
                        <textarea class="form-control notification-message" data-action-id="${e.id}" 
                            placeholder="Rule {{rule.name}} triggered with result: {{model_result}}">${e.config.messageTemplate||""}</textarea>
                    </div>
                `;case"webhook":return`
                    <div class="form-group">
                        <label>Webhook URL</label>
                        <input type="text" class="form-control webhook-url" data-action-id="${e.id}" 
                            placeholder="https://api.example.com/webhook" value="${e.config.url||""}">
                    </div>
                    <div class="form-group">
                        <label>Method</label>
                        <select class="form-control webhook-method" data-action-id="${e.id}">
                            <option value="POST" ${e.config.method==="POST"?"selected":""}>POST</option>
                            <option value="GET" ${e.config.method==="GET"?"selected":""}>GET</option>
                            <option value="PUT" ${e.config.method==="PUT"?"selected":""}>PUT</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Payload</label>
                        <textarea class="form-control webhook-payload" data-action-id="${e.id}" 
                            placeholder='{"data": "{{model_result}}"}'>${e.config.payload?JSON.stringify(e.config.payload,null,2):""}</textarea>
                    </div>
                `;case"trigger_rule":return`
                    <div class="form-group">
                        <label>Select Rule Engine</label>
                        <select class="form-control trigger-rule-select" data-action-id="${e.id}">
                            <option value="">Choose a rule engine</option>
                            ${this.availableModels.filter(t=>t.type==="rules_engine").map(t=>`<option value="${t.id}" ${e.config.ruleId==t.id?"selected":""}>${t.name}</option>`).join("")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Pass Data</label>
                        <textarea class="form-control trigger-rule-data" data-action-id="${e.id}" 
                            placeholder='{"input": "{{model_result}}"}'>${e.config.passData?JSON.stringify(e.config.passData,null,2):""}</textarea>
                    </div>
                `;case"store_data":return`
                    <div class="form-group">
                        <label>Storage Type</label>
                        <select class="form-control store-type" data-action-id="${e.id}">
                            <option value="database" ${e.config.storageType==="database"?"selected":""}>Database</option>
                            <option value="file" ${e.config.storageType==="file"?"selected":""}>File</option>
                            <option value="cache" ${e.config.storageType==="cache"?"selected":""}>Cache</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Storage Key/Path</label>
                        <input type="text" class="form-control store-key" data-action-id="${e.id}" 
                            placeholder="results/{{rule.name}}/{{timestamp}}" value="${e.config.key||""}">
                    </div>
                    <div class="form-group">
                        <label>Data to Store</label>
                        <textarea class="form-control store-data" data-action-id="${e.id}" 
                            placeholder='{"result": "{{model_result}}", "metadata": "{{context}}"}'>${e.config.data?JSON.stringify(e.config.data,null,2):""}</textarea>
                    </div>
                `;case"transform_data":return`
                    <div class="form-group">
                        <label>Transformation Type</label>
                        <select class="form-control transform-type" data-action-id="${e.id}">
                            <option value="jmespath" ${e.config.transformType==="jmespath"?"selected":""}>JMESPath</option>
                            <option value="javascript" ${e.config.transformType==="javascript"?"selected":""}>JavaScript</option>
                            <option value="template" ${e.config.transformType==="template"?"selected":""}>Template</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Transformation Expression</label>
                        <textarea class="form-control transform-expression" data-action-id="${e.id}" 
                            placeholder="data.results[?score > 0.5] or return data.map(d => d.value * 2)">${e.config.expression||""}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Output Variable</label>
                        <input type="text" class="form-control transform-output" data-action-id="${e.id}" 
                            placeholder="transformed_data" value="${e.config.outputVariable||""}">
                    </div>
                `;default:return'<div class="config-placeholder">Configuration for this action type coming soon</div>'}}attachConditionEventListeners(){const e=document.getElementById("add-condition-btn");e&&e.addEventListener("click",()=>{this.addCondition(this.ruleData.conditions),this.renderConditions()});const t=document.getElementById("add-group-btn");t&&t.addEventListener("click",()=>{this.addConditionGroup(this.ruleData.conditions),this.renderConditions()}),document.querySelectorAll(".add-condition-to-group").forEach(n=>{n.addEventListener("click",a=>{const s=a.target.dataset.groupId,o=this.findConditionById(this.ruleData.conditions,s);o&&o.type==="group"&&(this.addCondition(o),this.renderConditions())})}),document.querySelectorAll(".add-group-to-group").forEach(n=>{n.addEventListener("click",a=>{const s=a.target.dataset.groupId,o=this.findConditionById(this.ruleData.conditions,s);o&&o.type==="group"&&(this.addConditionGroup(o),this.renderConditions())})}),document.querySelectorAll(".connector-operator").forEach(n=>{n.addEventListener("change",a=>{const s=a.target.dataset.id,o=this.findConditionById(this.ruleData.conditions,s);o&&(o.connector=a.target.value,this.saveState(),this.updateTokenCost())})}),document.querySelectorAll(".condition-field").forEach(n=>{n.addEventListener("change",a=>{const s=a.target.dataset.id,o=this.findConditionById(this.ruleData.conditions,s);o&&(o.field=a.target.value,this.saveState(),this.updateTokenCost())})}),document.querySelectorAll(".condition-operator").forEach(n=>{n.addEventListener("change",a=>{const s=a.target.dataset.id,o=this.findConditionById(this.ruleData.conditions,s);o&&(o.operator=a.target.value,this.saveState(),this.updateTokenCost())})}),document.querySelectorAll(".condition-value").forEach(n=>{n.addEventListener("input",a=>{const s=a.target.dataset.id,o=this.findConditionById(this.ruleData.conditions,s);o&&(o.value=a.target.value,this.saveState(),this.updateTokenCost())})}),document.querySelectorAll(".conditions-tree .btn-remove").forEach(n=>{n.addEventListener("click",a=>{const s=a.target.dataset.id;this.removeConditionById(this.ruleData.conditions,s),this.renderConditions()})})}attachActionEventListeners(){const e=document.getElementById("add-action-btn");e&&e.addEventListener("click",()=>{this.addAction(),this.renderActions()}),document.querySelectorAll(".action-type").forEach(t=>{t.addEventListener("change",n=>{const a=n.target.dataset.id,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.type=n.target.value,this.initializeActionConfig(s),this.saveState(),this.updateTokenCost(),this.renderActions())})}),document.querySelectorAll(".model-select").forEach(t=>{t.addEventListener("change",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.modelId=n.target.value,this.saveState(),this.updateTokenCost())})}),document.querySelectorAll(".input-mapping").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);if(s)try{s.config.inputMapping=JSON.parse(n.target.value)}catch{}})}),document.querySelectorAll(".output-variable").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.outputVariable=n.target.value)})}),document.querySelectorAll(".actions-pipeline .btn-remove").forEach(t=>{t.addEventListener("click",n=>{const a=n.target.dataset.actionId;this.removeAction(a),this.renderActions()})}),document.querySelectorAll(".notification-type").forEach(t=>{t.addEventListener("change",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.notificationType=n.target.value)})}),document.querySelectorAll(".notification-recipients").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.recipients=n.target.value)})}),document.querySelectorAll(".notification-message").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.messageTemplate=n.target.value)})}),document.querySelectorAll(".webhook-url").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.url=n.target.value)})}),document.querySelectorAll(".webhook-method").forEach(t=>{t.addEventListener("change",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.method=n.target.value)})}),document.querySelectorAll(".webhook-payload").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);if(s)try{s.config.payload=JSON.parse(n.target.value)}catch{}})}),document.querySelectorAll(".trigger-rule-select").forEach(t=>{t.addEventListener("change",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.ruleId=n.target.value)})}),document.querySelectorAll(".trigger-rule-data").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);if(s)try{s.config.passData=JSON.parse(n.target.value)}catch{}})}),document.querySelectorAll(".store-type").forEach(t=>{t.addEventListener("change",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.storageType=n.target.value)})}),document.querySelectorAll(".store-key").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.key=n.target.value)})}),document.querySelectorAll(".store-data").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);if(s)try{s.config.data=JSON.parse(n.target.value)}catch{}})}),document.querySelectorAll(".transform-type").forEach(t=>{t.addEventListener("change",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.transformType=n.target.value)})}),document.querySelectorAll(".transform-expression").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.expression=n.target.value)})}),document.querySelectorAll(".transform-output").forEach(t=>{t.addEventListener("input",n=>{const a=n.target.dataset.actionId,s=this.ruleData.actions.find(o=>o.id===a);s&&(s.config.outputVariable=n.target.value)})})}findConditionById(e,t){if(e.id===t)return e;if(e.children)for(const n of e.children){const a=this.findConditionById(n,t);if(a)return a}return null}removeConditionById(e,t){if(e.children){const n=e.children.length;e.children=e.children.filter(a=>a.id!==t),n!==e.children.length&&(this.saveState(),this.updateTokenCost()),e.children.forEach(a=>this.removeConditionById(a,t))}}updateTokenCost(){var u,m,p,h,g;const e=this.countConditions(this.ruleData.conditions),t=this.ruleData.actions.length;let n="basic";const a=this.ruleData.actions.some(y=>y.type==="trigger_model"),s=t>3,o=e>5,l=(p=(m=(u=this.ruleData.apiConfig)==null?void 0:u.inputs)==null?void 0:m.webhook)==null?void 0:p.enabled,r=(((g=(h=this.ruleData.apiConfig)==null?void 0:h.outputs)==null?void 0:g.length)||0)>2;(a||s||o||l||r)&&(n="advanced"),a&&(s||o)&&(l||r)&&(n="complex");const c=N.calculateRulesCost(e,t,n),d=document.getElementById("total-token-cost");if(d){d.textContent=c.toLocaleString();const y=document.querySelector(".cost-breakdown");y&&(y.innerHTML=`
                    <div class="cost-item">
                        <span>Base Rule Cost:</span>
                        <span>${N.costs.rules.baseCost.toLocaleString()} tokens</span>
                    </div>
                    <div class="cost-item">
                        <span>Conditions (${e}):</span>
                        <span>${(e*N.costs.rules.perCondition).toLocaleString()} tokens</span>
                    </div>
                    <div class="cost-item">
                        <span>Actions (${t}):</span>
                        <span>${(t*N.costs.rules.perAction).toLocaleString()} tokens</span>
                    </div>
                    ${l?`
                        <div class="cost-item">
                            <span>API Webhook:</span>
                            <span>${N.costs.rules.webhookCost.toLocaleString()} tokens</span>
                        </div>
                    `:""}
                    ${n!=="basic"?`
                        <div class="cost-item">
                            <span>Complexity Multiplier (${n}):</span>
                            <span>×${N.costs.rules.complexityMultiplier[n]}</span>
                        </div>
                    `:""}
                    <div class="cost-item total">
                        <span>Total Cost:</span>
                        <span>${c.toLocaleString()} tokens</span>
                    </div>
                `)}}generateWebhookUrl(){const e=this.ruleId||"new",t=this.generateSecureToken(),n=window.location.origin;return this.ruleData.apiConfig.inputs.webhook.url=`${n}/api/rules/webhook/${e}`,this.ruleData.apiConfig.inputs.webhook.token=t,`${n}/api/rules/webhook/${e}/${t}`}generateSecureToken(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";let t="";for(let n=0;n<32;n++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}generateSamplePayload(){const e=this.ruleData.apiConfig.inputs.schema,t={};return e.forEach(n=>{if(n.name)switch(n.type){case"string":t[n.name]=n.default||"sample string";break;case"number":t[n.name]=n.default!==""?parseFloat(n.default):123;break;case"boolean":t[n.name]=n.default==="true"||n.default===!0;break;case"array":try{t[n.name]=n.default?JSON.parse(n.default):[]}catch{t[n.name]=[]}break;case"object":try{t[n.name]=n.default?JSON.parse(n.default):{}}catch{t[n.name]={}}break;default:t[n.name]=n.default||null}}),JSON.stringify(t,null,2)}getOutputIcon(e){return{webhook:"fa-globe",database:"fa-database",model:"fa-brain",storage:"fa-cloud-upload-alt",email:"fa-envelope",queue:"fa-stream"}[e]||"fa-plug"}getOutputTypeLabel(e){return{webhook:"Webhook",database:"Database",model:"Model",storage:"Cloud Storage",email:"Email",queue:"Message Queue"}[e]||e}getApiInputFields(){return this.ruleData.apiConfig.inputs.schema.filter(e=>e.name).map(e=>({value:`api.input.${e.name}`,label:`API Input: ${e.name}`}))}addSchemaField(){const e={id:`schema_field_${this.schemaFieldIdCounter++}`,name:"",type:"string",required:!1,default:""};this.ruleData.apiConfig.inputs.schema.push(e),this.renderApiInputs(document.getElementById("api-inputs-container")),this.updateTokenCost()}removeSchemaField(e){this.ruleData.apiConfig.inputs.schema=this.ruleData.apiConfig.inputs.schema.filter(t=>t.id!==e),this.renderApiInputs(document.getElementById("api-inputs-container")),this.updateTokenCost()}addOutputDestination(){const e={id:`output_${this.outputIdCounter++}`,type:"webhook",name:"",config:{url:"",method:"POST",headers:{},auth:{type:"none"}},timing:"immediate",mapping:{}};this.ruleData.apiConfig.outputs.push(e),this.renderApiOutputs(document.getElementById("api-outputs-container")),this.updateTokenCost()}removeOutputDestination(e){this.ruleData.apiConfig.outputs=this.ruleData.apiConfig.outputs.filter(t=>t.id!==e),this.renderApiOutputs(document.getElementById("api-outputs-container")),this.updateTokenCost()}updateFieldOptions(){const e=this.getApiInputFields();this.availableFields=[...this.defaultFields,...e],this.ruleData.conditions.children&&this.ruleData.conditions.children.length>0&&this.renderConditions()}countConditions(e){let t=0;return e.type==="condition"&&(t=1),e.children&&e.children.forEach(n=>{t+=this.countConditions(n)}),t}findInvalidConditions(e,t=[]){return e.type==="condition"&&(!e.field||!e.value)&&t.push(e),e.children&&e.children.forEach(n=>{this.findInvalidConditions(n,t)}),t}findInvalidActions(){const e=[];return this.ruleData.actions.forEach((t,n)=>{const a=n+1;switch(t.type){case"trigger_model":t.config.modelId||e.push(`Action ${a} (Trigger Model)`);break;case"send_notification":(!t.config.recipients||!t.config.messageTemplate)&&e.push(`Action ${a} (Send Notification)`);break;case"webhook":t.config.url||e.push(`Action ${a} (Webhook)`);break;case"trigger_rule":t.config.ruleId||e.push(`Action ${a} (Trigger Rule)`);break;case"store_data":(!t.config.key||!t.config.data)&&e.push(`Action ${a} (Store Data)`);break;case"transform_data":(!t.config.expression||!t.config.outputVariable)&&e.push(`Action ${a} (Transform Data)`);break}}),e}async saveRule(){var a,s;if(!this.ruleData.name){alert("Please enter a rule name");return}if(!this.ruleData.description){alert("Please enter a rule description");return}if(!this.ruleData.conditions.children||this.ruleData.conditions.children.length===0){alert("Please add at least one condition to your rule");return}if(this.findInvalidConditions(this.ruleData.conditions).length>0){alert("Please complete all condition fields. Some conditions are missing field or value information.");return}if(!this.ruleData.actions||this.ruleData.actions.length===0){alert("Please add at least one action to your rule");return}const t=this.findInvalidActions();if(t.length>0){alert(`Please complete configuration for the following actions: ${t.join(", ")}`);return}const n=document.getElementById("save-rule-btn");n&&(n.disabled=!0,n.textContent="Saving...");try{const o={rule_name:this.ruleData.name,description:this.ruleData.description,logic_json:{triggers:this.ruleData.triggers,apiConfig:this.ruleData.apiConfig,conditions:this.ruleData.conditions,actions:this.ruleData.actions,settings:this.ruleData.settings},trigger_config:this.ruleData.triggers,input_schema:{},output_schema:{},execution_mode:this.ruleData.settings.executionMode,error_handling:{strategy:this.ruleData.settings.errorHandling,maxRetries:this.ruleData.settings.maxRetries},create_as_model:!0,type:"rules_engine",visibility:"private",token_cost:parseInt(document.getElementById("total-token-cost").textContent||"0")},l=this.ruleId?`/api/rules/${this.ruleId}`:"/api/rules/",r=this.ruleId?"PUT":"POST",c=await f(l,{method:r,headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(c&&(c.id||this.ruleId)){const d=this.ruleId?"Rule Engine updated successfully!":"Rule Engine saved successfully! It will now appear in your models list.";if(alert(d),window.tokenSyncService){await window.tokenSyncService.forceUpdate();const u=c.tokens_used||o.token_cost||0;u>0&&window.tokenSyncService.trackUsage("rule_creation",u,{ruleName:this.ruleData.name,conditions:((a=this.ruleData.conditions.children)==null?void 0:a.length)||0,actions:((s=this.ruleData.actions)==null?void 0:s.length)||0})}sessionStorage.removeItem("rulesEngineState"),this.hasUnsavedChanges=!1,window.location.hash="#models"}}catch(o){console.error("Error saving rule:",o),alert("Failed to save rule. Please try again.")}finally{n&&(n.disabled=!1,n.textContent="Save Rule Engine")}}async testRule(){const e=document.getElementById("test-panel");e&&(e.innerHTML=`
            <div class="test-panel-content">
                <h4>Test Rule Execution</h4>
                <div class="form-group">
                    <label>Test Input Data</label>
                    <textarea class="form-control" id="test-input" rows="5" placeholder='{"field1": "value1", "field2": 123}'></textarea>
                </div>
                <button class="btn btn-primary" id="run-test-btn">Run Test</button>
                <div id="test-results" class="test-results"></div>
            </div>
        `,document.getElementById("run-test-btn").addEventListener("click",async()=>{const t=document.getElementById("test-input").value,n=document.getElementById("test-results");try{const a=JSON.parse(t);n.innerHTML='<div class="loading">Running test...</div>',setTimeout(()=>{n.innerHTML=`
                        <div class="test-success">
                            <h5>Test Results</h5>
                            <div class="result-item">
                                <strong>Conditions:</strong> 
                                <span class="badge badge-success">Passed</span>
                            </div>
                            <div class="result-item">
                                <strong>Actions Executed:</strong> ${this.ruleData.actions.length}
                            </div>
                            <div class="result-item">
                                <strong>Output:</strong>
                                <pre>${JSON.stringify({model_result:{prediction:.85,label:"positive"},notifications_sent:1,execution_time:"120ms"},null,2)}</pre>
                            </div>
                        </div>
                    `},1500)}catch(a){n.innerHTML=`<div class="test-error">Invalid JSON input: ${a.message}</div>`}}))}}function Jn(){console.log("🏗️ Setting up rules engine instance..."),window.rulesEngine&&(console.log("🧹 Cleaning up existing rules engine instance"),window.rulesEngine.destroy&&window.rulesEngine.destroy(),window.rulesEngine=null);const i=new Gn;i.init(),window.rulesEngine=i,console.log("✅ Rules engine setup complete")}window.copyToClipboard=function(i){const e=document.createElement("textarea");e.value=i,e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select();try{document.execCommand("copy");const t=event.target.closest("button"),n=t.innerHTML;t.innerHTML='<i class="fas fa-check"></i> Copied!',t.style.backgroundColor="#28a745",setTimeout(()=>{t.innerHTML=n,t.style.backgroundColor=""},2e3)}catch(t){console.error("Failed to copy:",t)}document.body.removeChild(e)};class Wn{constructor(){this.rules=[],this.filteredRules=[],this.executions=[],this.filters={search:"",status:"",trigger:"",sort:"created_desc"}}async init(){await this.loadRules(),await this.loadExecutions(),this.setupEventListeners(),this.updateStats(),this.renderRules()}async loadRules(){try{const e=await f("/api/rules/");this.rules=e||[],this.filteredRules=[...this.rules]}catch(e){console.error("Failed to load rules:",e),this.rules=[],this.filteredRules=[]}}async loadExecutions(){try{const e=await f("/api/rules/executions");Array.isArray(e)?this.executions=e:(console.warn("Executions API returned non-array data:",e),this.executions=[])}catch(e){console.error("Failed to load executions:",e),this.executions=[]}}setupEventListeners(){const e=document.getElementById("rule-search");e&&e.addEventListener("input",s=>{this.filters.search=s.target.value.toLowerCase(),this.applyFilters()});const t=document.getElementById("status-filter");t&&t.addEventListener("change",s=>{this.filters.status=s.target.value,this.applyFilters()});const n=document.getElementById("trigger-filter");n&&n.addEventListener("change",s=>{this.filters.trigger=s.target.value,this.applyFilters()});const a=document.getElementById("sort-filter");a&&a.addEventListener("change",s=>{this.filters.sort=s.target.value,this.applyFilters()})}applyFilters(){this.filteredRules=[...this.rules],this.filters.search&&(this.filteredRules=this.filteredRules.filter(e=>e.rule_name.toLowerCase().includes(this.filters.search)||e.description&&e.description.toLowerCase().includes(this.filters.search))),this.filters.status&&(this.filteredRules=this.filteredRules.filter(e=>(e.is_active?"active":"inactive")===this.filters.status)),this.filters.trigger&&(this.filteredRules=this.filteredRules.filter(e=>{var n;return(((n=e.trigger_config)==null?void 0:n.type)||e.trigger_type)===this.filters.trigger})),this.sortRules(),this.renderRules()}sortRules(){switch(this.filters.sort){case"created_asc":this.filteredRules.sort((e,t)=>new Date(e.created_at)-new Date(t.created_at));break;case"created_desc":this.filteredRules.sort((e,t)=>new Date(t.created_at)-new Date(e.created_at));break;case"name_asc":this.filteredRules.sort((e,t)=>e.rule_name.localeCompare(t.rule_name));break;case"name_desc":this.filteredRules.sort((e,t)=>t.rule_name.localeCompare(e.rule_name));break;case"executions":this.filteredRules.sort((e,t)=>{const n=this.getExecutionCount(e.id);return this.getExecutionCount(t.id)-n});break}}getExecutionCount(e){return this.executions.filter(t=>t.rule_id===e).length}getSuccessRate(e){const t=this.executions.filter(a=>a.rule_id===e);if(t.length===0)return 0;const n=t.filter(a=>a.status==="completed").length;return Math.round(n/t.length*100)}getLastExecution(e){const t=this.executions.filter(n=>n.rule_id===e);return t.length===0?null:t.sort((n,a)=>new Date(a.created_at)-new Date(n.created_at))[0]}updateStats(){const e=document.getElementById("total-rules");e&&(e.textContent=this.rules.length);const t=this.rules.filter(r=>r.is_active).length,n=document.getElementById("active-rules");n&&(n.textContent=t),Array.isArray(this.executions)||(console.warn("this.executions is not an array, defaulting to empty array"),this.executions=[]);const a=document.getElementById("total-executions");a&&(a.textContent=this.executions.length);const s=this.executions.filter(r=>r.status==="completed").length,o=this.executions.length>0?Math.round(s/this.executions.length*100):0,l=document.getElementById("success-rate");l&&(l.textContent=`${o}%`)}renderRules(){const e=document.getElementById("rules-grid"),t=document.getElementById("empty-state");if(e){if(this.filteredRules.length===0){e.style.display="none",t&&(t.style.display="block");return}e.style.display="grid",t&&(t.style.display="none"),e.innerHTML=this.filteredRules.map(n=>{var r;const a=this.getExecutionCount(n.id),s=this.getSuccessRate(n.id),o=this.getLastExecution(n.id),l=((r=n.trigger_config)==null?void 0:r.type)||n.trigger_type||"manual";return`
                <div class="rule-card" onclick="window.location.hash = '#rules-engine?edit=${n.id}'">
                    <div class="rule-header">
                        <h3 class="rule-title">${this.escapeHtml(n.rule_name)}</h3>
                        <span class="rule-status ${n.is_active?"active":"inactive"}">
                            ${n.is_active?"Active":"Inactive"}
                        </span>
                    </div>
                    
                    <p class="rule-description">
                        ${this.escapeHtml(n.description||"No description")}
                    </p>
                    
                    <div class="rule-meta">
                        <div class="meta-item">
                            <i class="fas fa-bolt"></i>
                            <span>${this.formatTriggerType(l)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${this.formatDate(n.created_at)}</span>
                        </div>
                        ${o?`
                            <div class="meta-item">
                                <i class="fas fa-sync"></i>
                                <span>Last run: ${this.formatRelativeTime(o.created_at)}</span>
                            </div>
                        `:""}
                    </div>
                    
                    <div class="rule-stats">
                        <div class="stat-item">
                            <div class="stat-item-value">${a}</div>
                            <div class="stat-item-label">Executions</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-value">${s}%</div>
                            <div class="stat-item-label">Success</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-value">${n.token_cost||0}</div>
                            <div class="stat-item-label">Token Cost</div>
                        </div>
                    </div>
                    
                    <div class="rule-actions">
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); executeRule(${n.id})">
                            <i class="fas fa-play"></i> Execute
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); viewHistory(${n.id})">
                            <i class="fas fa-history"></i> History
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteRule(${n.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `}).join("")}}formatTriggerType(e){return{manual:"Manual",schedule:"Scheduled",event:"Event-based",model_complete:"Model Completion",webhook:"Webhook"}[e]||e}formatDate(e){return new Date(e).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}formatRelativeTime(e){const t=new Date(e),a=new Date-t,s=Math.floor(a/6e4),o=Math.floor(s/60),l=Math.floor(o/24);return l>0?`${l}d ago`:o>0?`${o}h ago`:s>0?`${s}m ago`:"Just now"}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}window.executeRule=async function(i){try{const e=await f(`/api/rules/${i}/execute`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input_data:{},trigger_type:"manual"})});e&&!e.error?(alert("Rule executed successfully!"),window.rulesListManager.loadExecutions(),window.rulesListManager.renderRules()):alert("Failed to execute rule")}catch(e){console.error("Error executing rule:",e),alert("Failed to execute rule")}};window.viewHistory=function(i){window.location.hash=`#rule-history?id=${i}`};window.deleteRule=async function(i){if(confirm("Are you sure you want to delete this rule?"))try{const e=await f(`/api/rules/${i}`,{method:"DELETE"});e&&!e.error?(alert("Rule deleted successfully!"),window.rulesListManager.loadRules(),window.rulesListManager.updateStats(),window.rulesListManager.renderRules()):alert("Failed to delete rule")}catch(e){console.error("Error deleting rule:",e),alert("Failed to delete rule")}};function Qn(){window.rulesListManager=new Wn,window.rulesListManager.init()}class Xn{constructor(){this.ruleId=null,this.rule=null,this.executions=[],this.filteredExecutions=[],this.filters={status:"",trigger:"",dateRange:""}}async init(){const e=new URLSearchParams(window.location.hash.split("?")[1]||"");if(this.ruleId=e.get("id"),!this.ruleId){alert("No rule ID provided"),window.location.hash="#rules-list";return}await this.loadRule(),await this.loadExecutions(),this.setupEventListeners(),this.updateStats(),this.renderExecutions()}async loadRule(){try{const e=await f(`/api/rules/${this.ruleId}`);if(e&&!e.error)this.rule=e,document.getElementById("rule-name").textContent=`${e.rule_name} - Execution History`;else throw new Error("Rule not found")}catch(e){console.error("Failed to load rule:",e),alert("Failed to load rule"),window.location.hash="#rules-list"}}async loadExecutions(){try{const e=await f(`/api/rules/${this.ruleId}/executions`);this.executions=e||[],this.filteredExecutions=[...this.executions]}catch(e){console.error("Failed to load executions:",e),this.executions=[],this.filteredExecutions=[]}}setupEventListeners(){const e=document.getElementById("refresh-btn");e&&e.addEventListener("click",async()=>{e.disabled=!0,e.innerHTML='<i class="fas fa-spinner fa-spin"></i> Refreshing...',await this.loadExecutions(),this.applyFilters(),this.updateStats(),e.disabled=!1,e.innerHTML='<i class="fas fa-sync"></i> Refresh'});const t=document.getElementById("execute-btn");t&&t.addEventListener("click",()=>this.executeRule());const n=document.getElementById("first-execute-btn");n&&n.addEventListener("click",()=>this.executeRule());const a=document.getElementById("status-filter");a&&a.addEventListener("change",l=>{this.filters.status=l.target.value,this.applyFilters()});const s=document.getElementById("trigger-filter");s&&s.addEventListener("change",l=>{this.filters.trigger=l.target.value,this.applyFilters()});const o=document.getElementById("date-filter");o&&o.addEventListener("change",l=>{this.filters.dateRange=l.target.value,this.applyFilters()})}applyFilters(){if(this.filteredExecutions=[...this.executions],this.filters.status&&(this.filteredExecutions=this.filteredExecutions.filter(e=>e.status===this.filters.status)),this.filters.trigger&&(this.filteredExecutions=this.filteredExecutions.filter(e=>e.trigger_type===this.filters.trigger)),this.filters.dateRange){const e=new Date;let t;switch(this.filters.dateRange){case"today":t=new Date(e.getFullYear(),e.getMonth(),e.getDate());break;case"week":t=new Date(e.getTime()-10080*60*1e3);break;case"month":t=new Date(e.getTime()-720*60*60*1e3);break}t&&(this.filteredExecutions=this.filteredExecutions.filter(n=>new Date(n.created_at)>=t))}this.renderExecutions()}updateStats(){const e=document.getElementById("total-executions");e&&(e.textContent=this.executions.length);const t=this.executions.filter(c=>c.status==="completed").length,n=document.getElementById("success-count");n&&(n.textContent=t);const a=this.executions.filter(c=>c.status==="failed").length,s=document.getElementById("failed-count");s&&(s.textContent=a);const o=this.executions.filter(c=>c.execution_time_ms),l=o.length>0?Math.round(o.reduce((c,d)=>c+d.execution_time_ms,0)/o.length):0,r=document.getElementById("avg-time");r&&(r.textContent=`${l}ms`)}renderExecutions(){const e=document.getElementById("history-tbody"),t=document.getElementById("empty-state"),n=document.querySelector(".history-table-container");if(e){if(this.filteredExecutions.length===0){n.style.display="none",t&&(t.style.display="block");return}n.style.display="block",t&&(t.style.display="none"),e.innerHTML=this.filteredExecutions.map(a=>`
            <tr>
                <td><span class="execution-id">#${a.id}</span></td>
                <td><span class="trigger-badge">${this.formatTriggerType(a.trigger_type)}</span></td>
                <td><span class="status-badge ${a.status}">${this.formatStatus(a.status)}</span></td>
                <td><span class="execution-time">${this.formatDate(a.created_at)}</span></td>
                <td><span class="execution-duration">${this.formatDuration(a.execution_time_ms)}</span></td>
                <td><span class="token-cost">${a.token_cost||0}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary btn-icon" onclick="viewExecutionDetails(${a.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${a.status==="failed"?`
                            <button class="btn btn-sm btn-secondary btn-icon" onclick="retryExecution(${a.id})">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        `:""}
                    </div>
                </td>
            </tr>
        `).join("")}}async executeRule(){const e=event.target,t=e.innerHTML;e.disabled=!0,e.innerHTML='<i class="fas fa-spinner fa-spin"></i> Executing...';try{const n=await f(`/api/rules/${this.ruleId}/execute`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input_data:{},trigger_type:"manual"})});n&&!n.error?(alert("Rule executed successfully!"),await this.loadExecutions(),this.updateStats(),this.renderExecutions()):alert("Failed to execute rule: "+(n.message||"Unknown error"))}catch(n){console.error("Error executing rule:",n),alert("Failed to execute rule")}finally{e.disabled=!1,e.innerHTML=t}}formatTriggerType(e){return{manual:"Manual",schedule:"Scheduled",event:"Event",model_complete:"Model Complete",webhook:"Webhook"}[e]||e}formatStatus(e){return e.charAt(0).toUpperCase()+e.slice(1)}formatDate(e){return new Date(e).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}formatDuration(e){return e?e<1e3?`${e}ms`:e<6e4?`${(e/1e3).toFixed(1)}s`:`${Math.floor(e/6e4)}m ${Math.floor(e%6e4/1e3)}s`:"-"}async showExecutionDetails(e){const t=this.executions.find(s=>s.id===e);if(!t)return;const n=document.getElementById("execution-modal"),a=document.getElementById("execution-details");a.innerHTML=`
            <div class="detail-section">
                <h3>General Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Execution ID</span>
                        <span class="detail-value">#${t.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="status-badge ${t.status}">${this.formatStatus(t.status)}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Trigger Type</span>
                        <span class="detail-value">${this.formatTriggerType(t.trigger_type)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Started At</span>
                        <span class="detail-value">${this.formatDate(t.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Completed At</span>
                        <span class="detail-value">${t.completed_at?this.formatDate(t.completed_at):"-"}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">${this.formatDuration(t.execution_time_ms)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Token Cost</span>
                        <span class="detail-value">${t.token_cost||0}</span>
                    </div>
                </div>
            </div>

            ${t.error_message?`
                <div class="detail-section">
                    <h3>Error Details</h3>
                    <div class="error-message">
                        ${this.escapeHtml(t.error_message)}
                    </div>
                </div>
            `:""}

            <div class="detail-section">
                <h3>Input Data</h3>
                <div class="json-viewer">
                    <pre>${JSON.stringify(t.input_data||{},null,2)}</pre>
                </div>
            </div>

            ${t.output_data?`
                <div class="detail-section">
                    <h3>Output Data</h3>
                    <div class="json-viewer">
                        <pre>${JSON.stringify(t.output_data,null,2)}</pre>
                    </div>
                </div>
            `:""}
        `,n.style.display="flex"}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}window.viewExecutionDetails=function(i){window.ruleHistoryManager.showExecutionDetails(i)};window.closeExecutionModal=function(){const i=document.getElementById("execution-modal");i&&(i.style.display="none")};window.retryExecution=async function(i){const e=window.ruleHistoryManager.executions.find(t=>t.id===i);if(e&&confirm("Retry this execution with the same input data?"))try{const t=await f(`/api/rules/${window.ruleHistoryManager.ruleId}/execute`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input_data:e.input_data||{},trigger_type:"manual"})});t&&!t.error?(alert("Rule re-executed successfully!"),window.ruleHistoryManager.loadExecutions(),window.ruleHistoryManager.updateStats(),window.ruleHistoryManager.renderExecutions()):alert("Failed to retry execution")}catch(t){console.error("Error retrying execution:",t),alert("Failed to retry execution")}};function Kn(){window.ruleHistoryManager=new Xn,window.ruleHistoryManager.init()}async function Yn(){k("src/components/StyledDropdown/StyledDropdown.css"),ta(),Zn(),ea();const i=document.querySelector(".save-settings-btn");i&&i.addEventListener("click",sa);const e=document.querySelector(".reset-btn");e&&e.addEventListener("click",ia),await aa()}let b={};function Zn(){var s,o,l,r,c;const i=(s=document.querySelector('[data-setting="language"]'))==null?void 0:s.parentElement;if(i){const d=document.createElement("div");i.appendChild(d),b.language=new w(d,{id:"language-dropdown",label:"Language",placeholder:"Select language",helperText:"Choose your preferred language",options:[{value:"en",title:"English",icon:"fas fa-flag-usa"},{value:"es",title:"Spanish",icon:"fas fa-globe-americas"},{value:"fr",title:"French",icon:"fas fa-globe-europe"},{value:"de",title:"German",icon:"fas fa-globe-europe"},{value:"zh",title:"Chinese",icon:"fas fa-globe-asia"}],onChange:m=>{console.log("Language changed to:",m)}});const u=document.querySelector('[data-setting="language"]');u&&(u.style.display="none")}const e=(o=document.querySelector('[data-setting="timezone"]'))==null?void 0:o.parentElement;if(e){const d=document.createElement("div");e.appendChild(d),b.timezone=new w(d,{id:"timezone-dropdown",label:"Timezone",placeholder:"Select timezone",helperText:"Set your local timezone",options:[{value:"UTC",title:"UTC",icon:"fas fa-clock",description:"Coordinated Universal Time"},{value:"EST",title:"Eastern Time",icon:"fas fa-clock",description:"UTC-5:00"},{value:"PST",title:"Pacific Time",icon:"fas fa-clock",description:"UTC-8:00"},{value:"CET",title:"Central European Time",icon:"fas fa-clock",description:"UTC+1:00"},{value:"JST",title:"Japan Standard Time",icon:"fas fa-clock",description:"UTC+9:00"}],onChange:m=>{console.log("Timezone changed to:",m)}});const u=document.querySelector('[data-setting="timezone"]');u&&(u.style.display="none")}const t=(l=document.querySelector('[data-setting="session-timeout"]'))==null?void 0:l.parentElement;if(t){const d=document.createElement("div");t.appendChild(d),b.sessionTimeout=new w(d,{id:"session-dropdown",label:"Session Timeout",placeholder:"Select timeout duration",helperText:"Automatically log out after inactivity",options:[{value:"15",title:"15 minutes",icon:"fas fa-hourglass-half"},{value:"30",title:"30 minutes",icon:"fas fa-hourglass-half"},{value:"60",title:"1 hour",icon:"fas fa-hourglass"},{value:"120",title:"2 hours",icon:"fas fa-hourglass"},{value:"never",title:"Never",icon:"fas fa-infinity"}],onChange:m=>{console.log("Session timeout changed to:",m)}});const u=document.querySelector('[data-setting="session-timeout"]');u&&(u.style.display="none")}const n=(r=document.querySelector('[data-setting="data-retention"]'))==null?void 0:r.parentElement;if(n){const d=document.createElement("div");n.appendChild(d),b.dataRetention=new w(d,{id:"retention-dropdown",label:"Data Retention",placeholder:"Select retention period",helperText:"How long to keep your data",options:[{value:"30",title:"30 days",icon:"fas fa-calendar-day"},{value:"90",title:"90 days",icon:"fas fa-calendar-alt"},{value:"365",title:"1 year",icon:"fas fa-calendar"},{value:"forever",title:"Forever",icon:"fas fa-infinity"}],onChange:m=>{console.log("Data retention changed to:",m)}});const u=document.querySelector('[data-setting="data-retention"]');u&&(u.style.display="none")}const a=(c=document.querySelector('[data-setting="cache-duration"]'))==null?void 0:c.parentElement;if(a){const d=document.createElement("div");a.appendChild(d),b.cacheDuration=new w(d,{id:"cache-dropdown",label:"Cache Duration",placeholder:"Select cache duration",helperText:"How long to cache API responses",options:[{value:"0",title:"No cache",icon:"fas fa-ban"},{value:"5",title:"5 minutes",icon:"fas fa-database"},{value:"15",title:"15 minutes",icon:"fas fa-database"},{value:"30",title:"30 minutes",icon:"fas fa-database"},{value:"60",title:"1 hour",icon:"fas fa-database"}],onChange:m=>{console.log("Cache duration changed to:",m)}});const u=document.querySelector('[data-setting="cache-duration"]');u&&(u.style.display="none")}}function ea(){document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(e=>{e.addEventListener("change",t=>{console.log(`${t.target.id} changed to:`,t.target.checked)})})}function ta(){const i=document.getElementById("upgradePlanBtn");i&&i.addEventListener("click",()=>{const t=document.getElementById("availablePlans");t&&(t.style.display=t.style.display==="none"?"block":"none")}),document.querySelectorAll(".select-plan-btn").forEach(t=>{t.addEventListener("click",async n=>{const a=n.target.dataset.plan;a==="enterprise"?window.location.hash="#contact-us":console.log("Upgrading to plan:",a)})}),na()}async function na(){try{const i=await f("/api/profile"),e=await f("/api/tokens/usage");if(i){const t=document.getElementById("currentPlanBadge");t&&(t.textContent=i.subscription_tier||"Developer");const n=document.getElementById("monthlyTokens");n&&(n.textContent=Ae(i.token_limit||1e4));const a=document.getElementById("renewalDate");if(a){const o=new Date;o.setDate(o.getDate()+30),a.textContent=o.toLocaleDateString()}const s=document.getElementById("daysRemaining");s&&(s.textContent="30")}if(e){const t=e.reduce((l,r)=>l+Math.abs(r.change||0),0),n=document.getElementById("tokensUsed");n&&(n.textContent=Ae(t));const a=document.getElementById("usageStatus"),s=(i==null?void 0:i.token_limit)||1e4,o=t/s*100;a&&(o>=90?(a.textContent="Critical",a.className="stat-value danger"):o>=70?(a.textContent="High",a.className="stat-value warning"):(a.textContent="Normal",a.className="stat-value success"))}}catch(i){console.error("Error loading subscription data:",i)}}async function aa(){try{const i=await f("/api/settings/");if(i){for(const e in i){const t=document.getElementById(e.replace("_","-"));t&&t.type==="checkbox"&&(t.checked=i[e])}b.language&&i.language&&b.language.setValue(i.language),b.timezone&&i.timezone&&b.timezone.setValue(i.timezone),b.sessionTimeout&&i.session_timeout&&b.sessionTimeout.setValue(i.session_timeout),b.dataRetention&&i.data_retention&&b.dataRetention.setValue(i.data_retention),b.cacheDuration&&i.cache_duration&&b.cacheDuration.setValue(i.cache_duration)}}catch(i){console.error("Error loading settings:",i)}}async function sa(){var e,t,n,a,s,o,l,r,c,d,u,m,p,h;const i={dark_mode:((e=document.getElementById("dark-mode"))==null?void 0:e.checked)||!1,auto_save:((t=document.getElementById("auto-save"))==null?void 0:t.checked)||!1,email_notifications:((n=document.getElementById("email-notifications"))==null?void 0:n.checked)||!1,model_alerts:((a=document.getElementById("model-alerts"))==null?void 0:a.checked)||!1,api_warnings:((s=document.getElementById("api-warnings"))==null?void 0:s.checked)||!1,weekly_reports:((o=document.getElementById("weekly-reports"))==null?void 0:o.checked)||!1,analytics:((l=document.getElementById("analytics"))==null?void 0:l.checked)||!1,rate_limiting:((r=document.getElementById("rate-limiting"))==null?void 0:r.checked)||!1,debug_mode:((c=document.getElementById("debug-mode"))==null?void 0:c.checked)||!1,language:((d=b.language)==null?void 0:d.getValue())||"en",timezone:((u=b.timezone)==null?void 0:u.getValue())||"UTC",session_timeout:((m=b.sessionTimeout)==null?void 0:m.getValue())||"30",data_retention:((p=b.dataRetention)==null?void 0:p.getValue())||"90",cache_duration:((h=b.cacheDuration)==null?void 0:h.getValue())||"5"};try{await f("/api/settings/",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)})?X("Settings saved successfully!","success"):X("Failed to save settings","error")}catch(g){console.error("Error saving settings:",g),X("Error saving settings","error")}}function ia(){var i,e,t,n,a;confirm("Are you sure you want to reset all settings to defaults?")&&(document.getElementById("dark-mode").checked=!1,document.getElementById("auto-save").checked=!0,document.getElementById("email-notifications").checked=!0,document.getElementById("model-alerts").checked=!0,document.getElementById("api-warnings").checked=!0,document.getElementById("weekly-reports").checked=!1,document.getElementById("analytics").checked=!0,document.getElementById("rate-limiting").checked=!0,document.getElementById("debug-mode").checked=!1,(i=b.language)==null||i.setValue("en"),(e=b.timezone)==null||e.setValue("UTC"),(t=b.sessionTimeout)==null||t.setValue("30"),(n=b.dataRetention)==null||n.setValue("90"),(a=b.cacheDuration)==null||a.setValue("5"),X("Settings reset to defaults","info"))}function X(i,e="info"){const t=document.createElement("div");t.className=`toast toast-${e}`,t.textContent=i,t.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${e==="success"?"#4caf50":e==="error"?"#f44336":"#2196f3"};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="slideOut 0.3s ease-out",setTimeout(()=>t.remove(),300)},3e3)}function Ae(i){return new Intl.NumberFormat().format(i)}async function oa(){const i=document.getElementById("user-profile-form");if(!i)return;const e=await f("/api/profile");if(e)for(const t in e){const n=i.querySelector(`[name="${t}"]`);n&&(n.value=e[t])}i.addEventListener("submit",async t=>{t.preventDefault();const n=new FormData(i),a={};n.forEach((o,l)=>{a[l]=o});const s=await f("/api/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});alert(s?"Profile updated successfully!":"Failed to update profile.")})}function la(){console.log("Loading Contact Us Page data...")}class st{constructor(){this.packages=[],this.selectedPackage=null,this.selectedGateway="payfast",this.paymentGateways=[{id:"payfast",name:"PayFast",description:"Cards, EFT, SnapScan",logo:"💳",supported:["ZAR"]},{id:"paystack",name:"PayStack",description:"Cards, Mobile Money",logo:"📱",supported:["ZAR","NGN","GHS","KES"]},{id:"stripe",name:"Stripe",description:"International Cards",logo:"🌍",supported:["ZAR","USD","EUR","GBP"]}]}render(){return`
            <div class="token-purchase-page">
                <div class="page-header">
                    <h1>Purchase Tokens</h1>
                    <p>Select a token package that suits your needs</p>
                </div>
                
                <div class="token-balance-card">
                    <div class="balance-info">
                        <span class="balance-label">Current Balance</span>
                        <div class="balance-amount">
                            <i class="fas fa-coins"></i>
                            <span id="current-balance">0</span>
                            <span class="balance-unit">tokens</span>
                        </div>
                    </div>
                </div>
                
                <div class="packages-section">
                    <h2>Token Packages</h2>
                    <div class="token-packages" id="token-packages">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading packages...</p>
                        </div>
                    </div>
                </div>
                
                <div class="payment-section" id="payment-section" style="display: none;">
                    <h2>Payment Method</h2>
                    <div class="payment-methods">
                        ${this.renderPaymentMethods()}
                    </div>
                    
                    <div class="order-summary-card">
                        <h3>Order Summary</h3>
                        <div id="order-summary-content">
                            <!-- Summary will be populated here -->
                        </div>
                        <div class="vat-notice">
                            <i class="fas fa-info-circle"></i>
                            <span>Price includes 15% VAT (South Africa)</span>
                        </div>
                        <button class="btn btn-primary btn-lg btn-block" id="proceed-payment-btn">
                            <i class="fas fa-lock"></i>
                            Proceed to Secure Payment
                        </button>
                    </div>
                </div>
                
                <div class="security-badges">
                    <div class="badge">
                        <i class="fas fa-shield-alt"></i>
                        <span>Secure Payment</span>
                    </div>
                    <div class="badge">
                        <i class="fas fa-lock"></i>
                        <span>SSL Encrypted</span>
                    </div>
                    <div class="badge">
                        <i class="fas fa-check-circle"></i>
                        <span>PCI Compliant</span>
                    </div>
                </div>
            </div>
        `}renderPaymentMethods(){return this.paymentGateways.map(e=>`
            <div class="payment-method-card ${e.id===this.selectedGateway?"selected":""}" 
                 data-gateway="${e.id}">
                <div class="method-header">
                    <span class="method-logo">${e.logo}</span>
                    <div class="method-info">
                        <h4>${e.name}</h4>
                        <p>${e.description}</p>
                    </div>
                    <div class="method-selector">
                        <input type="radio" name="payment-gateway" value="${e.id}" 
                               ${e.id===this.selectedGateway?"checked":""}>
                    </div>
                </div>
                ${e.id==="payfast"?`
                    <div class="method-features">
                        <span class="feature-badge">✓ FNB Direct</span>
                        <span class="feature-badge">✓ Same-day Settlement</span>
                    </div>
                `:""}
            </div>
        `).join("")}async afterRender(){await this.loadPackages(),await this.loadUserBalance(),this.bindEvents()}async loadPackages(){try{const e=await fetch("http://localhost:8000/api/payment/packages",{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(!e.ok)throw new Error("Failed to load packages");const t=await e.json();this.packages=t.packages,this.renderPackages()}catch(e){console.error("Error loading packages:",e),this.showError("Failed to load token packages")}}renderPackages(){const e=document.getElementById("token-packages");if(this.packages.length===0){e.innerHTML="<p>No packages available</p>";return}e.innerHTML=this.packages.map(t=>`
            <div class="package-card ${t.is_popular?"popular":""}" data-package-id="${t.id}">
                ${t.is_popular?'<div class="popular-badge">Most Popular</div>':""}
                ${t.discount_percentage>0?`
                    <div class="discount-badge">${t.discount_percentage}% OFF</div>
                `:""}
                
                <div class="package-header">
                    <h3>${t.name}</h3>
                    <div class="package-tokens">
                        <span class="token-amount">${t.tokens.toLocaleString()}</span>
                        <span class="token-label">tokens</span>
                    </div>
                </div>
                
                <div class="package-price">
                    <span class="currency">R</span>
                    <span class="amount">${t.price.toFixed(2)}</span>
                    <span class="period">one-time</span>
                </div>
                
                <div class="package-rate">
                    R${(t.price/t.tokens).toFixed(4)} per token
                </div>
                
                ${t.description?`
                    <p class="package-description">${t.description}</p>
                `:""}
                
                <button class="btn btn-primary select-package-btn" data-package-id="${t.id}">
                    Select Package
                </button>
            </div>
        `).join(""),document.querySelectorAll(".select-package-btn").forEach(t=>{t.addEventListener("click",n=>{const a=n.target.dataset.packageId;this.selectPackage(a)})})}async loadUserBalance(){try{const e=localStorage.getItem("user");if(e){const t=JSON.parse(e),n=t.tokens||t.token_balance||0;document.getElementById("current-balance").textContent=n.toLocaleString()}}catch(e){console.error("Error loading user balance:",e)}}selectPackage(e){this.selectedPackage=this.packages.find(t=>t.id===e),this.selectedPackage&&(document.querySelectorAll(".package-card").forEach(t=>{t.classList.remove("selected")}),document.querySelector(`.package-card[data-package-id="${e}"]`).classList.add("selected"),document.getElementById("payment-section").style.display="block",this.updateOrderSummary(),document.getElementById("payment-section").scrollIntoView({behavior:"smooth"}))}updateOrderSummary(){const e=document.getElementById("order-summary-content"),t=this.selectedPackage.price/1.15,n=this.selectedPackage.price-t;e.innerHTML=`
            <div class="summary-item">
                <span>Package</span>
                <strong>${this.selectedPackage.name}</strong>
            </div>
            <div class="summary-item">
                <span>Tokens</span>
                <strong>${this.selectedPackage.tokens.toLocaleString()}</strong>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-item">
                <span>Subtotal</span>
                <span>R ${t.toFixed(2)}</span>
            </div>
            <div class="summary-item">
                <span>VAT (15%)</span>
                <span>R ${n.toFixed(2)}</span>
            </div>
            ${this.selectedPackage.discount_percentage>0?`
                <div class="summary-item discount">
                    <span>Discount</span>
                    <span class="text-success">-${this.selectedPackage.discount_percentage}%</span>
                </div>
            `:""}
            <div class="summary-divider"></div>
            <div class="summary-item total">
                <strong>Total</strong>
                <strong class="text-primary">R ${this.selectedPackage.price.toFixed(2)}</strong>
            </div>
        `}bindEvents(){var e;document.querySelectorAll(".payment-method-card").forEach(t=>{t.addEventListener("click",()=>{const n=t.dataset.gateway;this.selectedGateway=n,document.querySelectorAll(".payment-method-card").forEach(a=>{a.classList.remove("selected")}),t.classList.add("selected"),t.querySelector('input[type="radio"]').checked=!0})}),(e=document.getElementById("proceed-payment-btn"))==null||e.addEventListener("click",()=>{this.proceedToPayment()})}async proceedToPayment(){if(!this.selectedPackage){this.showError("Please select a package");return}const e=document.getElementById("proceed-payment-btn"),t=e.innerHTML;e.innerHTML='<i class="fas fa-spinner fa-spin"></i> Processing...',e.disabled=!0;try{const n=await fetch("http://localhost:8000/api/payment/create-session",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("token")}`},body:JSON.stringify({package_id:this.selectedPackage.id,gateway:this.selectedGateway,client_ip:window.location.hostname,user_agent:navigator.userAgent})});if(!n.ok){const s=await n.json();throw new Error(s.detail||"Payment initialization failed")}const a=await n.json();if(a.success&&a.payment_url)sessionStorage.setItem("pending_transaction",a.transaction_id),window.location.href=a.payment_url;else if(a.session_id)this.handleStripePayment(a.session_id);else if(a.access_code)this.handlePayStackPayment(a.access_code);else throw new Error("Invalid payment response")}catch(n){console.error("Payment error:",n),this.showError(n.message||"Failed to initialize payment"),e.innerHTML=t,e.disabled=!1}}handleStripePayment(e){console.log("Stripe payment session:",e),this.showError("Stripe integration pending - please use PayFast for now")}handlePayStackPayment(e){console.log("PayStack access code:",e),this.showError("PayStack integration pending - please use PayFast for now")}showError(e){window.app&&window.app.showNotification?window.app.showNotification({type:"error",title:"Payment Error",message:e,duration:5e3}):alert(e)}}typeof window<"u"&&(window.TokenPurchasePage=st);function ra(i){const t=i.replace(/Page$/,"").replace(/([A-Z])/g,"-$1").toLowerCase().replace(/^-/,"");document.querySelectorAll(".sidebar-nav .nav-link").forEach(n=>{n.classList.remove("active"),n.dataset.page===t&&n.classList.add("active")})}function ca(i){const e=document.getElementById("user-avatar"),t=document.getElementById("user-dropdown");!e||!t||(e.addEventListener("click",n=>{n.stopPropagation(),t.classList.toggle("show")}),t.addEventListener("click",n=>{const a=n.target.closest(".dropdown-item");if(a){if(a.classList.contains("logout-item"))localStorage.removeItem("token"),localStorage.removeItem("currentPage"),window.location.reload();else{const s=a.dataset.page;if(s){const o=s.split("-").map(l=>l.charAt(0).toUpperCase()+l.slice(1)).join("")+"Page";i(o)}}t.classList.remove("show")}}),document.addEventListener("click",n=>{!t.contains(n.target)&&n.target!==e&&t.classList.remove("show")}))}function da(){const i=document.getElementById("theme-icon");if(!i)return;const e=()=>{document.body.classList.contains("dark-mode")?i.innerHTML='<i class="fas fa-moon"></i>':i.innerHTML='<i class="fas fa-sun"></i>'};i.addEventListener("click",()=>{document.body.classList.toggle("dark-mode"),e()}),e()}async function ua(){try{if(window.tokenSyncService)await window.tokenSyncService.forceUpdate();else{const i=await f("/api/tokens/balance");if(i){const e=document.querySelector(".sidebar .token-amount");if(e){const t=_e(i.current_balance||0);e.textContent=t;const n=localStorage.getItem("user");if(n)try{const a=JSON.parse(n);a.token_balance=i.current_balance||0,localStorage.setItem("user",JSON.stringify(a))}catch(a){console.error("Failed to update user data:",a)}}}}}catch(i){console.error("Failed to update token balance:",i);const e=localStorage.getItem("user");if(e)try{const t=JSON.parse(e),n=document.querySelector(".sidebar .token-amount");n&&t.token_balance!==void 0&&(n.textContent=_e(t.token_balance))}catch{}}}function _e(i){return i===0?"0":i<1e3?i.toLocaleString():i>=1e6?`${(i/1e6).toFixed(1)}M`:i>=1e3?`${(i/1e3).toFixed(1)}K`:i.toLocaleString()}async function ma(){await L("Chat/Chat","#chat-container"),k("src/components/Chat/Chat.css");const i=document.getElementById("chat-icon"),e=document.getElementById("chat-window"),t=document.getElementById("close-chat");i&&i.addEventListener("click",()=>{e.classList.toggle("hidden")}),t&&t.addEventListener("click",()=>{e.classList.add("hidden")})}class pa{constructor(){this.updateInterval=3e4,this.intervalId=null,this.listeners=new Set,this.lastBalance=null,this.isUpdating=!1,this.lowBalanceThreshold=100,this.warningBalanceThreshold=.2}async initialize(){await this.updateBalance(),this.startPeriodicUpdates(),document.addEventListener("visibilitychange",()=>{document.hidden?this.stopPeriodicUpdates():(this.startPeriodicUpdates(),this.updateBalance())}),window.addEventListener("focus",()=>{this.updateBalance()})}startPeriodicUpdates(){this.intervalId||(this.intervalId=setInterval(()=>{this.updateBalance()},this.updateInterval))}stopPeriodicUpdates(){this.intervalId&&(clearInterval(this.intervalId),this.intervalId=null)}async updateBalance(){if(!this.isUpdating){this.isUpdating=!0;try{const e=await f("/api/tokens/balance");if(e&&e.current_balance!==void 0){const t=e.current_balance,n=this.lastBalance!==null&&this.lastBalance!==t;this.lastBalance=t;const a=this.getUserData();return a.token_balance=t,a.monthly_usage=e.monthly_usage||0,a.token_limit=e.token_limit||1e4,a.percentage_used=e.percentage_used||0,localStorage.setItem("user",JSON.stringify(a)),this.updateUIElements(t),this.checkBalanceWarnings(t,e),n&&this.notifyListeners({balance:t,previousBalance:this.lastBalance,data:e}),e}else{const t=this.getUserData();if(t.token_balance!==void 0)return this.updateUIElements(t.token_balance),{current_balance:t.token_balance,monthly_usage:t.monthly_usage||0,token_limit:t.token_limit||1e4,percentage_used:t.percentage_used||0}}}catch(e){console.error("Failed to update token balance:",e)}finally{this.isUpdating=!1}return null}}updateUIElements(e){const t=document.querySelector(".sidebar .token-amount");t&&(t.textContent=this.formatTokenAmount(e),t.classList.add("balance-updated"),setTimeout(()=>{t.classList.remove("balance-updated")},1e3)),document.querySelectorAll("[data-token-balance]").forEach(a=>{a.textContent=this.formatTokenAmount(e)})}formatTokenAmount(e){return e===0?"0":e<1e3?e.toLocaleString():e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toLocaleString()}checkBalanceWarnings(e,t){const n=this.getUserData(),a=t.token_limit||n.token_limit||1e4,s=t.percentage_used||0;e<this.lowBalanceThreshold&&this.showLowBalanceWarning(e),s>80&&this.showHighUsageWarning(s,a)}showLowBalanceWarning(e){const t=document.querySelector(".sidebar .token-label");if(t&&!t.querySelector(".warning-badge")){const n=document.createElement("span");n.className="warning-badge",n.innerHTML='<i class="fas fa-exclamation-triangle"></i>',n.title=`Low balance: ${e} tokens remaining`,t.appendChild(n)}window.app&&window.app.showNotification&&window.app.showNotification({type:"warning",title:"Low Token Balance",message:`You have only ${e} tokens remaining. Consider purchasing more tokens.`,duration:1e4,action:{text:"Purchase Tokens",callback:()=>window.location.hash="#tokens"}})}showHighUsageWarning(e,t){window.app&&window.app.showNotification&&window.app.showNotification({type:"warning",title:"High Token Usage",message:`You've used ${e.toFixed(0)}% of your monthly limit (${this.formatTokenAmount(t)} tokens).`,duration:8e3})}getUserData(){const e=localStorage.getItem("user");if(e)try{return JSON.parse(e)}catch{return{token_balance:0}}return{token_balance:0}}async forceUpdate(){return await this.updateBalance()}addListener(e){this.listeners.add(e)}removeListener(e){this.listeners.delete(e)}notifyListeners(e){this.listeners.forEach(t=>{try{t(e)}catch(n){console.error("Error in token balance listener:",n)}})}async trackUsage(e,t,n={}){const a={operation:e,tokens:t,timestamp:Date.now(),details:n},s=this.getUsageHistory();s.push(a),s.length>100&&s.shift(),localStorage.setItem("tokenUsageHistory",JSON.stringify(s)),await this.updateBalance()}getUsageHistory(){const e=localStorage.getItem("tokenUsageHistory");if(e)try{return JSON.parse(e)}catch{return[]}return[]}getUsageStats(){const e=this.getUsageHistory(),t=Date.now(),n=t-1440*60*1e3,a=t-10080*60*1e3,s={total:0,today:0,thisWeek:0,byOperation:{}};return e.forEach(o=>{s.total+=o.tokens,o.timestamp>n&&(s.today+=o.tokens),o.timestamp>a&&(s.thisWeek+=o.tokens),s.byOperation[o.operation]||(s.byOperation[o.operation]=0),s.byOperation[o.operation]+=o.tokens}),s}destroy(){this.stopPeriodicUpdates(),this.listeners.clear()}}const ha=new pa;typeof window<"u"&&(window.tokenSyncService=ha);const ga={AuthPage:{component:"AuthPage",css:"src/components/AuthPage/AuthPage.css",setup:lt},DashboardPage:{component:"DashboardPage",css:"src/components/DashboardPage/DashboardPage.css",setup:yt},AllModelsPage:{component:"AllModelsPage",css:"src/components/AllModelsPage/AllModelsPage.css",setup:async()=>{window.AllModelsPage?window.allModelsPage=new window.AllModelsPage:await St()}},CustomModelCreationPage:{component:"CustomModelCreationPage",css:"src/components/CustomModelCreationPage/CustomModelCreationPage.css",setup:xt},GeneratePredictionsPage:{component:"GeneratePredictionsPage",css:"src/components/GeneratePredictionsPage/ModelEditorStyles.css",setup:async()=>{Z&&await Z.initialize()}},DataGeneratorPage:{component:"DataGeneratorPage",css:"src/components/DataGeneratorPage/DataGeneratorPage.css",setup:Dt},DataCleaningPage:{component:"DataCleaningPage",css:"src/components/DataCleaningPage/DataCleaningPage.css",setup:async()=>{await new Promise(i=>setTimeout(i,100)),window.DataCleaningPage?window.dataCleaningPage=new window.DataCleaningPage:window.dataCleaningPage&&window.dataCleaningPage.initialize()}},RulesEnginePage:{component:"RulesEnginePage",css:"src/components/RulesEnginePage/RulesEnginePageAdvanced.css",setup:Jn},RulesListPage:{component:"RulesListPage",css:"src/components/RulesListPage/RulesListPage.css",setup:async()=>{window.initializeRulesListPage?window.initializeRulesListPage():window.RulesListPage?(await new Promise(i=>setTimeout(i,100)),window.rulesListPage=new window.RulesListPage):await Qn()}},RuleHistoryPage:{component:"RuleHistoryPage",css:"src/components/RuleHistoryPage/RuleHistoryPage.css",setup:Kn},SettingsPage:{component:"SettingsPage",css:"src/components/SettingsPage/SettingsPage.css",setup:Yn},UserProfilePage:{component:"UserProfilePage",css:"src/components/UserProfilePage/UserProfilePage.css",setup:oa},ContactUsPage:{component:"ContactUsPage",css:"src/components/ContactUsPage/ContactUsPage.css",setup:la},TokenPurchasePage:{component:"TokenPurchasePage",css:"src/css/payment.css",setup:()=>{const i=new st,e=document.querySelector(".page-content-area");e&&(e.innerHTML=i.render(),i.afterRender())}}};async function fa(){const i=document.getElementById("app-root");i.innerHTML=`
        <div class="dashboard-container">
            <aside class="sidebar-nav"></aside>
            <main class="main-content">
                <div class="page-content-area">
                    <!-- Page content will be loaded here -->
                </div>
            </main>
            <div id="chat-container"></div>
        </div>
    `,k("src/styles/global.css"),await L("Sidebar",".sidebar-nav"),k("src/components/Sidebar/Sidebar.css"),ca(R),da(),await ma(),window.tokenSyncService?await window.tokenSyncService.initialize():ua(),document.querySelector(".sidebar-nav").addEventListener("click",async e=>{const t=e.target.closest(".nav-link");if(t){e.preventDefault();const n=t.dataset.page;console.log(`Sidebar navigation to: ${n}`),window.location.hash=`#${n}`}})}async function R(i){console.log(`Loading page: ${i}`),localStorage.setItem("currentPage",i);const e=document.getElementById("app-root");document.querySelectorAll('link[href*="components/"][rel="stylesheet"]').forEach(n=>{!n.href.includes("global.css")&&!n.href.includes("Sidebar.css")&&!n.href.includes("Chat.css")&&n.remove()});const t=ga[i];if(!t){console.error(`No route found for page: ${i}`),localStorage.setItem("currentPage","DashboardPage"),window.location.hash="#dashboard";return}if(i==="AuthPage")e.innerHTML="",await L(t.component,"#app-root"),k(t.css),t.setup();else{document.querySelector(".dashboard-container")||await fa(),ra(i);const n=document.querySelector(".page-content-area");n.innerHTML="",await L(t.component,".page-content-area"),k(t.css),t.setup()}}const ya={"#dashboard":"DashboardPage","#all-models":"AllModelsPage","#models":"AllModelsPage","#generate-predictions":"GeneratePredictionsPage","#data-generator":"DataGeneratorPage","#data-cleaning":"DataCleaningPage","#rules-engine":"RulesEnginePage","#rules-list":"RulesListPage","#rule-history":"RuleHistoryPage","#settings":"SettingsPage","#user-profile":"UserProfilePage","#contact-us":"ContactUsPage","#login":"AuthPage","#tokens":"TokenPurchasePage","#billing":"TokenPurchasePage"};function qe(){const e=(window.location.hash||"#dashboard").split("?")[0],t=ya[e];t&&(!localStorage.getItem("token")&&t!=="AuthPage"?(window.location.hash="#login",R("AuthPage")):R(t))}document.addEventListener("DOMContentLoaded",()=>{const i=localStorage.getItem("token"),e=localStorage.getItem("currentPage");window.location.hash?qe():R(i?e||"DashboardPage":"AuthPage"),window.addEventListener("hashchange",qe)});class va{constructor(){this.currentTab="upload",this.selectedTier=null,this.uploadedFile=null,this.selectedTemplate=null,this.workflowSteps=[],this.cleaningJobs=[],this.currentTokens=1e6,this.processingInterval=null}async initialize(){await this.loadIndustryTemplateSelector(),await this.loadProgressMonitor(),this.setupEventListeners(),this.loadCleaningHistory()}async loadProgressMonitor(){const t=await(await fetch("/src/components/ProgressMonitor/ProgressMonitor.html")).text(),n=document.getElementById("progressMonitorContainer");n&&(n.innerHTML=t);const a=document.createElement("link");a.rel="stylesheet",a.href="/src/components/ProgressMonitor/ProgressMonitor.css",document.head.appendChild(a);const s=document.createElement("script");s.src="/src/components/ProgressMonitor/ProgressMonitor.js",document.body.appendChild(s)}async loadIndustryTemplateSelector(){const t=await(await fetch("src/components/IndustryTemplateSelector/IndustryTemplateSelector.html")).text(),n=document.getElementById("industryTemplateSelectorContainer");n&&(n.innerHTML=t);const a=document.createElement("link");a.rel="stylesheet",a.href="src/components/IndustryTemplateSelector/IndustryTemplateSelector.css",document.head.appendChild(a);const s=document.createElement("script");s.src="src/components/IndustryTemplateSelector/IndustryTemplateSelector.js",s.onload=()=>{window.IndustryTemplateSelector&&(this.industrySelector=new IndustryTemplateSelector,this.industrySelector.initialize("industryTemplateSelectorContainer",{onTemplateSelect:(o,l)=>{this.applyTemplate(o)}}))},document.body.appendChild(s)}setupEventListeners(){document.querySelectorAll(".tab-button").forEach(n=>{n.addEventListener("click",a=>{const s=a.currentTarget.getAttribute("data-tab");this.switchTab(s)})});const e=document.getElementById("uploadArea"),t=document.getElementById("fileInput");e.addEventListener("click",()=>t.click()),e.addEventListener("dragover",n=>{n.preventDefault(),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleFiles(n.dataTransfer.files)}),t.addEventListener("change",n=>{this.handleFiles(n.target.files)}),this.setupWorkflowBuilder(),document.querySelectorAll(".tier-card").forEach(n=>{n.addEventListener("click",()=>{const a=n.getAttribute("data-tier");this.selectTier(a)})})}switchTab(e){document.querySelectorAll(".tab-button").forEach(t=>{t.classList.toggle("active",t.getAttribute("data-tab")===e)}),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.toggle("active",t.id===`${e}Tab`)}),this.currentTab=e}handleFiles(e){if(e.length===0)return;const t=e[0];this.uploadedFile=t;const n=document.getElementById("uploadProgress");n.style.display="block";let a=0;const s=setInterval(()=>{a+=Math.random()*15,a>100&&(a=100),document.getElementById("progressFill").style.width=`${a}%`,document.getElementById("progressPercent").textContent=Math.floor(a),a===100&&(clearInterval(s),setTimeout(()=>{this.profileData()},500))},200)}profileData(){const e=document.getElementById("profilingResults");e.style.display="block",document.getElementById("totalRows").textContent="1,245,678",document.getElementById("totalColumns").textContent="24",document.getElementById("qualityScore").textContent="78%";const t=document.getElementById("columnProfiles");t.innerHTML=`
            <h3>Column Analysis</h3>
            <div id="columnAnalysisTable"></div>
        `;const a={columns:[{key:"name",label:"Column Name",sortable:!0,render:s=>`<code>${s}</code>`},{key:"type",label:"Data Type",sortable:!0,render:s=>`<i class="fas fa-${{integer:"hashtag",string:"font",date:"calendar",decimal:"percentage"}[s]||"question"}"></i> ${s}`},{key:"nullsPercent",label:"Null Values",sortable:!0,render:(s,o)=>`<span class="text-${o.nulls>5?"danger":o.nulls>2?"warning":"success"}">${s}</span>`},{key:"uniquePercent",label:"Unique Values",sortable:!0,render:s=>`<span class="text-info">${s}</span>`},{key:"quality",label:"Quality Score",sortable:!0,render:s=>{const o=s>=95?"success":s>=85?"warning":"danger";return`
                            <div class="quality-score">
                                <div class="quality-bar" style="width: 100px; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                                    <div class="quality-fill bg-${o}" style="width: ${s}%; height: 100%;"></div>
                                </div>
                                <span class="text-${o} ml-2">${s}%</span>
                            </div>
                        `}}],data:[{name:"customer_id",type:"integer",nulls:0,nullsPercent:"0%",unique:100,uniquePercent:"100%",quality:100},{name:"email",type:"string",nulls:2.3,nullsPercent:"2.3%",unique:98.5,uniquePercent:"98.5%",quality:95},{name:"purchase_date",type:"date",nulls:0,nullsPercent:"0%",unique:15,uniquePercent:"15%",quality:98},{name:"amount",type:"decimal",nulls:1.2,nullsPercent:"1.2%",unique:45,uniquePercent:"45%",quality:97}],sortable:!0,compact:!0,pageSize:10,emptyMessage:"No columns found"};new Me(document.getElementById("columnAnalysisTable"),a)}generateColumnProfiles(){return[{name:"customer_id",type:"integer",nulls:"0%",unique:"100%"},{name:"email",type:"string",nulls:"2.3%",unique:"98.5%"},{name:"purchase_date",type:"date",nulls:"0%",unique:"15%"},{name:"amount",type:"decimal",nulls:"1.2%",unique:"45%"}].map(t=>`
            <div class="column-card">
                <h4>${t.name}</h4>
                <div class="column-stats">
                    <span>Type: ${t.type}</span>
                    <span>Nulls: ${t.nulls}</span>
                    <span>Unique: ${t.unique}</span>
                </div>
            </div>
        `).join("")}applyTemplate(e){this.selectedTemplate=e,this.showNotification(`${e.charAt(0).toUpperCase()+e.slice(1)} template applied`,"success"),this.updateCleaningOptions(e)}selectTier(e){this.selectedTier=e,document.querySelectorAll(".tier-card").forEach(n=>{n.classList.toggle("selected",n.getAttribute("data-tier")===e)});const t=document.getElementById("cleaningOptions");t.style.display="block",this.updateCleaningOptions()}updateCleaningOptions(e=null){const t=document.getElementById("cleaningOptionsContent"),n=this.selectedTier;let a="";if(n==="basic"?a=`
                <div class="cleaning-options-group">
                    <h4>Data Quality</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="removeDuplicates" checked> 
                            Remove duplicate rows
                            <span class="option-info">Identifies and removes exact duplicate records</span>
                        </label>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="validateTypes" checked> 
                            Validate data types
                            <span class="option-info">Ensures data conforms to expected types</span>
                        </label>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Missing Data</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="handleMissing" checked> 
                            Handle missing values
                            <span class="option-info">Fill, interpolate, or remove missing data</span>
                        </label>
                        <div class="sub-options">
                            <select id="missingStrategy" class="option-select">
                                <option value="remove">Remove rows with missing values</option>
                                <option value="mean">Fill with mean (numeric)</option>
                                <option value="median">Fill with median (numeric)</option>
                                <option value="mode">Fill with mode (categorical)</option>
                                <option value="forward">Forward fill</option>
                                <option value="backward">Backward fill</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Standardization</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="standardizeFormats" checked> 
                            Standardize formats
                            <span class="option-info">Normalize dates, numbers, and text formats</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="standardizeDates" checked> Date formats (YYYY-MM-DD)
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="standardizeNumbers" checked> Number formats (remove commas)
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="standardizeCase" checked> Text case (proper case for names)
                            </label>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="trimWhitespace" checked> 
                            Trim whitespace
                            <span class="option-info">Remove leading/trailing spaces</span>
                        </label>
                    </div>
                </div>
            `:n==="advanced"?a=`
                <div class="cleaning-options-group">
                    <h4>Anomaly Detection</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="aiAnomalyDetection" checked> 
                            AI-powered anomaly detection
                            <span class="option-info">Uses machine learning to identify unusual patterns</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="detectNumericOutliers" checked> Numeric outliers (IQR method)
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="detectCategoricalAnomalies" checked> Categorical anomalies
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="detectTimeSeriesAnomalies"> Time series anomalies
                            </label>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="statisticalOutliers" checked> 
                            Statistical outlier detection
                            <span class="option-info">Z-score and isolation forest methods</span>
                        </label>
                        <div class="sub-options">
                            <label>Sensitivity threshold:</label>
                            <input type="range" id="outlierSensitivity" min="1" max="5" value="3" class="sensitivity-slider">
                            <span id="sensitivityValue">3</span>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Fuzzy Matching</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="fuzzyMatching" checked> 
                            Fuzzy matching (Jaro-Winkler)
                            <span class="option-info">Identifies similar but not exact matches</span>
                        </label>
                        <div class="sub-options">
                            <label>Similarity threshold:</label>
                            <select id="fuzzyThreshold" class="option-select">
                                <option value="0.95">Very High (95%)</option>
                                <option value="0.90" selected>High (90%)</option>
                                <option value="0.85">Medium (85%)</option>
                                <option value="0.80">Low (80%)</option>
                            </select>
                            <label class="sub-option">
                                <input type="checkbox" id="fuzzyNames" checked> Apply to name fields
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="fuzzyAddresses" checked> Apply to addresses
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="fuzzyProducts"> Apply to product names
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Smart Features</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="smartColumnMapping"> 
                            Smart column mapping
                            <span class="option-info">Automatically maps and standardizes column names</span>
                        </label>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="dataEnrichment" checked> 
                            Data enrichment
                            <span class="option-info">Enhance data with derived features</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="enrichDates" checked> Extract date components
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="enrichGeo" checked> Geocode addresses
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="enrichCategories"> Create category hierarchies
                            </label>
                        </div>
                    </div>
                </div>
            `:n==="ai-powered"&&(a=`
                <div class="cleaning-options-group">
                    <h4>AI-Powered Correction</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="gptDataCorrection" checked> 
                            GPT-4 powered data correction
                            <span class="option-info">Uses advanced language models to understand and fix data issues</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="gptAddressCorrection" checked> Address standardization & correction
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="gptNameCorrection" checked> Name parsing & formatting
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="gptDescriptionEnhancement" checked> Product description enhancement
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="gptCategoryPrediction"> Category prediction
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Industry ML Models</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="industryMLModels" checked> 
                            Industry-specific ML models
                            <span class="option-info">Pre-trained models for your industry vertical</span>
                        </label>
                        <div class="sub-options">
                            ${this.getIndustryModelOptions()}
                        </div>
                    </div>
                </div>
                
                <div class="cleaning-options-group">
                    <h4>Advanced Features</h4>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="predictiveQuality"> 
                            Predictive quality assessment
                            <span class="option-info">Predicts data quality issues before they occur</span>
                        </label>
                        <div class="sub-options">
                            <label class="sub-option">
                                <input type="checkbox" id="qualityScoring"> Generate quality scores per record
                            </label>
                            <label class="sub-option">
                                <input type="checkbox" id="qualityAlerts"> Set up quality threshold alerts
                            </label>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="syntheticData"> 
                            Generate synthetic data for gaps
                            <span class="option-info">Creates realistic synthetic data to fill missing values</span>
                        </label>
                        <div class="sub-options">
                            <select id="syntheticMethod" class="option-select">
                                <option value="statistical">Statistical generation</option>
                                <option value="gan">GAN-based generation</option>
                                <option value="llm" selected>LLM-based generation</option>
                            </select>
                        </div>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="entityResolution" checked> 
                            Advanced entity resolution
                            <span class="option-info">Identifies same entities across different representations</span>
                        </label>
                    </div>
                    <div class="cleaning-option">
                        <label>
                            <input type="checkbox" id="semanticValidation" checked> 
                            Semantic validation
                            <span class="option-info">Validates data meaning and relationships</span>
                        </label>
                    </div>
                </div>
            `),e==="healthcare"&&(a+=`
                <div class="cleaning-option">
                    <label>
                        <input type="checkbox" checked> FHIR compliance validation
                    </label>
                </div>
                <div class="cleaning-option">
                    <label>
                        <input type="checkbox" checked> PHI de-identification
                    </label>
                </div>
            `),t.innerHTML=a,n==="advanced"){const s=document.getElementById("outlierSensitivity"),o=document.getElementById("sensitivityValue");s&&o&&s.addEventListener("input",l=>{o.textContent=l.target.value})}}highlightField(e,t){if(e){if(this.clearValidationErrors(),e.classList.add("validation-error"),t){const n=document.createElement("div");n.className="validation-message",n.textContent=t;const a=e.closest(".form-group")||e.closest(".card")||e;a.parentNode.insertBefore(n,a.nextSibling)}if(e.scrollIntoView({behavior:"smooth",block:"center"}),(e.tagName==="INPUT"||e.tagName==="SELECT"||e.tagName==="TEXTAREA")&&setTimeout(()=>e.focus(),300),e.classList.contains("tier-card")){const n=()=>{e.classList.remove("validation-error");const a=e.parentNode.querySelector(".validation-message");a&&a.remove(),e.removeEventListener("click",n)};e.addEventListener("click",n)}else{const n=()=>{e.classList.remove("validation-error");const a=e.parentNode.querySelector(".validation-message");a&&a.remove(),e.removeEventListener("input",n),e.removeEventListener("change",n)};e.addEventListener("input",n),e.addEventListener("change",n)}}}clearValidationErrors(){document.querySelectorAll(".validation-error").forEach(e=>{e.classList.remove("validation-error")}),document.querySelectorAll(".validation-message").forEach(e=>{e.remove()})}startCleaning(){if(!this.uploadedFile&&!this.selectedTier){const s=document.querySelector(".upload-section");this.highlightField(s,"Please upload a file and select a cleaning tier");return}if(!this.uploadedFile){const s=document.querySelector(".upload-section");this.highlightField(s,"Please upload a file first");return}if(!this.selectedTier){const s=document.querySelector(".tier-selection");this.highlightField(s,"Please select a cleaning tier");return}const e=this.collectCleaningOptions(),t=1245678,n=this.getSelectedOperations(),a=N.calculateCleaningCost(t,this.selectedTier,n);window.tokenUsageTracker&&!window.tokenUsageTracker.useTokens(a,"cleaning")||(this.showProcessingModal(),this.simulateProcessing(a,e))}collectCleaningOptions(){var t,n,a,s,o,l,r,c,d,u,m,p,h,g,y,v,S,E,I,x,M,_,z,$,D,q,B,ye,ve,be,we,Ee,Ce,ke,Se,Ie,Te,xe;const e={tier:this.selectedTier,template:this.selectedTemplate,options:{}};return this.selectedTier==="basic"?e.options={removeDuplicates:((t=document.getElementById("removeDuplicates"))==null?void 0:t.checked)||!1,validateTypes:((n=document.getElementById("validateTypes"))==null?void 0:n.checked)||!1,handleMissing:((a=document.getElementById("handleMissing"))==null?void 0:a.checked)||!1,missingStrategy:((s=document.getElementById("missingStrategy"))==null?void 0:s.value)||"remove",standardizeFormats:((o=document.getElementById("standardizeFormats"))==null?void 0:o.checked)||!1,standardizeDates:((l=document.getElementById("standardizeDates"))==null?void 0:l.checked)||!1,standardizeNumbers:((r=document.getElementById("standardizeNumbers"))==null?void 0:r.checked)||!1,standardizeCase:((c=document.getElementById("standardizeCase"))==null?void 0:c.checked)||!1,trimWhitespace:((d=document.getElementById("trimWhitespace"))==null?void 0:d.checked)||!1}:this.selectedTier==="advanced"?e.options={...this.getBasicOptions(),aiAnomalyDetection:((u=document.getElementById("aiAnomalyDetection"))==null?void 0:u.checked)||!1,detectNumericOutliers:((m=document.getElementById("detectNumericOutliers"))==null?void 0:m.checked)||!1,detectCategoricalAnomalies:((p=document.getElementById("detectCategoricalAnomalies"))==null?void 0:p.checked)||!1,detectTimeSeriesAnomalies:((h=document.getElementById("detectTimeSeriesAnomalies"))==null?void 0:h.checked)||!1,statisticalOutliers:((g=document.getElementById("statisticalOutliers"))==null?void 0:g.checked)||!1,outlierSensitivity:((y=document.getElementById("outlierSensitivity"))==null?void 0:y.value)||3,fuzzyMatching:((v=document.getElementById("fuzzyMatching"))==null?void 0:v.checked)||!1,fuzzyThreshold:((S=document.getElementById("fuzzyThreshold"))==null?void 0:S.value)||"0.90",fuzzyNames:((E=document.getElementById("fuzzyNames"))==null?void 0:E.checked)||!1,fuzzyAddresses:((I=document.getElementById("fuzzyAddresses"))==null?void 0:I.checked)||!1,fuzzyProducts:((x=document.getElementById("fuzzyProducts"))==null?void 0:x.checked)||!1,smartColumnMapping:((M=document.getElementById("smartColumnMapping"))==null?void 0:M.checked)||!1,dataEnrichment:((_=document.getElementById("dataEnrichment"))==null?void 0:_.checked)||!1,enrichDates:((z=document.getElementById("enrichDates"))==null?void 0:z.checked)||!1,enrichGeo:(($=document.getElementById("enrichGeo"))==null?void 0:$.checked)||!1,enrichCategories:((D=document.getElementById("enrichCategories"))==null?void 0:D.checked)||!1}:this.selectedTier==="ai-powered"&&(e.options={...this.getBasicOptions(),...this.getAdvancedOptions(),gptDataCorrection:((q=document.getElementById("gptDataCorrection"))==null?void 0:q.checked)||!1,gptAddressCorrection:((B=document.getElementById("gptAddressCorrection"))==null?void 0:B.checked)||!1,gptNameCorrection:((ye=document.getElementById("gptNameCorrection"))==null?void 0:ye.checked)||!1,gptDescriptionEnhancement:((ve=document.getElementById("gptDescriptionEnhancement"))==null?void 0:ve.checked)||!1,gptCategoryPrediction:((be=document.getElementById("gptCategoryPrediction"))==null?void 0:be.checked)||!1,industryMLModels:((we=document.getElementById("industryMLModels"))==null?void 0:we.checked)||!1,predictiveQuality:((Ee=document.getElementById("predictiveQuality"))==null?void 0:Ee.checked)||!1,qualityScoring:((Ce=document.getElementById("qualityScoring"))==null?void 0:Ce.checked)||!1,qualityAlerts:((ke=document.getElementById("qualityAlerts"))==null?void 0:ke.checked)||!1,syntheticData:((Se=document.getElementById("syntheticData"))==null?void 0:Se.checked)||!1,syntheticMethod:((Ie=document.getElementById("syntheticMethod"))==null?void 0:Ie.value)||"llm",entityResolution:((Te=document.getElementById("entityResolution"))==null?void 0:Te.checked)||!1,semanticValidation:((xe=document.getElementById("semanticValidation"))==null?void 0:xe.checked)||!1,...this.collectIndustryModelOptions()}),e}getSelectedOperations(){var t,n,a,s,o,l,r,c,d,u,m,p;const e=[];return this.selectedTier==="basic"?((t=document.getElementById("removeDuplicates"))!=null&&t.checked&&e.push("deduplication"),(n=document.getElementById("validateTypes"))!=null&&n.checked&&e.push("typeValidation"),(a=document.getElementById("handleMissing"))!=null&&a.checked&&e.push("missingValues"),(s=document.getElementById("standardizeFormats"))!=null&&s.checked&&e.push("formatStandard")):this.selectedTier==="advanced"?((o=document.getElementById("anomalyDetection"))!=null&&o.checked&&e.push("anomalyDetection"),(l=document.getElementById("fuzzyMatching"))!=null&&l.checked&&e.push("fuzzyMatching"),(r=document.getElementById("outlierDetection"))!=null&&r.checked&&e.push("outlierDetection"),(c=document.getElementById("smartMapping"))!=null&&c.checked&&e.push("columnMapping")):this.selectedTier==="ai-powered"&&((d=document.getElementById("gptCorrection"))!=null&&d.checked&&e.push("gptCorrection"),(u=document.getElementById("industryModels"))!=null&&u.checked&&e.push("industryModels"),(m=document.getElementById("qualityPrediction"))!=null&&m.checked&&e.push("predictiveQuality"),(p=document.getElementById("syntheticAugmentation"))!=null&&p.checked&&e.push("syntheticGeneration")),e}getBasicOptions(){return{removeDuplicates:!0,validateTypes:!0,handleMissing:!0,missingStrategy:"remove",standardizeFormats:!0,trimWhitespace:!0}}getAdvancedOptions(){return{aiAnomalyDetection:!0,statisticalOutliers:!0,fuzzyMatching:!0,fuzzyThreshold:"0.90",dataEnrichment:!0}}collectIndustryModelOptions(){const e={};return["modelDiagnosisValidation","modelProcedureCoding","modelPatientMatching","modelFraudDetection","modelAMLScreening","modelRiskScoring","modelClaimsValidation","modelRiskAssessment","modelPolicyMatching","modelProductCategorization","modelInventoryPrediction","modelCustomerSegmentation","modelGeneralClassification","modelAnomalyDetection","modelPatternRecognition"].forEach(n=>{const a=document.getElementById(n);a&&(e[n]=a.checked)}),e}getIndustryModelOptions(){const e=this.selectedTemplate;return e==="healthcare"?`
                <label class="sub-option">
                    <input type="checkbox" id="modelDiagnosisValidation" checked> Diagnosis code validation
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelProcedureCoding" checked> Procedure coding assistance
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelPatientMatching"> Patient record matching
                </label>
            `:e==="finance"?`
                <label class="sub-option">
                    <input type="checkbox" id="modelFraudDetection" checked> Fraud pattern detection
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelAMLScreening" checked> AML screening
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelRiskScoring"> Risk scoring models
                </label>
            `:e==="insurance"?`
                <label class="sub-option">
                    <input type="checkbox" id="modelClaimsValidation" checked> Claims validation
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelRiskAssessment" checked> Risk assessment
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelPolicyMatching"> Policy matching
                </label>
            `:e==="retail"?`
                <label class="sub-option">
                    <input type="checkbox" id="modelProductCategorization" checked> Product categorization
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelInventoryPrediction" checked> Inventory prediction
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelCustomerSegmentation"> Customer segmentation
                </label>
            `:`
                <label class="sub-option">
                    <input type="checkbox" id="modelGeneralClassification" checked> General classification
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelAnomalyDetection" checked> Anomaly detection
                </label>
                <label class="sub-option">
                    <input type="checkbox" id="modelPatternRecognition"> Pattern recognition
                </label>
            `}showProcessingModal(){var o;const e=document.getElementById("progress-modal");if(!e)return;e.style.display="flex";const t=(o=this.uploadedFile)!=null&&o.size?Math.floor(this.uploadedFile.size/100):1e3,n=document.getElementById("total-rows-target");n&&(n.textContent=t);const a=document.getElementById("continue-background");a&&(a.onclick=()=>{var r;const l={id:Date.now(),type:"data_cleaning",fileName:((r=this.uploadedFile)==null?void 0:r.name)||"data.csv",tier:this.selectedTier,startTime:Date.now(),status:"in_progress",progress:this.currentProgress||0,currentStage:this.currentStage||"analyzing"};localStorage.setItem("activeCleaning",JSON.stringify(l)),e.style.display="none",window.location.hash="#dashboard?tab=in-progress"}),e.querySelectorAll(".close-modal").forEach(l=>{l.onclick=()=>{e.style.display="none"}})}simulateProcessing(e,t){var a;const n=(a=this.uploadedFile)!=null&&a.size?Math.floor(this.uploadedFile.size/100):1e3;this.simulateCleaningProgress(n,t)}simulateCleaningProgress(e,t){const n=["analyzing","deduplicating","validating","cleaning","finalizing"];let a=0,s=0,o=0;const l=Date.now();let r=0;const c=()=>{s<20?a=0:s<35?(a=1,r=Math.floor(Math.random()*50)+10):s<50?(a=2,r=Math.floor(Math.random()*100)+50):s<85?(a=3,r=Math.floor(Math.random()*200)+100):a=4,document.querySelectorAll(".stage-item").forEach((E,I)=>{I<a?(E.classList.add("completed"),E.classList.remove("active")):I===a?(E.classList.add("active"),E.classList.remove("completed")):E.classList.remove("active","completed")});const u=document.getElementById("generation-progress-fill"),m=document.querySelector(".progress-percentage");u&&(u.style.width=`${s}%`),m&&(m.textContent=`${s}%`),o=Math.floor(s/100*e);const p=document.getElementById("rows-processed");p&&(p.textContent=o);const h=Date.now()-l,g=Math.floor(h/6e4),y=Math.floor(h%6e4/1e3),v=document.getElementById("time-elapsed");if(v&&(v.textContent=`${g}:${y.toString().padStart(2,"0")}`),s>0){const I=h/(s/100)-h,x=Math.floor(I/6e4),M=Math.floor(I%6e4/1e3),_=document.getElementById("eta-remaining");_&&(_.textContent=`${x}:${M.toString().padStart(2,"0")}`)}const S=document.getElementById("status-message");if(S){const E={analyzing:"Analyzing data patterns and issues...",deduplicating:"Removing duplicate records...",validating:"Validating data types and formats...",cleaning:`Applying ${this.selectedTier} cleaning rules...`,finalizing:"Finalizing and preparing cleaned data..."};S.textContent=E[n[a]]}this.currentProgress=s,this.currentStage=n[a],s<100?(s+=Math.random()*3+1,s=Math.min(s,100),setTimeout(c,500)):this.completeCleaning(e,r,l,tokenCost)};c()}completeCleaning(e,t,n,a){const s=document.getElementById("completion-section"),o=document.querySelector(".current-status");s&&(s.style.display="block"),o&&(o.style.display="none");const l=document.getElementById("final-rows");l&&(l.textContent=e);const r=document.getElementById("issues-fixed");r&&(r.textContent=t);const c=Date.now()-n,d=Math.floor(c/6e4),u=Math.floor(c%6e4/1e3),m=document.getElementById("total-time");m&&(m.textContent=`${d}:${u.toString().padStart(2,"0")}`);const p=document.getElementById("file-size");p&&(p.textContent=`${(e*1e-4).toFixed(1)} MB`);const h=document.getElementById("download-cleaned-data");h&&(h.onclick=()=>{var y,v;alert(`Downloading cleaned data: ${((v=(y=this.uploadedFile)==null?void 0:y.name)==null?void 0:v.replace(/\.[^/.]+$/,""))||"data"}_cleaned.csv`)});const g=document.getElementById("preview-cleaned-data");g&&(g.onclick=()=>{alert(`Cleaning Summary:

Total Rows: ${e}
Duplicates Removed: ${Math.floor(t*.3)}
Missing Values Handled: ${Math.floor(t*.4)}
Format Issues Fixed: ${Math.floor(t*.3)}
Data Quality Score: ${(85+Math.random()*10).toFixed(1)}%`)}),this.completeProcessing(a)}simulateProcessingOld(e,t){const a=this.generateProcessingStages(t);let s=0,o=0;this.progressMonitor&&this.progressMonitor.startProgress(1245678,"Cleaning Dataset"),this.processingInterval=setInterval(()=>{const l=Math.floor(Math.random()*5e4)+1e4;o=Math.min(o+l,1245678);const r=o/1245678*100,c=Math.floor(r/100*a.length);if(c!==s&&c<a.length&&(s=c,this.progressMonitor&&this.progressMonitor.addLog(`Started: ${a[c]}`,"info")),this.progressMonitor){const d=a[Math.min(s,a.length-1)];this.progressMonitor.updateProgress(o,d,`Processing row ${o.toLocaleString()} of ${1245678 .toLocaleString()}`)}o>=1245678&&(clearInterval(this.processingInterval),this.progressMonitor&&this.progressMonitor.completeProgress({tokenCost:e,message:"Data cleaning completed successfully!"}))},500)}generateProcessingStages(e){const t=["Analyzing data structure"];return e.options.removeDuplicates&&t.push("Removing duplicate rows"),e.options.validateTypes&&t.push("Validating data types"),e.options.handleMissing&&t.push(`Handling missing values (${e.options.missingStrategy})`),e.options.standardizeFormats&&t.push("Standardizing formats"),e.options.trimWhitespace&&t.push("Trimming whitespace"),e.options.aiAnomalyDetection&&t.push("Detecting anomalies with AI"),e.options.statisticalOutliers&&t.push("Identifying statistical outliers"),e.options.fuzzyMatching&&t.push(`Applying fuzzy matching (${e.options.fuzzyThreshold} threshold)`),e.options.smartColumnMapping&&t.push("Mapping columns intelligently"),e.options.dataEnrichment&&t.push("Enriching data with derived features"),e.options.gptDataCorrection&&t.push("Applying GPT-4 data corrections"),e.options.industryMLModels&&t.push("Running industry-specific ML models"),e.options.predictiveQuality&&t.push("Performing predictive quality assessment"),e.options.syntheticData&&t.push(`Generating synthetic data (${e.options.syntheticMethod})`),e.options.entityResolution&&t.push("Resolving entities across records"),e.options.semanticValidation&&t.push("Validating semantic relationships"),t.push("Validating results","Generating quality report"),t}completeProcessing(e){const t={id:Date.now(),filename:this.uploadedFile.name,date:new Date().toLocaleDateString(),rows:1245678,tier:this.selectedTier,status:"completed",tokens:e};this.cleaningJobs.unshift(t),this.saveCleaningHistory(),setTimeout(()=>{document.getElementById("processingModal").classList.remove("active"),this.showNotification("Data cleaning completed successfully!","success"),this.switchTab("history"),this.loadCleaningHistory()},3e3)}setupWorkflowBuilder(){const e=document.getElementById("workflowCanvas");document.querySelectorAll(".workflow-tool").forEach(n=>{n.addEventListener("dragstart",a=>{a.dataTransfer.setData("tool",n.getAttribute("data-tool"))})}),e.addEventListener("dragover",n=>{n.preventDefault(),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over");const a=n.dataTransfer.getData("tool");this.addWorkflowStep(a)})}addWorkflowStep(e){const t=document.getElementById("workflowCanvas");this.workflowSteps.length===0&&(t.innerHTML="");const n={id:Date.now(),type:e,config:{}};this.workflowSteps.push(n);const a=document.createElement("div");a.className="workflow-step",a.innerHTML=`
            <div class="step-header">
                <i class="fas fa-${this.getToolIcon(e)}"></i>
                <span>${this.getToolName(e)}</span>
                <button class="step-remove" onclick="dataCleaningPage.removeWorkflowStep(${n.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `,t.appendChild(a)}getToolIcon(e){return{dedupe:"copy",validate:"check-circle",transform:"exchange-alt","ai-clean":"brain",export:"download"}[e]||"cog"}getToolName(e){return{dedupe:"Deduplication",validate:"Validation",transform:"Transform","ai-clean":"AI Cleaning",export:"Export"}[e]||e}removeWorkflowStep(e){this.workflowSteps=this.workflowSteps.filter(t=>t.id!==e),this.renderWorkflow()}renderWorkflow(){const e=document.getElementById("workflowCanvas");if(this.workflowSteps.length===0){e.innerHTML='<p class="workflow-placeholder">Drag tools here to build your workflow</p>';return}e.innerHTML=this.workflowSteps.map(t=>`
            <div class="workflow-step">
                <div class="step-header">
                    <i class="fas fa-${this.getToolIcon(t.type)}"></i>
                    <span>${this.getToolName(t.type)}</span>
                    <button class="step-remove" onclick="dataCleaningPage.removeWorkflowStep(${t.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join("")}saveWorkflow(){if(this.workflowSteps.length===0){this.showNotification("Please add steps to your workflow","error");return}const e=JSON.parse(localStorage.getItem("cleaningWorkflows")||"[]");e.push({id:Date.now(),name:`Workflow ${e.length+1}`,steps:this.workflowSteps,created:new Date().toISOString()}),localStorage.setItem("cleaningWorkflows",JSON.stringify(e)),this.showNotification("Workflow saved successfully!","success")}runWorkflow(){if(this.workflowSteps.length===0){this.showNotification("Please create a workflow first","error");return}if(!this.uploadedFile){const e=document.querySelector(".upload-section");this.highlightField(e,"Please upload a file first"),this.switchTab("upload");return}this.showProcessingModal(),this.simulateProcessing(5)}loadCleaningHistory(){const e=document.getElementById("cleaningHistory"),t=JSON.parse(localStorage.getItem("cleaningJobs")||"[]");if(t.length===0){e.innerHTML=`
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No cleaning jobs yet</p>
                    <p class="empty-state-subtitle">Your cleaning history will appear here</p>
                </div>
            `;return}e.innerHTML='<div id="cleaningHistoryTable"></div>';const n=[{key:"filename",label:"File Name",sortable:!0,render:s=>`<strong>${s}</strong>`},{key:"date",label:"Date",sortable:!0,type:"date"},{key:"rows",label:"Rows",sortable:!0,type:"number",render:s=>s.toLocaleString()},{key:"tier",label:"Tier",sortable:!0,render:s=>`<span class="badge badge-${{basic:"info",advanced:"warning","ai-powered":"success"}[s]||"secondary"}">${s}</span>`},{key:"status",label:"Status",sortable:!0,render:s=>{const o={completed:"check-circle",processing:"spinner fa-spin",failed:"times-circle"},l={completed:"success",processing:"warning",failed:"danger"};return`<i class="fas fa-${o[s]} text-${l[s]}"></i> ${s}`}},{key:"tokens",label:"Tokens Used",sortable:!0,type:"number",render:s=>`<span class="text-primary">${s.toLocaleString()}</span>`}],a=[{key:"download",label:"Download",icon:"fas fa-download",class:"btn-sm btn-primary",handler:s=>this.downloadResults(s.id)},{key:"report",label:"Report",icon:"fas fa-chart-bar",class:"btn-sm btn-secondary",handler:s=>this.viewReport(s.id)},{key:"delete",label:"",icon:"fas fa-trash",class:"btn-sm btn-danger",tooltip:"Delete",handler:s=>{O.confirm({title:"Delete Cleaning Job",message:`Are you sure you want to delete the cleaning job for "${s.filename}"?`,confirmText:"Delete",confirmClass:"btn-danger",onConfirm:()=>this.deleteCleaningJob(s.id)})}}];this.historyTable=new Me(document.getElementById("cleaningHistoryTable"),{columns:n,data:t,actions:a,sortable:!0,filterable:!0,paginated:!0,pageSize:10,striped:!0,hoverable:!0,emptyMessage:"No cleaning jobs found"})}saveCleaningHistory(){localStorage.setItem("cleaningJobs",JSON.stringify(this.cleaningJobs))}downloadResults(e){this.showNotification("Downloading cleaned data...","info"),setTimeout(()=>{this.showNotification("Download started","success")},1e3)}viewReport(e){const t=this.cleaningJobs.find(n=>n.id===e);if(!t){this.showNotification("Job not found","error");return}O.alert({title:`Cleaning Report: ${t.filename}`,size:"large",message:`
                <div class="cleaning-report">
                    <div class="report-section">
                        <h4>Summary</h4>
                        <div class="report-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Rows Processed:</span>
                                <span class="stat-value">${t.rows.toLocaleString()}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Cleaning Tier:</span>
                                <span class="stat-value">${t.tier}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Tokens Used:</span>
                                <span class="stat-value">${t.tokens}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Processing Date:</span>
                                <span class="stat-value">${t.date}</span>
                            </div>
                        </div>
                    </div>
                    <div class="report-section">
                        <h4>Data Quality Improvements</h4>
                        <div class="quality-metrics">
                            <div class="metric">
                                <div class="metric-label">Duplicates Removed</div>
                                <div class="metric-value">12,345</div>
                                <div class="metric-change positive">-15.2%</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Missing Values Handled</div>
                                <div class="metric-value">8,901</div>
                                <div class="metric-change positive">-8.7%</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Format Standardizations</div>
                                <div class="metric-value">45,678</div>
                                <div class="metric-change">36.6%</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Quality Score</div>
                                <div class="metric-value">94%</div>
                                <div class="metric-change positive">+16%</div>
                            </div>
                        </div>
                    </div>
                    ${t.tier==="advanced"||t.tier==="ai-powered"?`
                        <div class="report-section">
                            <h4>Advanced Operations</h4>
                            <ul class="operations-list">
                                <li><i class="fas fa-check text-success"></i> AI-powered anomaly detection completed</li>
                                <li><i class="fas fa-check text-success"></i> Fuzzy matching applied to 3,456 records</li>
                                <li><i class="fas fa-check text-success"></i> Smart column mapping resolved 12 ambiguities</li>
                            </ul>
                        </div>
                    `:""}
                </div>
            `})}deleteCleaningJob(e){this.cleaningJobs=this.cleaningJobs.filter(t=>t.id!==e),this.saveCleaningHistory(),this.loadCleaningHistory(),this.showNotification("Cleaning job deleted","success")}showPricingModal(){window.tokenUsageTracker&&window.tokenUsageTracker.showPricingModal()}closePricingModal(){const e=document.getElementById("pricingModal");e&&e.classList.remove("active")}showNotification(e,t="info"){A[t](e)}}const ba=new va;window.dataCleaningPage=ba});export default wa();
