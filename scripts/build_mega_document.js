const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputPath = path.join(__dirname, '..', 'informe_tecnico_integral_ribergo.html');
const publicPath = path.join(__dirname, '..', 'public', 'informe_tecnico_integral_ribergo.html');
const pdfPath = path.join(__dirname, '..', 'informe_tecnico_integral_ribergo.pdf');

console.log('Generando documento maestro refinado para RiberGO (Tarifa 10 Bs, Comisión 1 Bs, Pagos QR, Billetera y Créditos)...');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento Técnico Oficial: Plataforma RiberGO (Riberalta, Bolivia)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

    :root {
      --bg: #05080C;
      --card-bg: #0D131C;
      --card-inner: #131C29;
      --border: #1E2B3E;
      --border-gold: rgba(244, 197, 66, 0.4);
      --gold: #F4C542;
      --gold-light: #FFDF85;
      --gold-dark: #C69512;
      --emerald: #10B981;
      --cyan: #38BDF8;
      --purple: #A855F7;
      --red: #EF4444;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
      --text-dim: #64748B;
      --code-bg: #070B10;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.75;
      padding: 25px 20px 120px;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 1040px;
      margin: 0 auto;
    }

    /* Floating Bar */
    .top-action-bar {
      position: sticky;
      top: 14px;
      z-index: 9999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(13, 19, 28, 0.95);
      border: 1px solid var(--border-gold);
      backdrop-filter: blur(16px);
      border-radius: 16px;
      padding: 12px 24px;
      margin-bottom: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 900;
      font-size: 17px;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }

    .brand-title span {
      color: var(--gold);
    }

    .btn-print {
      background: linear-gradient(135deg, var(--gold) 0%, #D97706 100%);
      color: #05080C;
      font-weight: 800;
      font-size: 13px;
      padding: 10px 22px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 6px 20px rgba(244, 197, 66, 0.35);
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-print:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(244, 197, 66, 0.55);
    }

    /* Container */
    .doc-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 28px;
      padding: 60px 70px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.75);
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(244, 197, 66, 0.12);
      border: 1px solid var(--border-gold);
      color: var(--gold);
      font-size: 11px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 100px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 34px;
      font-weight: 900;
      line-height: 1.25;
      color: #FFFFFF;
      letter-spacing: -0.03em;
      margin-bottom: 15px;
    }

    h1 .gold-text {
      background: linear-gradient(90deg, var(--gold) 0%, var(--gold-light) 50%, #F59E0B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .lead-text {
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.65;
      margin-bottom: 30px;
      padding-bottom: 25px;
      border-bottom: 1px solid var(--border);
    }

    h2 {
      font-size: 23px;
      font-weight: 800;
      color: #FFFFFF;
      margin-top: 55px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--border);
      letter-spacing: -0.02em;
    }

    h2 .num {
      color: var(--gold);
      font-size: 18px;
      background: rgba(244, 197, 66, 0.1);
      padding: 4px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-gold);
    }

    h3 {
      font-size: 18px;
      font-weight: 700;
      color: var(--gold-light);
      margin-top: 35px;
      margin-bottom: 14px;
      letter-spacing: -0.01em;
    }

    h4 {
      font-size: 15px;
      font-weight: 700;
      color: var(--cyan);
      margin-top: 24px;
      margin-bottom: 10px;
    }

    p {
      margin-bottom: 16px;
      color: #CBD5E1;
      text-align: justify;
    }

    ul, ol {
      margin-left: 24px;
      margin-bottom: 20px;
      color: #CBD5E1;
    }

    li {
      margin-bottom: 8px;
    }

    strong {
      color: #FFFFFF;
      font-weight: 700;
    }

    /* Highlight Cards */
    .callout {
      background: var(--card-inner);
      border-left: 4px solid var(--gold);
      border-top: 1px solid var(--border);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px 26px;
      margin: 25px 0;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }

    .callout-title {
      font-weight: 800;
      color: var(--gold);
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .callout p {
      margin-bottom: 0;
      font-size: 14px;
    }

    /* Tables */
    .table-responsive {
      overflow-x: auto;
      margin: 28px 0;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      text-align: left;
    }

    th {
      background: #141E2D;
      color: var(--gold);
      font-weight: 800;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.08em;
    }

    td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      color: #CBD5E1;
      background: var(--card-bg);
      vertical-align: top;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:nth-child(even) td {
      background: #0A0F17;
    }

    /* Code */
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      background: var(--code-bg);
      color: var(--gold-light);
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid rgba(244, 197, 66, 0.2);
    }

    pre {
      background: var(--code-bg);
      padding: 22px;
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow-x: auto;
      margin: 22px 0;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.6);
    }

    pre code {
      background: transparent;
      padding: 0;
      border: none;
      color: #E2E8F0;
      font-size: 13px;
      line-height: 1.6;
    }

    /* Graphic Diagram Box */
    .diagram-container {
      background: #080D14;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      margin: 30px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 15px 40px rgba(0,0,0,0.5);
    }

    .diagram-caption {
      margin-top: 14px;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* Visual Grid */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin: 25px 0;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 25px 0;
    }

    @media (max-width: 850px) {
      .grid-3, .grid-2 {
        grid-template-columns: 1fr;
      }
      .doc-container {
        padding: 35px 22px;
      }
      h1 {
        font-size: 26px;
      }
    }

    .card {
      background: var(--card-inner);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      transition: all 0.2s;
    }

    .card:hover {
      border-color: var(--border-gold);
    }

    .card-icon {
      font-size: 26px;
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 8px;
    }

    .card-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 0;
    }

    /* Print Styles */
    @media print {
      body {
        background: #FFFFFF !important;
        color: #0F172A !important;
        padding: 0 !important;
        font-size: 11pt !important;
      }

      .top-action-bar {
        display: none !important;
      }

      .doc-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        background: transparent !important;
        max-width: 100% !important;
      }

      h1 {
        color: #0F172A !important;
        font-size: 22pt !important;
        border-bottom: 2pt solid #0F172A !important;
      }

      h1 .gold-text {
        background: none !important;
        -webkit-text-fill-color: #B45309 !important;
        color: #B45309 !important;
      }

      h2 {
        color: #B45309 !important;
        font-size: 15pt !important;
        border-bottom: 1pt solid #CBD5E1 !important;
        page-break-after: avoid;
        margin-top: 25pt !important;
      }

      h2 .num {
        background: #FEF3C7 !important;
        color: #92400E !important;
        border-color: #FCD34D !important;
      }

      h3 {
        color: #0284C7 !important;
        font-size: 12pt !important;
        page-break-after: avoid;
      }

      p, li {
        color: #1E293B !important;
      }

      .callout {
        background: #F8FAFC !important;
        border-left: 4pt solid #D97706 !important;
        border-color: #E2E8F0 !important;
        page-break-inside: avoid;
      }

      .callout-title {
        color: #B45309 !important;
      }

      .table-responsive {
        border-color: #CBD5E1 !important;
        page-break-inside: avoid;
      }

      th {
        background: #F1F5F9 !important;
        color: #0F172A !important;
      }

      td {
        background: #FFFFFF !important;
        color: #1E293B !important;
        border-color: #E2E8F0 !important;
      }

      tr:nth-child(even) td {
        background: #F8FAFC !important;
      }

      code {
        background: #F1F5F9 !important;
        color: #92400E !important;
        border-color: #E2E8F0 !important;
      }

      pre {
        background: #F8FAFC !important;
        border: 1pt solid #CBD5E1 !important;
        page-break-inside: avoid;
      }

      pre code {
        color: #0F172A !important;
      }

      .diagram-container {
        background: #FFFFFF !important;
        border: 1pt solid #CBD5E1 !important;
        page-break-inside: avoid;
      }

      .diagram-caption {
        color: #64748B !important;
      }

      .card {
        background: #F8FAFC !important;
        border: 1pt solid #E2E8F0 !important;
        page-break-inside: avoid;
      }

      .card-title {
        color: #0F172A !important;
      }

      .card-desc {
        color: #475569 !important;
      }
    }
  </style>
