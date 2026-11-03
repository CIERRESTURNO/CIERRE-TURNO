# Procesos Disciplinarios · PLAN VE S.A.S

App: **https://cierresturno.github.io/CIERRE-TURNO/disciplinario/**

Lleva la trazabilidad de cada caso disciplinario en 4 pasos:
**Citación → Descargos (acta) → Respuesta de RRHH → Llamado de atención / Suspensión y cierre.**
Los casos se guardan en una hoja de Google Sheets: esa hoja es el repositorio. Cada documento se puede imprimir para firma en papel o firmar en la pantalla del celular.

---

## Configuración (una sola vez, unos 10 minutos)

### 1. Crear la hoja
1. Entre a Google Drive con la cuenta de la EDS.
2. Cree una hoja de cálculo nueva con el nombre **Procesos Disciplinarios PLAN VE**.
3. No la comparta con los promotores. Solo con usted y RRHH.

### 2. Pegar el script
1. En la hoja, vaya a **Extensiones → Apps Script**.
2. Borre lo que aparece y pegue todo el contenido del archivo `apps-script/Code.gs` de esta carpeta.
3. Pulse **Guardar** (icono de disquete).

### 3. Poner la clave de acceso
1. En Apps Script, a la izquierda, entre a **⚙ Configuración del proyecto**.
2. Baje hasta **Propiedades del script → Agregar propiedad**.
3. En *Propiedad* escriba `CLAVE`. En *Valor*, la clave que usarán usted y RRHH (por ejemplo una frase larga).
4. Pulse **Guardar propiedades del script**.

### 4. Publicar
1. Arriba a la derecha, pulse **Implementar → Nueva implementación**.
2. En el engranaje, elija **Aplicación web**.
3. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier usuario**.
4. Pulse **Implementar**, autorice con su cuenta y **copie la URL** que termina en `/exec`.

### 5. Entrar a la app
1. Abra la app, pegue la URL del paso 4, escriba su nombre y la clave.
2. Envíele la URL a Claude para que quede fija en la app; así RRHH no tiene que pegarla.

> Si algún día cambia el script, use **Implementar → Gestionar implementaciones → Editar → Nueva versión**. Así la URL no cambia.

---

## Usarla como app
- **iPhone (Safari):** abra el link → Compartir → **Agregar a pantalla de inicio**.
- **Android (Chrome):** menú ⋮ → **Instalar app** / Agregar a pantalla principal.
- **Mac (Safari):** Archivo → **Agregar al Dock**.

## Imprimir y firmar
Dentro de cada caso, el botón **👁 Ver** de cada paso abre el documento ya lleno:
- **🖨 Imprimir para firmar:** imprime la carta en tamaño carta, con espacios para la firma del trabajador y de dos testigos.
- **✍️ Firma trabajador / Firma empresa:** firma con el dedo en el celular o tablet. La firma queda en el documento y en la trazabilidad.
- **🔗 Link:** copia un enlace directo a ese documento para abrirlo e imprimirlo desde otro computador (pide la clave).
- **Word:** descarga el documento editable.

## Seguridad
- Sin la clave nadie puede ver ni modificar los casos, aunque tenga el link.
- La hoja **Bitácora** registra cada acción con fecha, hora y quién la hizo.
- Para cambiar la clave, edite la propiedad `CLAVE` (paso 3). Todos tendrán que entrar de nuevo.
