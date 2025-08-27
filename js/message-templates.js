// /public/js/message-templates.js - система шаблонов сообщений
(() => {
    const LS_KEY = 'messageTemplatesV1';
    
    // Стандартные шаблоны по умолчанию
    const defaultTemplates = [
        {
            id: 'first-contact',
            name: 'Первое обращение',
            category: 'Аутрич',
            text: 'Здравствуйте, {{name}}! Меня зовут {{myName}}, я представляю {{company}}. Хотим предложить сотрудничество по продвижению нашего продукта {{product}}.',
            variables: [
                { key: 'name', label: 'Имя блогера', required: true },
                { key: 'myName', label: 'Ваше имя', required: true },
                { key: 'company', label: 'Название компании', required: true },
                { key: 'product', label: 'Продукт/услуга', required: true }
            ]
        },
        {
            id: 'follow-up',
            name: 'Напоминание',
            category: 'Аутрич',
            text: 'Добрый день, {{name}}! Напоминаем о нашем предложении от {{date}}. Будем рады обсудить детали сотрудничества.',
            variables: [
                { key: 'name', label: 'Имя блогера', required: true },
                { key: 'date', label: 'Дата первого обращения', required: true }
            ]
        },
        {
            id: 'brief-sending',
            name: 'Отправка брифа',
            category: 'Работа',
            text: 'Приветствую, {{name}}! Отправляю бриф по нашему проекту. Дедлайн: {{deadline}}. Бюджет: {{budget}} руб. Жду ваших вопросов!',
            variables: [
                { key: 'name', label: 'Имя блогера', required: true },
                { key: 'deadline', label: 'Дедлайн', required: true },
                { key: 'budget', label: 'Бюджет', required: true }
            ]
        },
        {
            id: 'feedback-request',
            name: 'Запрос обратной связи',
            category: 'Работа',
            text: '{{name}}, добрый день! Направляю готовый материал для проверки. Пожалуйста, дайте обратную связь до {{feedbackDate}}.',
            variables: [
                { key: 'name', label: 'Имя блогера', required: true },
                { key: 'feedbackDate', label: 'Дата обратной связи', required: true }
            ]
        },
        {
            id: 'payment-info',
            name: 'Информация об оплате',
            category: 'Финансы',
            text: 'Уважаемый {{name}}! Подтверждаем получение оплаты по договору №{{contractNumber}} на сумму {{amount}} руб. Спасибо за сотрудничество!',
            variables: [
                { key: 'name', label: 'Имя блогера', required: true },
                { key: 'contractNumber', label: 'Номер договора', required: true },
                { key: 'amount', label: 'Сумма', required: true }
            ]
        }
    ];

    let templates = [];

    // Загрузка шаблонов из localStorage
    function loadTemplates() {
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored) {
                templates = JSON.parse(stored);
            } else {
                templates = [...defaultTemplates];
                saveTemplates();
            }
        } catch (error) {
            console.error('Ошибка загрузки шаблонов:', error);
            templates = [...defaultTemplates];
        }
    }

    // Сохранение шаблонов в localStorage
    function saveTemplates() {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(templates));
        } catch (error) {
            console.error('Ошибка сохранения шаблонов:', error);
        }
    }

    // Рендер UI для управления шаблонами
    function renderTemplatesUI() {
        if (document.getElementById('templates-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'templates-panel';
        panel.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 80px;
            width: 350px;
            max-height: 500px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1001;
            display: none;
            flex-direction: column;
        `;

        panel.innerHTML = `
            <div style="padding: 15px; border-bottom: 1px solid #eee; background: #f8f9fa; border-radius: 8px 8px 0 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 16px;">Шаблоны сообщений</h3>
                    <button id="close-templates" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
                </div>
                <input type="text" id="template-search" placeholder="Поиск шаблонов..." 
                       style="width: 100%; padding: 8px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div id="templates-list" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
            <div style="padding: 10px; border-top: 1px solid #eee; background: #f8f9fa;">
                <button id="new-template-btn" class="btn btn-secondary" style="width: 100%;">+ Новый шаблон</button>
            </div>
        `;

        document.body.appendChild(panel);

        // Обработчики событий
        document.getElementById('close-templates').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        document.getElementById('template-search').addEventListener('input', (e) => {
            filterTemplates(e.target.value);
        });

        document.getElementById('new-template-btn').addEventListener('click', () => {
            showTemplateEditor();
        });

        renderTemplatesList();
    }

    // Рендер списка шаблонов
    function renderTemplatesList(filter = '') {
        const listEl = document.getElementById('templates-list');
        if (!listEl) return;

        const filteredTemplates = filter ? 
            templates.filter(t => 
                t.name.toLowerCase().includes(filter.toLowerCase()) ||
                t.text.toLowerCase().includes(filter.toLowerCase()) ||
                t.category.toLowerCase().includes(filter.toLowerCase())
            ) : templates;

        // Группировка по категориям
        const categories = {};
        filteredTemplates.forEach(template => {
            if (!categories[template.category]) {
                categories[template.category] = [];
            }
            categories[template.category].push(template);
        });

        listEl.innerHTML = Object.keys(categories).map(category => `
            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; color: #666; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee;">${category}</div>
                ${categories[category].map(template => `
                    <div class="template-item" data-id="${template.id}" 
                         style="padding: 10px; margin-bottom: 8px; border: 1px solid #eee; border-radius: 6px; cursor: pointer; transition: background-color 0.2s;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${template.name}</div>
                        <div style="font-size: 12px; color: #666; line-height: 1.3;">${template.text.substring(0, 60)}${template.text.length > 60 ? '...' : ''}</div>
                        <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                            <button class="btn btn-secondary btn-sm use-template" style="padding: 2px 8px; font-size: 11px;">Использовать</button>
                            <button class="btn btn-secondary btn-sm edit-template" style="padding: 2px 8px; font-size: 11px;">✏️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');

        // Обработчики для кнопок
        document.querySelectorAll('.use-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.closest('.template-item').dataset.id;
                useTemplate(templateId);
            });
        });

        document.querySelectorAll('.edit-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.closest('.template-item').dataset.id;
                showTemplateEditor(templateId);
            });
        });

        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const templateId = item.dataset.id;
                    useTemplate(templateId);
                }
            });
        });
    }

    // Фильтрация шаблонов
    function filterTemplates(searchText) {
        renderTemplatesList(searchText);
    }

    // Использование шаблона
    function useTemplate(templateId) {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        // Если есть переменные, показать форму для их заполнения
        if (template.variables && template.variables.length > 0) {
            showVariablesForm(template);
        } else {
            insertTemplate(template.text);
        }
    }

    // Форма для заполнения переменных
    function showVariablesForm(template) {
        const formHtml = `
            <div style="padding: 20px;">
                <h4 style="margin-bottom: 15px;">Заполните данные для "${template.name}"</h4>
                ${template.variables.map(variable => `
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 500;">${variable.label}${variable.required ? ' *' : ''}</label>
                        <input type="text" 
                               data-key="${variable.key}" 
                               ${variable.required ? 'required' : ''}
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                               placeholder="Введите ${variable.label.toLowerCase()}">
                    </div>
                `).join('')}
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-secondary" id="cancel-variables">Отмена</button>
                    <button class="btn" id="apply-variables">Вставить</button>
                </div>
            </div>
        `;

        const modal = createModal(formHtml, 'Заполнение шаблона');
        
        document.getElementById('apply-variables').addEventListener('click', () => {
            const values = {};
            let isValid = true;

            template.variables.forEach(variable => {
                const input = document.querySelector(`[data-key="${variable.key}"]`);
                values[variable.key] = input.value.trim();
                
                if (variable.required && !values[variable.key]) {
                    isValid = false;
                    input.style.borderColor = 'red';
                } else {
                    input.style.borderColor = '';
                }
            });

            if (isValid) {
                const renderedText = renderTemplate(template.text, values);
                insertTemplate(renderedText);
                modal.remove();
            }
        });

        document.getElementById('cancel-variables').addEventListener('click', () => {
            modal.remove();
        });
    }

    // Рендер шаблона с переменными
    function renderTemplate(templateText, variables) {
        return templateText.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] || match;
        });
    }

    // Вставка текста в поле ввода сообщения
    function insertTemplate(text) {
        const msgInput = document.getElementById('msg-text');
        if (msgInput) {
            msgInput.value = text;
            msgInput.focus();
            
            // Закрыть панель шаблонов
            const panel = document.getElementById('templates-panel');
            if (panel) {
                panel.style.display = 'none';
            }
        }
    }

    // Редактор шаблонов
    function showTemplateEditor(templateId = null) {
        const template = templateId ? templates.find(t => t.id === templateId) : {
            id: 'template-' + Date.now(),
            name: '',
            category: 'Общее',
            text: '',
            variables: []
        };

        const editorHtml = `
            <div style="padding: 20px;">
                <h4 style="margin-bottom: 15px;">${templateId ? 'Редактирование' : 'Создание'} шаблона</h4>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Название *</label>
                    <input type="text" id="template-name" value="${template.name}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Категория</label>
                    <select id="template-category" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="Общее" ${template.category === 'Общее' ? 'selected' : ''}>Общее</option>
                        <option value="Аутрич" ${template.category === 'Аутрич' ? 'selected' : ''}>Аутрич</option>
                        <option value="Работа" ${template.category === 'Работа' ? 'selected' : ''}>Работа</option>
                        <option value="Финансы" ${template.category === 'Финансы' ? 'selected' : ''}>Финансы</option>
                    </select>
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Текст шаблона *</label>
                    <textarea id="template-text" 
                              style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" 
                              required>${template.text}</textarea>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        Используйте {{variable}} для переменных
                    </div>
                </div>

                <div id="variables-list" style="margin-bottom: 15px;">
                    <div style="font-weight: 500; margin-bottom: 8px;">Переменные</div>
                    ${template.variables.map((variable, index) => `
                        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                            <input type="text" placeholder="Ключ" value="${variable.key}" 
                                   style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <input type="text" placeholder="Описание" value="${variable.label}" 
                                   style="flex: 2; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <label style="display: flex; align-items: center; gap: 4px;">
                                <input type="checkbox" ${variable.required ? 'checked' : ''}> Обязательное
                            </label>
                            <button class="btn btn-secondary btn-sm remove-variable" style="padding: 4px 8px;">×</button>
                        </div>
                    `).join('')}
                </div>

                <button class="btn btn-secondary" id="add-variable" style="margin-bottom: 15px;">+ Добавить переменную</button>

                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" id="cancel-edit">Отмена</button>
                    <button class="btn" id="save-template">Сохранить</button>
                    ${templateId ? `<button class="btn btn-secondary" id="delete-template" style="margin-left: auto;">Удалить</button>` : ''}
                </div>
            </div>
        `;

        const modal = createModal(editorHtml, templateId ? 'Редактирование шаблона' : 'Новый шаблон');

        // Добавление переменной
        document.getElementById('add-variable').addEventListener('click', () => {
            const variablesList = document.getElementById('variables-list');
            const newVariableHtml = `
                <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                    <input type="text" placeholder="Ключ" 
                           style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                    <input type="text" placeholder="Описание" 
                           style="flex: 2; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                    <label style="display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox"> Обязательное
                    </label>
                    <button class="btn btn-secondary btn-sm remove-variable" style="padding: 4px 8px;">×</button>
                </div>
            `;
            variablesList.insertAdjacentHTML('beforeend', newVariableHtml);
            
            // Обработчик для новой кнопки удаления
            variablesList.querySelector('.remove-variable:last-child').addEventListener('click', function() {
                this.parentElement.remove();
            });
        });

        // Обработчики для существующих кнопок удаления
        document.querySelectorAll('.remove-variable').forEach(btn => {
            btn.addEventListener('click', function() {
                this.parentElement.remove();
            });
        });

        // Сохранение шаблона
        document.getElementById('save-template').addEventListener('click', () => {
            const name = document.getElementById('template-name').value.trim();
            const category = document.getElementById('template-category').value;
            const text = document.getElementById('template-text').value.trim();

            if (!name || !text) {
                alert('Пожалуйста, заполните обязательные поля');
                return;
            }

            // Сбор переменных
            const variables = [];
            document.querySelectorAll('#variables-list > div').forEach(variableDiv => {
                const inputs = variableDiv.querySelectorAll('input');
                const key = inputs[0].value.trim();
                const label = inputs[1].value.trim();
                const required = inputs[2].checked;

                if (key) {
                    variables.push({ key, label, required });
                }
            });

            const updatedTemplate = {
                ...template,
                name,
                category,
                text,
                variables
            };

            if (templateId) {
                // Обновление существующего шаблона
                const index = templates.findIndex(t => t.id === templateId);
                if (index !== -1) {
                    templates[index] = updatedTemplate;
                }
            } else {
                // Добавление нового шаблона
                templates.push(updatedTemplate);
            }

            saveTemplates();
            renderTemplatesList();
            modal.remove();
        });

        // Удаление шаблона
        if (templateId) {
            document.getElementById('delete-template').addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить этот шаблон?')) {
                    templates = templates.filter(t => t.id !== templateId);
                    saveTemplates();
                    renderTemplatesList();
                    modal.remove();
                }
            });
        }

        document.getElementById('cancel-edit').addEventListener('click', () => {
            modal.remove();
        });
    }

    // Создание модального окна
    function createModal(content, title = '') {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 1002;
            min-width: 400px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
        `;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        // Затемнение фона
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1001;
        `;
        document.body.appendChild(overlay);

        // Закрытие по клику на overlay
        overlay.addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });

        return modal;
    }

    // Инициализация
    function init() {
        loadTemplates();
        renderTemplatesUI();

        // Добавляем кнопку для открытия панели шаблонов в чат
        const observer = new MutationObserver(() => {
            const msgInput = document.getElementById('msg-input');
            if (msgInput && !msgInput.querySelector('.templates-btn')) {
                const templatesBtn = document.createElement('button');
                templatesBtn.className = 'btn btn-secondary templates-btn';
                templatesBtn.innerHTML = '📋';
                templatesBtn.title = 'Шаблоны сообщений';
                templatesBtn.style.marginRight = '8px';
                
                templatesBtn.addEventListener('click', () => {
                    const panel = document.getElementById('templates-panel');
                    if (panel) {
                        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
                        renderTemplatesList();
                    }
                });

                msgInput.insertBefore(templatesBtn, msgInput.firstChild);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Публичный API
    window.MessageTemplates = {
        // Получить все шаблоны
        getAll: () => [...templates],
        
        // Получить шаблон по ID
        get: (templateId) => templates.find(t => t.id === templateId),
        
        // Создать/обновить шаблон
        save: (template) => {
            const index = templates.findIndex(t => t.id === template.id);
            if (index !== -1) {
                templates[index] = template;
            } else {
                templates.push(template);
            }
            saveTemplates();
        },
        
        // Удалить шаблон
        delete: (templateId) => {
            templates = templates.filter(t => t.id !== templateId);
            saveTemplates();
        },
        
        // Рендер шаблона с переменными
        render: (templateId, variables = {}) => {
            const template = templates.find(t => t.id === templateId);
            if (!template) return '';
            
            return template.text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return variables[key] || match;
            });
        },
        
        // Открыть панель шаблонов
        openPanel: () => {
            const panel = document.getElementById('templates-panel');
            if (panel) {
                panel.style.display = 'flex';
                renderTemplatesList();
            }
        },
        
        // Закрыть панель шаблонов
        closePanel: () => {
            const panel = document.getElementById('templates-panel');
            if (panel) {
                panel.style.display = 'none';
            }
        }
    };

    // Автоматическая инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();