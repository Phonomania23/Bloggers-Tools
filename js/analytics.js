// /js/analytics.js
(async () => {
  // Ждем загрузки Day.js и плагинов
  await new Promise(resolve => {
    if (window.dayjs) {
      window.dayjs.extend(window.dayjs_plugin_utc);
      window.dayjs.extend(window.dayjs_plugin_timezone);
      window.dayjs.locale('ru');
      resolve();
    } else {
      console.error("Day.js not loaded");
      // Продолжаем работу без Day.js
      resolve();
    }
  });

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const fmtMoney = v => (v == null || isNaN(v) ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v));
  const fmtPct = v => (v == null || isNaN(v) ? '—' : (v * 100).toFixed(1) + '%');
  const fmtNum = v => (v == null || isNaN(v) ? '—' : v.toLocaleString('ru-RU'));

  let charts = {};
  let currentData = null;

  window.addEventListener('DOMContentLoaded', () => {
    try {
      // Дефолтный период: последние 30 дней
      const to = dayjs ? dayjs().format('YYYY-MM-DD') : new Date().toISOString().split('T')[0];
      const from = dayjs ? dayjs().subtract(29, 'day').format('YYYY-MM-DD') : new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
      
      $('#from').value = from;
      $('#to').value = to;

      $('#applyFilters').addEventListener('click', refresh);
      $('#exportPdf').addEventListener('click', exportPDF);
      $('#exportXlsx').addEventListener('click', exportXLSX);

      // Инициализация графиков
      initCharts();

      // Запуск первоначальной загрузки данных
      refresh();

      // Ресайз графиков при изменении размера окна
      window.addEventListener('resize', debounce(() => {
        Object.values(charts).forEach(chart => {
          if (chart && typeof chart.resize === 'function') {
            chart.resize();
          }
        });
      }, 250));

    } catch (error) {
      console.error("Error in DOMContentLoaded:", error);
      showErrorState();
    }
  });

  function initCharts() {
    try {
      charts.ts = echarts.init($('#chartTimeseries'));
      charts.formats = echarts.init($('#chartFormats'));
      charts.bloggers = echarts.init($('#chartBloggers'));
      charts.forecast = echarts.init($('#chartForecast'));
      
      // Устанавливаем базовые опции для графиков
      setLoadingOptions();
      
      console.log("Charts initialized successfully");
    } catch (error) {
      console.error("Error initializing charts:", error);
      throw error;
    }
  }

  function setLoadingOptions() {
    const loadingOption = {
      title: {
        text: 'Загрузка данных...',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: '45%',
        style: {
          text: '⏳',
          fontSize: 24,
          fill: '#999'
        }
      }
    };

    Object.values(charts).forEach(chart => {
      if (chart) {
        chart.setOption(loadingOption, true);
      }
    });
  }

  async function refresh() {
    try {
      const dealId = $('#dealId').value.trim() || 'ALL';
      const from = $('#from').value;
      const to = $('#to').value;
      
      if (!from || !to) {
        alert('Пожалуйста, укажите период');
        return;
      }

      $('#filtersInfo').textContent = `Дил: ${dealId}, период: ${from} — ${to}`;
      setLoadingState(true);

      const [summary, compare, forecast] = await Promise.all([
        fetchJSON(`/api/analytics/summary?dealId=${encodeURIComponent(dealId)}&from=${from}&to=${to}`),
        fetchJSON(`/api/analytics/compare?dealId=${encodeURIComponent(dealId)}&from=${from}&to=${to}`),
        fetchJSON(`/api/analytics/forecast?dealId=${encodeURIComponent(dealId)}&from=${from}&to=${to}`)
      ]);

      currentData = { summary, compare, forecast };
      updateUI(summary, compare, forecast);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      showErrorState();
      // Показываем мок-данные при ошибке
      showMockData();
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(loading) {
    const elements = $('#filters, .kpis, .grid2, .card');
    if (loading) {
      elements.classList.add('loading');
      $('#applyFilters').disabled = true;
    } else {
      elements.classList.remove('loading');
      $('#applyFilters').disabled = false;
    }
  }

  function showErrorState() {
    $('#kpiSpend').textContent = '—';
    $('#kpiRevenue').textContent = '—';
    $('#kpiROI').textContent = '—';
    $('#kpiConv').textContent = '—';
    $('#tableTop tbody').innerHTML = '<tr><td colspan="8" style="text-align: center; color: #dc3545;">Ошибка загрузки данных</td></tr>';
    
    // Показываем сообщения об ошибке на графиках
    const errorOption = {
      title: {
        text: 'Ошибка загрузки',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#dc3545',
          fontSize: 16
        }
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: '45%',
        style: {
          text: '❌',
          fontSize: 24,
          fill: '#dc3545'
        }
      }
    };

    Object.values(charts).forEach(chart => {
      if (chart) {
        chart.setOption(errorOption, true);
      }
    });
  }

  function showMockData() {
    // Простые мок-данные для демонстрации
    const mockSummary = {
      totals: {
        spend_rub: 350000,
        revenue_rub: 520000,
        conversions: 2480
      },
      series: generateMockSeries()
    };

    const mockCompare = {
      byBlogger: [
        { name: 'Иван Петров', format: 'Интеграция', impressions: 150000, clicks: 7500, conversions: 430, spend_rub: 120000, revenue_rub: 210000 },
        { name: 'Анна Сидорова', format: 'Shorts', impressions: 120000, clicks: 6000, conversions: 390, spend_rub: 80000, revenue_rub: 170000 },
        { name: 'Сергей Козлов', format: 'Рилс', impressions: 180000, clicks: 9000, conversions: 350, spend_rub: 160000, revenue_rub: 220000 }
      ],
      byFormat: [
        { format: 'Интеграция', revenue_rub: 330000 },
        { format: 'Shorts', revenue_rub: 260000 },
        { format: 'Рилс', revenue_rub: 110000 }
      ]
    };

    const mockForecast = {
      series: generateMockForecast()
    };

    updateUI(mockSummary, mockCompare, mockForecast);
  }

  function generateMockSeries() {
    const series = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today - i * 86400000).toISOString().split('T')[0];
      series.push({
        date,
        spend_rub: 2000 + Math.round(Math.random() * 2000),
        revenue_rub: 4000 + Math.round(Math.random() * 5000),
        conversions: 20 + Math.round(Math.random() * 30)
      });
    }
    return series;
  }

  function generateMockForecast() {
    const forecast = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today.getTime() + i * 86400000).toISOString().split('T')[0];
      forecast.push({
        date,
        revenue_rub: 5000 + Math.round(Math.random() * 6000),
        conversions: 25 + Math.round(Math.random() * 35)
      });
    }
    return forecast;
  }

  function updateUI(summary, compare, forecast) {
    if (!summary || !compare || !forecast) return;

    // KPIs
    updateKPIs(summary.totals);
    
    // Charts
    renderTimeseries(summary.series);
    renderFormats(compare.byFormat);
    renderBloggers(compare.byBlogger);
    renderForecast(forecast.series);

    // Table
    renderTopTable(compare.byBlogger);
  }

  function updateKPIs(totals) {
    $('#kpiSpend').textContent = fmtMoney(totals.spend_rub);
    $('#kpiRevenue').textContent = fmtMoney(totals.revenue_rub);
    
    const roiValue = totals.spend_rub > 0 ? 
      (totals.revenue_rub - totals.spend_rub) / totals.spend_rub : 0;
    $('#kpiROI').textContent = fmtPct(roiValue);
    $('#kpiROI').className = roiValue >= 0 ? 'value positive' : 'value negative';
    
    $('#kpiConv').textContent = fmtNum(totals.conversions);
  }

  function renderTimeseries(series) {
    if (!series || series.length === 0) return;

    const days = series.map(d => d.date);
    const option = {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: { color: '#374151' },
        axisPointer: { 
          type: 'shadow',
          shadowStyle: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      },
      legend: { 
        data: ['Расход', 'Выручка', 'Конверсии'],
        bottom: 0,
        itemGap: 20
      },
      grid: { 
        left: '3%', 
        right: '4%', 
        bottom: '60px', 
        top: '40px',
        containLabel: true 
      },
      xAxis: { 
        type: 'category', 
        data: days,
        axisLabel: {
          rotate: 45,
          formatter: (value) => dayjs ? dayjs(value).format('DD.MM') : value
        }
      },
      yAxis: [
        { 
          type: 'value', 
          name: '₽', 
          axisLabel: { formatter: '{value}' },
          nameTextStyle: { padding: [0, 30, 0, 0] }
        },
        { 
          type: 'value', 
          name: 'шт', 
          axisLabel: { formatter: '{value}' },
          nameTextStyle: { padding: [0, 0, 0, 30] }
        }
      ],
      series: [
        { 
          name: 'Расход', 
          type: 'line', 
          smooth: true, 
          data: series.map(d => d.spend_rub),
          itemStyle: { color: '#ef4444' },
          lineStyle: { color: '#ef4444' }
        },
        { 
          name: 'Выручка', 
          type: 'line', 
          smooth: true, 
          data: series.map(d => d.revenue_rub),
          itemStyle: { color: '#10b981' },
          lineStyle: { color: '#10b981' }
        },
        { 
          name: 'Конверсии', 
          type: 'bar', 
          yAxisIndex: 1, 
          data: series.map(d => d.conversions),
          itemStyle: { color: '#3b82f6' }
        }
      ],
      animation: true,
      animationDuration: 1000
    };
    
    charts.ts.setOption(option, true);
  }

  function renderFormats(rows) {
    if (!rows || rows.length === 0) return;

    const option = {
      tooltip: { 
        trigger: 'item', 
        formatter: '{a} <br/>{b}: {c} ₽ ({d}%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      },
      legend: { 
        orient: 'vertical', 
        right: 10, 
        top: 'center',
        textStyle: { fontSize: 12 }
      },
      series: [{
        name: 'Выручка по форматам',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { 
          borderRadius: 6, 
          borderColor: '#fff', 
          borderWidth: 2 
        },
        label: { 
          show: true, 
          formatter: '{b}: {c} ₽',
          fontSize: 12
        },
        emphasis: { 
          label: { 
            show: true, 
            fontWeight: 'bold',
            fontSize: 14
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        labelLine: { 
          show: true,
          length: 10,
          length2: 10
        },
        data: rows.map(r => ({ 
          name: r.format, 
          value: r.revenue_rub 
        }))
      }],
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
      animation: true,
      animationDuration: 1000
    };
    
    charts.formats.setOption(option, true);
  }

  function renderBloggers(rows) {
    if (!rows || rows.length === 0) return;

    const top = rows.slice(0, 10);
    const option = {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        axisPointer: { type: 'shadow' }
      },
      legend: { 
        data: ['ROI', 'CPA'],
        bottom: 0,
        itemGap: 20
      },
      grid: { 
        left: '3%', 
        right: '4%', 
        bottom: '60px', 
        top: '40px',
        containLabel: true 
      },
      xAxis: [
        { 
          type: 'value', 
          name: 'ROI (%)', 
          position: 'top', 
          splitLine: { show: false },
          nameTextStyle: { padding: [0, 0, 10, 0] }
        },
        { 
          type: 'value', 
          name: 'CPA (₽)', 
          position: 'bottom',
          nameTextStyle: { padding: [10, 0, 0, 0] }
        }
      ],
      yAxis: { 
        type: 'category', 
        data: top.map(r => r.name), 
        axisLabel: { 
          interval: 0, 
          rotate: 30,
          fontSize: 12
        }
      },
      series: [
        {
          name: 'ROI', 
          type: 'bar', 
          xAxisIndex: 0,
          data: top.map(r => r.spend_rub > 0 ? 
            ((r.revenue_rub - r.spend_rub) / r.spend_rub * 100) : 0),
          label: { 
            show: true, 
            position: 'right', 
            formatter: '{c}%',
            color: '#374151'
          },
          itemStyle: {
            color: function(params) {
              return params.value >= 0 ? '#10b981' : '#ef4444';
            }
          }
        },
        {
          name: 'CPA', 
          type: 'bar', 
          xAxisIndex: 1,
          data: top.map(r => r.conversions > 0 ? 
            (r.spend_rub / r.conversions) : 0),
          label: { 
            show: true, 
            position: 'insideLeft', 
            formatter: '{c} ₽',
            color: '#fff'
          },
          itemStyle: { color: '#3b82f6' }
        }
      ],
      animation: true,
      animationDuration: 1000
    };
    
    charts.bloggers.setOption(option, true);
  }

  function renderForecast(series) {
    if (!series || series.length === 0) return;

    const days = series.map(d => d.date);
    const option = {
      tooltip: { 
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      },
      legend: { 
        data: ['Прогноз выручки', 'Прогноз конверсий'],
        bottom: 0,
        itemGap: 20
      },
      grid: { 
        left: '3%', 
        right: '4%', 
        bottom: '60px', 
        top: '40px',
        containLabel: true 
      },
      xAxis: { 
        type: 'category', 
        data: days,
        axisLabel: {
          rotate: 45,
          formatter: (value) => dayjs ? dayjs(value).format('DD.MM') : value
        }
      },
      yAxis: [
        { 
          type: 'value', 
          name: '₽',
          nameTextStyle: { padding: [0, 30, 0, 0] }
        },
        { 
          type: 'value', 
          name: 'шт',
          nameTextStyle: { padding: [0, 0, 0, 30] }
        }
      ],
      series: [
        { 
          name: 'Прогноз выручки', 
          type: 'line', 
          smooth: true, 
          data: series.map(d => d.revenue_rub),
          itemStyle: { color: '#10b981' },
          lineStyle: { 
            color: '#10b981',
            type: 'dashed'
          }
        },
        { 
          name: 'Прогноз конверсий', 
          type: 'line', 
          smooth: true, 
          yAxisIndex: 1, 
          data: series.map(d => d.conversions),
          itemStyle: { color: '#3b82f6' },
          lineStyle: { 
            color: '#3b82f6',
            type: 'dashed'
          }
        }
      ],
      animation: true,
      animationDuration: 1000
    };
    
    charts.forecast.setOption(option, true);
  }

  function renderTopTable(rows) {
    const tbody = $('#tableTop tbody');
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Нет данных</td></tr>';
      return;
    }

    const topRows = rows
      .slice()
      .sort((a, b) => {
        const roiA = a.spend_rub > 0 ? (a.revenue_rub - a.spend_rub) / a.spend_rub : 0;
        const roiB = b.spend_rub > 0 ? (b.revenue_rub - b.spend_rub) / b.spend_rub : 0;
        return roiB - roiA;
      })
      .slice(0, 20);

    tbody.innerHTML = '';
    topRows.forEach(r => {
      const roi = r.spend_rub > 0 ? (r.revenue_rub - r.spend_rub) / r.spend_rub : 0;
      const tr = document.createElement('tr');
      
      tr.innerHTML = `
        <td><strong>${r.name || '—'}</strong></td>
        <td>${r.format || '—'}</td>
        <td>${fmtNum(r.impressions)}</td>
        <td>${fmtNum(r.clicks)}</td>
        <td>${fmtNum(r.conversions)}</td>
        <td>${fmtMoney(r.spend_rub)}</td>
        <td>${fmtMoney(r.revenue_rub)}</td>
        <td class="${roi >= 0 ? 'positive' : 'negative'}"><strong>${fmtPct(roi)}</strong></td>`;
      
      tbody.appendChild(tr);
    });
  }

  async function exportPDF() {
    try {
      setLoadingState(true);
      $('#exportPdf').disabled = true;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
      const blocks = [
        document.querySelector('.kpis'),
        $('#chartTimeseries'), $('#chartFormats'),
        $('#chartBloggers'), $('#chartForecast'),
        document.querySelector('#tableTop').parentElement
      ];

      let y = 40;
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('📊 Отчёт по аналитике — Bloggers.tools', 40, y);
      
      y += 30;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      
      const periodText = `Период: ${$('#from').value} - ${$('#to').value}`;
      const dealText = `Сделка: ${$('#dealId').value || 'Все'}`;
      pdf.text(`${periodText} | ${dealText}`, 40, y);
      
      y += 20;
      pdf.text(`Сгенерировано: ${new Date().toLocaleString('ru-RU')}`, 40, y);
      y += 40;

      for (const el of blocks) {
        if (!el) continue;

        const canvas = await html2canvas(el, { 
          background: '#fff', 
          scale: 1.2,
          logging: false,
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pageWidth = pdf.internal.pageSize.getWidth() - 80;
        const ratio = pageWidth / canvas.width;
        const height = canvas.height * ratio;

        if (y + height > pdf.internal.pageSize.getHeight() - 40) {
          pdf.addPage();
          y = 40;
        }

        pdf.addImage(imgData, 'JPEG', 40, y, pageWidth, height);
        y += height + 30;
      }

      pdf.save(`analytics_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ошибка при создании PDF. Проверьте консоль для подробностей.');
    } finally {
      setLoadingState(false);
      $('#exportPdf').disabled = false;
    }
  }

  async function exportXLSX() {
    try {
      setLoadingState(true);
      $('#exportXlsx').disabled = true;

      const dealId = $('#dealId').value.trim() || 'ALL';
      const from = $('#from').value;
      const to = $('#to').value;

      if (!currentData) {
        await refresh();
      }

      // Создаем простой Excel на клиенте как fallback
      if (!window.XLSX) {
        alert('Библиотека Excel не загружена');
        return;
      }

      const wb = XLSX.utils.book_new();
      
      // Лист с данными временных рядов
      const seriesData = currentData.summary.series.map(item => ({
        'Дата': item.date,
        'Расход (₽)': item.spend_rub,
        'Выручка (₽)': item.revenue_rub,
        'Конверсии': item.conversions
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(seriesData), 'Динамика');

      // Лист с блогерами
      const bloggersData = currentData.compare.byBlogger.map(item => ({
        'Блогер': item.name,
        'Формат': item.format,
        'Показы': item.impressions,
        'Клики': item.clicks,
        'Конверсии': item.conversions,
        'Расход (₽)': item.spend_rub,
        'Выручка (₽)': item.revenue_rub,
        'ROI': item.spend_rub > 0 ? ((item.revenue_rub - item.spend_rub) / item.spend_rub) : 0
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bloggersData), 'Блогеры');

      // Лист с KPI
      const kpiData = [{
        'Показатель': 'Значение',
        'Расход (₽)': currentData.summary.totals.spend_rub,
        'Выручка (₽)': currentData.summary.totals.revenue_rub,
        'Конверсии': currentData.summary.totals.conversions,
        'ROI': currentData.summary.totals.spend_rub > 0 ? 
          ((currentData.summary.totals.revenue_rub - currentData.summary.totals.spend_rub) / currentData.summary.totals.spend_rub) : 0
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiData), 'Итоги');

      XLSX.writeFile(wb, `analytics_${from}_${to}.xlsx`);

    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      
      // Fallback: пытаемся использовать серверный экспорт
      try {
        const dealId = $('#dealId').value.trim() || 'ALL';
        const from = $('#from').value;
        const to = $('#to').value;
        const url = `/api/analytics/export-xlsx?dealId=${encodeURIComponent(dealId)}&from=${from}&to=${to}`;
        window.location.href = url;
      } catch (fallbackError) {
        alert('Ошибка при экспорте в Excel. Проверьте консоль для подробностей.');
      }
    } finally {
      setLoadingState(false);
      $('#exportXlsx').disabled = false;
    }
  }

  async function fetchJSON(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
})();