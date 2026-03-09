// js/admin.js
import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- ЕЛЕМЕНТИ UI ---
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const toast = document.getElementById('toast');

// --- АВТОРИЗАЦІЯ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'block';
        loadSettings(); // Завантажуємо лінки
        loadLessons();  // Завантажуємо уроки
    } else {
        loginScreen.style.display = 'flex';
        dashboard.style.display = 'none';
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    const loginBtn = document.getElementById('login-btn');

    errorMsg.style.display = 'none';
    loginBtn.textContent = 'Зачекайте...';

    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            errorMsg.style.display = 'block';
            errorMsg.textContent = 'Невірний email або пароль.';
        })
        .finally(() => { loginBtn.textContent = 'Увійти'; });
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// --- ФУНКЦІЯ СПОВІЩЕНЬ ---
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- 1. КЕРУВАННЯ ПОСИЛАННЯМИ (ТАРИФИ) ---
const linkBasicInput = document.getElementById('link-basic');
const linkPremiumInput = document.getElementById('link-premium');
const saveLinksBtn = document.getElementById('save-links-btn');

// Завантаження лінків з бази
async function loadSettings() {
    try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            linkBasicInput.value = docSnap.data().basic_url || '';
            linkPremiumInput.value = docSnap.data().premium_url || '';
        }
    } catch (e) { console.error("Помилка завантаження налаштувань:", e); }
}

// Збереження лінків у базу
saveLinksBtn.addEventListener('click', async () => {
    saveLinksBtn.textContent = 'Зберігаємо...';
    try {
        await setDoc(doc(db, "settings", "pricing"), {
            basic_url: linkBasicInput.value,
            premium_url: linkPremiumInput.value
        });
        showToast('Посилання успішно збережено!');
    } catch (e) {
        console.error(e);
        alert("Сталася помилка при збереженні.");
    }
    saveLinksBtn.textContent = 'Зберегти посилання';
});


// --- 2. КОНСТРУКТОР ПРОГРАМИ (УРОКИ) ---
const lessonsList = document.getElementById('lessons-list');
const modal = document.getElementById('lesson-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const openAddModalBtn = document.getElementById('open-add-modal-btn');
const saveLessonBtn = document.getElementById('save-lesson-btn');

// Інпути модалки
const idInput = document.getElementById('lesson-id');
const orderInput = document.getElementById('lesson-order');
const modTagInput = document.getElementById('lesson-module-tag');
const modTitleInput = document.getElementById('lesson-module-title');
const titleInput = document.getElementById('lesson-title');
const descInput = document.getElementById('lesson-desc');

// Відкрити модалку для ДОДАВАННЯ
openAddModalBtn.addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Додати новий урок';
    idInput.value = ''; // Очищаємо ID (це означає, що створюємо новий)
    orderInput.value = '';
    modTagInput.value = '';
    modTitleInput.value = '';
    titleInput.value = '';
    descInput.value = '';
    modal.style.display = 'flex';
});

// Закрити модалку
closeModalBtn.addEventListener('click', () => { modal.style.display = 'none'; });

// Завантаження уроків
async function loadLessons() {
    lessonsList.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Завантаження уроків...</p>';
    try {
        // Запитуємо уроки, відсортовані за порядковим номером
        const q = query(collection(db, "lessons"), orderBy("order", "asc"));
        const querySnapshot = await getDocs(q);
        
        lessonsList.innerHTML = ''; // Очищаємо контейнер
        
        if (querySnapshot.empty) {
            lessonsList.innerHTML = '<p style="text-align: center;">Уроків поки немає. Додайте перший!</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            // Створюємо картку уроку в HTML
            const lessonItem = document.createElement('div');
            lessonItem.className = 'lesson-item';
            lessonItem.innerHTML = `
                <div class="lesson-info">
                    <span style="color: #b2ff05; font-size: 0.8rem; font-weight: bold;">[Порядок: ${data.order}] ${data.module_tag}</span>
                    <h4>${data.title}</h4>
                    <p>${data.module_title}</p>
                </div>
                <div class="lesson-actions">
                    <button class="btn btn-edit edit-btn" data-id="${id}">✎ Редагувати</button>
                    <button class="btn btn-danger delete-btn" data-id="${id}">🗑 Видалити</button>
                </div>
            `;
            lessonsList.appendChild(lessonItem);
        });

        // Додаємо слухачі на нові кнопки "Редагувати" та "Видалити"
        attachLessonButtonsEvents();

    } catch (e) {
        console.error(e);
        lessonsList.innerHTML = '<p style="color: red;">Помилка завантаження уроків з бази.</p>';
    }
}

