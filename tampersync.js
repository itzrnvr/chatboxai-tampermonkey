// ==UserScript==
// @name         ChatboxAI Cloud Sync (v11.1 - Large File Fix)
// @namespace    http://tampermonkey.net/
// @version      11.1
// @description  Sync data to Google Drive. Fixes 60MB+ upload errors and UI sizing.
// @match        https://web.chatboxai.app/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        FILE_PREFIX: "Chatbox_Backup",
        MIME_TYPE: "application/json",
        BUTTON_ID: 'overseer-sync-button',
        LANDMARK_TEXT: 'Settings'
    };

    // ==================== STYLES ====================
    GM_addStyle(`
        :root { --sync-bg: #1a1b1e; --sync-surface: #25262b; --sync-primary: #228be6; --sync-danger: #fa5252; --sync-success: #40c057; --sync-text: #c1c2c5; --sync-border: #373a40; }
        .sync-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.85); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); opacity: 0; animation: fadeIn 0.2s forwards; }
        .sync-box { background: var(--sync-bg); color: var(--sync-text); width: 600px; max-height: 90vh; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display: flex; flex-direction: column; font-family: 'Segoe UI', system-ui, sans-serif; border: 1px solid var(--sync-border); overflow: hidden; }

        /* Header */
        .sync-header { padding: 16px 20px; background: var(--sync-surface); border-bottom: 1px solid var(--sync-border); display: flex; justify-content: space-between; align-items: center; }
        .sync-title { font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
        .btn-close-x { background: transparent; border: none; color: var(--sync-text); font-size: 20px; cursor: pointer; } .btn-close-x:hover { color: #fff; }

        /* Content Area */
        .sync-content { padding: 20px; overflow-y: auto; min-height: 200px; display: flex; flex-direction: column; gap: 15px; }

        /* Dashboard Grid */
        .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .action-card { background: var(--sync-surface); border: 1px solid var(--sync-border); padding: 20px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; transition: transform 0.1s; }
        .action-card:hover { border-color: var(--sync-primary); transform: translateY(-2px); }
        .card-icon { font-size: 32px; margin-bottom: 5px; }
        .card-title { font-weight: 600; color: #fff; }
        .card-desc { font-size: 12px; color: #909296; }

        /* Buttons */
        .sync-btn { border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: var(--sync-primary); color: white; width: 100%; } .btn-primary:hover { background: #1c7ed6; }
        .btn-danger { background: rgba(250, 82, 82, 0.1); color: var(--sync-danger); border: 1px solid var(--sync-danger); } .btn-danger:hover { background: var(--sync-danger); color: white; }
        .btn-secondary { background: var(--sync-surface); border: 1px solid var(--sync-border); color: var(--sync-text); } .btn-secondary:hover { border-color: #fff; color: #fff; }

        /* File List Table */
        .file-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .file-table th { text-align: left; color: #909296; padding: 8px; border-bottom: 1px solid var(--sync-border); font-weight: 500; }
        .file-table td { padding: 12px 8px; border-bottom: 1px solid var(--sync-border); color: #fff; }
        .file-table tr:hover td { background: rgba(255,255,255,0.03); }
        .file-meta { color: #909296; font-size: 11px; }

        /* Progress Bar */
        .progress-container { display: none; flex-direction: column; gap: 8px; margin-top: 10px; }
        .progress-track { width: 100%; height: 8px; background: var(--sync-surface); border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--sync-success); width: 0%; transition: width 0.2s ease; }
        .progress-text { font-size: 12px; text-align: right; color: var(--sync-success); }

        /* Logs */
        .log-area { font-family: monospace; font-size: 11px; color: #909296; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--sync-border); max-height: 100px; overflow-y: auto; }

        /* UI Utilities */
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

        /* Sidebar Button Fix */
        #overseer-sync-button {
            height: 42px !important;
            min-height: 42px !important;
            padding: 8px 12px !important;
            display: flex !important;
            align-items: center !important;
            font-size: 14px !important;
            margin-bottom: 4px !important;
        }
        #overseer-sync-button svg { width: 20px; height: 20px; margin-right: 10px; }
    `);

    // ==================== UI ENGINE ====================
    let ui = { overlay: null, content: null, log: null };

    function createUI() {
        if (ui.overlay) return;
        const overlay = document.createElement('div'); overlay.className = 'sync-overlay';
        overlay.innerHTML = `
            <div class="sync-box">
                <div class="sync-header">
                    <div class="sync-title">☁️ Cloud Sync <span style="font-size:12px; color:#909296; margin-left:10px;">v11.1</span></div>
                    <button class="btn-close-x" id="sync-x">✕</button>
                </div>
                <div class="sync-content" id="sync-main"></div>
                <div style="padding: 0 20px 20px 20px;">
                    <div class="progress-container" id="sync-progress">
                        <div style="display:flex; justify-content:space-between;"><span style="font-size:12px">Processing...</span><span class="progress-text" id="prog-txt">0%</span></div>
                        <div class="progress-track"><div class="progress-fill" id="prog-fill"></div></div>
                    </div>
                    <div class="log-area" id="sync-log"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        ui.overlay = overlay;
        ui.content = overlay.querySelector('#sync-main');
        ui.log = overlay.querySelector('#sync-log');

        overlay.querySelector('#sync-x').onclick = closeUI;
        showDashboard();
    }

    function closeUI() { if(ui.overlay) { ui.overlay.remove(); ui.overlay = null; } }

    function showDashboard() {
        const hasToken = !!GM_getValue("gdrive_token");
        ui.content.innerHTML = `
            <div class="dashboard-grid">
                <div class="action-card">
                    <div class="card-icon">⬆️</div>
                    <div class="card-title">Backup</div>
                    <div class="card-desc">Save current state to Drive</div>
                    <button class="sync-btn btn-primary" id="btn-backup" ${!hasToken?'disabled style="opacity:0.5"':''}>Create Backup</button>
                </div>
                <div class="action-card">
                    <div class="card-icon">⬇️</div>
                    <div class="card-title">Restore</div>
                    <div class="card-desc">Select a file from Drive</div>
                    <button class="sync-btn btn-primary" id="btn-restore" ${!hasToken?'disabled style="opacity:0.5"':''}>View Backups</button>
                </div>
            </div>
            <div style="display:flex; gap:10px; justify-content: center; margin-top:10px;">
                <button class="sync-btn btn-secondary" id="btn-setup">⚙️ Google Setup</button>
                <button class="sync-btn btn-danger" id="btn-nuke">🔥 Factory Reset</button>
            </div>
            ${!hasToken ? '<div style="text-align:center; color:#fa5252; font-size:12px;">⚠️ Setup required.</div>' : ''}
        `;
        ui.content.querySelector('#btn-backup').onclick = () => runTask(performBackup);
        ui.content.querySelector('#btn-restore').onclick = () => runTask(showRestoreList);
        ui.content.querySelector('#btn-setup').onclick = () => runTask(setupCredentials);
        ui.content.querySelector('#btn-nuke').onclick = () => runTask(nukeEverything);
    }

    function updateProgress(percent, text) {
        const container = document.getElementById('sync-progress');
        if (!container) return;
        if (percent === null) { container.style.display = 'none'; return; }
        container.style.display = 'flex';
        document.getElementById('prog-fill').style.width = percent + '%';
        document.getElementById('prog-txt').textContent = percent + '%';
        if(text) container.querySelector('span').textContent = text;
    }

    function log(msg) {
        if(ui.log) { ui.log.innerHTML += `<div>> ${msg}</div>`; ui.log.scrollTop = ui.log.scrollHeight; }
        console.log(`[Sync] ${msg}`);
    }

    async function runTask(fn) {
        try { await fn(); }
        catch (e) { log(`❌ Error: ${e.message}`); console.error(e); updateProgress(null); }
    }

    // ==================== CORE TASKS ====================
    async function performBackup() {
        updateProgress(0, "Preparing Data...");
        log("Exporting Database (this may take a moment)...");

        const token = await getAccessToken();
        const idbData = await exportAllIndexedDB();
        const payload = {
            version: 11,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            localStorage: JSON.stringify(localStorage),
            indexedDB: idbData
        };

        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        log(`Payload size: ${sizeMB} MB`);

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${CONFIG.FILE_PREFIX}_v11_${dateStr}.json`;

        await uploadFileNative(filename, blob, token);

        updateProgress(100);
        log("✅ Backup Complete!");
        setTimeout(() => { updateProgress(null); showDashboard(); alert(`Backup saved: ${sizeMB} MB`); }, 500);
    }

    async function showRestoreList() {
        ui.content.innerHTML = `<div style="text-align:center; padding:40px;">Fetching backups...<br>⏳</div>`;
        const token = await getAccessToken();
        const files = await listFiles(token);

        if (files.length === 0) {
            ui.content.innerHTML = `<div style="text-align:center; padding:20px;">No backups found.</div><button class="sync-btn btn-secondary" id="btn-back">Back</button>`;
            ui.content.querySelector('#btn-back').onclick = showDashboard;
            return;
        }

        let html = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><strong>Available Backups</strong><button class="sync-btn btn-secondary" id="btn-back" style="padding:2px 8px;">Back</button></div>
            <div style="overflow-y:auto; max-height:300px; border:1px solid var(--sync-border); border-radius:6px;">
            <table class="file-table"><thead><tr><th>Date</th><th>Size</th><th></th></tr></thead><tbody>
        `;
        files.forEach(f => {
            const date = new Date(f.createdTime).toLocaleString();
            const size = (parseInt(f.size) / 1024 / 1024).toFixed(2) + " MB";
            html += `<tr><td>${date}<br><span class="file-meta">${f.name}</span></td><td>${size}</td><td style="text-align:right;"><button class="sync-btn btn-primary btn-restore-file" data-id="${f.id}">Load</button></td></tr>`;
        });
        html += `</tbody></table></div>`;
        ui.content.innerHTML = html;
        ui.content.querySelector('#btn-back').onclick = showDashboard;
        ui.content.querySelectorAll('.btn-restore-file').forEach(b => b.onclick = () => performRestore(b.getAttribute('data-id'), token));
    }

    async function performRestore(fileId, token) {
        if (!confirm("⚠️ This will overwrite CURRENT data with the backup.\n\nContinue?")) return;
        try {
            updateProgress(0, "Downloading...");
            const jsonString = await downloadFileNative(fileId, token);
            const data = JSON.parse(jsonString);
            updateProgress(50, "Restoring DB...");

            localStorage.clear();
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) { await new Promise(r => { const req = window.indexedDB.deleteDatabase(db.name); req.onsuccess = r; req.onerror = r; req.onblocked = r; }); }

            if (data.localStorage) {
                const ls = JSON.parse(data.localStorage);
                Object.keys(ls).forEach(k => localStorage.setItem(k, ls[k]));
            }
            if (data.indexedDB) await restoreAllIndexedDB(data.indexedDB);

            updateProgress(100);
            log("✅ Done! Reloading...");
            location.reload();
        } catch(e) {
            log("❌ Restore Failed: " + e.message);
            updateProgress(null);
        }
    }

    // ==================== NETWORK (Native XHR for >60MB Support) ====================
    // Standard XHR bypasses Tampermonkey's message passing limit for large blobs

    function getAccessToken() {
        const t = GM_getValue("gdrive_token", null);
        if (!t) throw new Error("Go to Setup first.");
        if (Date.now() < t.expiresAt) return Promise.resolve(t.accessToken);
        return refreshAccessToken(t.refreshToken);
    }

    function uploadFileNative(name, blob, token) {
        return new Promise((resolve, reject) => {
            const metadata = { name: name, mimeType: CONFIG.MIME_TYPE };
            const boundary = "-------Boundary" + Math.random().toString().slice(2);
            const delimiter = "\r\n--" + boundary + "\r\n";
            const closeDelim = "\r\n--" + boundary + "--";

            const reader = new FileReader();
            reader.readAsBinaryString(blob);
            reader.onload = function() {
                const multipartBody = delimiter +
                    'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
                    delimiter + 'Content-Type: ' + CONFIG.MIME_TYPE + '\r\n' +
                    'Content-Transfer-Encoding: binary\r\n\r\n' + reader.result + closeDelim;

                const xhr = new XMLHttpRequest();
                xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart");
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                xhr.setRequestHeader("Content-Type", `multipart/related; boundary=${boundary}`);

                xhr.upload.onprogress = (e) => { if(e.lengthComputable) updateProgress(Math.floor((e.loaded / e.total) * 100), "Uploading..."); };
                xhr.onload = () => { if(xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText)); else reject(new Error(xhr.responseText)); };
                xhr.onerror = () => reject(new Error("Network Error"));
                xhr.send(multipartBody);
            };
        });
    }

    function downloadFileNative(fileId, token) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);

            xhr.onprogress = (e) => { if(e.lengthComputable) updateProgress(Math.floor((e.loaded / e.total) * 100), "Downloading..."); };
            xhr.onload = () => { if(xhr.status === 200) resolve(xhr.responseText); else reject(new Error("Download failed: " + xhr.status)); };
            xhr.onerror = () => reject(new Error("Network Error"));
            xhr.send();
        });
    }

    function listFiles(token) {
        return new Promise((resolve, reject) => {
            const q = encodeURIComponent(`name contains '${CONFIG.FILE_PREFIX}' and trashed = false`);
            // Using GM_xmlhttpRequest here as the response is small and it handles headers easily
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`,
                headers: { "Authorization": `Bearer ${token}` },
                onload: (res) => {
                    if (res.status === 200) resolve(JSON.parse(res.responseText).files || []);
                    else reject(new Error(res.responseText));
                }
            });
        });
    }

    // ==================== DATABASE HELPERS ====================
    async function exportAllIndexedDB() {
        if (!window.indexedDB) return {};
        const dbs = await indexedDB.databases();
        const exportData = {};
        for (const dbInfo of dbs) {
            exportData[dbInfo.name] = await new Promise((resolve) => {
                const req = indexedDB.open(dbInfo.name);
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    if(db.objectStoreNames.length===0){ resolve({version:db.version,stores:[]}); return; }
                    const tx = db.transaction(db.objectStoreNames, "readonly");
                    const stores = [];
                    let c = 0;
                    [...db.objectStoreNames].forEach(name => {
                        const store = tx.objectStore(name);
                        store.getAll().onsuccess = (ev1) => {
                            store.getAllKeys().onsuccess = (ev2) => {
                                stores.push({
                                    schema: { name, keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes: [...store.indexNames].map(n=>({name:n, ...store.index(n)})) },
                                    records: ev1.target.result.map((v, i) => ({ key: ev2.target.result[i], value: v }))
                                });
                                c++; if(c === db.objectStoreNames.length) resolve({version:db.version, stores});
                            };
                        };
                    });
                };
            });
        }
        return exportData;
    }

    async function restoreAllIndexedDB(idbData) {
        for (const [dbName, content] of Object.entries(idbData)) {
            await new Promise(r => { const req = indexedDB.deleteDatabase(dbName); req.onsuccess = r; req.onerror = r; req.onblocked = r; });
            const storesToCreate = Array.isArray(content.stores) ? content.stores : Object.entries(content).filter(([k])=>k!=='version').map(([n,i])=>({schema:{name:n,keyPath:null,autoIncrement:false}, records:Array.isArray(i)?i.map(x=>({key:x.id||x.key,value:x})):[]}));

            await new Promise((resolve, reject) => {
                const req = indexedDB.open(dbName, content.version || 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    storesToCreate.forEach(s => {
                        if(!db.objectStoreNames.contains(s.schema.name)) {
                            const opts = { autoIncrement: s.schema.autoIncrement };
                            if(s.schema.keyPath) opts.keyPath = s.schema.keyPath;
                            const st = db.createObjectStore(s.schema.name, opts);
                            if(s.schema.indexes) s.schema.indexes.forEach(i=>st.createIndex(i.name, i.keyPath, {unique:i.unique, multiEntry:i.multiEntry}));
                        }
                    });
                };
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction(storesToCreate.map(s=>s.schema.name), "readwrite");
                    storesToCreate.forEach(s => {
                        const store = tx.objectStore(s.schema.name);
                        s.records.forEach(r => {
                            try {
                                if(store.keyPath) store.put(r.value);
                                else store.put(r.value, r.key || r.value.id || "rec_"+Math.random());
                            } catch(err){}
                        });
                    });
                    tx.oncomplete = resolve; tx.onerror = reject;
                };
                req.onerror = reject;
            });
        }
    }

    // ==================== AUTH & SETUP ====================
    function setupCredentials() {
        const id = prompt("Client ID:", GM_getValue("client_id", "")); if(!id) return;
        const secret = prompt("Client Secret:", GM_getValue("client_secret", "")); if(!secret) return;
        GM_setValue("client_id", id); GM_setValue("client_secret", secret);
        window.open(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${id}&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent`, "_blank", "width=500,height=600");
        setTimeout(() => {
            let c = prompt("Paste localhost URL code:");
            if(c) { if(c.startsWith('http')) c = new URL(c).searchParams.get('code'); exchangeCode(c); }
        }, 1500);
    }
    function exchangeCode(code) {
        GM_xmlhttpRequest({
            method: "POST", url: "https://oauth2.googleapis.com/token",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            data: `client_id=${GM_getValue("client_id")}&client_secret=${GM_getValue("client_secret")}&code=${code}&grant_type=authorization_code&redirect_uri=http://localhost`,
            onload: (r) => { const d = JSON.parse(r.responseText); if(d.error) alert(d.error); else { saveTokens(d); alert("Setup Complete!"); showDashboard(); } }
        });
    }
    function refreshAccessToken(rt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST", url: "https://oauth2.googleapis.com/token",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                data: `client_id=${GM_getValue("client_id")}&client_secret=${GM_getValue("client_secret")}&refresh_token=${rt}&grant_type=refresh_token`,
                onload: (r) => { const d = JSON.parse(r.responseText); if(d.error) reject(d.error_description); else { saveTokens(d, rt); resolve(d.access_token); } }
            });
        });
    }
    function saveTokens(d, rt) { GM_setValue("gdrive_token", { accessToken: d.access_token, refreshToken: d.refresh_token||rt, expiresAt: Date.now() + (d.expires_in*1000)-60000 }); }
    async function nukeEverything() { if(confirm("Reset everything?")) { localStorage.clear(); const dbs = await indexedDB.databases(); for(const d of dbs) indexedDB.deleteDatabase(d.name); location.reload(); } }

    // ==================== INJECT ====================
    function injectButton() {
        if (document.getElementById(CONFIG.BUTTON_ID)) return;
        const links = [...document.querySelectorAll('a, button')];
        const target = links.find(el => el.textContent.includes(CONFIG.LANDMARK_TEXT));
        if (target) {
            const btn = target.cloneNode(true);
            btn.id = CONFIG.BUTTON_ID;
            // Clean content but keep SVG if possible or replace
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 8l0 8" /><path d="M8 12l8 0" /></svg>Cloud Sync`;
            btn.removeAttribute('href');
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); createUI(); };
            if(target.parentElement) target.parentElement.appendChild(btn);
        }
    }
    new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
})();
