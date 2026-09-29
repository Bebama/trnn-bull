# TRNN BULL CrossFit

App del box con la **misma arquitectura** que COSTES (`webcostes` + `restcostes`):

| COSTES | Este proyecto | Rol |
|--------|---------------|-----|
| `webcostes/` | `webforja/` | Front Angular 16 |
| `restcostes/` | `restforja/` | API Express 4 |

Datos en **JSON** bajo `restforja/data` (sin Oracle/MySQL).

## Arranque

```bash
cd restforja && npm install && npm start
cd webforja && npm install && npm start
```

- REST: `http://127.0.0.1:4032/`
- App: `http://127.0.0.1:4200/#/login`

## Semilla local

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `superusuario` | `super123` | superusuario |
| `entrenador` | `coach123` | entrenador |

Se crean al arrancar el REST si no existe `restforja/data/users.json`.