// Збереження уроку (Додавання або Оновлення)
saveLessonBtn.addEventListener('click', async () => {
    // Валідація
    if(!orderInput.value || !titleInput.value) {
        alert("Заповніть обов'язкові поля!");
        return;
    }

    saveLessonBtn.textContent = 'Зберігаємо...';
    const lessonData = {
        order: Number(orderInput.value),
        module_tag: modTagInput.value,
        module_title: modTitleInput.value,
        title: titleInput.value,
        description: descInput.value
    };

    try {
        if (idInput.value) {
            // Якщо є ID - оновлюємо існуючий
            await updateDoc(doc(db, "lessons", idInput.value), lessonData);
            showToast('Урок оновлено!');
        } else {
            // Якщо немає ID - створюємо новий
            await addDoc(collection(db, "lessons"), lessonData);
            showToast('Урок додано!');
        }
        modal.style.display = 'none';
        loadLessons(); // Перезавантажуємо список
    } catch (e) {
        console.error(e);
        alert("Помилка збереження уроку.");
    }
    saveLessonBtn.textContent = 'Зберегти урок';
});

// Функція для кнопок редагування та видалення
function attachLessonButtonsEvents() {
    // ВИДАЛЕННЯ
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("Ви точно хочете видалити цей урок? Дію неможливо скасувати.")) {
                e.target.textContent = '...';
                await deleteDoc(doc(db, "lessons", id));
                showToast('Урок видалено!');
                loadLessons();
            }
        });
    });

    // РЕДАГУВАННЯ
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            btn.textContent = '...';
            
            // Завантажуємо дані конкретного уроку
            const docSnap = await getDoc(doc(db, "lessons", id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById('modal-title').textContent = 'Редагувати урок';
                idInput.value = id;
                orderInput.value = data.order;
                modTagInput.value = data.module_tag;
                modTitleInput.value = data.module_title;
                titleInput.value = data.title;
                descInput.value = data.description;
                
                modal.style.display = 'flex';
            }
            btn.textContent = '✎ Редагувати';
        });
    });

    // === ТИМЧАСОВИЙ КОД ДЛЯ АВТОЗАВАНТАЖЕННЯ ===
