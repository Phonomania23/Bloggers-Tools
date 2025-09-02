// js/include.js
// Подставляет HTML-фрагменты из /components/*.html в элементы с data-include
// - Поддержка относительных путей (страницы в подпапках)
// - Исполнение <script> внутри инклюдов
// - Событие includes:ready после завершения всех вставок

(async () => {
  const slots = Array.from(document.querySelectorAll("[data-include]"));
  if (!slots.length) return;

  // Помощник для абсолютного URL инклюда и его дочерних ресурсов
  const toAbs = (path, base) => {
    try {
      return new URL(path, base).href;
    } catch {
      try {
        return new URL(path, window.location.href).href;
      } catch {
        return path;
      }
    }
  };

  await Promise.all(
    slots.map(async (placeholder) => {
      const raw = placeholder.getAttribute("data-include") || "";
      const absUrl = toAbs(raw, window.location.href);

      try {
        const res = await fetch(absUrl, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // Разбираем HTML в контейнер, вырезаем <script>, чтобы исполнить их вручную
        const tmp = document.createElement("div");
        tmp.innerHTML = html;

        const scripts = Array.from(tmp.querySelectorAll("script"));
        scripts.forEach((s) => s.parentNode.removeChild(s));

        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);

        // Заменяем плейсхолдер контентом
        placeholder.replaceWith(frag);

        // Исполняем скрипты (сохраняем атрибуты; src резолвим относительно файла-инклюда)
        for (const s of scripts) {
          const exec = document.createElement("script");
          // переноc атрибутов
          for (const { name, value } of Array.from(s.attributes)) {
            if (name === "src") {
              exec.setAttribute("src", toAbs(value, absUrl));
            } else {
              exec.setAttribute(name, value);
            }
          }
          if (!s.src) {
            exec.textContent = s.textContent || "";
          }
          // Вставляем ближе к концу body, чтобы DOM уже был на месте
          document.body.appendChild(exec);
        }
      } catch (e) {
        console.error("Include failed:", absUrl, e);
      }
    })
  );

  // Полезно для инициализации после инклюдов (хедер/навигация и т.п.)
  document.dispatchEvent(new CustomEvent("includes:ready"));
})();
