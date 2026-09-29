# Rest Forja — API TRNN BULL CrossFit

Misma tecnología que `restcostes` de COSTES: **Node.js + Express 4 + body-parser + cors** (CommonJS).

Datos en JSON bajo `data/` (sin Oracle). Auth con token en `Authorization: Bearer …` y sesiones en `data/sessions.json`.

## Arranque

```bash
cd restforja
npm install
npm start
```

Puerto: **4032**. Variable opcional: `PORT`.

## Usuarios semilla (local)

Si no existe `data/users.json`, al arrancar se crean:

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `superusuario` | `super123` | superusuario |
| `entrenador` | `coach123` | entrenador |

## Email de verificación

SMTP en `configs/configForja.js` (`smtp.host`, `port`, `user`, `pass`, `from`). Si está vacío, el código se guarda igual. Con `devShowCode: true` (por defecto) el registro devuelve `devCode` / `devHint` para pruebas locales.

## Rutas principales

- `POST /auth` · `POST /logout` · `POST /register` · `POST /verify-email`
- `GET/PUT /me`
- `GET /users/pending` · `POST /users/:id/approve` · `POST /users/:id/reject`
- `POST /coaches` (solo superusuario)
- `GET/POST /logros` · `DELETE /logros/:logroId`
- `GET/PUT /rm`
- `GET/PUT/DELETE /calendar` · `/calendar/:date`
- `GET /status`