const initialLessons = [
    { order: 1, module_tag: "MOD 1", module_title: "Фундамент та логіка роботи з ШІ", title: "Урок 1. Стратегія особистого бренду та бізнесу в 2026", description: "<ul class='lesson-list'><li>Позиціонування експерта</li><li>Визначення ніші</li><li>Архітектура особистого бренду</li><li>Контент як система продажу</li><li>Як будувати довіру</li><li style='color:var(--bg-color); font-weight:600;'><i>Практика: створення власної SMM-стратегії</i></li></ul>" },
    { order: 2, module_tag: "MOD 1", module_title: "Фундамент та логіка роботи з ШІ", title: "Урок 2. Мистецтво промтингу", description: "Технологія написання професійних запитів та алгоритми взаємодії з ШІ для отримання ідеального результату з першої спроби." },
    { order: 3, module_tag: "MOD 1", module_title: "Фундамент та логіка роботи з ШІ", title: "Урок 3. Огляд інструментів для бізнесу", description: "ChatGPT vs Claude vs Perplexity vs Copilot. Обираємо найкращий інструмент під конкретні SMM-задачі." },
    { order: 4, module_tag: "MOD 1", module_title: "Фундамент та логіка роботи з ШІ", title: "Урок 4. База промптів для маркетолога", description: "Отримання готового набору з 100+ перевірених промптів для щоденної роботи." },
    
    { order: 5, module_tag: "MOD 2", module_title: "Стратегія та глибока аналітика", title: "Урок 4(b). Як СММ спеціалісту працювати з:", description: "Глибокою сегментацією. Біль, тригери, страхи. JTBD." },
    { order: 6, module_tag: "MOD 2", module_title: "Стратегія та глибока аналітика", title: "Урок 5. Як сформувати сильне УТП", description: "Види контенту: прогрів, експертність, продаж. Контент-матриця. Сценарії прогрівів. Сторіс-структури.<br><br><i style='color:var(--bg-color); font-weight:600;'>Практика: створення воронки під свій продукт.</i>" },
    { order: 7, module_tag: "MOD 2", module_title: "Стратегія та глибока аналітика", title: "Урок 6. Аналіз цільової аудиторії", description: "Використання ШІ для глибокої сегментації та вивчення реальних болів і тригерів вашої ЦА." },
    { order: 8, module_tag: "MOD 2", module_title: "Стратегія та глибока аналітика", title: "Урок 7. Контент-план та лід-магніт у таблицях", description: "Створення автоматизованої бази, яка генерує ідеї та воронки на місяці вперед." },
    
    { order: 9, module_tag: "MOD 3", module_title: "Текстовий контент та копірайтинг", title: "Урок 8. Як адаптувати текст під живий стиль", description: "Як зробити контент “не AI, а з душею”. Структура відео, які продають." },
    { order: 10, module_tag: "MOD 3", module_title: "Текстовий контент та копірайтинг", title: "Урок 9. AI у написанні текстів", description: "Базові принципи створення якісного копірайтингу, що чіпляє та не виглядає як 'роботизований'." },
    { order: 11, module_tag: "MOD 3", module_title: "Текстовий контент та копірайтинг", title: "Урок 10. Автоматизоване переписування постів", description: "Як за хвилини адаптувати один і той самий контент під різні платформи (Instagram, Telegram, LinkedIn)." },
    
    { order: 12, module_tag: "MOD 4", module_title: "Visual & Video Production", title: "Урок 11. Як створити систему", description: "Модель 3-3-3. Баланс прогрів/експертність/продаж." },
    { order: 13, module_tag: "MOD 4", module_title: "Visual & Video Production", title: "Урок 12. Адаптація текстів", description: "Як адаптувати текст під живий стиль. Як зробити контент “не AI, а з душею”. Структура відео, які продають." },
    { order: 14, module_tag: "MOD 4", module_title: "Visual & Video Production", title: "Урок 13. Огляд Midjourney", description: "Глибоке занурення в генерацію унікального візуального контенту та рекламних креативів професійного рівня." },
    { order: 15, module_tag: "MOD 4", module_title: "Visual & Video Production", title: "Урок 14. AI-Аватари та клонування голосу", description: "Створення цифрових персонажів (Heygen) та синтез голосу для Reels без залучення дикторів." },
    { order: 16, module_tag: "MOD 4", module_title: "Visual & Video Production", title: "Урок 15. Створення відео з ШІ (Kling & Runway)", description: "Практичний воркшоп зі збірки реалістичних роликів та анімацій, що привертають увагу." },
    
    { order: 17, module_tag: "MOD 5", module_title: "Автоматизація та масштабування", title: "Урок 16. Автоматизація Instagram (Direct & Comments)", description: "Налаштування системи автоматичних привітань та відповідей на коментарі для підвищення охоплень та лояльності підписників." }
];

const autoBtn = document.getElementById('auto-upload-btn');
if (autoBtn) {
    
    autoBtn.addEventListener('click', async () => {
        if(!confirm('Завантажити всі 17 уроків у базу?')) return;
        
        autoBtn.innerHTML = '⏳ Завантаження... (не закривай сторінку)';
        autoBtn.style.background = '#f39c12';
        
        try {
            for (let lesson of initialLessons) {
                await addDoc(collection(db, "lessons"), lesson);
            }
            autoBtn.innerHTML = '✅ ГОТОВО! Уроки в базі. Тепер видали код і кнопку.';
            autoBtn.style.background = '#27ae60';
            loadLessons(); // Оновлюємо список
        } catch (e) {
            console.error(e);
            autoBtn.innerHTML = '❌ Помилка завантаження';
            autoBtn.style.background = '#e74c3c';
        }
    });
}
// ==========================================================
}