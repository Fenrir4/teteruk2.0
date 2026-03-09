// js/app.js
import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. ЗАВАНТАЖЕННЯ УРОКІВ ТА ГЕНЕРАЦІЯ АКОРДЕОНУ ---
    const accordionContainer = document.getElementById('program-accordion');
    
    if (accordionContainer) {
        try {
            // Беремо уроки з бази, відсортовані за порядковим номером
            const q = query(collection(db, "lessons"), orderBy("order", "asc"));
            const querySnapshot = await getDocs(q);
            
            // Групуємо уроки по модулях
            const modules = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const modKey = data.module_tag + "|" + data.module_title;
                if (!modules[modKey]) {
                    modules[modKey] = [];
                }
                modules[modKey].push(data);
            });

            accordionContainer.innerHTML = ''; // Очищаємо текст "Завантаження..."

            // Малюємо HTML для кожного модуля
            for (const [modKey, lessons] of Object.entries(modules)) {
                const [tag, title] = modKey.split('|');
                
                let lessonsHtml = '';
                lessons.forEach(lesson => {
                    lessonsHtml += `
                        <div class="lesson-block">
                            <div class="lesson-title">${lesson.title}</div>
                            <div class="lesson-text">${lesson.description}</div>
                        </div>
                    `;
                });

                const moduleHtml = `
                    <div class="accordion-item">
                        <button class="accordion-header">
                            <div><span class="lesson-tag">${tag}</span> ${title}</div>
                            <span class="icon-plus">+</span>
                        </button>
                        <div class="accordion-body">
                            <div class="body-inner">
                                ${lessonsHtml}
                            </div>
                        </div>
                    </div>
                `;
                accordionContainer.innerHTML += moduleHtml;
            }

            // Активуємо анімацію натискання ТІЛЬКИ ПІСЛЯ того, як намалювали уроки
            attachAccordionEvents();

        } catch (error) {
            console.error("Помилка завантаження програми:", error);
            accordionContainer.innerHTML = '<p style="text-align:center; color:red;">Не вдалося завантажити програму. Оновіть сторінку.</p>';
        }
    }

    // --- 2. ЗАВАНТАЖЕННЯ ПОСИЛАНЬ НА ОПЛАТУ ---
    try {
        const pricingDoc = await getDoc(doc(db, "settings", "pricing"));
        if (pricingDoc.exists()) {
            const data = pricingDoc.data();
            
            const btnBasic = document.getElementById('btn-buy-basic');
            const btnPremium = document.getElementById('btn-buy-premium');
            
            // Підставляємо лінки з бази, якщо вони є
            if (btnBasic && data.basic_url) btnBasic.href = data.basic_url;
            if (btnPremium && data.premium_url) btnPremium.href = data.premium_url;
        }
    } catch(e) {
        console.error("Помилка завантаження лінків:", e);
    }
});

// Функція для роботи акордеону (та сама, що була в тебе)
function attachAccordionEvents() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const container = item.parentElement;
            
            container.querySelectorAll('.accordion-item').forEach(i => {
                if (i !== item) {
                    i.classList.remove('active');
                    i.querySelector('.accordion-body').style.maxHeight = null;
                }
            });
            
            item.classList.toggle('active');
            const body = header.nextElementSibling;
            if (body.style.maxHeight) {
                body.style.maxHeight = null;
            } else {
                body.style.maxHeight = body.scrollHeight + "px";
            }
        });
    });
}

// --- 3. АНІМАЦІЇ ПРИ СКРОЛІ  ---
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15 // Анімація спрацює, коли 15% блоку з'явиться на екрані
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Анімуємо лише один раз
        }
    });
}, observerOptions);

// Шукаємо всі елементи з класом fade-in і починаємо за ними стежити
document.querySelectorAll('.fade-in').forEach(element => {
    observer.observe(element);
});