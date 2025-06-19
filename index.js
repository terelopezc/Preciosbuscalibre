const { chromium } = require('playwright');
const { google } = require('googleapis');

// CONFIGURACIÓN DE LA HOJA DE CÁLCULO
const SPREADSHEET_ID = '1WDkuWNg8RBd3BtQKaoxUYnR_tKrFOlJWxIIM3HQsvBI';
const HOJA = 'BASE';
const RANGE_URLS = `${HOJA}!E2:E`; // Leer links desde columna E
const COLUMNA_PRECIO_BASE = 'D';   // Escribir precios en columna D

// 🔐 AUTORIZACIÓN CON GOOGLE SHEETS (Railway: usa variable de entorno)
async function autorizarGoogle() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

// 📥 LEER LOS LINKS DESDE LA COLUMNA E
async function leerUrlsDesdeSheet(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE_URLS,
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No se encontraron URLs en la hoja.');
    return [];
  }
  return rows.map(r => r[0]);
}

// 📝 ESCRIBIR LOS PRECIOS EN LA COLUMNA D
async function escribirPrecios(auth, precios) {
  const sheets = google.sheets({ version: 'v4', auth });
  const rangoDestino = `${HOJA}!${COLUMNA_PRECIO_BASE}2:${COLUMNA_PRECIO_BASE}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rangoDestino,
    valueInputOption: 'RAW',
    requestBody: {
      values: precios.map(p => [p])
    }
  });
}

// 🛒 SCRAPEAR PRECIO DESDE BUSCALIBRE
async function obtenerPrecioDesdeBuscalibre(url, browser) {
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.screenshot({ path: `screenshot-${Date.now()}.png` });
    await page.waitForSelector('span.ped, span.price', { timeout: 10000 });


    const precio = await page.$eval('span.ped, span.price', el =>
      el.innerText.replace(/[^\d]/g, '')
    );

    await page.close();
    return precio || 'error';
  } catch (e) {
    console.error(`❌ Error en URL: ${url}`);
    return 'error';
  }
}

// 🚀 BLOQUE PRINCIPAL
(async () => {
  const auth = await autorizarGoogle();
  const urls = await leerUrlsDesdeSheet(auth);

  console.log(`🔗 Se encontraron ${urls.length} URLs.`);

  const browser = await chromium.launch({ headless: true });
  const precios = [];

  for (const [i, url] of urls.entries()) {
    console.log(`🔍 Procesando ${i + 1}/${urls.length}: ${url}`);
    const precio = await obtenerPrecioDesdeBuscalibre(url, browser);
    precios.push(precio);
  }

  await browser.close();
  await escribirPrecios(auth, precios);
  console.log('✅ Precios reales escritos en la hoja.');
})();


