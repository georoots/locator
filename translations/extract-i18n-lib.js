'use strict';

const fs = require('fs');
const path = require('path');

function extractBalancedObject(source, openBraceIndex) {
    let depth = 0;
    let inString = null;
    let escaped = false;

    for (let i = openBraceIndex; i < source.length; i++) {
        const ch = source[i];
        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === inString) {
                inString = null;
            }
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            inString = ch;
            continue;
        }
        if (ch === '{') depth++;
        if (ch === '}') {
            depth--;
            if (depth === 0) {
                const text = source.slice(openBraceIndex, i + 1);
                return { text, end: i + 1, value: Function(`"use strict"; return (${text});`)() };
            }
        }
    }
    throw new Error(`Unbalanced braces near index ${openBraceIndex}`);
}

function discoverLangBlocks(html) {
    const codes = [];
    const pattern = /id="lang-([a-z]{2})"/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
        codes.push(match[1]);
    }
    return codes;
}

function loadLangBlock(html, code) {
    const marker = `id="lang-${code}"`;
    const start = html.indexOf(marker);
    if (start < 0) throw new Error(`Missing lang-${code}`);
    const jsonStart = html.indexOf('{', start);
    const jsonEnd = html.indexOf('</script>', jsonStart);
    return JSON.parse(html.slice(jsonStart, jsonEnd));
}

function extractInlineTranslations(html) {
    const match = html.match(/(?:let|const)\s+translations\s*=\s*\{/);
    if (!match) throw new Error('Could not find inline translations object');
    const openIndex = match.index + match[0].length - 1;
    return extractBalancedObject(html, openIndex).value;
}

function extractLocatorTranslations(repoDir, html) {
    const match = html.match(/const\s+TRANSLATIONS\s*=\s*\{/);
    if (!match) throw new Error('Could not find TRANSLATIONS object in index.html');
    const openIndex = match.index + match[0].length - 1;
    const root = extractBalancedObject(html, openIndex).value;
    const translations = { ...root };

    const externalFiles = fs.readdirSync(repoDir).filter((name) => /^translations-[a-z]{2}\.js$/i.test(name));
    for (const fileName of externalFiles) {
        const content = fs.readFileSync(path.join(repoDir, fileName), 'utf8');
        const fileMatch = content.match(/GEOLOCATOR_TRANSLATIONS\.([a-z]{2})\s*=\s*\{/);
        if (!fileMatch) continue;
        const langOpen = fileMatch.index + fileMatch[0].length - 1;
        translations[fileMatch[1]] = extractBalancedObject(content, langOpen).value;
    }

    return translations;
}

function compareKeys(referenceKeys, langKeys) {
    const refSet = new Set(referenceKeys);
    const langSet = new Set(langKeys);
    return {
        missing: referenceKeys.filter((key) => !langSet.has(key)),
        extra: langKeys.filter((key) => !refSet.has(key)),
    };
}

function flattenForExport(obj) {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') out[key] = value;
    }
    return out;
}

function loadTranslations(repoConfig) {
    const html = fs.readFileSync(repoConfig.html, 'utf8');
    const repoDir = path.dirname(repoConfig.html);

    if (repoConfig.format === 'lang-blocks') {
        const codes = discoverLangBlocks(html);
        const translations = {};
        for (const code of codes) {
            translations[code] = loadLangBlock(html, code);
        }
        return translations;
    }

    if (repoConfig.format === 'inline-js') {
        const raw = extractInlineTranslations(html);
        const translations = {};
        for (const [code, value] of Object.entries(raw)) {
            translations[code] = flattenForExport(value);
        }
        return translations;
    }

    if (repoConfig.format === 'locator') {
        const raw = extractLocatorTranslations(repoDir, html);
        const translations = {};
        for (const [code, value] of Object.entries(raw)) {
            translations[code] = flattenForExport(value);
        }
        return translations;
    }

    throw new Error(`Unknown format: ${repoConfig.format}`);
}

function writeExports(repoConfig) {
    const outDir = path.join(path.dirname(repoConfig.html), 'translations');

    const translations = loadTranslations(repoConfig);
    const codes = Object.keys(translations);
    if (!codes.includes('en')) {
        throw new Error('English (en) is required as the reference language');
    }

    const referenceKeys = Object.keys(translations.en);
    const referenceCount = referenceKeys.length;
    let allOk = true;

    console.log(`Reference: en (${referenceCount} keys)\n`);

    for (const code of codes) {
        const flat = translations[code];
        const keys = Object.keys(flat);
        const outPath = path.join(outDir, `i18n-${code}.json`);
        fs.writeFileSync(outPath, JSON.stringify(flat, null, 4) + '\n', 'utf8');

        const { missing, extra } = compareKeys(referenceKeys, keys);
        const ok = missing.length === 0 && extra.length === 0;
        if (!ok) allOk = false;

        const status = ok ? 'OK' : 'MISMATCH';
        console.log(`${code}: ${keys.length} keys — ${status}`);
        if (missing.length) console.log(`  missing (${missing.length}): ${missing.join(', ')}`);
        if (extra.length) console.log(`  extra (${extra.length}): ${extra.join(', ')}`);
    }

    fs.writeFileSync(
        path.join(outDir, 'i18n-data.js'),
        `window.${repoConfig.dataVar} = ${JSON.stringify(translations, null, 4)};\n`,
        'utf8'
    );

    console.log(`\nExported ${codes.length} files to translations/i18n-*.json`);
    if (allOk) {
        console.log(`All languages match en (${referenceCount} keys each).`);
    } else {
        console.log('Some languages have key mismatches — see details above.');
        process.exitCode = 1;
    }
}

module.exports = {
    loadTranslations,
    writeExports,
    compareKeys,
};
