# План доведения JoinApp до production MVP

## Цель

Довести JoinApp до MVP production-приложения для iPhone и Android.

Web/Vite-прототип остается рабочим источником UX и тестовой площадкой. Production mobile app строится отдельно в `apps/mobile` и использует уже подготовленную Supabase-базу.

## Базовые решения

- Mobile: Expo SDK 56, React Native, TypeScript.
- Backend: Supabase, PostgreSQL, PostGIS, Auth, Storage, Realtime, RPC.
- API boundary: `@join/api`.
- Domain contracts: `@join/core`.
- DB types: `@join/db`.
- Package manager: `pnpm`.

## Что уже есть

- Supabase migrations для schema, RLS, Storage, Realtime, discovery, notifications и core RPC.
- Smoke-проверка Supabase.
- Vite-прототип с `local` и `supabase` data source.
- Начальный Expo app shell в `apps/mobile`.
- Документация в `docs/ARCHITECTURE.md`, `docs/SUPABASE.md`, `docs/MVP_ROADMAP.md`.

## Этап 1. Mobile foundation

Цель: мобильное приложение запускается, типизируется и не ломает web-прототип.

Сделать:

- проверить `apps/mobile` через Expo CLI;
- добавить нормальную структуру `src`: app, screens, components, services;
- подключить shared packages;
- настроить env чтение для `EXPO_PUBLIC_SUPABASE_URL` и `EXPO_PUBLIC_SUPABASE_ANON_KEY`;
- добавить базовый UI shell;
- решить навигацию: Expo Router или React Navigation.

Готово, когда:

- `pnpm mobile:typecheck` проходит;
- Expo dev server стартует;
- app shell показывает корректное состояние без runtime errors.

## Этап 2. Auth и bootstrap

Цель: пользователь может войти, зарегистрироваться, создать профиль и пройти onboarding.

Сделать:

- Supabase client для React Native;
- persistence с безопасным mobile storage;
- auth screen: sign up, sign in, sign out;
- bootstrap status:
  - нет session: auth;
  - есть session, нет profile: registration;
  - есть profile, onboarding не завершен: onboarding;
  - onboarding завершен: main tabs;
- profile create/update;
- settings read/update.

Готово, когда:

- новый пользователь проходит полный путь;
- session переживает restart приложения;
- profile row привязан к auth user id;
- web-прототип продолжает работать.

## Этап 3. Events MVP

Цель: основной event flow работает на мобильном.

Сделать:

- feed через `nearby_events`;
- серверные фильтры discovery;
- event details;
- create event;
- edit event;
- join/leave;
- request approval;
- approve/reject requests;
- attendee list с учетом privacy;
- realtime refresh для event activity.

Готово, когда:

- два пользователя могут создать событие, подать заявку, принять заявку и попасть в event chat;
- counters и statuses обновляются корректно;
- RLS не дает менять чужие события.

## Этап 4. Chats MVP

Цель: direct chats и event chats работают в мобильном приложении.

Сделать:

- chats list;
- direct conversation create/open;
- event chat open;
- messages list;
- send text message;
- send image attachment;
- signed URL для private attachments;
- mark conversation read;
- realtime refresh.

Готово, когда:

- два пользователя обмениваются direct messages;
- участник события пишет в event chat;
- unread/read состояние обновляется;
- private attachment не доступен неучастнику.

## Этап 5. Notifications MVP

Цель: in-app notifications работают, push-token контракт готов.

Сделать:

- notification bell;
- notification screen;
- unread count;
- mark one/all read;
- register/unregister push token для iOS/Android;
- подготовить будущий worker/edge function для внешней доставки.

Готово, когда:

- organizer получает notification о заявке;
- attendee получает notification об approve/reject;
- unread count обновляется;
- token registration RPC работает из mobile.

## Этап 6. Media и UX hardening

Цель: приложение выглядит и ведет себя как MVP, а не как тестовый shell.

Сделать:

- avatar upload;
- event cover upload;
- chat image upload;
- loading states;
- error states;
- empty states;
- offline/network error handling;
- базовая адаптация под iPhone/Android safe areas;
- проверка длинных текстов и русских строк.

Готово, когда:

- основные экраны не ломаются на маленьких экранах;
- ошибки API показываются понятно;
- загрузки не блокируют приложение без обратной связи.

## Этап 7. Release readiness

Цель: подготовить TestFlight и Play Internal Testing.

Сделать:

- EAS config;
- bundle identifiers;
- app icons и splash;
- staging/prod env handling;
- privacy strings;
- basic crash/error monitoring;
- release checklist;
- ручной QA checklist для двух аккаунтов;
- platform builds.

Готово, когда:

- iOS build собирается через EAS;
- Android build собирается через EAS;
- smoke Supabase проходит;
- критические сценарии пройдены на двух аккаунтах;
- известные ограничения записаны перед тестовой публикацией.

## Базовые проверки

Запускать по смыслу изменения:

```sh
pnpm typecheck
pnpm mobile:typecheck
pnpm smoke:supabase
pnpm --filter @join/mobile exec expo install --check
```

## Рабочий порядок

1. Сначала читать текущий код и документацию.
2. Делать небольшие законченные изменения.
3. После каждого этапа запускать проверки.
4. Не смешивать backend migrations, mobile UI и git cleanup в один неконтролируемый коммит.
5. В финальном ответе кратко писать, что изменено и чем проверено.

