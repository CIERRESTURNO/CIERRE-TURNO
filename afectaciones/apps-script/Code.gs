/**
 * AFECTACIONES · MANTENIMIENTO · DAÑOS LOCATIVOS — EDS Terpel Av. Boyacá · PLAN VE S.A.S
 * Repositorio en Google Sheets para la app de GitHub Pages:
 *   https://cierresturno.github.io/CIERRE-TURNO/afectaciones/
 *
 * Hojas que crea solo la primera vez:
 *   - Afectaciones  : eventos que hicieron perder venta (POS, obras, bloqueos, carros varados...)
 *   - Mantenimiento : cambios de partes por surtidor / cara / manguera (válvulas, pistolas, lectores...)
 *   - Daños         : daños locativos menores (baños, jardines, sifones, llaves, techo...)
 *   - Usuarios      : quién puede reportar (Nombre, Cargo, PIN, Rol, Activo)  ← aquí cambia los PIN
 *   - Config        : surtidores, caras, mangueras y rendimientos (lo edita la administradora desde la app)
 *   - Bitácora      : cada acción con fecha, hora y quién la hizo
 *
 * Cada fila tiene columnas legibles para analizar en Excel y, al final, una columna DATOS con el JSON completo
 * que usa la app. No borre ni mueva la columna DATOS.
 */

const H_AF = 'Afectaciones', H_MT = 'Mantenimiento', H_DN = 'Daños', H_US = 'Usuarios', H_CFG = 'Config', H_LOG = 'Bitácora';
const TZ = 'America/Bogota';

const ENC_AF = ['ID', 'Consecutivo', 'Estado', 'Fecha inicio', 'Fecha fin', 'Duración (min)', 'Duración (h)', 'Motivo', 'Producto afectado',
  'Alcance', 'Surtidores', 'Caras', 'Posiciones afectadas', 'Galones perdidos (est.)', 'm3 GNV perdidos (est.)', 'Descripción',
  'Reportado por', 'Actualizado por', 'Actualizado', 'DATOS'];
const ENC_MT = ['ID', 'Consecutivo', 'Fecha', 'Surtidor', 'Cara', 'Manguera', 'Parte', 'Producto', 'Cantidad', 'Motivo del cambio',
  'Técnico / Proveedor', 'Costo', 'Observaciones', 'Reportado por', 'Actualizado por', 'Actualizado', 'DATOS'];
const ENC_DN = ['ID', 'Consecutivo', 'Estado', 'Fecha reporte', 'Fecha reparación', 'Días abierto', 'Área', 'Elemento', 'Ubicación',
  'Prioridad', 'Descripción', 'Reparado por', 'Costo', 'Observaciones', 'Reportado por', 'Actualizado por', 'Actualizado', 'DATOS'];
const ENC_US = ['Nombre', 'Cargo', 'PIN', 'Rol', 'Activo'];

const USUARIOS_INICIALES = [
  ['Sylvia Torres', 'Administradora', '1234', 'admin', 'SI'],
  ['Jefe de patios', 'Jefe de patios', '1234', 'usuario', 'SI'],
  ['Líder de patio', 'Líder de patio', '1234', 'usuario', 'SI'],
  ['Líder de islas', 'Líder de islas', '1234', 'usuario', 'SI']
];

