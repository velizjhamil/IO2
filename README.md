# Simulador de Teoría de Colas (M/M/1) - Investigación Operativa II (UAGRM)

Aplicación web desarrollada con Next.js (App Router), React y Tailwind CSS para el cálculo y simulación de líneas de espera en un sistema unicanal (M/M/1), basada en la toma de datos de campo de una estación de servicio (Surtidor).

---

## 🚀 Despliegue en Vercel

El proyecto está 100% configurado para desplegarse en Vercel sin complicaciones.

### Opción 1: Conectar con GitHub (Recomendado)
1. Sube los cambios a tu repositorio de GitHub:
   ```bash
   git add .
   git commit -m "Configuracion para Vercel"
   git push origin main
   ```
2. Ve a [vercel.com](https://vercel.com/) e inicia sesión.
3. Haz clic en **"Add New..."** > **"Project"**.
4. Importa el repositorio **`IO2`**.
5. Los ajustes están preconfigurados gracias a `vercel.json` y `package.json` en la raíz.
   - *Nota:* Si Vercel te pide el **Root Directory**, puedes dejarlo en `./` o seleccionar `frontend` (ambas opciones funcionan correctamente).
6. Haz clic en **"Deploy"**.

### Opción 2: Desplegar desde la terminal con Vercel CLI
```bash
# 1. Iniciar sesión y previsualizar despliegue
npx vercel

# 2. Desplegar directamente a producción
npx vercel --prod
```

---

## 🛠️ Ejecución Local

Para correr el proyecto localmente en tu computadora:

```bash
# Desde la raíz del proyecto
npm run dev

# O entrando a la carpeta frontend
cd frontend
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 👥 Integrantes
- Juany Nicol Velasquez Carrillo
- Jhamil Veliz Loayza