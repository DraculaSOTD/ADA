(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&a(c)}).observe(document,{childList:!0,subtree:!0});function t(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(n){if(n.ep)return;n.ep=!0;const o=t(n);fetch(n.href,o)}})();async function d(e,s){try{const t=e.includes("/")?`/src/components/${e}.html`:`/src/components/${e}/${e}.html`,a=await fetch(t);if(!a.ok)throw new Error(`HTTP error! status: ${a.status}`);const n=await a.text();if(document.querySelector(s).innerHTML=n,e==="TokensTabContent")h();else if(e==="ModelPerformance")L();else if(e==="NotificationsAlerts")w();else if(e==="AllModelsTabContent"){C();const o=document.querySelector('.add-model-button[data-model-type="pretrained"]'),c=document.querySelector('.add-model-button[data-model-type="custom"]');o&&o.addEventListener("click",()=>{l("GeneratePredictionsPage")}),c&&c.addEventListener("click",()=>{l("CustomModelCreationPage")})}else e==="InProgressTabContent"?M():e==="ActiveModelsTabContent"?T():e==="DownloadDataPage"?E():e==="AllModelsPage"?(await d("AllModelsPage/AllModelsOverviewTabContent",".all-models-page-container .tab-content"),r("src/components/AllModelsPage/AllModelsPageTabs.css"),b(),document.querySelector(".all-models-tabs-container").addEventListener("click",async o=>{const c=o.target.closest(".tab-item");if(c){const u=c.dataset.tab;document.querySelectorAll(".all-models-tabs-container .tab-item").forEach(m=>m.classList.remove("active")),c.classList.add("active");const i=document.querySelector(".all-models-page-container .tab-content");switch(i.innerHTML="",u){case"all-models-overview":await d("AllModelsPage/AllModelsOverviewTabContent",".all-models-page-container .tab-content"),r("src/components/AllModelsPage/AllModelsPageTabs.css"),b();break;case"community-models":await d("AllModelsPage/CommunityModelsTabContent",".all-models-page-container .tab-content"),r("src/components/AllModelsPage/AllModelsPageTabs.css"),P();break;case"pretrained-models":await d("AllModelsPage/PretrainedModelsTabContent",".all-models-page-container .tab-content"),r("src/components/AllModelsPage/AllModelsPageTabs.css"),k();break;default:console.warn("Unknown All Models tab:",u)}}})):e==="FinalizationPage"?A():e==="DataGeneratorPage"?D():e==="RulesEnginePage"&&I()}catch(t){console.error(`Failed to load ${e} component:`,t)}}function r(e){const s=`/${e}`;if(!document.querySelector(`link[href="${s}"]`)){const t=document.createElement("link");t.rel="stylesheet",t.href=s,document.head.appendChild(t)}}async function p(e,s={}){try{const t=await fetch(e,s);if(!t.ok)throw new Error(`HTTP error! status: ${t.status}`);return await t.json()}catch(t){return console.error(`Failed to fetch data from ${e}:`,t),null}}async function y(e,s={}){const t=localStorage.getItem("token");if(!t)return console.error("No token found, redirecting to login."),l("AuthPage"),null;const a={...s.headers,Authorization:`Bearer ${t}`};return p(e,{...s,headers:a})}async function h(){const e=await p("/src/data/tokensData.json");if(e){document.querySelector(".balance-amount").textContent=e.currentBalance;const s=document.querySelector(".balance-items");s.innerHTML="",e.items.forEach(t=>{const a=document.createElement("div");a.classList.add("balance-item","card"),a.innerHTML=`
                <div class="item-details">
                    <span class="item-name">${t.name}</span>
                    <span class="item-price">$${t.price.toFixed(2)}</span>
                    <span class="item-quantity">Quantity: ${t.quantity}</span>
                </div>
                <button class="delete-item-btn">🗑️</button>
            `,s.appendChild(a)}),document.querySelector(".base-price").textContent=`$${e.priceBreakdown.basePrice.toFixed(2)}`,document.querySelector(".taxes").textContent=`$${e.priceBreakdown.taxes.toFixed(2)}`,document.querySelector(".total-amount").textContent=`$${e.priceBreakdown.total.toFixed(2)}`,document.querySelector(".checkout-button").textContent=`Checkout ($${e.priceBreakdown.total.toFixed(2)})`}}async function L(){const e=await p("/src/data/modelPerformanceData.json");if(e){const s=document.querySelector(".model-performance-card .performance-list");s.innerHTML="",e.models.forEach(t=>{const a=document.createElement("div");a.classList.add("performance-item"),a.innerHTML=`
                <span class="model-name">${t.name}</span>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${t.percentage}%;"></div>
                </div>
                <span class="percentage">${t.percentage}%</span>
            `,s.appendChild(a)})}}async function w(){const e=await p("/src/data/notificationsAlertsData.json");if(e){const s=document.querySelector(".notifications-alerts-card .alerts-list");s.innerHTML="",e.alerts.forEach(t=>{const a=document.createElement("div");a.classList.add("alert-item"),a.innerHTML=`
                <div class="alert-dot"></div>
                <div class="alert-content">
                    <span class="alert-title">${t.title}</span>
                    <span class="alert-description">${t.description}</span>
                </div>
                <span class="alert-time">${t.time}</span>
            `,s.appendChild(a)})}}async function C(){const e=await y("/api/users");if(e&&e.data){const s=document.querySelector(".all-models-tab-content .model-list");s.innerHTML="",e.data.forEach(t=>{const a=document.createElement("div");a.classList.add("model-card","card"),a.innerHTML=`
                <div class="model-header">
                    <span class="model-name">User: ${t.username}</span>
                </div>
                <div class="model-details">
                    <p>ID: <span class="detail-value">${t.id}</span></p>
                </div>
            `,s.appendChild(a)})}}async function M(){const e=await p("/src/data/inProgressData.json");if(e){const s=document.querySelector(".in-progress-tab-content .model-list");s.innerHTML="",e.models.forEach(t=>{const a=document.createElement("div");a.classList.add("model-card","card"),a.innerHTML=`
                <div class="model-header">
                    <span class="model-name">Model Name:</span>
                    <span class="model-value">${t.name}</span>
                </div>
                <div class="model-details">
                    <p>Model State: <span class="detail-value">${t.state}</span></p>
                    <p>Time Elapsed: <span class="detail-value">${t.timeElapsed}</span></p>
                    <p>Elapsed Token Cost: <span class="detail-value">${t.elapsedTokenCost}</span></p>
                </div>
                <div class="progress-section">
                    <span class="progress-label">State Progress:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${t.progress}%;"></div>
                    </div>
                    <span class="percentage">${t.progress}%</span>
                </div>
                <div class="model-actions">
                    <button class="pause-button">Pause</button>
                    <button class="cancel-button">Cancel</button>
                </div>
            `,s.appendChild(a)})}}async function T(){const e=await p("/src/data/activeModelsData.json");if(e){const s=document.querySelector(".active-models-tab-content .model-list");s.innerHTML="",e.models.forEach(t=>{const a=document.createElement("div");a.classList.add("model-card","card"),a.innerHTML=`
                <div class="model-header">
                    <span class="model-name">${t.name}</span>
                    <span class="person-published">${t.personPublished}</span>
                    <div class="model-actions">
                        <button class="action-button">➕</button>
                        <button class="action-button">🔗</button>
                    </div>
                </div>
                <div class="model-details">
                    <p>Model description: <span class="detail-value">${t.description}</span></p>
                    <p>Model Trained Values: <span class="detail-value">${t.trainedValues}</span></p>
                    <p>Model Average Accuracy: <span class="detail-value">${t.averageAccuracy}</span></p>
                </div>
            `,s.appendChild(a)})}}async function E(){console.log("Loading Download Data Page data...")}function f(e,s){const t=document.querySelector(s);if(!t){console.error(`Container not found: ${s}`);return}t.innerHTML="",e.forEach(a=>{const n=document.createElement("div");n.classList.add("model-card","card"),n.innerHTML=`
            <div class="model-header">
                <span class="username">${a.username}</span>
                <span class="post-description">${a.postDescription}</span>
                <div class="likes">
                    <span>${a.likes}</span>
                    <span>👍</span>
                    <span>👎</span>
                </div>
            </div>
            <div class="model-details">
                <p>Model Name: <span class="detail-value">${a.modelName}</span></p>
                <p>Model Description: <span class="detail-value">${a.modelDescription}</span></p>
                <p>Data Trained Description: <span class="detail-value">${a.dataTrainedDescription}</span></p>
                <p>Data Fields: <span class="detail-value">${a.dataFields}</span></p>
            </div>
            <div class="model-actions">
                <select>
                    <option value="retrain" ${a.dropdownValue==="retrain"?"selected":""}>Retrain</option>
                    <option value="new" ${a.dropdownValue==="new"?"selected":""}>New</option>
                </select>
                <span class="dropdown-number">${a.dropdownNumber}</span>
                <button class="action-button">⚙️</button>
            </div>
        `,t.appendChild(n)})}async function b(){const e=await p("/src/data/communityModelsData.json"),s=await p("/src/data/pretrainedModelsData.json");let t=[];e&&e.models&&(t=t.concat(e.models)),s&&s.models&&(t=t.concat(s.models)),f(t,"#allModelsList"),v(t,"#allModelsList")}async function P(){const e=await p("/src/data/communityModelsData.json");e&&e.models&&(f(e.models,"#communityModelsList"),v(e.models,"#communityModelsList"))}async function k(){const e=await p("/src/data/pretrainedModelsData.json");e&&e.models&&(f(e.models,"#pretrainedModelsList"),v(e.models,"#pretrainedModelsList"))}function v(e,s){const t=document.getElementById("model-search");t&&(t.removeEventListener("input",g),t.addEventListener("input",a=>g(a,e,s)))}function g(e,s,t){const a=e.target.value.toLowerCase(),n=s.filter(o=>o.modelName.toLowerCase().includes(a)||o.username.toLowerCase().includes(a)||o.modelDescription.toLowerCase().includes(a)||o.dataTrainedDescription.toLowerCase().includes(a)||o.dataFields.toLowerCase().includes(a));f(n,t)}async function l(e){console.log(`Loading page: ${e}`);const s=document.getElementById("app-root");s.innerHTML="",document.querySelectorAll('link[href*="components/"][rel="stylesheet"]').forEach(t=>{t.href.includes("global.css")||t.remove()}),e==="AuthPage"?(await d(e,"#app-root"),r(`src/components/${e}/${e}.css`),S()):(s.innerHTML=`
            <div class="dashboard-container">
                <aside class="sidebar-nav"></aside>
                <header class="header"></header>
                <main class="main-content">
                    <div class="page-content-area">
                        <!-- Page content will be loaded here -->
                    </div>
                </main>
            </div>
        `,r("src/styles/global.css"),d("Sidebar",".sidebar-nav"),r("src/components/Sidebar/Sidebar.css"),await d("Header",".header"),r("src/components/Header/Header.css"),$(),q(),await d(e,".page-content-area"),r(`src/components/${e}/${e}.css`),e==="DashboardPage"&&(d("DashboardTabs",".dashboard-tabs"),r("src/components/DashboardTabs/DashboardTabs.css"),d("ModelPerformance",".model-performance-section"),r("src/components/ModelPerformance/ModelPerformance.css"),d("NotificationsAlerts",".notifications-alerts-section"),r("src/components/NotificationsAlerts/NotificationsAlerts.css"),d("AllModelsTabContent",".tab-content"),r("src/components/AllModelsTabContent/AllModelsTabContent.css"),document.querySelector(".dashboard-tabs").addEventListener("click",async t=>{const a=t.target.closest(".tab-item");if(a){const n=a.dataset.tab;document.querySelectorAll(".tab-item").forEach(c=>c.classList.remove("active")),a.classList.add("active");const o=document.querySelector(".tab-content");switch(o.innerHTML="",n){case"tokens":await d("TokensTabContent",".tab-content"),r("src/components/TokensTabContent/TokensTabContent.css");break;case"my-models":await d("AllModelsTabContent",".tab-content"),r("src/components/AllModelsTabContent/AllModelsTabContent.css");break;case"in-progress":await d("InProgressTabContent",".tab-content"),r("src/components/InProgressTabContent/InProgressTabContent.css");break;case"active-models":await d("ActiveModelsTabContent",".tab-content"),r("src/components/ActiveModelsTabContent/ActiveModelsTabContent.css");break;default:console.warn("Unknown tab:",n)}}})),document.querySelector(".sidebar-nav").addEventListener("click",async t=>{const a=t.target.closest(".nav-link");if(a){const n=a.dataset.page;switch(console.log(`Sidebar navigation to: ${n}`),document.querySelectorAll(".sidebar-nav .nav-link").forEach(o=>o.classList.remove("active")),a.classList.add("active"),n){case"dashboard":await l("DashboardPage");break;case"all-models-page":await l("AllModelsPage");break;case"custom-model-creation":await l("CustomModelCreationPage");break;case"generate-predictions":await l("GeneratePredictionsPage");break;case"data-generator":await l("DataGeneratorPage");break;case"rules-engine":await l("RulesEnginePage");break;case"user-profile":await l("UserProfilePage");break;case"contact-us":await l("ContactUsPage");break;case"settings":await l("SettingsPage");break;default:console.warn("Unknown page:",n)}}}))}function S(){const e=document.getElementById("sign-in-form"),s=document.getElementById("sign-up-form"),t=document.querySelector('.auth-tab[data-tab="sign-in"]'),a=document.querySelector('.auth-tab[data-tab="sign-up"]');e&&s&&(e.classList.add("active-form"),s.classList.remove("active-form")),t&&a&&(t.addEventListener("click",()=>{t.classList.add("active"),a.classList.remove("active"),e.classList.add("active-form"),s.classList.remove("active-form"),e.style.display="block",s.style.display="none"}),a.addEventListener("click",()=>{a.classList.add("active"),t.classList.remove("active"),s.classList.add("active-form"),e.classList.remove("active-form"),s.style.display="block",e.style.display="none"})),document.querySelectorAll(".password-toggle").forEach(n=>{n.addEventListener("click",()=>{const o=n.previousElementSibling;o.type==="password"?(o.type="text",n.textContent="🙈"):(o.type="password",n.textContent="👁️")})}),e&&e.addEventListener("submit",async n=>{n.preventDefault();const o=e.querySelector('input[type="text"]').value,c=e.querySelector('input[type="password"]').value,u=await p("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:o,password:c})});u&&u.accessToken?(localStorage.setItem("token",u.accessToken),l("DashboardPage")):alert("Login failed!")}),s&&s.addEventListener("submit",async n=>{n.preventDefault();const o=s.querySelector('input[type="text"]').value,c=s.querySelector('input[type="password"]').value,u=await p("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:o,password:c})});if(u&&u.message==="success"){const i=await p("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:o,password:c})});i&&i.accessToken?(localStorage.setItem("token",i.accessToken),l("DashboardPage")):(alert("Registration succeeded, but login failed."),l("AuthPage"))}else alert("Registration failed!")})}document.addEventListener("DOMContentLoaded",()=>{const e=localStorage.getItem("token");l(e?"DashboardPage":"AuthPage")});function $(){const e=document.getElementById("user-avatar"),s=document.getElementById("user-dropdown");!e||!s||(e.addEventListener("click",t=>{t.stopPropagation(),s.classList.toggle("show")}),document.addEventListener("click",t=>{const a=t.target.closest(".dropdown-item");if(a&&s.contains(a)){const n=a.dataset.page;if(n){const o=n.split("-").map(c=>c.charAt(0).toUpperCase()+c.slice(1)).join("")+"Page";console.log(`Navigating to: ${o}`),l(o),s.classList.remove("show")}}}),document.addEventListener("click",t=>{!s.contains(t.target)&&t.target!==e&&s.classList.remove("show")}))}function A(){const e=document.querySelector(".api-scheduler .minus-button"),s=document.querySelector(".api-scheduler .plus-button"),t=document.querySelector(".api-scheduler .api-calls-count"),a=document.querySelector(".api-scheduler .api-cost");if(!e||!s||!t||!a)return;let n=0;const o=10;function c(){t.textContent=n,a.textContent=n*o}e.addEventListener("click",()=>{n>0&&(n--,c())}),s.addEventListener("click",()=>{n++,c()}),c()}function D(){const e=document.getElementById("rows"),s=document.getElementById("columns"),t=document.getElementById("file-size"),a=document.getElementById("token-cost");if(!e||!s||!t||!a)return;function n(){const o=parseInt(e.value,10)||0,c=parseInt(s.value,10)||0,i=(o*c*10/1024).toFixed(2),m=o*c;t.textContent=`${i} KB`,a.textContent=m}e.addEventListener("input",n),s.addEventListener("input",n),n()}function I(){const e=document.getElementById("rules-list"),s=document.getElementById("add-rule-button"),t=document.getElementById("total-token-cost");if(!e||!s||!t)return;let a=0;function n(){const i=Date.now(),m=document.createElement("div");return m.classList.add("rule"),m.dataset.id=i,m.innerHTML=`
            <span>If</span>
            <input type="text" placeholder="this">
            <select class="operator-select">
                <option value="equals">equals</option>
                <option value="greater-than">greater than</option>
                <option value="less-than">less than</option>
            </select>
            <input type="text" placeholder="this">
            <span>then</span>
            <input type="text" placeholder="pass">
            <select class="api-select">
                <option value="">No API</option>
                <option value="internal">Internal API</option>
                <option value="external">External API</option>
            </select>
            <button class="delete-rule-button">-</button>
        `,m}function o(){const i=n();e.appendChild(i),u()}function c(i){i.remove(),u()}function u(){a=document.querySelectorAll(".rule").length*10,t.textContent=a}s.addEventListener("click",o),e.addEventListener("click",i=>{if(i.target.classList.contains("delete-rule-button")){const m=i.target.closest(".rule");c(m)}}),o()}function q(){const e=document.getElementById("theme-icon");e&&e.addEventListener("click",()=>{document.body.classList.toggle("dark-mode"),document.body.classList.contains("dark-mode")?e.textContent="🌙":e.textContent="☀️"})}
