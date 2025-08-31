/* Saved Searches v1 — localStorage persistence + tiny picker UI
 * Usage: 
 * - Save: SavedSearches.saveSearch(name) 
 * - Load: SavedSearches.loadSearch(name)
 * - List: SavedSearches.listSavedSearches()
 * - Delete: SavedSearches.deleteSearch(name)
 */

(function(){
    const STORE_KEY = 'savedSearches.v1';
    const MAX_SAVED = 100;

    // Read from localStorage
    function readStore() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    // Write to localStorage
    function writeStore(items) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(items));
            return true;
        } catch {
            return false;
        }
    }

    // Collect current filter state from DOM
    function collectFilterStateFromDOM() {
        const state = {};
        
        // Basic filters
        const basicFilters = [
            'fPlatform', 'followersMin', 'followersMax', 'fFollowersUnit', 
            'fCategory', 'fAudienceGeo', 'fBloggerGeo', 'fErMin', 'fErMax',
            'fPriceMin', 'fPriceMax', 'fQuery', 'fHasEmail', 'fVerifiedOnly',
            'fGrowing'
        ];
        
        basicFilters.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    state[id] = el.checked;
                } else {
                    state[id] = el.value;
                }
            }
        });

        // Advanced filters (if expanded)
        const advancedFilters = [
            'fContentLanguage', 'fPostsMin', 'fPostsMax', 'fLastPost',
            'fContentType', 'fContentFormats', 'fAudienceGender', 'fBloggerGender',
            'fAudienceAge', 'fBloggerAge', 'fBrandExperience', 'fTop25ER', 'fSimilarTo'
        ];
        
        advancedFilters.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    state[id] = el.checked;
                } else {
                    state[id] = el.value;
                }
            }
        });

        // Sort option
        const activeSort = document.querySelector('.sort-btn.active');
        if (activeSort) {
            state.sort = activeSort.dataset.sort;
        }

        // AI search query
        const aiQuery = document.getElementById('aiSearchQuery');
        if (aiQuery) {
            state.aiQuery = aiQuery.value;
        }

        return state;
    }

    // Apply filter state to DOM
    function applyFilterStateToDOM(state) {
        // Basic filters
        Object.keys(state).forEach(key => {
            if (key === 'sort' || key === 'aiQuery') return;
            
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = Boolean(state[key]);
                } else {
                    el.value = state[key] || '';
                }
            }
        });

        // Sort option
        if (state.sort) {
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.sort === state.sort) {
                    btn.classList.add('active');
                }
            });
        }

        // AI search query
        if (state.aiQuery && document.getElementById('aiSearchQuery')) {
            document.getElementById('aiSearchQuery').value = state.aiQuery;
        }

        // Trigger filters change event
        const event = new Event('change', { bubbles: true });
        Object.keys(state).forEach(key => {
            if (key !== 'sort' && key !== 'aiQuery') {
                const el = document.getElementById(key);
                if (el) el.dispatchEvent(event);
            }
        });

        // Also trigger input event for real-time filters
        const inputEvent = new Event('input', { bubbles: true });
        Object.keys(state).forEach(key => {
            if (key !== 'sort' && key !== 'aiQuery') {
                const el = document.getElementById(key);
                if (el) el.dispatchEvent(inputEvent);
            }
        });
    }

    // Save search with given name
    function saveSearch(name, filterState = null) {
        if (!name || typeof name !== 'string') {
            throw new Error('Название поиска обязательно');
        }

        const items = readStore();
        const existingIndex = items.findIndex(item => item.name === name);
        const state = filterState || collectFilterStateFromDOM();
        
        const searchData = {
            name,
            state,
            updatedAt: new Date().toISOString(),
            createdAt: existingIndex >= 0 ? items[existingIndex].createdAt : new Date().toISOString()
        };

        if (existingIndex >= 0) {
            items[existingIndex] = searchData;
        } else {
            items.unshift(searchData);
            // Keep only MAX_SAVED items
            if (items.length > MAX_SAVED) {
                items.splice(MAX_SAVED);
            }
        }

        if (!writeStore(items)) {
            throw new Error('Не удалось сохранить поиск');
        }

        return searchData;
    }

    // List all saved searches
    function listSavedSearches() {
        return readStore();
    }

    // Load search by name
    function loadSearch(name) {
        const items = readStore();
        const search = items.find(item => item.name === name);
        
        if (!search) {
            throw new Error(`Поиск "${name}" не найден`);
        }

        applyFilterStateToDOM(search.state);
        return search;
    }

    // Delete search by name
    function deleteSearch(name) {
        const items = readStore();
        const filtered = items.filter(item => item.name !== name);
        
        if (filtered.length === items.length) {
            throw new Error(`Поиск "${name}" не найден`);
        }

        if (!writeStore(filtered)) {
            throw new Error('Не удалось удалить поиск');
        }

        return true;
    }

    // Show picker UI for load/delete
    function showPicker(mode = 'load') {
        const items = listSavedSearches();
        
        // Create or get picker element
        let root = document.getElementById('savedSearchesPicker');
        if (!root) {
            root = document.createElement('div');
            root.id = 'savedSearchesPicker';
            root.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 20px;
                z-index: 1000;
                box-shadow: var(--shadow-3);
                min-width: 400px;
                max-width: 90vw;
                max-height: 80vh;
                overflow-y: auto;
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: var(--text-muted);
            `;
            closeBtn.addEventListener('click', hidePicker);
            root.appendChild(closeBtn);
            
            document.body.appendChild(root);
        }

        root.innerHTML = '<div style="margin-bottom:16px;font-weight:bold">Сохранённые поиски</div>';
        
        const list = document.createElement('div');
        list.style.maxHeight = '300px';
        list.style.overflowY = 'auto';
        
        if (items.length === 0) {
            list.innerHTML = '<div class="muted" style="padding:16px;text-align:center">Нет сохранённых поисков</div>';
        } else {
            items.forEach(it => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:12px;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border)';
                
                const left = document.createElement('div');
                left.innerHTML = `<div style="color:var(--text)"><strong>${escapeHtml(it.name)}</strong></div>
                <div class="muted" style="font-size:12px">Обновлён: ${new Date(it.updatedAt).toLocaleString()}</div>`;
                
                const right = document.createElement('div');
                right.style.display = 'flex';
                right.style.gap = '8px';
                
                if (mode === 'load') {
                    const btnLoad = document.createElement('button');
                    btnLoad.className = 'btn'; 
                    btnLoad.textContent = 'Загрузить';
                    btnLoad.addEventListener('click', () => { 
                        try { 
                            loadSearch(it.name); 
                            hidePicker(); 
                            // Trigger filters apply
                            if (typeof applyFilters === 'function') {
                                applyFilters();
                            }
                        } catch(err){ 
                            alert(err.message||err); 
                        } 
                    });
                    right.appendChild(btnLoad);
                }
                
                const btnDel = document.createElement('button');
                btnDel.className = 'btn btn-secondary'; 
                btnDel.textContent = 'Удалить';
                btnDel.addEventListener('click', () => {
                    if (confirm(`Удалить «${it.name}»?`)) { 
                        try {
                            deleteSearch(it.name); 
                            showPicker(mode); 
                        } catch (err) {
                            alert(err.message||err);
                        }
                    }
                });
                right.appendChild(btnDel);
                
                row.appendChild(left);
                row.appendChild(right);
                list.appendChild(row);
            });
        }
        
        root.appendChild(list);
        root.style.display = 'block';
    }

    function hidePicker(){ 
        const el = document.getElementById('savedSearchesPicker'); 
        if (el) el.style.display='none'; 
    }

    function escapeHtml(s){ 
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); 
    }

    // ---- buttons wiring (optional) ----
    function bindButtons(){
        const btnSave = document.getElementById('btnSaveSearch') || document.getElementById('saveSearch');
        const btnLoad = document.getElementById('btnLoadSearch');
        const btnDelete = document.getElementById('btnDeleteSearch');

        if (btnSave && !btnSave.dataset.bound) {
            btnSave.addEventListener('click', () => {
                const name = prompt('Название сохранённого поиска:');
                if (!name) return;
                try { 
                    saveSearch(name); 
                    alert(`Поиск «${name}» сохранён`); 
                } catch(err){ 
                    alert(err.message||err); 
                }
            });
            btnSave.dataset.bound = '1';
        }

        if (btnLoad && !btnLoad.dataset.bound) {
            btnLoad.addEventListener('click', () => showPicker('load'));
            btnLoad.dataset.bound = '1';
        }

        if (btnDelete && !btnDelete.dataset.bound) {
            btnDelete.addEventListener('click', () => showPicker('delete'));
            btnDelete.dataset.bound = '1';
        }
    }

    // auto-bind on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindButtons);
    } else {
        setTimeout(bindButtons, 100);
    }

    // export
    window.SavedSearches = {
        saveSearch,
        listSavedSearches,
        loadSearch,
        deleteSearch,
        collectFilterStateFromDOM,
        applyFilterStateToDOM,
        _dev: { readStore, writeStore }
    };
})();