function doGet() {
  return salida({ ok: true, msg: 'Afectaciones EDS Av. Boyacá · PLAN VE activo' });
}

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (x) { return salida({ ok: false, error: 'json' }); }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  preparar(ss);

  // Sin PIN: lista de nombres para la pantalla de entrada
  if (req.action === 'users') return salida({ ok: true, usuarios: listarUsuarios(ss, false) });

  const u = autenticar(ss, req.usuario, req.pin);
  if (!u) return salida({ ok: false, error: 'pin' });

  if (req.action === 'login') return salida({ ok: true, rol: u.rol, cargo: u.cargo, cfg: leerCfg(ss), sheetUrl: ss.getUrl() });
  if (req.action === 'list') {
    return salida({ ok: true, rol: u.rol, cfg: leerCfg(ss), sheetUrl: ss.getUrl(),
      afectaciones: leer(ss, H_AF, ENC_AF.length), mantenimiento: leer(ss, H_MT, ENC_MT.length), danos: leer(ss, H_DN, ENC_DN.length),
      usuarios: u.rol === 'admin' ? listarUsuarios(ss, true) : undefined });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case 'saveAf': guardar(ss, H_AF, ENC_AF.length, req.item, filaAf, u.nombre); registrar(ss, 'Afectación ' + (req.item.consecutivo || ''), req.accion || 'Guardada', u.nombre); break;
      case 'saveMt': guardar(ss, H_MT, ENC_MT.length, req.item, filaMt, u.nombre); registrar(ss, 'Mantenimiento ' + (req.item.consecutivo || ''), req.accion || 'Guardado', u.nombre); break;
      case 'saveDn': guardar(ss, H_DN, ENC_DN.length, req.item, filaDn, u.nombre); registrar(ss, 'Daño ' + (req.item.consecutivo || ''), req.accion || 'Guardado', u.nombre); break;
      case 'delAf': case 'delMt': case 'delDn': {
        if (u.rol !== 'admin') return salida({ ok: false, error: 'rol' });
        const hoja = req.action === 'delAf' ? H_AF : req.action === 'delMt' ? H_MT : H_DN;
        borrar(ss, hoja, req.id); registrar(ss, hoja + ' ' + req.id, 'Eliminado', u.nombre); break;
      }
      case 'cfg':
        if (u.rol !== 'admin') return salida({ ok: false, error: 'rol' });
        ss.getSheetByName(H_CFG).getRange('A2').setValue(JSON.stringify(req.cfg || {}));
        registrar(ss, 'Config', 'Configuración actualizada', u.nombre); break;
      case 'saveUser': {
        if (u.rol !== 'admin') return salida({ ok: false, error: 'rol' });
        guardarUsuario(ss, req.user || {}); registrar(ss, 'Usuario ' + (req.user || {}).nombre, 'Usuario guardado', u.nombre); break;
      }
      default: return salida({ ok: false, error: 'accion' });
    }
    return salida({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- estructura ---------- */
function preparar(ss) {
  try { if (ss.getSpreadsheetTimeZone() !== TZ) ss.setSpreadsheetTimeZone(TZ); } catch (x) {}
  hojaCon(ss, H_AF, ENC_AF);
  hojaCon(ss, H_MT, ENC_MT);
  hojaCon(ss, H_DN, ENC_DN);
  const us = hojaCon(ss, H_US, ENC_US, true);
  if (us.getLastRow() < 2) us.getRange(2, 1, USUARIOS_INICIALES.length, ENC_US.length).setValues(USUARIOS_INICIALES);
  let c = ss.getSheetByName(H_CFG);
  if (!c) { c = ss.insertSheet(H_CFG); c.getRange('A1').setValue('Configuración de la app (se edita desde la app, no a mano)'); }
  hojaCon(ss, H_LOG, ['Fecha y hora', 'Registro', 'Acción', 'Por']);
}

function hojaCon(ss, nombre, enc, textoPin) {
  let h = ss.getSheetByName(nombre);
  if (!h) {
    h = ss.insertSheet(nombre);
    h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold').setBackground('#3B3B3B').setFontColor('#ffffff');
    h.setFrozenRows(1);
    if (textoPin) h.getRange('C:C').setNumberFormat('@'); // PIN como texto para no perder ceros
    const col = enc.indexOf('DATOS') + 1;
    if (col > 0) h.setColumnWidth(col, 60);
  }
  return h;
}

/* ---------- usuarios ---------- */
function listarUsuarios(ss, conPin) {
  const h = ss.getSheetByName(H_US), n = h.getLastRow();
  if (n < 2) return [];
  return h.getRange(2, 1, n - 1, ENC_US.length).getValues().filter(f => f[0] && String(f[4]).toUpperCase() !== 'NO')
    .map(f => conPin ? { nombre: String(f[0]).trim(), cargo: f[1], pin: String(f[2]), rol: f[3] || 'usuario', activo: f[4] }
                     : { nombre: String(f[0]).trim(), cargo: f[1], rol: f[3] || 'usuario' });
}

function autenticar(ss, nombre, pin) {
  if (!nombre || pin === undefined) return null;
  const h = ss.getSheetByName(H_US), n = h.getLastRow();
  if (n < 2) return null;
  const filas = h.getRange(2, 1, n - 1, ENC_US.length).getValues();
  for (const f of filas) {
    if (String(f[0]).trim().toLowerCase() === String(nombre).trim().toLowerCase()) {
      if (String(f[4]).toUpperCase() === 'NO') return null;
      if (String(f[2]).trim() !== String(pin).trim()) return null;
      return { nombre: String(f[0]).trim(), cargo: f[1], rol: (f[3] || 'usuario') };
    }
  }
  return null;
}

function guardarUsuario(ss, u) {
  const h = ss.getSheetByName(H_US), n = h.getLastRow();
  const fila = [u.nombre || '', u.cargo || '', String(u.pin || ''), u.rol || 'usuario', u.activo === false ? 'NO' : 'SI'];
  if (n >= 2) {
    const nombres = h.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < nombres.length; i++) {
      if (String(nombres[i][0]).trim().toLowerCase() === String(u.nombre).trim().toLowerCase()) {
        h.getRange(i + 2, 1, 1, fila.length).setValues([fila]); return;
      }
    }
  }
  h.appendRow(fila);
}

/* ---------- datos ---------- */
function leer(ss, nombre, ancho) {
  const h = ss.getSheetByName(nombre), n = h.getLastRow();
  if (n < 2) return [];
  const filas = h.getRange(2, 1, n - 1, Math.max(h.getLastColumn(), ancho)).getValues();
  const out = [];
  filas.forEach(f => {
    if (!f[0]) return;
    try { out.push(JSON.parse(String(f[ancho - 1]))); } catch (x) { /* fila dañada: se omite */ }
  });
  return out;
}

function filaDe(h, id) {
  const n = h.getLastRow();
  if (n < 2) return -1;
  const ids = h.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function guardar(ss, nombre, ancho, item, armar, usuario) {
  if (!item || !item.id) throw new Error('sin_id');
  const h = ss.getSheetByName(nombre);
  item.actualizadoPor = usuario; item.actualizado = new Date().toISOString();
  if (!item.consecutivo) item.consecutivo = consecutivo(h, nombre);
  const fila = armar(item).concat([JSON.stringify(item)]);
  let r = filaDe(h, item.id);
  if (r < 0) r = h.getLastRow() + 1;
  h.getRange(r, 1, 1, fila.length).setValues([fila]);
}

function consecutivo(h, nombre) {
  const pref = nombre === H_AF ? 'AF' : nombre === H_MT ? 'MT' : 'DN';
  const n = h.getLastRow();
  let max = 0;
  if (n >= 2) h.getRange(2, 2, n - 1, 1).getValues().forEach(v => { const m = String(v[0]).match(/(\d+)$/); if (m) max = Math.max(max, +m[1]); });
  return pref + '-' + String(max + 1).padStart(4, '0');
}

function borrar(ss, nombre, id) {
  const h = ss.getSheetByName(nombre);
  const r = filaDe(h, id);
  if (r > 0) h.deleteRow(r);
}

function registrar(ss, registro, accion, usuario) {
  ss.getSheetByName(H_LOG).appendRow([new Date(), registro, accion, usuario || '']);
}

function leerCfg(ss) {
  const v = ss.getSheetByName(H_CFG).getRange('A2').getValue();
  try { return v ? JSON.parse(v) : null; } catch (x) { return null; }
}

/* ---------- columnas legibles ---------- */
// Las fechas llegan como 'yyyy-MM-dd' o 'yyyy-MM-ddTHH:mm' en hora de Bogotá (sin zona): se interpretan en TZ.
function fecha(iso) {
  if (!iso) return '';
  const s = String(iso);
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Utilities.parseDate(s, TZ, 'yyyy-MM-dd');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) return Utilities.parseDate(s.slice(0, 16), TZ, "yyyy-MM-dd'T'HH:mm");
  } catch (x) {}
  const d = new Date(s); return isNaN(d) ? '' : d;
}
function num(v) { const n = parseFloat(v); return isNaN(n) ? '' : n; }

