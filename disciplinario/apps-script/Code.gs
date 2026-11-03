/**
 * PROCESOS DISCIPLINARIOS · PLAN VE S.A.S
 * Repositorio en Google Sheets para la app de GitHub Pages.
 *
 * Hojas que crea solo:
 *   - Casos     : una fila por caso (columnas legibles + datos completos en JSON)
 *   - Bitácora  : cada acción con fecha, caso, trabajador y quién la hizo
 *   - Config    : datos de la empresa que salen en las cartas
 *
 * IMPORTANTE: en Configuración del proyecto > Propiedades del script,
 * cree la propiedad  CLAVE  con la clave de acceso que usarán usted y RRHH.
 */

const HOJA_CASOS = 'Casos';
const HOJA_LOG = 'Bitácora';
const HOJA_CFG = 'Config';
const TROZO = 45000; // límite seguro por celda (Sheets admite 50.000 caracteres)
const ENC = ['ID', 'Consecutivo', 'Trabajador', 'Cédula', 'Cargo', 'Estado', 'Falta (RIT)', 'Decisión', 'Días suspensión',
  'Fecha hechos', 'Fecha citación', 'Fecha descargos', 'Fecha respuesta', 'Fecha notificación', 'Actualizado', 'Último cambio por', 'DATOS'];
const COL_DATOS = ENC.length; // columna Q en adelante

const ESTADOS = { borrador: 'Borrador', reportado: 'Reportado · por citar', citado: 'Citado a descargos', descargos: 'Descargos rendidos', decision: 'Respuesta RRHH emitida', sancion: 'Sanción notificada', cerrado: 'Cerrado' };
const TIPOS = { archivo: 'Archivo', verbal: 'Llamado de atención verbal', escrito: 'Llamado de atención escrito', suspension: 'Suspensión', terminacion: 'Terminación con justa causa' };

function doGet() {
  return salida({ ok: true, msg: 'Procesos disciplinarios PLAN VE activo' });
}

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (x) { return salida({ ok: false, error: 'json' }); }
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE') || '';
  if (!clave) return salida({ ok: false, error: 'sin_clave' });
  if (String(req.clave || '') !== clave) return salida({ ok: false, error: 'clave' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  preparar(ss);

  if (req.action === 'list') return salida({ ok: true, casos: leerCasos(ss), cfg: leerCfg(ss) });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (req.action === 'save') {
      const c = req.caso || {};
      if (!c.id) return salida({ ok: false, error: 'sin_id' });
      guardarCaso(ss, c, req.usuario);
      if (req.accion) registrar(ss, c, req.accion, req.usuario);
    } else if (req.action === 'delete') {
      borrarCaso(ss, req.id);
      registrar(ss, { id: req.id, consecutivo: '', trabajador: {} }, req.accion || 'Caso eliminado', req.usuario);
    } else if (req.action === 'cfg') {
      ss.getSheetByName(HOJA_CFG).getRange('A2').setValue(JSON.stringify(req.cfg || {}));
    } else {
      return salida({ ok: false, error: 'accion' });
    }
    return salida({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function preparar(ss) {
  let h = ss.getSheetByName(HOJA_CASOS);
  if (!h) {
    h = ss.insertSheet(HOJA_CASOS);
    h.getRange(1, 1, 1, ENC.length).setValues([ENC]).setFontWeight('bold').setBackground('#1B1F27').setFontColor('#ffffff');
    h.setFrozenRows(1);
    h.setColumnWidth(COL_DATOS, 80);
  }
  let l = ss.getSheetByName(HOJA_LOG);
  if (!l) {
    l = ss.insertSheet(HOJA_LOG);
    l.getRange(1, 1, 1, 5).setValues([['Fecha y hora', 'Consecutivo', 'Trabajador', 'Acción', 'Por']]).setFontWeight('bold').setBackground('#1B1F27').setFontColor('#ffffff');
    l.setFrozenRows(1);
  }
  let c = ss.getSheetByName(HOJA_CFG);
  if (!c) {
    c = ss.insertSheet(HOJA_CFG);
    c.getRange('A1').setValue('Configuración de la app (no editar a mano)');
  }
}

function leerCasos(ss) {
  const h = ss.getSheetByName(HOJA_CASOS);
  const n = h.getLastRow();
  if (n < 2) return [];
  const ancho = Math.max(h.getLastColumn(), COL_DATOS);
  const filas = h.getRange(2, 1, n - 1, ancho).getValues();
  const out = [];
  filas.forEach(f => {
    if (!f[0]) return;
    const json = f.slice(COL_DATOS - 1).join('');
    try { out.push(JSON.parse(json)); } catch (x) { /* fila dañada: se omite */ }
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

function guardarCaso(ss, c, usuario) {
  const h = ss.getSheetByName(HOJA_CASOS);
  const t = c.trabajador || {}, d = c.decision || {};
  const json = JSON.stringify(c);
  const trozos = [];
  for (let i = 0; i < json.length; i += TROZO) trozos.push(json.substring(i, i + TROZO));
  const visibles = [
    c.id, c.consecutivo || '', t.nombre || '', t.cedula ? "'" + t.cedula : '', t.cargo || '',
    ESTADOS[c.estado] || c.estado || '', c.falta || '', TIPOS[d.tipo] || '', d.dias || '',
    (c.fechaHechos || ''), ((c.citacion || {}).fecha || ''), ((c.descargos || {}).fecha || ''), (d.fecha || ''),
    ((c.sancion || {}).notificada || ''), new Date(), usuario || ''
  ];
  const fila = visibles.concat(trozos);
  let r = filaDe(h, c.id);
  if (r < 0) r = h.getLastRow() + 1;
  // limpiar trozos sobrantes de una versión anterior más larga
  const ancho = h.getLastColumn();
  if (ancho > fila.length) h.getRange(r, fila.length + 1, 1, ancho - fila.length).clearContent();
  h.getRange(r, 1, 1, fila.length).setValues([fila]);
}

function borrarCaso(ss, id) {
  const h = ss.getSheetByName(HOJA_CASOS);
  const r = filaDe(h, id);
  if (r > 0) h.deleteRow(r);
}

function registrar(ss, c, accion, usuario) {
  const t = c.trabajador || {};
  ss.getSheetByName(HOJA_LOG).appendRow([new Date(), c.consecutivo || '', t.nombre || '', accion, usuario || '']);
}

function leerCfg(ss) {
  const v = ss.getSheetByName(HOJA_CFG).getRange('A2').getValue();
  try { return v ? JSON.parse(v) : null; } catch (x) { return null; }
}

function salida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
