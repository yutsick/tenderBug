function generatePermits(userId) {
    const btn = document.getElementById(`generateBtn_${userId}`);
    const result = document.getElementById(`generateResult_${userId}`);
    
    // Блокуємо кнопку
    btn.disabled = true;
    btn.innerHTML = '⏳ Генеруємо...';
    result.innerHTML = '';
    
    // AJAX запит
    fetch(`/admin/users/tenderuser/${userId}/generate-permits-ajax/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            result.innerHTML = `
                <div style="background: #f6ffed; padding: 10px; border-radius: 4px; border: 1px solid #52c41a;">
                    <strong style="color: #52c41a;">✅ ${data.message}</strong><br>
                    <small>Видалено: ${data.deleted}, створено: ${data.created}</small><br>
                    <button onclick="location.reload()" style="margin-top: 8px; background: #1890ff; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;">
                        🔄 Оновити сторінку
                    </button>
                </div>
            `;
        } else {
            result.innerHTML = `
                <div style="background: #fff2f0; padding: 10px; border-radius: 4px; border: 1px solid #ff4d4f;">
                    <strong style="color: #ff4d4f;">❌ Помилка:</strong><br>
                    ${data.error}
                </div>
            `;
        }
    })
    .catch(error => {
        result.innerHTML = `
            <div style="background: #fff2f0; padding: 10px; border-radius: 4px; border: 1px solid #ff4d4f;">
                <strong style="color: #ff4d4f;">❌ Помилка мережі:</strong><br>
                ${error.message}
            </div>
        `;
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '⚡ Згенерувати перепустки';
    });
}

function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}