function filaAf(a) {
  const ini = fecha(a.inicio), fin = fecha(a.fin);
  const min = (ini && fin) ? Math.max(0, Math.round((fin - ini) / 60000)) : '';
  return [a.id, a.consecutivo || '', a.fin ? 'Cerrada' : 'Abierta', ini, fin, min, min === '' ? '' : Math.round(min / 60 * 100) / 100,
    a.motivo || '', a.producto || '', a.alcance || '', (a.surtidores || []).join(', '), (a.caras || []).join(', '),
    num(a.posiciones), num(a.galones), num(a.m3), a.descripcion || '', a.reportadoPor || '', a.actualizadoPor || '', new Date()];
}

function filaMt(m) {
  return [m.id, m.consecutivo || '', fecha(m.fecha), m.surtidor || '', m.cara || '', m.manguera || '', m.parte || '', m.producto || '',
    num(m.cantidad), m.motivo || '', m.tecnico || '', num(m.costo), m.observaciones || '', m.reportadoPor || '', m.actualizadoPor || '', new Date()];
}

function filaDn(d) {
  const rep = fecha(d.fecha), fix = fecha(d.fechaReparacion);
  const dias = rep ? Math.max(0, Math.floor(((fix || new Date()) - rep) / 86400000)) : '';
  return [d.id, d.consecutivo || '', d.estado || 'Reportado', rep, fix, dias, d.area || '', d.elemento || '', d.ubicacion || '',
    d.prioridad || '', d.descripcion || '', d.reparadoPor || '', num(d.costo), d.observaciones || '', d.reportadoPor || '', d.actualizadoPor || '', new Date()];
}

