document.addEventListener('DOMContentLoaded', function() {
    // Обмежуємо ширину всіх селектів
    console.log("Custom JS loaded: Adjusting select widths");
    
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.style.maxWidth = '300px';
    });
});