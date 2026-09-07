# Расписалка · gorelikov.ae

Конструктор красивого расписания для школы и универа. Статический сайт: лендинг + редактор.

- Код: `site/` (`index.html`, `css/app.css`, `js/app.js`)
- Прод: Beget **`159.194.227.211`** → https://gorelikov.ae/
- Vultr `208.76.221.48` — другой сервер, Расписалка там не крутится.
- Автодеплой: на Beget таймер раз в минуту тянет `main` (см. [DEPLOY.md](DEPLOY.md)). После мержа сайт сам обновляется.

Локально:

```bash
python3 -m http.server 8899 --directory site
```

Как залить: [DEPLOY.md](DEPLOY.md)