</head>
<body>

  <div class="wrapper">
    <!-- Top Action Bar -->
    <div class="top-action-bar">
      <div class="brand-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F4C542" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
        Riber<span>GO</span> • Memoria Técnica Integral
      </div>
      <button class="btn-print" onclick="window.print()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Imprimir / Guardar como PDF
      </button>
    </div>

    <!-- Main Document Card -->
    <div class="doc-container">

      <div class="badge">
        <span>Documentación Técnica Oficial • Riberalta, Beni, Bolivia</span>
      </div>

      <h1>
        MEMORIA TÉCNICA E INFORME COMPLETO: <br />
        <span class="gold-text">APLICACIÓN DIGITAL DE MOVILIDAD "RiberGO"</span>
      </h1>

      <p class="lead-text">
        Manual de ingeniería exhaustivo: modelo económico (Tarifa plana de 10 Bs, comisión de 1 Bs, recargas QR y créditos), arquitectura de software, desglose minucioso de cada archivo, gráficos de interfaz y síntesis de tecnologías empleadas.
      </p>

      <!-- =================================================== -->
      <!-- SECCIÓN 1: BREVE RESUMEN HISTÓRICO DE TECNOLOGÍAS -->
      <!-- =================================================== -->
      <h2><span class="num">01</span> SÍNTESIS DE LAS TECNOLOGÍAS UTILIZADAS: ORIGEN Y CREADORES</h2>

      <p>
        Para materializar RiberGO se seleccionó un ecosistema de tecnologías web de vanguardia. A continuación se resume qué es cada una, cuándo nació y quién la creó:
      </p>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Tecnología</th>
              <th>Creador / Organización</th>
              <th>Año</th>
              <th>¿Qué es y de dónde proviene?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Next.js 15.5</strong></td>
              <td>Guillermo Rauch (Vercel)</td>
              <td>2016</td>
              <td>Framework fullstack para React nacido en San Francisco, EE.UU. Provee compilador ultraveloz en Rust (SWC), renderizado híbrido y arquitectura basada en carpetas (<em>App Router</em>).</td>
            </tr>
            <tr>
              <td><strong>React 19</strong></td>
              <td>Jordan Walke (Facebook / Meta)</td>
              <td>2013</td>
              <td>Librería de interfaces declarativas. Introdujo el concepto de <em>Virtual DOM</em> y componentes reutilizables que solo repintan en pantalla lo que cambia.</td>
            </tr>
            <tr>
              <td><strong>TypeScript 5.9</strong></td>
              <td>Anders Hejlsberg (Microsoft)</td>
              <td>2012</td>
              <td>Superset tipado de JavaScript creado por el autor de Turbo Pascal y C#. Convierte a JavaScript en un lenguaje de ingeniería estricto, previniendo errores antes de ejecutar el código.</td>
            </tr>
            <tr>
              <td><strong>Tailwind CSS v4</strong></td>
              <td>Adam Wathan</td>
              <td>2017</td>
              <td>Framework de diseño atómico utilitario basado en un compilador propio (*Oxide*). Elimina hojas CSS pesadas y genera estilos responsivos ultraligeros.</td>
            </tr>
            <tr>
              <td><strong>Leaflet 1.9</strong></td>
              <td>Vladimir Agafonkin</td>
              <td>2011</td>
              <td>Librería de cartografía abierta más ligera del mundo (39 KB). Consume los mapas libres de OpenStreetMap sin requerir tarjetas de crédito ni costosas cuotas de Google Maps.</td>
            </tr>
            <tr>
              <td><strong>Zustand 5.0</strong></td>
              <td>Dai Shi (Poimandres)</td>
              <td>2019</td>
              <td>Gestor de estado global para React. Extremadamente rápido, basado en hooks y sin el código repetitivo (*boilerplate*) que aquejaba a librerías como Redux.</td>
            </tr>
            <tr>
              <td><strong>Cloud Firestore & Auth</strong></td>
              <td>James Tamplin & Andrew Lee (Google Firebase)</td>
              <td>2011</td>
              <td>Base de datos NoSQL documental en tiempo real. Sincroniza datos a través de <em>WebSockets</em> instantáneos cuando un pasajero solicita un mototaxi.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- =================================================== -->
      <!-- SECCIÓN 2: MODELO ECONÓMICO Y DE PAGOS DE RIBERGO -->
      <!-- =================================================== -->
      <h2><span class="num">02</span> MODELO DE TARIFACIÓN, COMISIÓN JUSTA Y SISTEMA DE PAGOS</h2>

      <p>
        El modelo financiero de RiberGO fue diseñado milimétricamente respetando la realidad de la economía de Riberalta:
      </p>

      <div class="grid-3">
        <div class="card">
          <div class="card-icon">🛵</div>
          <div class="card-title">Tarifa Urbana: 10 Bs</div>
          <p class="card-desc">Tarifa fija estándar por carrera urbana. El pasajero viaja seguro con precio conocido de antemano, sin negociaciones bajo la lluvia o en la noche.</p>
        </div>
        <div class="card">
          <div class="card-icon">🪙</div>
          <div class="card-title">Comisión Justa: 1 Bs</div>
          <p class="card-desc">La app descuenta únicamente <strong>1 Bs</strong> por carrera terminada de los créditos del chofer. El mototaxista se queda con <strong>9 Bs netos (90%)</strong> en su bolsillo.</p>
        </div>
        <div class="card">
          <div class="card-icon">🎁</div>
          <div class="card-title">Bono de Bienvenida: 50 Bs</div>
          <p class="card-desc">Cada conductor nuevo recibe <strong>50 BOB en créditos</strong> gratuitos de saldo en su billetera digital, equivalentes a sus primeros <strong>50 viajes libres</strong>.</p>
        </div>
      </div>

      <h3>2.1. Métodos de Pago Disponibles para el Pasajero</h3>
      <p>
        El usuario pasajero puede abonar los <strong>10 Bs</strong> del pasaje utilizando tres modalidades integradas:
      </p>
      <ul>
        <li><strong>1. Pago en Efectivo (Cash)</strong>: Modalidad tradicional directa. El pasajero abona los 10 Bs billete a mano al mototaxista al descender del vehículo.</li>
        <li><strong>2. Pago por Código QR (Simple QR / Banca Móvil)</strong>: El pasajero abre su aplicación bancaria preferida (Banco Unión, BNB, Banco Mercantil, BCP, Banco Fie o billeteras como Yape Bolivia), escanea el código QR del chofer y transfiere los 10 Bs al instante.</li>
        <li><strong>3. Saldo Digital / Créditos Prepagados en App</strong>: Los usuarios pueden tener saldo a favor en su perfil de RiberGO para viajar sin necesidad de llevar efectivo físico.</li>
      </ul>

      <h3>2.2. Sistema de Billetera Digital del Conductor (Driver Wallet) y Créditos</h3>
      <p>
        Para erradicar cobradores en persona, cuotas fijas mensuales extorsivas o cortes arbitrarios, el conductor opera mediante un sistema de <strong>Billetera Digital Prepagada</strong>:
      </p>
      <ol>
        <li><strong>Deducción Automática por Carrera</strong>: Cada vez que el conductor marca un viaje como finalizado (<code>TRIP_COMPLETED</code>), la plataforma cobra automáticamente <strong>1 Bs de comisión</strong> deduciéndolo de su saldo de billetera en Firestore (<code>walletBalance - 1</code>).</li>
        <li><strong>Recargas Fáciles por QR</strong>: Desde su vista de Ingresos (<code>IncomeView</code>), el chofer presiona el botón <em>"Recargar Saldo QR"</em>, se abre el modal oficial (<code>QrTopupModal</code>) y selecciona montos accesibles: <strong>20 Bs</strong> (20 carreras), <strong>50 Bs</strong> (50 carreras) o <strong>100 Bs</strong> (100 carreras).</li>
        <li><strong>Acreditación Instantánea</strong>: El conductor paga desde su banca móvil escaneando el código QR oficial de la plataforma y su saldo se acredita en segundos 24/7.</li>
      </ol>

      <!-- DIAGRAMA VISUAL 1: FLUJO FINANCIERO Y DE PAGO SVG -->
      <div class="diagram-container">
        <svg width="860" height="230" viewBox="0 0 860 230" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pasajero Box -->
          <rect x="30" y="40" width="220" height="150" rx="16" fill="#131C29" stroke="#38BDF8" stroke-width="2"/>
          <text x="140" y="70" fill="#38BDF8" font-size="14" font-weight="bold" text-anchor="middle">PASAJERO</text>
          <text x="140" y="95" fill="#FFFFFF" font-size="20" font-weight="900" text-anchor="middle">PAGA 10 Bs</text>
          <text x="140" y="125" fill="#94A3B8" font-size="11" text-anchor="middle">Opciones de Pago:</text>
          <text x="140" y="145" fill="#CBD5E1" font-size="11" text-anchor="middle">• Efectivo (Mano a mano)</text>
          <text x="140" y="165" fill="#CBD5E1" font-size="11" text-anchor="middle">• Simple QR (Banca Móvil)</text>

          <!-- Arrow Pasajero a Conductor -->
          <line x1="250" y1="115" x2="330" y2="115" stroke="#F4C542" stroke-width="3"/>
          <polygon points="330,109 342,115 330,121" fill="#F4C542"/>
          <text x="290" y="105" fill="#F4C542" font-size="11" font-weight="bold" text-anchor="middle">10 Bs</text>

          <!-- Conductor Box -->
          <rect x="350" y="40" width="220" height="150" rx="16" fill="#131C29" stroke="#10B981" stroke-width="2"/>
          <text x="460" y="70" fill="#10B981" font-size="14" font-weight="bold" text-anchor="middle">CONDUCTOR</text>
          <text x="460" y="95" fill="#FFFFFF" font-size="20" font-weight="900" text-anchor="middle">RECIBE 10 Bs</text>
          <text x="460" y="125" fill="#94A3B8" font-size="11" text-anchor="middle">Retención Directa:</text>
          <text x="460" y="145" fill="#10B981" font-size="12" font-weight="bold" text-anchor="middle">Conserva 9 Bs Netos (90%)</text>
          <text x="460" y="165" fill="#CBD5E1" font-size="11" text-anchor="middle">Billetera con bono 50 Bs</text>

          <!-- Arrow Conductor a Plataforma -->
          <line x1="570" y1="115" x2="650" y2="115" stroke="#F4C542" stroke-width="3"/>
          <polygon points="650,109 662,115 650,121" fill="#F4C542"/>
          <text x="610" y="105" fill="#F4C542" font-size="11" font-weight="bold" text-anchor="middle">1 Bs</text>

          <!-- Plataforma Box -->
          <rect x="670" y="40" width="160" height="150" rx="16" fill="#131C29" stroke="#F4C542" stroke-width="2"/>
          <text x="750" y="70" fill="#F4C542" font-size="14" font-weight="bold" text-anchor="middle">RIBERGO</text>
          <text x="750" y="95" fill="#FFFFFF" font-size="18" font-weight="900" text-anchor="middle">COMISIÓN 1 Bs</text>
          <text x="750" y="125" fill="#94A3B8" font-size="11" text-anchor="middle">Débito Automático:</text>
          <text x="750" y="145" fill="#CBD5E1" font-size="11" text-anchor="middle">Resta 1 crédito de saldo</text>
          <text x="750" y="165" fill="#F4C542" font-size="10" font-weight="bold" text-anchor="middle">Cero Cobranzas en Calle</text>
        </svg>
        <div class="diagram-caption">Figura 1: Arquitectura Financiera de RiberGO — Pasaje 10 Bs, Ganancia 9 Bs y Comisión Transparente de 1 Bs</div>
      </div>

      <!-- =================================================== -->
      <!-- SECCIÓN 3: MOCKUPS GRÁFICOS REALES DE LA APP -->
      <!-- =================================================== -->
      <h2><span class="num">03</span> MOCKUPS GRÁFICOS Y COMPONENTES VISUALES DE LA APLICACIÓN</h2>

      <p>
        A continuación se ilustran las dos pantallas estelares de la plataforma tal y como se visualizan e interactúan en el teléfono inteligente:
      </p>

      <!-- DIAGRAMA VISUAL 2: MOCKUPS DE LAS PANTALLAS SVG -->
      <div class="diagram-container">
        <svg width="860" height="480" viewBox="0 0 860 480" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- PHONE 1: PASAJERO -->
          <g transform="translate(60, 20)">
            <!-- Marco Phone -->
            <rect x="0" y="0" width="320" height="440" rx="32" fill="#0A0F17" stroke="#25354C" stroke-width="4"/>
            <!-- Notch -->
            <rect x="110" y="8" width="100" height="14" rx="7" fill="#1E2B3E"/>
            
            <!-- Map Simulation -->
            <rect x="12" y="30" width="296" height="230" rx="18" fill="#141E2A"/>
            <!-- Grid lines / Calles de Riberalta -->
            <line x1="20" y1="90" x2="300" y2="90" stroke="#1E2E42" stroke-width="3"/>
            <line x1="20" y1="160" x2="300" y2="160" stroke="#1E2E42" stroke-width="4"/>
            <line x1="100" y1="30" x2="100" y2="250" stroke="#1E2E42" stroke-width="3"/>
            <line x1="220" y1="30" x2="220" y2="250" stroke="#1E2E42" stroke-width="3"/>
            <!-- Ruta amarilla -->
            <path d="M100 160 L180 160 L180 90 L220 90" stroke="#F4C542" stroke-width="4" stroke-linecap="round"/>
            
            <!-- Pin Origen -->
            <circle cx="100" cy="160" r="7" fill="#38BDF8" stroke="#FFFFFF" stroke-width="2"/>
            <!-- Pin Moto -->
            <circle cx="220" cy="90" r="10" fill="#F4C542" stroke="#FFFFFF" stroke-width="2"/>
            <text x="220" y="94" fill="#05080C" font-size="10" font-weight="bold" text-anchor="middle">🏍️</text>

            <!-- Card Inferior de Tarifa (10 Bs) -->
            <rect x="16" y="270" width="288" height="150" rx="20" fill="#111823" stroke="#223348" stroke-width="1.5"/>
            <text x="32" y="295" fill="#F4C542" font-size="11" font-weight="bold">TARIFA PLANA URBANA</text>
            <text x="32" y="325" fill="#FFFFFF" font-size="24" font-weight="900">10.00 Bs</text>
            <text x="140" y="325" fill="#10B981" font-size="11" font-weight="bold">✓ Precio Justo</text>

            <!-- Selector de Métodos de Pago -->
            <rect x="32" y="340" width="75" height="26" rx="8" fill="#1E2C3F" stroke="#F4C542" stroke-width="1"/>
            <text x="70" y="357" fill="#FFFFFF" font-size="10" font-weight="bold" text-anchor="middle">💵 Efectivo</text>
            <rect x="115" y="340" width="65" height="26" rx="8" fill="#141E2B"/>
            <text x="147" y="357" fill="#94A3B8" font-size="10" text-anchor="middle">📱 QR</text>
            <rect x="188" y="340" width="90" height="26" rx="8" fill="#141E2B"/>
            <text x="233" y="357" fill="#94A3B8" font-size="10" text-anchor="middle">💳 Créditos</text>

            <!-- Botón Pedir Mototaxi -->
            <rect x="32" y="375" width="256" height="34" rx="12" fill="#F4C542"/>
            <text x="160" y="397" fill="#05080C" font-size="13" font-weight="900" text-anchor="middle">PEDIR MOTOTAXI</text>
          </g>

          <!-- PHONE 2: CONDUCTOR -->
          <g transform="translate(480, 20)">
            <!-- Marco Phone -->
            <rect x="0" y="0" width="320" height="440" rx="32" fill="#0A0F17" stroke="#25354C" stroke-width="4"/>
            <!-- Notch -->
            <rect x="110" y="8" width="100" height="14" rx="7" fill="#1E2B3E"/>

            <!-- Header Conductor -->
            <rect x="16" y="30" width="288" height="60" rx="16" fill="#111823" stroke="#223348" stroke-width="1.5"/>
            <text x="32" y="55" fill="#CBD5E1" font-size="12" font-weight="bold">Estado:</text>
            <!-- Switch En Línea -->
            <rect x="80" y="42" width="80" height="22" rx="11" fill="#10B981"/>
            <circle cx="148" cy="53" r="8" fill="#FFFFFF"/>
            <text x="110" y="57" fill="#FFFFFF" font-size="10" font-weight="bold">EN LÍNEA</text>

            <!-- Saldo de Billetera -->
            <text x="200" y="52" fill="#94A3B8" font-size="10">Billetera:</text>
            <text x="200" y="70" fill="#F4C542" font-size="15" font-weight="900">48.00 Bs</text>

            <!-- Tarjeta de Carrera Entrante -->
            <rect x="16" y="105" width="288" height="240" rx="20" fill="#131D2A" stroke="#F4C542" stroke-width="2"/>
            <text x="32" y="132" fill="#F4C542" font-size="12" font-weight="bold">⚡ NUEVA CARRERA ENTRANTE</text>
            
            <circle cx="42" cy="160" r="6" fill="#38BDF8"/>
            <text x="56" y="164" fill="#FFFFFF" font-size="12" font-weight="bold">Plaza Principal 3 de Febrero</text>
            <circle cx="42" cy="190" r="6" fill="#F4C542"/>
            <text x="56" y="194" fill="#FFFFFF" font-size="12" font-weight="bold">Hospital General de Riberalta</text>

            <rect x="32" y="215" width="256" height="50" rx="12" fill="#0C131D"/>
            <text x="44" y="235" fill="#94A3B8" font-size="11">Tarifa al Pasajero:</text>
            <text x="44" y="252" fill="#FFFFFF" font-size="14" font-weight="900">10.00 Bs</text>
            <text x="160" y="235" fill="#10B981" font-size="11">Tu Ganancia:</text>
            <text x="160" y="252" fill="#10B981" font-size="14" font-weight="900">9.00 Bs (-1 Bs)</text>

            <!-- Botón Aceptar Carrera -->
            <rect x="32" y="280" width="256" height="45" rx="14" fill="#10B981"/>
            <text x="160" y="308" fill="#FFFFFF" font-size="14" font-weight="900" text-anchor="middle">ACEPTAR CARRERA</text>

            <!-- Botón Recarga QR Inferior -->
            <rect x="16" y="360" width="288" height="55" rx="16" fill="#1A2433" stroke="#F4C542" stroke-width="1"/>
            <text x="40" y="385" fill="#F4C542" font-size="12" font-weight="bold">💳 Recargar Saldo con Simple QR</text>
            <text x="40" y="402" fill="#94A3B8" font-size="10">20 Bs • 50 Bs • 100 Bs (Banca Móvil)</text>
          </g>
        </svg>
        <div class="diagram-caption">Figura 2: Interfaces reales de RiberGO — A la izquierda: Pasajero (Mapa, Tarifa 10 Bs y Métodos de Pago). A la derecha: Conductor (En Línea, Alerta con 9 Bs netos y Billetera QR).</div>
      </div>

      <!-- =================================================== -->
      <!-- SECCIÓN 4: DESGLOSE MINUCIOSO ARCHIVO POR ARCHIVO -->
      <!-- =================================================== -->
      <h2><span class="num">04</span> DICCIONARIO Y DESGLOSE EXHAUSTIVO ARCHIVO POR ARCHIVO</h2>

      <p>
        A continuación se explica la totalidad de los archivos que componen el repositorio de la aplicación RiberGO, su misión técnica y funciones específicas:
      </p>

      <h3>4.1. Núcleo de Entrada y Vistas (<code>app/</code> y <code>components/views/</code>)</h3>
      <ul>
        <li><code>app/page.tsx</code>: Punto neurálgico de arranque. Conecta con el observador <code>onAuthStateChanged</code> de Firebase Auth, inicializa la animación de Splash (2 segundos), registra el Service Worker (<code>/sw.js</code>) e incluye el modal inteligente de instalación PWA (<code>SmartPwaInstallModal</code>).</li>
        <li><code>app/layout.tsx</code>: Configura el estándar HTML5 móvil con atributos <code>viewport-fit=cover</code>, meta-etiquetas PWA y el tema de fondo oscuro azabache <code>#05080C</code>.</li>
        <li><code>components/views/PassengerHome.tsx</code>: Controla la experiencia completa del cliente en Riberalta:
          <ul>
            <li>Carga el mapa interactivo (<code>MapView</code>).</li>
            <li>Detecta la posición por GPS o ubica al usuario en el centro de Riberalta.</li>
            <li>Ofrece destinos rápidos predefinidos (Mercado Central, Aeropuerto, Hospital, Plaza 3 de Febrero).</li>
            <li>Fija la tarjeta de tarifa en <strong>10.00 Bs</strong>.</li>
            <li>Permite escoger método de pago: <strong>Efectivo</strong>, <strong>QR</strong> o <strong>Créditos</strong>.</li>
            <li>Ejecuta el radar de búsqueda y muestra en tiempo real nombre, moto, placa y calificación del mototaxista asignado.</li>
          </ul>
        </li>
        <li><code>components/views/DriverHome.tsx</code>: Cabina de mando del chofer:
          <ul>
            <li>Interruptor de activación (<em>Switch En Línea</em>).</li>
            <li>Escucha en tiempo real mediante <code>onSnapshot</code> nuevas solicitudes.</li>
            <li>Alerta sonora y háptica de carrera entrante.</li>
            <li>Desglose visible: <strong>Tarifa: 10 Bs</strong>, <strong>Tu Ganancia: 9 Bs</strong>, <strong>Comisión: 1 Bs</strong>.</li>
            <li>Botón de navegación hacia el pasajero y finalización de viaje.</li>
          </ul>
        </li>
        <li><code>components/views/IncomeView.tsx</code>: Centro contable del chofer donde visualiza su saldo actual en créditos (ej. 48.00 BOB), carreras del día y el botón directo de recarga QR.</li>
        <li><code>components/views/MessagesView.tsx</code>: Chat bidireccional en tiempo real entre conductor y pasajero, permitiendo enviar mensajes instantáneos ("Ya estoy afuera de tu casa", "Llego en 2 min").</li>
        <li><code>components/views/TripsView.tsx</code>: Registro histórico de viajes completados con fecha, hora, origen, destino y monto cancelado.</li>
        <li><code>components/views/ProfileView.tsx</code>: Información del conductor/pasajero, estrellas de calificación, verificación de documentos y cambio de rol.</li>
        <li><code>components/views/LoginView.tsx</code> y <code>RegisterView.tsx</code>: Autenticación mediante celular (+591) con código PIN o inicio seguro con cuenta de Google.</li>
      </ul>

      <h3>4.2. Módulo de Pagos, Billetera y Modales (<code>components/modals/</code>)</h3>
      <ul>
        <li><code>components/modals/QrTopupModal.tsx</code>: <strong>El motor de recarga de créditos</strong>. Genera el código QR oficial para que el conductor recargue 20, 50 o 100 BOB mediante su aplicación bancaria (Banco Unión, BNB, BCP, Fie, Yape). Tras la confirmación, actualiza de inmediato el campo <code>walletBalance</code> en Firestore.</li>
        <li><code>components/modals/DriverWalletTutorialModal.tsx</code>: Guía interactiva de 4 pasos que educa al mototaxista:
          <ol>
            <li>Bono de bienvenida de 50 BOB.</li>
            <li>Cobro íntegro de los 10 Bs en mano o a su QR personal.</li>
            <li>Descuento transparente de 1 Bs por carrera terminada.</li>
            <li>Recargas instantáneas 24/7 mediante QR sin acudir a oficinas físicas.</li>
          </ol>
        </li>
        <li><code>components/modals/SmartPwaInstallModal.tsx</code>: Detecta el sistema operativo móvil y despliega instrucciones ilustradas: en Android enseña el botón "Instalar App", y en iPhone muestra cómo tocar "Compartir" y "Añadir a Pantalla de Inicio" en Safari.</li>
      </ul>

      <h3>4.3. Estado Global y Capa de Datos (<code>store/</code> y <code>services/</code>)</h3>
      <ul>
        <li><code>store/useAppStore.ts</code>: Store global en Zustand. Gobierna las interfaces fundamentales:
          <pre><code>// Estado y tipos de cobro en RiberGO
