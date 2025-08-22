// 🚀 Сучасний табовий інтерфейс для Django admin (Vanilla JS)
document.addEventListener('DOMContentLoaded', function() {
    const inlineGroups = document.querySelectorAll('.inline-group');
    
    if (inlineGroups.length > 1) {
        createTabInterface(inlineGroups);
    }
});

function createTabInterface(inlineGroups) {
    // Створюємо контейнер для табів
    const tabsContainer = createElement('div', 'admin-tabs-container');
    const tabsNav = createElement('div', 'admin-tabs-nav');
    const tabsContent = createElement('div', 'admin-tabs-content');
    
    // Додаємо таби перед першою inline секцією
    inlineGroups[0].parentNode.insertBefore(tabsContainer, inlineGroups[0]);
    tabsContainer.appendChild(tabsNav);
    tabsContainer.appendChild(tabsContent);
    
    // Створюємо таби для кожної inline секції
    inlineGroups.forEach((group, index) => {
        const tabTitle = group.querySelector('h2')?.textContent.trim() || `Таб ${index + 1}`;
        const tabId = `tab-${index}`;
        
        // Іконка для табу
        const tabIcon = getTabIcon(tabTitle);
        
        // Створюємо кнопку табу
        const tabButton = createElement('button', 'admin-tab-button');
        tabButton.type = 'button';
        tabButton.dataset.tab = tabId;
        tabButton.innerHTML = `
            <span class="tab-icon">${tabIcon}</span>
            <span class="tab-title">${tabTitle}</span>
        `;
        
        // Обгортаємо inline секцію в таб
        const tabPane = createElement('div', 'admin-tab-pane');
        tabPane.id = tabId;
        tabPane.appendChild(group);
        
        // Додаємо до контейнерів
        tabsNav.appendChild(tabButton);
        tabsContent.appendChild(tabPane);
    });
    
    // Робимо перший таб активним
    const firstButton = tabsNav.querySelector('.admin-tab-button');
    const firstPane = tabsContent.querySelector('.admin-tab-pane');
    
    if (firstButton && firstPane) {
        firstButton.classList.add('active');
        firstPane.classList.add('active');
    }
    
    // Обробляємо кліки по табах
    tabsNav.addEventListener('click', (e) => {
        const button = e.target.closest('.admin-tab-button');
        if (!button) return;
        
        e.preventDefault();
        switchTab(button.dataset.tab, tabsNav, tabsContent);
    });
    
    // Додаємо лічильники даних
    addDataCounters(tabsNav, tabsContent);
    
    // Відслідковуємо зміни в формах
    setupFormWatchers(tabsNav, tabsContent);
}

function switchTab(targetTabId, tabsNav, tabsContent) {
    // Прибираємо активний стан з усіх табів
    tabsNav.querySelectorAll('.admin-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    tabsContent.querySelectorAll('.admin-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Додаємо активний стан до поточного табу
    const activeButton = tabsNav.querySelector(`[data-tab="${targetTabId}"]`);
    const activePane = tabsContent.querySelector(`#${targetTabId}`);
    
    if (activeButton && activePane) {
        activeButton.classList.add('active');
        activePane.classList.add('active');
    }
}

function getTabIcon(title) {
    const titleLower = title.toLowerCase();
    
    const iconMap = {
        'специфікац': '📋',
        'робіт': '📋',
        'співробітник': '👥', 
        'працівник': '👥',
        'наказ': '📋',
        'order': '📋',
        'техніка': '🚜',
        'technic': '🚜',
        'інструмент': '🔧',
        'instrument': '🔧',
        'зіз': '🛡️',
        'ppe': '🛡️',
        'захист': '🛡️'
    };
    
    for (const [keyword, icon] of Object.entries(iconMap)) {
        if (titleLower.includes(keyword)) {
            return icon;
        }
    }
    
    return '📄';
}

function addDataCounters(tabsNav, tabsContent) {
    const buttons = tabsNav.querySelectorAll('.admin-tab-button');
    
    buttons.forEach((button) => {
        const tabId = button.dataset.tab;
        const tabPane = tabsContent.querySelector(`#${tabId}`);
        
        if (!tabPane) return;
        
        let recordsCount = 0;
        
        // Для табличних inline
        const tableRows = tabPane.querySelectorAll('.tabular tbody tr:not(.add-row, .empty-form)');
        if (tableRows.length > 0) {
            // Виключаємо порожні рядки
            recordsCount = Array.from(tableRows).filter(row => {
                const inputs = row.querySelectorAll('input[type="text"], textarea, select');
                return Array.from(inputs).some(input => input.value && input.value.trim() !== '');
            }).length;
        }
        
        // Для stacked inline
        const stackedInputs = tabPane.querySelectorAll('.stacked .form-row input, .stacked .form-row textarea');
        const filledStackedInputs = Array.from(stackedInputs).filter(input => 
            input.value && input.value.trim() !== ''
        );
        
        if (filledStackedInputs.length > 0) {
            recordsCount = Math.max(recordsCount, 1);
        }
        
        // Видаляємо старий лічильник
        const oldCounter = button.querySelector('.tab-counter');
        if (oldCounter) {
            oldCounter.remove();
        }
        
        // Оновлюємо класи
        button.classList.remove('has-data', 'no-data');
        
        // Додаємо лічильник та класи
        if (recordsCount > 0) {
            const counterBadge = createElement('span', 'tab-counter');
            counterBadge.textContent = recordsCount;
            button.appendChild(counterBadge);
            button.classList.add('has-data');
        } else {
            button.classList.add('no-data');
        }
    });
}

function setupFormWatchers(tabsNav, tabsContent) {
    // Відслідковуємо зміни в формах
    const forms = document.querySelectorAll('.inline-group');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            ['change', 'input', 'keyup'].forEach(event => {
                input.addEventListener(event, debounce(() => {
                    addDataCounters(tabsNav, tabsContent);
                }, 300));
            });
        });
    });
    
    // Відслідковуємо додавання/видалення рядків
    const observer = new MutationObserver(debounce(() => {
        addDataCounters(tabsNav, tabsContent);
    }, 300));
    
    forms.forEach(form => {
        observer.observe(form, { 
            childList: true, 
            subtree: true 
        });
    });
}

// Утилітарні функції
function createElement(tag, className = '') {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    return element;
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

// Експорт для використання в інших скриптах (опціонально)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createTabInterface, addDataCounters };
}