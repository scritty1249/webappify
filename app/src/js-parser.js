import { cleanPath } from "./file.js";

const IMPORT_PATTERN = /(?<!\S)import\s*(?<imported>[\sa-zA-Z0-9_$*,{}]+)\s*from\s*(["'])(?<module>.+)\2\s*(?:;|$)/gm;
const NAME_PATTERN = /(?<name>[^\s,]+)(?:\s*as\s*(?<alias>[^\s,]+))?/gm;
const EXPORT_PATTERN = /(?<!\S)export\s+(?:(?:const|let|var|function|class|async|\{)(?:\s+function)?\s+)?(.*?)(?:\=|$|\(|\}|\{|;)/gm;
const EXPORT_DELETE_PATTERN = /(?<!\S)export\s+(?:\{.*?\})?/gm;

function mapImported (str) {
    let clean = str.trim();
    if (clean.at(0) === "{" && clean.at(-1) === "}") {
        clean = clean.slice(1, -1).trim();
        if (clean.at(-1) === ",")
            clean = clean.slice(0, -1);
    }
    const imported = [];
    for (const {groups: {name, alias = undefined}} of clean.matchAll(NAME_PATTERN))
        imported.push({ name, alias });
    return imported;
}

function mapExported (str) {
    const clean = str.trim();
    const exported = [];
    for (const [_, name, alias = undefined] of clean.matchAll(NAME_PATTERN))
        exported.push({name, alias});
    return exported;
}

function bundleImports (content, moduleMap, moduleMapName) {
    return content.replace(IMPORT_PATTERN, (match, p1, p2, p3, offset, str, groups) => {
        const { imported, module } = groups;
        const modulePath = cleanPath(module);
        if (!moduleMap.has(modulePath)) throw new Error(`encountered unmapped module: ${module}`);
        const imports = mapImported(imported);
        const moduleName = moduleMap.get(modulePath);
        let nameString;
        if (imports.length > 1) {
            const nameList = [];
            for (const { name, alias } of imports)
                nameList.push(alias ? `${name}: ${alias}` : name);
            nameString = `{ ${nameList.join(", ")} }`;
        } else {
            const { name, alias } = imports[0];
            nameString = (name === "*")
                ? alias
                : alias
                ? `{ ${name}: ${alias} }`
                : `{ ${name} }`;
        }
        return `const ${nameString} = window.${moduleMapName}.get("${moduleName}");`;
    });
}

function bundleExports (content, moduleMap, modulePath, moduleMapName) {
    const exportList = [];
    for (const [_, matched] of content.matchAll(EXPORT_PATTERN))
        for (const {name, alias} of mapExported(matched))
            exportList.push("\t" + (alias ? `${alias}: ${name}` : name));
    const footer = exportList.length ? `\nwindow.${moduleMapName}.set("${moduleMap.get(modulePath)}", {\n${exportList.join(",\n")}})` : "";
    const cleaned = content.replaceAll(EXPORT_DELETE_PATTERN, "").trim();
    return cleaned + footer;
}

export function parse (content) {
    return new Set(content.matchAll(IMPORT_PATTERN).map(({groups: {module}}) => cleanPath(module)));
}

export function bundle (content, moduleMap, modulePath, moduleMapName) {
    const firstPass = bundleImports(content, moduleMap, moduleMapName);
    const finalPass = bundleExports(firstPass, moduleMap, modulePath, moduleMapName);
    return finalPass;
}