export interface ActiveTripInfo {
  id: string;
  pickup: LocationPoint;
  destination: LocationPoint;
  price: 10;                  // 10.00 Bs oficial
  platformFee: 1;             // 1.00 Bs de comisión
  driverEarnings: 9;          // 9.00 Bs netos para el chofer
  paymentMethod: 'CASH' | 'QR' | 'WALLET';
  driver?: DriverData;
  passengerName?: string;
}</code></pre>
        </li>
        <li><code>services/apiService.ts</code>: Centraliza las llamadas a Cloud Firestore:
          <ul>
            <li><code>requestTrip()</code>: Inserta el viaje en la colección <code>trips</code>.</li>
            <li><code>acceptTrip()</code>: Asigna el conductor al viaje.</li>
            <li><code>completeTrip()</code>: Finaliza la carrera y descuenta 1 Bs del <code>walletBalance</code> del conductor.</li>
            <li><code>topUpDriverWallet()</code>: Registra la recarga de saldo por QR.</li>
            <li><code>sendMessage()</code>: Envía mensajes en tiempo real al chat del viaje.</li>
          </ul>
        </li>
        <li><code>services/mockData.ts</code>: Contiene las coordenadas verificadas de Riberalta (<code>lat: -11.0061, lng: -66.0747</code>) y los destinos más frecuentados por los vecinos riberalteños.</li>
        <li><code>lib/firebase.ts</code>: Inicializa el SDK de Firebase con las claves del proyecto <code>ribergo-app</code>.</li>
        <li><code>utils/audio.ts</code>: Sintetizador de tonos analógicos puros mediante Web Audio API para confirmar solicitudes y llegadas.</li>
        <li><code>utils/haptics.ts</code>: Genera patrones de vibración física en el celular ante eventos clave de la carrera.</li>
      </ul>

      <!-- DIAGRAMA VISUAL 3: MÁQUINA DE ESTADOS Y COBRO DE COMISIÓN SVG -->
      <div class="diagram-container">
        <svg width="860" height="190" viewBox="0 0 860 190" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Step 1 -->
          <rect x="20" y="60" width="140" height="60" rx="12" fill="#131C29" stroke="#64748B" stroke-width="2"/>
          <text x="90" y="88" fill="#CBD5E1" font-size="12" font-weight="bold" text-anchor="middle">1. SOLICITUD</text>
          <text x="90" y="105" fill="#94A3B8" font-size="10" text-anchor="middle">Tarifa fijada: 10 Bs</text>

          <line x1="160" y1="90" x2="195" y2="90" stroke="#F4C542" stroke-width="2"/>
          <polygon points="195,86 203,90 195,94" fill="#F4C542"/>

          <!-- Step 2 -->
          <rect x="205" y="60" width="150" height="60" rx="12" fill="#131C29" stroke="#F4C542" stroke-width="2"/>
          <text x="280" y="88" fill="#F4C542" font-size="12" font-weight="bold" text-anchor="middle">2. ACEPTACIÓN</text>
          <text x="280" y="105" fill="#94A3B8" font-size="10" text-anchor="middle">Moto asignada en GPS</text>

          <line x1="355" y1="90" x2="390" y2="90" stroke="#F4C542" stroke-width="2"/>
          <polygon points="390,86 398,90 390,94" fill="#F4C542"/>

          <!-- Step 3 -->
          <rect x="400" y="60" width="140" height="60" rx="12" fill="#131C29" stroke="#38BDF8" stroke-width="2"/>
          <text x="470" y="88" fill="#38BDF8" font-size="12" font-weight="bold" text-anchor="middle">3. EN CURSO</text>
          <text x="470" y="105" fill="#94A3B8" font-size="10" text-anchor="middle">Chat en tiempo real</text>

          <line x1="540" y1="90" x2="575" y2="90" stroke="#F4C542" stroke-width="2"/>
          <polygon points="575,86 583,90 575,94" fill="#F4C542"/>

          <!-- Step 4 -->
          <rect x="585" y="60" width="130" height="60" rx="12" fill="#131C29" stroke="#10B981" stroke-width="2"/>
          <text x="650" y="88" fill="#10B981" font-size="12" font-weight="bold" text-anchor="middle">4. COBRO 10 Bs</text>
          <text x="650" y="105" fill="#94A3B8" font-size="10" text-anchor="middle">Efectivo o Simple QR</text>

          <line x1="715" y1="90" x2="745" y2="90" stroke="#F4C542" stroke-width="2"/>
          <polygon points="745,86 753,90 745,94" fill="#F4C542"/>

          <!-- Step 5 -->
          <rect x="755" y="60" width="90" height="60" rx="12" fill="#131C29" stroke="#F4C542" stroke-width="2"/>
          <text x="800" y="85" fill="#F4C542" font-size="11" font-weight="bold" text-anchor="middle">5. -1 Bs</text>
          <text x="800" y="103" fill="#10B981" font-size="9" font-weight="bold" text-anchor="middle">+9 Bs Netos</text>
        </svg>
        <div class="diagram-caption">Figura 3: Ciclo de vida completo del viaje y liquidación automática de comisión de 1 Bs</div>
      </div>

      <!-- =================================================== -->
      <!-- SECCIÓN 5: CAPACIDAD PROGRESSIVE WEB APP (PWA) -->
      <!-- =================================================== -->
      <h2><span class="num">05</span> ARQUITECTURA PWA: INSTALACIÓN SIN TIENDAS Y OPERACIÓN OFFLINE</h2>

      <p>
        Uno de los mayores logros de ingeniería de RiberGO radica en su condición de <strong>Progressive Web App</strong>:
      </p>

      <ul>
        <li><strong>Instalación Directa</strong>: El usuario visita <code>https://ribergo-app.vercel.app</code> e inmediatamente recibe la opción de agregar la app a su pantalla de inicio como una aplicación nativa.</li>
        <li><strong>Cero Espacio en Memoria</strong>: Frente a aplicaciones tradicionales que exigen entre 50 y 150 MB de descarga inicial, RiberGO pesa <strong>menos de 1.2 MB</strong> de caché local, ideal para teléfonos con espacio saturado.</li>
        <li><strong>Service Worker (<code>public/sw.js</code>)</strong>: Intercepta peticiones HTTP, almacena en caché las librerías esenciales y garantiza que la interfaz cargue al instante incluso con mala cobertura 3G o 4G en zonas periféricas de Riberalta.</li>
        <li><strong>Manifiesto Web (<code>public/manifest.json</code>)</strong>: Declara el comportamiento a pantalla completa (<code>display: standalone</code>), eliminando barras de navegación y URL del navegador.</li>
      </ul>

      <!-- =================================================== -->
      <!-- SECCIÓN 6: CONCLUSIÓN Y VALOR ESTRATÉGICO -->
      <!-- =================================================== -->
      <h2><span class="num">06</span> CONCLUSIÓN Y VALOR ESTRATÉGICO PARA RIBERALTA</h2>

      <p>
        <strong>RiberGO</strong> materializa un ecosistema tecnológico equilibrado, justo y sustentable:
      </p>
      <ul>
        <li>Para el <strong>Pasajero</strong>: Previsibilidad con <strong>tarifa exacta de 10 Bs</strong>, múltiples opciones de pago (Efectivo o Simple QR) y certeza de viajar con un conductor identificado.</li>
        <li>Para el <strong>Conductor Mototaxista</strong>: Dignificación laboral con <strong>9 Bs netos por carrera</strong>, bono de inicio de <strong>50 Bs</strong>, comisiones transparentes de solo <strong>1 Bs</strong> y recargas instantáneas por QR sin intermediarios.</li>
        <li>Para <strong>Riberalta</strong>: Un salto hacia la modernización de su transporte amazónico con tecnología desarrollada con los más altos estándares mundiales de ingeniería.</li>
      </ul>

      <div style="margin-top: 55px; padding-top: 25px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-dim);">
        <div>Proyecto RiberGO • Riberalta, Beni, Bolivia</div>
        <div>Desarrollo Local Independiente • 2026</div>
      </div>

    </div>
  </div>

</body>
</html>
`;

console.log('Escribiendo archivo HTML único a disco...');
fs.writeFileSync(outputPath, htmlContent, 'utf8');
fs.writeFileSync(publicPath, htmlContent, 'utf8');
console.log('HTML generado con éxito en:', outputPath);

console.log('Generando PDF actualizado con headless Chrome...');
try {
  execSync(
    `google-chrome --headless --no-sandbox --disable-gpu --run-all-compositor-stages-before-draw --virtual-time-budget=2000 --print-to-pdf="${pdfPath}" "file://${outputPath}"`,
    { stdio: 'inherit' }
  );
  console.log('PDF generado con éxito en:', pdfPath);
} catch (e) {
  console.warn('Aviso sobre generación PDF:', e.message);
}