function salida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- utilidad: pestaña de referencia "Distribución" (ejecutar una vez desde el editor) ---------- */
function crearDistribucion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName('Distribución');
  if (!h) h = ss.insertSheet('Distribución'); else h.clear();
  const enc = ['Isla', 'Surtidor', 'Cara', 'Manguera', 'Producto', 'Venta cara (gal/h)', 'Venta cara (gal/min)'];
  const L = [
    ['1','S1',1,1,'Corriente',30.8],['1','S1',1,2,'Extra',30.8],['1','S1',2,3,'Corriente',22.8],['1','S1',2,4,'Extra',22.8],
    ['1','S2',3,5,'Diésel B10',28.7],['1','S2',3,6,'Corriente',28.7],['1','S2',4,7,'Diésel B10',28.9],['1','S2',4,8,'Corriente',28.9],
    ['1','S2',5,9,'Corriente',24.6],['1','S2',5,10,'Extra',24.6],['1','S2',6,11,'Corriente',25.2],['1','S2',6,12,'Extra',25.2],
    ['2','S3',7,13,'Extra',35.8],['2','S3',7,14,'Corriente',35.8],['2','S3',8,15,'Extra',33.2],['2','S3',8,16,'Corriente',33.2],
    ['2','S4',9,17,'Corriente',38.9],['2','S4',9,18,'Extra',38.9],['2','S4',10,19,'Corriente',27.6],['2','S4',10,20,'Extra',27.6],
    ['2','S4',11,21,'Diésel B10',33.2],['2','S4',11,22,'Corriente',33.2],['2','S4',12,23,'Diésel B10',31.5],['2','S4',12,24,'Corriente',31.5],
    ['3','S5',13,25,'Extra',23.7],['3','S5',13,26,'Corriente',23.7],['3','S5',14,27,'Extra',19.7],['3','S5',14,28,'Corriente',19.7],
    ['3','S6',15,29,'Diésel B10',28.4],['3','S6',15,30,'Corriente',28.4],['3','S6',16,31,'Diésel B10',25.0],['3','S6',16,32,'Corriente',25.0],
    ['3','S6',17,33,'Corriente',27.6],['3','S6',17,34,'Extra',27.6],['3','S6',18,35,'Corriente',12.1],['3','S6',18,36,'Extra',12.1],
    ['GNV','G1',1,1,'GNV',''],['GNV','G1',2,2,'GNV',''],['GNV','G2',3,3,'GNV',''],['GNV','G2',4,4,'GNV','']
  ];
  h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold').setBackground('#3B3B3B').setFontColor('#ffffff');
  const filas = L.map((f, i) => f.concat([f[5] === '' ? '' : '=F' + (i + 2) + '/60']));
  h.getRange(2, 1, filas.length, enc.length).setValues(filas);
  h.getRange(2, 6, filas.length, 1).setNumberFormat('0.0');
  h.getRange(2, 7, filas.length, 1).setNumberFormat('0.00');
  const r = filas.length + 3;
  h.getRange(r, 5).setValue('Promedio por cara (líquidos)').setFontWeight('bold');
  h.getRange(r, 6).setFormula('=SUM(F2:F37)/2/18').setNumberFormat('0.0');
  h.getRange(r + 1, 1).setValue('Fuente: Reporte de venta detallada Terpel POS, 1 al 7 de noviembre de 2026 (83.625 gal). gal/h = galones de la semana / (7 días × 24 h). GNV no aparece en ese reporte.').setFontStyle('italic').setFontColor('#6E6E6E');
  h.setFrozenRows(1);
  h.autoResizeColumns(1, enc.length);
}
