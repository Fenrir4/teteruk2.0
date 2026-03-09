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
// Ініціалізація візуального редактора Quill
const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'bullet' }] // Кнопка маркованого списку
        ]
    },
    placeholder: 'Опис уроку...'
});

// Відкрити модалку для ДОДАВАННЯ
openAddModalBtn.addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Додати новий урок';
    idInput.value = ''; // Очищаємо ID (це означає, що створюємо новий)
    orderInput.value = '';
    modTagInput.value = '';
    modTitleInput.value = '';
    titleInput.value = '';
    quill.root.innerHTML = '';
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
        description: quill.root.innerHTML
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
                quill.clipboard.dangerouslyPasteHTML(data.description || '');
                
                modal.style.display = 'flex';
            }
            btn.textContent = '✎ Редагувати';
        });
    });
}