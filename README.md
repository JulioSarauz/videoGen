# genVideo

Monolito privado (Node.js + Express + React) para generar video a partir de una
imagen fija: subes la imagen, describes el movimiento en un prompt, y el
sistema la anima intentando preservar al maximo texto, logos y composicion
originales.

## Por que no esta en GitHub Pages

GitHub Pages solo sirve archivos estaticos y no puede ejecutar el backend que
guarda las credenciales de la API de video ni el login con contrasena
compartida. Por eso el proyecto se despliega completo (frontend + backend) en
un unico servicio Node.js (Render o Railway). GitHub queda como repositorio +
CI (`.github/workflows/deploy.yml` valida el build en cada push).

## Arquitectura

```
/server   Express + TypeScript. Sirve la API y, en produccion, el build del cliente.
/client   React + Vite. En dev corre aparte (proxy a /api); en build se copia dentro de server/dist/public.
```

- **Auth**: contrasena compartida (hash bcrypt) -> JWT en cookie httpOnly.
- **Proveedor de video**: Kling AI, detras de una interfaz (`server/src/services/videoProvider`)
  para poder cambiar de proveedor sin tocar rutas ni frontend.
- **Fidelidad de imagen**: el prompt del usuario se envuelve (`promptWrapper.ts`)
  para instruir explicitamente "no redibujes texto/logos, solo anima lo
  siguiente"; ademas se compara la portada devuelta por el proveedor contra la
  imagen original (`fidelityCheck.ts`) para avisar si el resultado se desvio
  demasiado del original.
- **Validacion de imagen**: rechaza imagenes por debajo de `MIN_LONG_EDGE_PX`
  (1080 por defecto) y no recomprime la imagen antes de enviarla al proveedor.

## Requisitos previos

- Node.js 20+
- Cuenta de desarrollador en Kling AI (Access Key + Secret Key)
- Cuenta en Render o Railway para el hosting

## Configuracion local

```bash
npm install

# Genera el hash de tu contrasena compartida
node server/scripts/hash-password.js "tu-password"

cp .env.example .env
# Completa .env con el hash generado y tus credenciales de Kling
```

Correr en dos terminales:

```bash
npm run dev:server   # http://localhost:3000
npm run dev:client   # http://localhost:5173 (proxy /api -> :3000)
```

## Build de produccion (monolito unico)

```bash
npm run build   # build:client -> build:server (copia dist del cliente dentro del server)
npm run start   # sirve todo desde un solo proceso Node en PORT
```

## Deploy

1. Sube el repo a GitHub (privado).
2. En Render/Railway, crea un servicio Node.js apuntando a este repo
   (Render puede usar `render.yaml` directamente).
3. Configura las variables de entorno marcadas como `sync: false` en
   `render.yaml` (o su equivalente en Railway): `AUTH_PASSWORD_HASH`,
   `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`.
4. Activa auto-deploy en push a `main`.

## Verificar antes de produccion

Los paths de la API de Kling (`KLING_IMAGE2VIDEO_PATH`,
`KLING_IMAGE2VIDEO_STATUS_PATH`) y el shape de la respuesta pueden cambiar.
Revisa la documentacion vigente en el panel de desarrollador de Kling antes
de usar esto con trafico real (ver comentarios en
`server/src/services/videoProvider/klingProvider.ts`).

## Limitaciones conocidas

- Los jobs en curso viven en memoria (`server/src/services/jobStore.ts`): si
  el proceso se reinicia, los jobs pendientes se pierden. Para multiples
  instancias o persistencia entre reinicios, reemplazar por Redis/SQLite.
- El chequeo de fidelidad es una heuristica (diferencia en escala de grises
  entre la imagen original y la portada del video generado), no una garantia
  absoluta de que el modelo no altero texto o detalles finos.



Repositorio en https://github.com/JulioSarauz/videoGen.git

el clasificador de seguridad).
2. Cuenta de desarrollador en Kling AI (Access Key/Secret Key) y verificar los paths exactos de su API contra su documentación vigente — los dejé como variables de entorno configurables en server/src/services/videoProvider/klingProvider.ts porque no tengo certeza de que sigan siendo los mismos.
3. Generar AUTH_PASSWORD_HASH con node server/password" ycargar las variables de entorno en Render/Railway.