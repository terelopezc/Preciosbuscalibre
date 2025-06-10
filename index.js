import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Buscalibre scraper funcionando');
});

app.post('/precio', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Falta URL' });

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const precio = await page.$eval('.product-price', el => el.textContent.trim());
    await browser.close();

    const valorNumerico = precio.replace(/\$|\./g, '').replace(',', '.');
    res.json({ precio: valorNumerico });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

