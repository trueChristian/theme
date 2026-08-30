import { access, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "AGENTS.md",
  "assets/brand/logo.jpg",
  "assets/favicons/favicon.ico",
  "assets/footer/city-skyline-reference.png",
  "docs/header.md",
  "docs/footer.md",
  "docs/reference/header-desktop.png",
  "docs/reference/footer-desktop.png",
  "docs/source/header-desktop-source.html",
  "docs/source/footer-source-extract.html",
  "src/html/site-header.html",
  "src/html/site-footer.html",
  "src/html/document-head.html",
  "src/data/site-chrome.json",
  "src/data/main-site-navigation.json",
  "src/js/site-header.js",
  "dist/truechristian-theme.css",
  "dist/truechristian-theme.min.css",
  "dist/truechristian-theme.js",
  "examples/style-guide.html"
];

for (const file of requiredFiles) await access(path.join(root, file));

const logo = await stat(path.join(root, "assets/brand/logo.jpg"));
const favicon = await stat(path.join(root, "assets/favicons/favicon.ico"));
if (logo.size !== 25467) throw new Error(`Unexpected logo byte size: ${logo.size}`);
if (favicon.size !== 1150) throw new Error(`Unexpected favicon byte size: ${favicon.size}`);

const expectedHashes = {
  "assets/brand/logo.jpg": "69b53d5ff26b260efbc859887112a1be8ffc851c335befa3c47a2d3ae9aa53bf",
  "assets/favicons/favicon.ico": "2a28086f29f140828e2c1e03629a5d8306000c456453a9e6d25cf4ccfadb9a2d",
  "assets/footer/city-skyline-reference.png": "e21c5357ee6583efc20eb2c6c3926dfd89554a327cd2ea00518c9b3b7ca4f12a",
  "docs/reference/header-desktop.png": "23c862136e521fb69a46aca6f38b125ec58a7c340638c4b09dc62bc51ebec40f",
  "docs/reference/footer-desktop.png": "392add221768d63d1055ade7d487808ba63236d83b717d60e3fc274df6a46fe2",
  "docs/source/header-desktop-source.html": "1ec7e611834da96da84c35c2fd579e64752ee2687df3379d4da27edddbde99b9"
};
for (const [file, expected] of Object.entries(expectedHashes)) {
  const bytes = await readFile(path.join(root, file));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`Protected source asset changed: ${file}`);
}

const chrome = JSON.parse(await readFile(path.join(root, "src/data/site-chrome.json"), "utf8"));
const mainNavigation = JSON.parse(await readFile(path.join(root, "src/data/main-site-navigation.json"), "utf8"));
const groupLabels = chrome.footer.directoryGroups.map((group) => group.label);
if (groupLabels.join("|") !== "Church Info|Projects|Welcome") throw new Error("Directory group order changed.");
if (chrome.footer.social.label !== "Social Outreach") throw new Error("Social footer group is missing.");
const socialLabels = chrome.footer.social.links.map((link) => link.label);
if (socialLabels.join("|") !== "GitHub|Telegram") throw new Error("Social footer must contain only GitHub and Telegram.");

const requiredCopyright = ["free distribution only", "Privacy Policy", "Mission", "Revival", "We Fear God", "Why we believe the Bible", "Trousseau Chest"];
const copyrightLabels = chrome.footer.copyright.links.map((link) => link.label);
if (copyrightLabels.join("|") !== requiredCopyright.join("|")) throw new Error("Copyright link order changed.");

const header = await readFile(path.join(root, "src/html/site-header.html"), "utf8");
const footer = await readFile(path.join(root, "src/html/site-footer.html"), "utf8");
const example = await readFile(path.join(root, "examples/style-guide.html"), "utf8");
const css = await readFile(path.join(root, "dist/truechristian-theme.css"), "utf8");
const sourceScript = await readFile(path.join(root, "src/js/site-header.js"), "utf8");
const distScript = await readFile(path.join(root, "dist/truechristian-theme.js"), "utf8");
const suppliedHeader = await readFile(path.join(root, "docs/source/header-desktop-source.html"), "utf8");

if (sourceScript !== distScript) throw new Error("Built header script is stale.");
if (chrome.header.siteSpecificLinks.position !== "after-home") throw new Error("Site-specific links must follow Home.");
const portableHref = (href) => href.startsWith("/") ? new URL(href, chrome.brand.canonicalOrigin).href : href;

const mainLabels = mainNavigation.items.map((item) => item.label);
if (mainLabels.join("|") !== "Home|The Holy Scriptures|Sermons|Articles|Daily|Services") {
  throw new Error("Canonical main-site navigation order changed.");
}

for (const label of ["A True Christian Church", "Home", "The Holy Scriptures", "Sermons", "Articles", "Daily", "Services", "Join us"]) {
  if (!header.includes(label)) throw new Error(`Header is missing: ${label}`);
}

if (/aria-current="page"/.test(header)) throw new Error("Reusable header hardcodes an active page.");
for (const requirement of ["tcc-header__close", "tcc-header__scrim", "aria-haspopup", "data-tcc-global-header"]) {
  if (!header.includes(requirement)) throw new Error(`Header behavior hook is missing: ${requirement}`);
}

for (const item of mainNavigation.items) {
  if (!suppliedHeader.includes(item.label)) throw new Error(`Supplied header fixture is missing: ${item.label}`);
}
for (const landmark of ["Remnant Topics", "Trousseau Chest", "Transcribed Sermons", "Download Remnant PDFs"]) {
  if (!suppliedHeader.includes(landmark)) throw new Error(`Mega-menu source fixture is missing: ${landmark}`);
  if (!JSON.stringify(mainNavigation).includes(landmark)) throw new Error(`Main navigation data is missing: ${landmark}`);
}

