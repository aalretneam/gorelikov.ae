# Деплой Расписалки на VPS через GitHub

Сайт статический. На сервер уходит содержимое `site/` в `/var/www/gorelikov.ae`.
Пуш в `main` сам выкладывает через GitHub Actions.

VPS тот же, что Palma / QuestQuest: **`208.76.221.48`**. Отдельный nginx-vhost, чужие сайты не трогаем.

## 1. DNS

У регистратора `gorelikov.ae`:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `@` | `208.76.221.48` |
| A | `www` | `208.76.221.48` |

Парковочные ANAME/CNAME на DonDominio — удалить, иначе корень будет скакать.

## 2. GitHub-репозиторий и секреты

Репозиторий: этот проект. Secrets (Settings → Secrets and variables → Actions):

| Secret | Значение |
|--------|----------|
| `VPS_HOST` | `208.76.221.48` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | приватный ключ деплоя (целиком, включая `BEGIN`/`END`) |

Публичную пару ключа добавь на VPS в `/root/.ssh/authorized_keys`.

С Mac, один раз:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gorelikov_deploy -N "" -C "gorelikov-github-actions"
ssh-copy-id -i ~/.ssh/gorelikov_deploy.pub root@208.76.221.48
# приватный ~/.ssh/gorelikov_deploy — в секрет VPS_SSH_KEY
```

## 3. Первый раз на VPS

Когда репозиторий уже на GitHub:

```bash
ssh root@208.76.221.48
git clone git@github.com:USER/gorelikov.ae.git /opt/gorelikov.ae
bash /opt/gorelikov.ae/deploy/install.sh
bash /opt/gorelikov.ae/deploy/setup-ssl.sh
```

`install.sh` копирует `site/` в `/var/www/gorelikov.ae` и включает nginx.
`setup-ssl.sh` выпускает Let's Encrypt (нужны верные A-записи и открытые 80/443).

## 4. Дальше

Пуш в `main` → workflow **Deploy to VPS** → rsync в `/opt/gorelikov.ae` → `install.sh`.

Проверка: https://gorelikov.ae/

## Перед продом — донат и Метрика

В `site/js/app.js`, объект `CONFIG`:

1. **Донат.** `donateUrl: ""` — CloudTips / Boosty / Tribute. Пока пусто — кнопка открывает почту `artem@gorelikov.ae`.
2. **Яндекс.Метрика.** Счётчик **112279782** стоит в `site/index.html`. Тег грузится только на `gorelikov.ae`.

Сайт сам шлёт цели:

| Цель | Когда |
|---|---|
| `editor_open` | открыли редактор |
| `download` | скачали PNG или скопировали в Telegram |
| `share` | поделились ссылкой |
| `schedule_created` | первое готовое расписание в сессии (скачать / копия / ссылка) |
| `donate_open` | открыли окно доната |

Включён webvisor, карта кликов и `trackHash` (переход на `#edit`). Сбор и hit-ы счётчиков только с `gorelikov.ae`, не с localhost.

Живые цифры на главной: заходы и «создано расписаний» (abacus). Второе растёт один раз за сессию, когда человек сохранил или отправил расписание.

## Локально

```bash
python3 -m http.server 8899 --directory site
```
