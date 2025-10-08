document.addEventListener('DOMContentLoaded', function() {
    // Обмежуємо ширину всіх селектів
    console.log("Custom JS loaded: Adjusting select widths");

    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.style.maxWidth = '300px';
    });
});

// Функція копіювання лінку активації в буфер обміну
function copyActivationLink(link) {
    // Створюємо тимчасове текстове поле
    const tempInput = document.createElement('textarea');
    tempInput.value = link;
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);

    // Виділяємо і копіюємо текст
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // Для мобільних пристроїв

    try {
        // Спроба використати сучасний API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link).then(function() {
                showCopyMessage('Лінк скопійовано в буфер обміну! ✅');
            }).catch(function(err) {
                // Fallback на старий метод
                document.execCommand('copy');
                showCopyMessage('Лінк скопійовано! ✅');
            });
        } else {
            // Використовуємо старий метод для HTTP або старих браузерів
            document.execCommand('copy');
            showCopyMessage('Лінк скопійовано! ✅');
        }
    } catch (err) {
        console.error('Помилка копіювання:', err);
        showCopyMessage('Помилка копіювання. Скопіюйте текст вручну.', 'error');
    } finally {
        // Видаляємо тимчасове поле
        document.body.removeChild(tempInput);
    }
}

// Показуємо повідомлення про копіювання
function showCopyMessage(message, type = 'success') {
    // Створюємо елемент повідомлення
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#52c41a' : '#ff4d4f'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;

    // Додаємо стилі для анімації
    if (!document.getElementById('copy-message-styles')) {
        const style = document.createElement('style');
        style.id = 'copy-message-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(messageDiv);

    // Автоматично видаляємо через 3 секунди
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}