for (const label of ["Church Info", "Projects", "Welcome", "Social Outreach", ...requiredCopyright]) {
  if (!footer.includes(label)) throw new Error(`Footer is missing: ${label}`);
  if (!example.includes(label)) throw new Error(`Style guide is missing: ${label}`);
}

if (example.includes('href="#')) throw new Error("Style guide contains an unresolved fragment link.");
for (const behaviorHook of ["has-submenu", "aria-expanded", "tcc-header__close", "tcc-header__scrim"]) {
  if (!example.includes(behaviorHook)) throw new Error(`Style guide does not exercise: ${behaviorHook}`);
}

for (const group of chrome.footer.directoryGroups) {
  for (const link of group.links) {
    const marker = `href="${portableHref(link.href)}"`;
    const index = example.indexOf(marker);
    if (index < 0) throw new Error(`Style guide is missing footer URL: ${link.href}`);
    const tagEnd = example.indexOf("</a>", index);
    const anchor = example.slice(index, tagEnd);
    if (link.newTab === true && !anchor.includes('target="_blank"')) throw new Error(`Style guide target behavior changed: ${link.label}`);
    if (link.newTab === false && anchor.includes('target="_blank"')) throw new Error(`Style guide target behavior changed: ${link.label}`);
  }
}

const exampleSocial = example.slice(example.indexOf("tcc-footer-social"));
for (const link of chrome.footer.social.links) {
  const marker = `href="${portableHref(link.href)}"`;
  const index = exampleSocial.indexOf(marker);
  if (index < 0) throw new Error(`Style guide is missing social URL: ${link.href}`);
  const tagEnd = exampleSocial.indexOf("</a>", index);
  if (link.newTab && !exampleSocial.slice(index, tagEnd).includes('target="_blank"')) throw new Error(`Style guide social target changed: ${link.label}`);
}


const directoryMarkup = footer.split("<footer", 1)[0];
let previousDirectoryIndex = -1;
for (const group of chrome.footer.directoryGroups) {
  for (const link of group.links) {
    const marker = `href="${portableHref(link.href)}"`;
    const index = directoryMarkup.indexOf(marker, previousDirectoryIndex + 1);
    if (index < 0) throw new Error(`Directory footer is missing URL: ${link.href}`);
    if (index < previousDirectoryIndex) throw new Error(`Directory footer URL order changed: ${link.href}`);
    const tagEnd = directoryMarkup.indexOf("</a>", index);
    if (!directoryMarkup.slice(index, tagEnd).includes(link.label)) throw new Error(`Directory label/URL mismatch: ${link.label}`);
    if (link.newTab === true && !directoryMarkup.slice(index, tagEnd).includes('target="_blank"')) {
      throw new Error(`Directory target behavior changed: ${link.label}`);
    }
    if (link.newTab === false && directoryMarkup.slice(index, tagEnd).includes('target="_blank"')) {
      throw new Error(`Directory target behavior changed: ${link.label}`);
    }
    previousDirectoryIndex = index;
  }
}

for (const link of chrome.footer.social.links) {
  if (!directoryMarkup.includes(`href="${portableHref(link.href)}"`)) throw new Error(`Social footer URL is missing: ${link.href}`);
}
if (!footer.includes("city-skyline-reference.png")) throw new Error("Footer image reference is missing.");

const copyrightMarkup = footer.slice(footer.indexOf("<footer"));
let previousCopyrightIndex = -1;
for (const link of chrome.footer.copyright.links) {
  const marker = `href="${portableHref(link.href)}"`;
  const index = copyrightMarkup.indexOf(marker, previousCopyrightIndex + 1);
  if (index < 0 || index < previousCopyrightIndex) throw new Error(`Copyright URL/order changed: ${link.href}`);
  const tagEnd = copyrightMarkup.indexOf("</a>", index);
  if (!copyrightMarkup.slice(index, tagEnd).includes(link.label)) throw new Error(`Copyright label/URL mismatch: ${link.label}`);
  previousCopyrightIndex = index;
}

for (const selector of [".tcc-site-header", ".tcc-footer-directory", ".tcc-footer-copyright", ".tm-bottom", "#license"]) {
  if (!css.includes(selector)) throw new Error(`Built CSS is missing selector: ${selector}`);
}

for (const value of ["--tcc-container-max: 1200px", "border-top: 1px solid", "min-height: 80px", "font-size: 0.6875rem", "gap: 40px", "width: 36px", "padding-block: var(--tcc-space-7)"]) {
  if (!css.includes(value)) throw new Error(`Built CSS is missing measured contract: ${value}`);
}

for (const behavior of ["Escape", "inert", "aria-expanded", "tcc-menu-open"]) {
  if (!sourceScript.includes(behavior)) throw new Error(`Header script is missing behavior: ${behavior}`);
}
for (const behavior of ["requestAnimationFrame", "data-scroll-hidden", 'addEventListener("scroll"']) {
  if (!sourceScript.includes(behavior)) throw new Error(`Header scroll behavior is missing: ${behavior}`);
}
if (!css.includes('.tcc-site-header[data-scroll-hidden="true"]')) throw new Error("Built CSS is missing the hidden header state.");
for (const canonicalMarkup of [footer, example]) {
  if (canonicalMarkup.includes("twitter.com") || canonicalMarkup.includes("facebook.com")) {
    throw new Error("Canonical footer still contains X/Twitter or Facebook.");
  }
}

console.log("Theme validation passed.");
