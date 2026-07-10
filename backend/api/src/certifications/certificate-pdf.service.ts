import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { promises as fs } from 'fs';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

export interface CertificateTemplateData {
  recipientFullName: string;
  programTitle: string;
  completionDate: string;
  certificateId: string;
  verificationUrl: string;
  issuerName: string;
  issuerRole: string;
  signerTwoName: string;
  signerTwoRole: string;
  organizationName: string;
  courseMetadata: string;
  qrCodeDataUrl: string;
}

/** Inline fallback only when no template file exists on disk (misconfiguration). */
const INLINE_TEMPLATE_FALLBACK = `<!doctype html><html><head><meta charset="UTF-8"/><style>@page{size:A4 landscape;margin:0}body{margin:0;font-family:Arial,sans-serif}.page{width:297mm;height:210mm;position:relative;padding:16mm;border:1px solid #cbd5e1}.title{font-size:28px;font-weight:700}.name{font-size:48px;margin-top:8mm;font-family:Times New Roman,serif}.course{margin-top:6mm;font-size:22px;font-weight:700}.meta{margin-top:4mm;color:#475569}.qr{position:absolute;right:16mm;bottom:16mm;text-align:right}.qr img{width:110px;height:110px}</style></head><body><main class="page"><div class="title">COURSE CERTIFICATE</div><div class="meta">{{COMPLETION_DATE}}</div><div class="name">{{RECIPIENT_FULL_NAME}}</div><div class="course">{{PROGRAM_TITLE}}</div><div class="meta">{{COURSE_METADATA}}</div><div class="meta">Certificate ID: {{CERTIFICATE_ID}}</div><div class="meta">{{ISSUER_NAME}} - {{ISSUER_ROLE}}</div><div class="meta">{{SIGNER_TWO_NAME}} - {{SIGNER_TWO_ROLE}}</div><div class="qr"><img src="{{QR_CODE_DATA_URL}}" alt="qr"/><div>{{VERIFICATION_URL}}</div></div></main></body></html>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);

  constructor(private readonly configService: ConfigService) {}

  async buildPdf(data: Omit<CertificateTemplateData, 'qrCodeDataUrl'>): Promise<Buffer> {
    const qrCodeDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      type: 'image/png',
      margin: 0,
      width: 140,
      errorCorrectionLevel: 'M',
    });

    const hydrated = await this.hydrateTemplate({
      ...data,
      qrCodeDataUrl,
    });

    const browser = await this.launchBrowser();

    try {
      const page = await browser.newPage();
      // Template is designed at 1122×794px — viewport avoids clipping in headless.
      await page.setViewport({ width: 1200, height: 850, deviceScaleFactor: 2 });

      await page.setContent(hydrated, {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      });

      await page.evaluate(async () => {
        try {
          await document.fonts.ready;
        } catch {
          /* ignore */
        }
      });
      // Let Google Fonts / layout settle without requiring networkidle (blocked CDNs would hang).
      await new Promise((r) => setTimeout(r, 900));

      // Collapse body to exactly the frame size so Puppeteer never creates a second page.
      // The template body has min-height:100vh + padding:20px which overflows A4 landscape.
      await page.addStyleTag({
        content: `
          html, body {
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
            overflow: hidden !important;
          }
          .frame-outer {
            box-shadow: none !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* ── Enhanced Subul branding ── */
          .ribbon-svg [fill="#2c3e50"], .ribbon-svg [fill="#1a2940"] {
            fill: #1a1a2e !important;
          }
          .course-title {
            font-size: 19px !important;
            line-height: 1.3 !important;
            color: #1a1a2e !important;
          }
          .recipient-name {
            font-size: 54px !important;
            background: linear-gradient(135deg, #1a1a2e 0%, #6b3fa0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .verify-url {
            color: #8B1CC8 !important;
            font-weight: 700 !important;
          }
          .sig-rule { background: linear-gradient(90deg, #E8177D, #8B1CC8) !important; height: 2px !important; }
          .seal-bg {
            background: radial-gradient(circle at 38% 32%, rgba(232,23,125,0.08), rgba(139,28,200,0.12)) !important;
            border-color: rgba(139,28,200,0.35) !important;
          }
          .seal-bg::before { border-color: rgba(139,28,200,0.2) !important; }
          .border-outer { border-color: rgba(139,28,200,0.25) !important; }
          .border-inner { border-color: rgba(232,23,125,0.15) !important; }
          .qr-box { border-color: rgba(139,28,200,0.3) !important; border-radius: 6px !important; }
        `,
      });

      await page.emulateMediaType('screen');
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private async launchBrowser() {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--disable-crashpad',
      '--disable-features=Crashpad',
      '--no-zygote',
      '--remote-debugging-port=0',
      '--user-data-dir=/tmp/chrome-user-data',
      '--data-path=/tmp/chrome-data',
      '--disk-cache-dir=/tmp/chrome-cache',
    ];

    const configuredExecutablePath = this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH')?.trim();
    const executablePathCandidates = [
      configuredExecutablePath,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ].filter((v): v is string => Boolean(v && v.trim().length > 0));
    const launchCandidates: Array<NonNullable<Parameters<typeof puppeteer.launch>[0]>> = [
      ...executablePathCandidates.map((executablePath) => ({
        headless: true as const,
        args: launchArgs,
        executablePath,
      })),
      {
        headless: true as const,
        args: launchArgs,
      },
      {
        headless: true as const,
        args: launchArgs,
        channel: 'chrome' as const,
      },
    ];

    let lastError: unknown = null;
    for (const options of launchCandidates) {
      try {
        return await puppeteer.launch(options);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Puppeteer launch attempt failed${options.executablePath ? ` (executablePath=${options.executablePath})` : ''}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.error(
      `All Puppeteer launch attempts failed. executablePath candidates: ${executablePathCandidates.join(', ') || 'none'}`,
    );
    throw lastError instanceof Error ? lastError : new Error('Unable to launch browser for certificate PDF generation');
  }

  buildVerificationUrl(verificationCode: string): string {
    const frontend = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/+$/, '');
    let publicBase = frontend;
    try {
      publicBase = new URL(frontend).origin;
    } catch {
      // keep configured fallback as-is
    }
    return `${publicBase}/verify/certificate/${encodeURIComponent(verificationCode)}`;
  }

  // ─── Course Completion Certificate ───────────────────────────────────────────

  async buildCourseCompletionPdf(data: {
    recipientFullName: string;
    courseTitle: string;
    completionDate: string;
    certificateId: string;
    verificationUrl: string;
  }): Promise<Buffer> {
    const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      type: 'image/png',
      margin: 0,
      width: 120,
      errorCorrectionLevel: 'M',
    });

    const frontendUrl = this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    const html = this.buildCourseCompletionHtml({ ...data, qrDataUrl, frontendUrl });
    const browser = await this.launchBrowser();

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 850, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.evaluate(async () => {
        try { await document.fonts.ready; } catch { /* ignore */ }
      });
      await new Promise((r) => setTimeout(r, 900));
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildCourseCompletionHtml(data: {
    recipientFullName: string;
    courseTitle: string;
    completionDate: string;
    certificateId: string;
    verificationUrl: string;
    qrDataUrl: string;
    frontendUrl: string;
  }): string {
    const e = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 landscape;margin:0}
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&family=Montserrat:wght@300;400;600;700&display=swap');
  body{background:#fff;font-family:'Montserrat',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:0;overflow:hidden}
  .frame{width:1122px;height:794px;background:#fff;position:relative;overflow:hidden;flex-shrink:0}

  /* right gradient border */
  .right-border{position:absolute;top:0;right:0;width:6px;height:100%;background:linear-gradient(180deg,#E8177D 0%,#8B1CC8 100%);z-index:10}

  /* top thin line */
  .top-line{position:absolute;top:22px;left:280px;right:20px;height:1.5px;background:linear-gradient(90deg,rgba(232,23,125,0.7),rgba(139,28,200,0.4));z-index:5}
  .bottom-line-right{position:absolute;bottom:22px;right:20px;left:280px;height:1px;background:rgba(139,28,200,0.2);z-index:5}

  /* logo areas */
  .logo-smartovate{position:absolute;top:26px;left:26px;z-index:10}
  .logo-subul{position:absolute;top:14px;right:18px;z-index:10}

  /* wave SVG bottom-left */
  .wave-bg{position:absolute;bottom:0;left:0;width:380px;height:260px;z-index:1;opacity:0.92}

  /* QR + corner brackets */
  .qr-area{position:absolute;left:38px;top:50%;transform:translateY(-58%);z-index:8;display:flex;flex-direction:column;align-items:center;gap:6px}
  .brackets{width:96px;height:96px;position:relative}
  .brackets::before,.brackets::after{content:'';position:absolute;width:24px;height:24px;border-color:#555;border-style:solid}
  .brackets::before{top:0;left:0;border-width:2.5px 0 0 2.5px}
  .brackets::after{bottom:0;right:0;border-width:0 2.5px 2.5px 0}
  .brackets-inner::before,.brackets-inner::after{content:'';position:absolute;width:24px;height:24px;border-color:#555;border-style:solid}
  .brackets-inner::before{bottom:0;left:0;border-width:0 0 2.5px 2.5px}
  .brackets-inner::after{top:0;right:0;border-width:2.5px 2.5px 0 0}
  .qr-img{width:72px;height:72px;margin:12px auto;display:block}
  .qr-label{font-size:7px;color:#888;letter-spacing:0.03em;text-align:center;max-width:90px}

  /* main content */
  .content{position:absolute;top:0;left:160px;right:14px;bottom:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 40px 20px 40px;text-align:center}

  .cert-heading{font-size:58px;font-weight:800;letter-spacing:0.01em;line-height:1;background:linear-gradient(135deg,#E8177D 0%,#8B1CC8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:2px}
  .cert-sub{font-size:18px;font-weight:300;letter-spacing:0.22em;color:#7a7a8c;text-transform:uppercase;margin-bottom:22px}
  .presented-to{font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#9ca3af;margin-bottom:8px}
  .recipient{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-weight:600;font-size:48px;color:#6b3fa0;margin-bottom:10px;line-height:1.1}
  .for-text{font-size:13px;font-weight:400;color:#6b7280;margin-bottom:6px}
  .course-name{font-size:20px;font-weight:700;color:#1e1b4b;margin-bottom:12px;line-height:1.25}
  .description{font-size:12px;font-weight:400;color:#6b7280;line-height:1.6;max-width:480px;margin-bottom:14px}
  .awarded-on{font-size:13px;color:#4b5563;margin-bottom:0}

  /* signature */
  .signature-block{position:absolute;bottom:38px;right:36px;z-index:8;text-align:right}
  .sig-name{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:22px;color:#2d1e4e;margin-bottom:2px}
  .sig-rule{width:160px;height:1.5px;background:linear-gradient(90deg,#E8177D,#8B1CC8);margin:4px 0 4px auto}
  .sig-role{font-size:10px;color:#9ca3af;font-weight:400;letter-spacing:0.05em}

  /* cert id */
  .cert-id{position:absolute;bottom:10px;left:160px;font-size:8px;color:#d1d5db;letter-spacing:0.06em;z-index:6}
</style>
</head>
<body>
<div class="frame">
  <!-- Right border -->
  <div class="right-border"></div>
  <!-- Top line -->
  <div class="top-line"></div>
  <div class="bottom-line-right"></div>

  <!-- Smartovate logo (inline SVG — no external dependency) -->
  <div class="logo-smartovate">
    <svg viewBox="0 0 210 65" xmlns="http://www.w3.org/2000/svg" height="52">
      <circle cx="26" cy="30" r="22" fill="none" stroke="#1a1a2e" stroke-width="2.5"/>
      <path d="M26 10 A20 20 0 1 1 9 23" fill="none" stroke="#E8177D" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="8,18 15,24 8,30" fill="#E8177D"/>
      <text x="56" y="27" font-family="Arial Black,Arial,sans-serif" font-size="19" font-weight="900" fill="#1a1a2e" letter-spacing="0.3">Smartovate</text>
      <text x="57" y="42" font-family="Arial,sans-serif" font-size="6.5" fill="#777" letter-spacing="0.9">A SMARTER WAY TO ENGAGE YOUR TEAM</text>
    </svg>
  </div>

  <!-- Subul logo (inline SVG) -->
  <div class="logo-subul">
    <svg viewBox="0 0 105 55" xmlns="http://www.w3.org/2000/svg" height="54">
      <defs>
        <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#E8177D"/>
          <stop offset="100%" stop-color="#8B1CC8"/>
        </linearGradient>
      </defs>
      <!-- Bars (left to right, increasing height) -->
      <rect x="4"  y="28" width="6" height="13" rx="2" fill="url(#sg)"/>
      <rect x="13" y="20" width="6" height="21" rx="2" fill="url(#sg)"/>
      <rect x="22" y="12" width="6" height="29" rx="2" fill="url(#sg)"/>
      <!-- Arrow pointing left -->
      <line x1="35" y1="20" x2="3" y2="20" stroke="url(#sg)" stroke-width="3.5" stroke-linecap="round"/>
      <polygon points="3,20 11,14 11,26" fill="url(#sg)"/>
      <!-- SUBUL text -->
      <text x="45" y="32" font-family="Arial Black,Arial,sans-serif" font-size="17" font-weight="900" fill="url(#sg)" letter-spacing="2.5">SUBUL</text>
    </svg>
  </div>

  <!-- Wave decoration (bottom-left) — SVG matching image design -->
  <svg class="wave-bg" viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M-40 200 Q80 120 160 170 Q240 220 320 150 Q380 110 420 130" stroke="#c084fc" stroke-width="1.5" fill="none" opacity="0.6"/>
    <path d="M-40 210 Q60 140 150 185 Q230 230 310 160 Q370 120 420 140" stroke="#a855f7" stroke-width="1.2" fill="none" opacity="0.5"/>
    <path d="M-40 220 Q70 155 155 195 Q240 240 315 168 Q375 128 420 148" stroke="#9333ea" stroke-width="1" fill="none" opacity="0.4"/>
    <path d="M-40 180 Q90 100 175 155 Q255 208 335 138 Q390 98 420 115" stroke="#e879f9" stroke-width="2" fill="none" opacity="0.45"/>
    <path d="M-40 190 Q85 110 168 162 Q248 214 328 144 Q385 104 420 122" stroke="#c026d3" stroke-width="1.5" fill="none" opacity="0.38"/>
    <path d="M-40 230 Q50 165 140 200 Q220 240 305 175 Q365 138 420 155" stroke="#7e22ce" stroke-width="0.8" fill="none" opacity="0.35"/>
    <path d="M-40 240 Q55 172 145 205 Q228 242 310 180 Q368 142 420 160" stroke="#6b21a8" stroke-width="0.6" fill="none" opacity="0.28"/>
    <path d="M-40 170 Q95 90 178 148 Q258 202 340 130 Q395 90 420 107" stroke="#d946ef" stroke-width="2.5" fill="none" opacity="0.3"/>
    <path d="M-40 250 Q60 185 148 215 Q232 248 318 185 Q372 148 420 165" stroke="#581c87" stroke-width="0.5" fill="none" opacity="0.22"/>
    <!-- Filled wave shape -->
    <path d="M-40 260 L-40 195 Q80 115 160 162 Q245 212 325 145 Q385 105 420 125 L420 260 Z" fill="url(#waveGrad)" opacity="0.08"/>
    <defs>
      <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7e22ce"/>
        <stop offset="100%" stop-color="#E8177D"/>
      </linearGradient>
    </defs>
  </svg>

  <!-- QR + corner brackets (left side) -->
  <div class="qr-area">
    <div class="brackets brackets-inner">
      <img class="qr-img" src="${e(data.qrDataUrl)}" alt="QR Code">
    </div>
    <div class="qr-label">${e(data.verificationUrl.replace(/^https?:\/\//, '').slice(0, 40))}</div>
  </div>

  <!-- Main content -->
  <div class="content">
    <div class="cert-heading">CERTIFICATE</div>
    <div class="cert-sub">of Accomplishment</div>
    <div class="presented-to">This certificate is proudly presented to</div>
    <div class="recipient">${e(data.recipientFullName)}</div>
    <div class="for-text">for successfully completing the course</div>
    <div class="course-name">${e(data.courseTitle)}</div>
    <div class="description">
      demonstrating outstanding dedication, technical expertise,<br>
      and commitment to professional excellence in modern technology.
    </div>
    <div class="awarded-on">This certificate was awarded on <strong>${e(data.completionDate)}</strong></div>
  </div>

  <!-- Signature -->
  <div class="signature-block">
    <div class="sig-name">Abdelkhalek Bakkari</div>
    <div class="sig-rule"></div>
    <div class="sig-role">CEO &amp; Founder, Smartovate Ltd</div>
  </div>

  <!-- Certificate ID -->
  <div class="cert-id">Certificate ID: ${e(data.certificateId)}</div>
</div>
</body>
</html>`;
  }

  private stripScriptsForPdf(html: string): string {
    return html
      .replace(/<script\b[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/gi, '')
      .replace(/<script\b[^>]*src=["'][^"']+["'][^>]*\/>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  private async hydrateTemplate(data: CertificateTemplateData): Promise<string> {
    const templatePath = await this.resolveTemplatePath();
    const raw = templatePath ? await fs.readFile(templatePath, 'utf8') : INLINE_TEMPLATE_FALLBACK;

    if (!templatePath) {
      this.logger.warn(
        'Certificate template file not found — using minimal inline fallback. Configure CERTIFICATE_TEMPLATE_PATH or add certificate_template.official.html.',
      );
    }

    const replacements: Record<string, string> = {
      '{{RECIPIENT_FULL_NAME}}': escapeHtml(data.recipientFullName),
      '{{PROGRAM_TITLE}}': escapeHtml(data.programTitle),
      '{{COMPLETION_DATE}}': escapeHtml(data.completionDate),
      '{{CERTIFICATE_ID}}': escapeHtml(data.certificateId),
      '{{VERIFICATION_URL}}': escapeHtml(data.verificationUrl),
      '{{ISSUER_NAME}}': escapeHtml(data.issuerName),
      '{{ISSUER_ROLE}}': escapeHtml(data.issuerRole),
      '{{SIGNER_TWO_NAME}}': escapeHtml(data.signerTwoName),
      '{{SIGNER_TWO_ROLE}}': escapeHtml(data.signerTwoRole),
      '{{ORGANIZATION_NAME}}': escapeHtml(data.organizationName),
      '{{COURSE_METADATA}}': escapeHtml(data.courseMetadata),
      '{{QR_CODE_DATA_URL}}': data.qrCodeDataUrl,
    };

    let output = raw;
    Object.entries(replacements).forEach(([key, value]) => {
      output = output.split(key).join(value);
    });

    // Legacy template static placeholders (frontend/lib/certifications/certificate_template.html)
    output = output
      .replaceAll('[Recipient Full Name]', escapeHtml(data.recipientFullName))
      .replaceAll('[Training Program Title]', escapeHtml(data.programTitle))
      .replaceAll('[DD Month YYYY]', escapeHtml(data.completionDate))
      .replaceAll('SMT-0001-IT-2025', escapeHtml(data.certificateId))
      .replaceAll('smartovate.com/verify?id=SMT-0001-IT-2025', escapeHtml(data.verificationUrl))
      .replaceAll('Abdelkhalek Bakkari', escapeHtml(data.issuerName))
      .replaceAll('Insaf Chaibi', escapeHtml(data.signerTwoName));
    output = output
      .replaceAll('CEO &amp; Founder, Smartovate Ltd', escapeHtml(data.issuerRole))
      .replaceAll('AI Project Manager, Smartovate Ltd', escapeHtml(data.signerTwoRole))
      .replaceAll('Smartovate<br>Ltd', escapeHtml(data.organizationName));
    output = output.replace(
      /<div class="course-title">[\s\S]*?<\/div>/,
      `<div class="course-title">${escapeHtml(data.programTitle)}</div>`,
    );
    output = output.replace(
      /<div class="date-line">[\s\S]*?<\/div>/,
      `<div class="date-line">${escapeHtml(data.completionDate)}</div>`,
    );
    output = output.replace(
      /<div class="qr-box"><div id="qrcode"><\/div><\/div>/,
      `<div class="qr-box"><img src="${data.qrCodeDataUrl}" alt="QR code" width="84" height="84" /></div>`,
    );
    output = output.replace(
      /<div class="verify-url" id="verify-url-txt">[\s\S]*?<\/div>/,
      `<div class="verify-url" id="verify-url-txt">${escapeHtml(data.verificationUrl)}</div>`,
    );
    output = output.replace(/<script>\s*const certId[\s\S]*?<\/script>/, '');

    output = this.stripScriptsForPdf(output);
    return output;
  }

  /**
   * Resolve the Smartovate/Subul HTML template.
   *
   * Priority:
   * 1. CERTIFICATE_TEMPLATE_PATH (absolute path)
   * 2. Bundled copy next to this service (dist/certifications/templates/** after nest build assets)
   * 3. Monorepo frontend path (dev: cwd backend/api → ../../frontend/...)
   * 4. Legacy filename certificate_template.html next to official copy
   */
  private async resolveTemplatePath(): Promise<string | null> {
    const candidates = this.getTemplateCandidates();
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        this.logger.log(`Using certificate template: ${candidate}`);
        return candidate;
      } catch {
        // try next
      }
    }
    this.logger.warn(
      `No certificate template found. Tried ${candidates.length} paths (set CERTIFICATE_TEMPLATE_PATH or run: node scripts/sync-certificate-template.mjs).`,
    );
    return null;
  }

  private getTemplateCandidates(): string[] {
    const list: string[] = [];

    const explicit = this.configService.get<string>('CERTIFICATE_TEMPLATE_PATH')?.trim();
    if (explicit) {
      list.push(path.resolve(explicit));
    }

    // Production / compiled: dist/certifications/certificate-pdf.service.js → templates alongside
    list.push(
      path.join(__dirname, 'templates', 'certificate_template.official.html'),
    );
    list.push(
      path.join(__dirname, 'templates', 'certificate_template.html'),
    );

    // Dev / repo: backend/api working directory
    list.push(
      path.join(process.cwd(), '..', '..', 'frontend', 'lib', 'certifications', 'certificate_template.html'),
    );
    list.push(
      path.join(process.cwd(), 'frontend', 'lib', 'certifications', 'certificate_template.html'),
    );
    list.push(
      path.join(process.cwd(), '..', 'frontend', 'lib', 'certifications', 'certificate_template.html'),
    );

    // Monorepo root from src tree (ts-node / jest): backend/api/src/certifications/*.ts
    list.push(
      path.join(__dirname, '..', '..', '..', '..', 'frontend', 'lib', 'certifications', 'certificate_template.html'),
    );

    const seen = new Set<string>();
    return list.filter((p) => {
      const n = path.normalize(p);
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  }
}
