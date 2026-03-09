document.addEventListener('DOMContentLoaded', () => {
    const headers = document.querySelectorAll('.accordion-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const container = item.parentElement;
            
            // Закриваємо всі інші акордеони в цьому ж контейнері
            container.querySelectorAll('.accordion-item').forEach(i => {
                if (i !== item) {
                    i.classList.remove('active');
                    i.querySelector('.accordion-body').style.maxHeight = null;
                }
            });
            
            // Відкриваємо/закриваємо поточний
            item.classList.toggle('active');
            const body = header.nextElementSibling;
            if (body.style.maxHeight) {
                body.style.maxHeight = null;
            } else {
                body.style.maxHeight = body.scrollHeight + "px";
            }
        });
    });
});