# Afectaciones · Mantenimiento · Daños locativos — EDS Terpel Av. Boyacá · PLAN VE S.A.S

App: **https://cierresturno.github.io/CIERRE-TURNO/afectaciones/**

Tres registros en una sola app, pensada para el celular del jefe de patios:

1. **Afectaciones** — todo lo que impidió vender galones o m³ de GNV: caída del POS Terpel, obra en la EDS, cierre de posiciones, bloqueo de la avenida, carro varado, bloqueo de surtidor o cara… Se registra inicio, fin, alcance (toda la EDS / surtidores / caras) y la pérdida estimada.
2. **Mantenimiento** — cada cambio de válvula de aire, manguera, pistola, codo, breakaway, filtro o **lector**, con surtidor, cara, manguera y fecha. La app muestra la última fecha de cambio de cada parte por surtidor.
3. **Daños locativos** — baños, jardines, sifones, llaves, techo, iluminación, pintura, etc., con prioridad y estado (reportado → en reparación → reparado).

Todo queda en una hoja de Google Sheets (una pestaña por registro) y desde la pestaña **Informe** se descarga un Excel con el detalle y los resúmenes del rango de fechas que elijas. Cada registro guarda **quién lo reportó**.

---

## Configuración (una sola vez, unos 10 minutos)

### 1. Crear la hoja
1. Entra a Google Drive con la cuenta de la EDS.
2. Crea una hoja de cálculo nueva con el nombre **Afectaciones EDS Av. Boyacá**.
3. No la compartas con los promotores; solo contigo (y con quien vaya a analizar).

### 2. Pegar el script
1. En la hoja: **Extensiones → Apps Script**.
2. Borra lo que aparece y pega todo el contenido del archivo `apps-script/Code.gs` de esta carpeta.
3. Pulsa **Guardar** (icono de disquete).

### 3. Publicar
1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En el engranaje elige **Aplicación web**.
3. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier usuario**.
4. Pulsa **Implementar**, autoriza con tu cuenta y **copia la URL** que termina en `/exec`.

### 4. Entrar a la app
1. Abre la app, pega la URL del paso 3, elige **Sylvia Torres** y escribe el PIN **1234**.
2. Al entrar por primera vez el script crea solas las pestañas *Afectaciones, Mantenimiento, Daños, Usuarios, Config y Bitácora*.
3. Envíale la URL a Claude para dejarla fija en la app; así el jefe de patios no tiene que pegarla.

### 5. Cambiar los PIN
En la app, pestaña **Configuración → Usuarios**, o directamente en la pestaña **Usuarios** de la hoja. Vienen creados con PIN `1234`:

| Nombre | Cargo | Rol |
|---|---|---|
| Sylvia Torres | Administradora | admin (ve Configuración, puede eliminar registros) |
| Jefe de patios | Jefe de patios | usuario |
| Líder de patio | Líder de patio | usuario |
| Líder de islas | Líder de islas | usuario |

Puedes cambiar los nombres por los nombres reales de las personas: así el informe dice exactamente quién reportó.

### 6. Ajustar la estación (pestaña Configuración, solo admin)
- La distribución de surtidores viene tomada del reporte de venta detallada del Terpel POS: 3 islas, 6 surtidores, 18 caras (S1, S3 y S5 con 2 caras; S2, S4 y S6 con 4) y 36 mangueras con su producto (Corriente, Extra, Diésel B10). Se ve en Configuración y solo se edita en "Avanzado" si cambia la estación.
- **Galones por hora por posición** y **m³ por hora por posición**: con esto la app estima la venta perdida (posiciones × horas × rendimiento). Calíbralo con el promedio real de Sicom; el valor estimado siempre se puede corregir a mano con el dato real.
- Nombres de surtidores (opcional): `S1=Isla 1 Norte, S2=Isla 1 Sur…`

> Si algún día cambias el script: **Implementar → Gestionar implementaciones → ✎ Editar → Versión: Nueva → Implementar**. Así la URL no cambia.

---

## Uso diario (jefe de patios)
- Botón **+** (abajo a la derecha) → *Afectación*, *Cambio de parte* o *Daño locativo*.
- Una afectación se puede dejar **abierta** (sin hora de fin) y cerrarla después con **Cerrar ahora** desde Inicio; al cerrarla se calcula la pérdida estimada.
- En **Inicio** cada surtidor muestra sus caras: roja = tuvo afectación en el mes, naranja = cambio de parte en el mes, y la fecha del último cambio de lector.

## Informe en Excel (administración)
Pestaña **Informe** → elige el rango de fechas → **⬇ Descargar Excel**. Trae: hoja *Resumen* (motivos, partes por surtidor, lectores por cara, daños por área) y el detalle de *Afectaciones*, *Mantenimiento* y *Daños locativos* con fechas reales para tablas dinámicas. **Abrir hoja de Google** abre el histórico completo.

## Usarla como app en el celular
- **iPhone (Safari):** abre el link → Compartir → **Agregar a pantalla de inicio**.
- **Android (Chrome):** menú ⋮ → **Instalar app** / Agregar a pantalla principal.

## Seguridad
- Sin nombre + PIN nadie puede ver ni registrar, aunque tenga el link.
- Solo el rol **admin** puede eliminar registros, cambiar la configuración y gestionar usuarios.
- La pestaña **Bitácora** de la hoja registra cada acción con fecha, hora y quién la hizo.
