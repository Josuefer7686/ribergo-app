const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { execSync } = require('child_process');

const markdownPath = '/home/fernando/.gemini/antigravity/brain/60b4e1ad-70cf-4bca-b800-5384e5b57cc1/informe_tecnico_integral_ribergo.md';
const outputHtmlPath = path.join(__dirname, '..', 'informe_tecnico_integral_ribergo.html');
const publicHtmlPath = path.join(__dirname, '..', 'public', 'informe_tecnico_integral_ribergo.html');
const outputPdfPath = path.join(__dirname, '..', 'informe_tecnico_integral_ribergo.pdf');

console.log('Reading markdown source...');
let mdContent = fs.readFileSync(markdownPath, 'utf8');

// Replace mermaid code blocks with <div class="mermaid">...</div> for mermaid.js rendering
mdContent = mdContent.replace(/```mermaid([\s\S]*?)```/g, (match, p1) => {
  return `<div class="mermaid">${p1.trim()}</div>`;
});

const bodyHtml = marked(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Técnico Integral - Proyecto RiberGO</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');

    :root {
      --bg: #090D11;
      --card-bg: #111822;
      --border: #233044;
      --gold: #F4C542;
      --gold-light: #FFD966;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
      --accent: #38BDF8;
      --code-bg: #0D131B;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 40px 20px 100px;
      font-size: 15px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 50px 60px;
      box-shadow: 0 25px 70px rgba(0,0,0,0.6);
      position: relative;
    }

    /* Action bar */
    .action-bar {
      position: sticky;
      top: 20px;
      z-index: 1000;
      max-width: 900px;
      margin: 0 auto 25px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn {
      background: linear-gradient(135deg, var(--gold) 0%, #D97706 100%);
      color: #05080B;
      font-weight: 800;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(244, 197, 66, 0.35);
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(244, 197, 66, 0.5);
    }

    h1, h2, h3, h4 {
      color: #FFFFFF;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    h1 {
      font-size: 30px;
      line-height: 1.25;
      margin-bottom: 12px;
      background: linear-gradient(90deg, #FFFFFF 0%, var(--gold) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
    }

    h2 {
      font-size: 22px;
      margin-top: 45px;
      margin-bottom: 18px;
      border-bottom: 1px solid rgba(244, 197, 66, 0.2);
      padding-bottom: 8px;
      color: var(--gold-light);
    }

    h3 {
      font-size: 17px;
      margin-top: 28px;
      margin-bottom: 12px;
      color: #38BDF8;
    }

    p {
      margin-bottom: 16px;
      color: #CBD5E1;
    }

    ul, ol {
      margin-left: 24px;
      margin-bottom: 18px;
      color: #CBD5E1;
    }

    li {
      margin-bottom: 8px;
    }

    strong {
      color: #FFFFFF;
      font-weight: 700;
    }

    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 40px 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 25px 0;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
      font-size: 14px;
    }

    th {
      background-color: #172233;
      color: var(--gold);
      font-weight: 700;
      text-align: left;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.05em;
    }

    td {
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      background-color: var(--card-bg);
      color: #CBD5E1;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:nth-child(even) td {
      background-color: #0E1520;
    }

    /* Code & Pre */
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background: var(--code-bg);
      color: var(--gold);
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid rgba(244, 197, 66, 0.2);
    }

    pre {
      background: var(--code-bg);
      padding: 20px;
      border-radius: 14px;
      overflow-x: auto;
      border: 1px solid var(--border);
      margin: 20px 0;
    }

    pre code {
      background: transparent;
      padding: 0;
      border: none;
      color: #F8FAFC;
    }

    /* Links */
    a {
      color: var(--gold);
      text-decoration: none;
      font-weight: 600;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Mermaid */
    .mermaid {
      background: #0B1117;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 25px;
      margin: 30px 0;
      display: flex;
      justify-content: center;
    }

    /* Print styling */
    @media print {
      body {
        background: #FFFFFF !important;
        color: #1E293B !important;
        font-size: 12pt;
        padding: 0;
      }

      .action-bar {
        display: none !important;
      }

      .container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        background: transparent !important;
        max-width: 100% !important;
      }

      h1 {
        background: none !important;
        -webkit-text-fill-color: #0F172A !important;
        color: #0F172A !important;
        border-bottom: 2pt solid #0F172A !important;
      }

      h2 {
        color: #B45309 !important;
        border-bottom: 1pt solid #E2E8F0 !important;
        page-break-after: avoid;
      }

      h3 {
        color: #0284C7 !important;
        page-break-after: avoid;
      }

      p, li {
        color: #334155 !important;
      }

      table {
        border: 1pt solid #CBD5E1 !important;
        page-break-inside: avoid;
      }

      th {
        background: #F1F5F9 !important;
        color: #0F172A !important;
      }

      td {
        background: #FFFFFF !important;
        color: #334155 !important;
        border-bottom: 1pt solid #E2E8F0 !important;
      }

      tr:nth-child(even) td {
        background: #F8FAFC !important;
      }

      .mermaid {
        background: #F8FAFC !important;
        border: 1pt solid #E2E8F0 !important;
        page-break-inside: avoid;
      }

      code {
        background: #F1F5F9 !important;
        color: #B45309 !important;
        border: 1pt solid #E2E8F0 !important;
      }
    }
  </style>
</head>
<body>

  <div class="action-bar">
    <button class="btn" onclick="window.print()">
      🖨️ Imprimir / Guardar como PDF
    </button>
  </div>

  <div class="container">
    ${bodyHtml}
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0B1117',
        primaryColor: '#F4C542',
        primaryTextColor: '#05080B',
        primaryBorderColor: '#FFD966',
        lineColor: '#38BDF8',
        secondaryColor: '#172233',
        tertiaryColor: '#1E293B'
      }
    });
  </script>
</body>
</html>
`;

console.log('Writing HTML to output files...');
fs.writeFileSync(outputHtmlPath, fullHtml, 'utf8');
fs.writeFileSync(publicHtmlPath, fullHtml, 'utf8');
console.log('Saved HTML to:', outputHtmlPath);
console.log('Saved HTML to:', publicHtmlPath);

// Generate PDF using Google Chrome headless
console.log('Generating PDF via Google Chrome headless...');
try {
  execSync(
    `google-chrome --headless --no-sandbox --disable-gpu --run-all-compositor-stages-before-draw --virtual-time-budget=3000 --print-to-pdf="${outputPdfPath}" "file://${outputHtmlPath}"`,
    { stdio: 'inherit' }
  );
  console.log('Successfully generated PDF at:', outputPdfPath);
} catch (err) {
  console.warn('Chrome PDF generation notice:', err.message);
}
