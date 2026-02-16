# Тестування на iPhone (локально)

## Підготовка (одноразово)

1. **iPhone**: Налаштування → Apps → Safari → Додатково → увімкнути **Web Inspector**
2. **Mac Safari**: Safari → Settings → Advanced → увімкнути **"Show features for web developers"**
3. **`.env`**: `NEXT_PUBLIC_API_URL=http://192.168.1.109:3000`
4. **`next.config.ts`**: має містити `allowedDevOrigins: ["192.168.1.109"]`
5. Бекенд має слухати на `0.0.0.0` (а не тільки localhost)

## Запуск

```bash
# 1. Запустити бекенд (має бути доступний на 192.168.1.109:3000)

# 2. Запустити фронтенд (dev mode працює завдяки allowedDevOrigins)
pnpm dev --hostname 0.0.0.0
```

## На iPhone

1. Підключити iPhone до Mac через **USB**
2. Відкрити `http://192.168.1.109:4000` в Safari або Chrome

## Логін (перенос токенів)

Google OAuth не працює через IP — потрібно перенести токени з десктопу.
Токени потрібно ставити **окремо для кожного браузера** (Safari і Chrome мають різний localStorage).

### Крок 1: Отримати токени (Mac Chrome, localhost:4000)

```js
console.log(
  JSON.stringify({
    a: localStorage.getItem("access_token"),
    r: localStorage.getItem("refresh_token"),
  }),
);
```

### Крок 2: Встановити токени на iPhone

#### Safari (через Web Inspector)

1. Mac Safari → меню **Develop** → вибрати iPhone → вибрати сторінку
2. В консолі Web Inspector вставити:

```js
localStorage.setItem("access_token", "ACCESS_TOKEN_СЮДИ");
localStorage.setItem("refresh_token", "REFRESH_TOKEN_СЮДИ");
location.reload();
```

#### Chrome (через адресний рядок)

1. Відкрити `http://192.168.1.109:4000` в Chrome на iPhone
2. В адресний рядок вставити (одним рядком):

```
javascript:localStorage.setItem('access_token','ACCESS_TOKEN_СЮДИ');localStorage.setItem('refresh_token','REFRESH_TOKEN_СЮДИ');location.reload()
```

> **Увага**: iOS Chrome видаляє `javascript:` при вставці — потрібно дописати вручну перед вставленим текстом.

## Примітки

- iPhone і Mac мають бути в **одній Wi-Fi мережі**
- IP `192.168.1.109` може змінитись при перепідключенні до Wi-Fi
- Перевірити поточний IP: `ipconfig getifaddr en0` в терміналі
- Токени мають термін дії — якщо expired, повторити процедуру
- Після зміни `.env` потрібно перезапустити dev-сервер
- Не забудьте повернути `.env` на `http://localhost:3000` після тестування
