/* Client-side helper to export current results as XLSX/CSV.
Requires the API endpoint /api/export/search-xlsx.
*/

(function(){
let isExporting = false;

async function exportSearch(format = 'xlsx') {
  if (isExporting) return;
  isExporting = true;
  
  try {
    // Показать индикатор загрузки
    const originalText = document.getElementById('btnExportXlsx').innerHTML;
    document.getElementById('btnExportXlsx').innerHTML = '<span class="loading"></span> Экспорт...';
    document.getElementById('btnExportXlsx').disabled = true;
    
    const ids = collectCurrentResultIds();
    const qs = new URLSearchParams();
    if (ids.length) {
      qs.set('ids', ids.join(','));
    } else {
      // Если нет ID, попробуем использовать текущий поисковый запрос
      const searchQuery = document.getElementById('fQuery')?.value;
      if (searchQuery) {
        qs.set('q', searchQuery);
      }
    }
    qs.set('format', format);

    const url = `/api/export/search-xlsx?${qs.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Экспорт не удался: ' + resp.statusText);

    const blob = await resp.blob();
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0,19);
    a.download = `bloggers-export-${ts}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    
    // Очистка
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 100);
    
  } catch (error) {
    console.error('Export error:', error);
    alert('Ошибка экспорта: ' + error.message);
  } finally {
    isExporting = false;
    // Восстановить кнопку
    const btn = document.getElementById('btnExportXlsx');
    if (btn) {
      btn.innerHTML = 'Экспорт XLSX';
      btn.disabled = false;
    }
  }
}

function collectCurrentResultIds() {
  // Приоритет 1: Глобальная переменная с выбранными блогерами
  if (window.appState && Array.isArray(window.appState.selectedBloggers) && window.appState.selectedBloggers.length > 0) {
    return window.appState.selectedBloggers.map(blogger => String(blogger.id)).filter(Boolean);
  }
  
  // Приоритет 2: Глобальная переменная с текущими результатами
  if (window.appState && Array.isArray(window.appState.filteredBloggers)) {
    return window.appState.filteredBloggers.map(blogger => String(blogger.id)).filter(Boolean);
  }
  
  // Приоритет 3: Поиск ID в DOM
  const nodes = document.querySelectorAll('[data-blogger-id], .card-blogger[data-id]');
  const ids = Array.from(nodes).map(n => 
    n.dataset.bloggerId || n.dataset.id || n.getAttribute('data-id')
  ).filter(Boolean);
  
  return Array.from(new Set(ids.map(String)));
}

// Экспортируем в глобал для кнопок
window.ExportHelper = { 
  exportSearch,
  collectCurrentResultIds
};

// Автопривязка к стандартным кнопкам
function bindButtons(){
  const btnX = document.getElementById('btnExportXlsx');
  const btnC = document.getElementById('btnExportCsv');
  
  if (btnX && !btnX.dataset.bound) {
    btnX.addEventListener('click', () => exportSearch('xlsx'));
    btnX.dataset.bound = '1';
  }
  
  if (btnC && !btnC.dataset.bound) {
    btnC.addEventListener('click', () => exportSearch('csv'));
    btnC.dataset.bound = '1';
  }
}

// Инициализация
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindButtons);
} else {
  setTimeout(bindButtons, 100);
}
})();