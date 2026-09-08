# art.gorelikov.ae

Арт-сайт на том же Beget, что и Расписалка. **Отдельный nginx-vhost, отдельный каталог, отдельная ветка.** Пуш в `main` Расписалки этот сайт не выкладывает.

| Что | Расписалка | Арт |
|---|---|---|
| Домен | gorelikov.ae | art.gorelikov.ae |
| Ветка | `main` | `artgorelikov` |
| Код на сервере | `/opt/gorelikov.ae` | `/opt/art.gorelikov.ae` |
| Веб-корень | `/var/www/gorelikov.ae` | `/var/www/art.gorelikov.ae` |
| nginx | `sites-available/gorelikov.ae` | `sites-available/art.gorelikov.ae` |
| Сертификат | `live/gorelikov.ae` | `live/art.gorelikov.ae` |
| Автодеплой | таймер `raspisalka-deploy` (только `main`) | GitHub Actions на ветке `artgorelikov` |

**Не мержить `artgorelikov` в `main`.**

## DNS

A `art` → `159.194.227.211` (уже стоит).

## Первый раз на Beget

```bash
ssh root@159.194.227.211
# клон только этой ветки в отдельную папку
git clone --branch artgorelikov --single-branch \
  https://github.com/aalretneam/gorelikov.ae.git /opt/art.gorelikov.ae
cd /opt/art.gorelikov.ae
npm ci
npm run build
bash deploy/install.sh
bash deploy/setup-ssl.sh
```

После этого пуш в `artgorelikov` сам выкладывает через workflow **Deploy art.gorelikov.ae** (нужен тот же секрет `VPS_SSH_KEY`, что у Расписалки).
