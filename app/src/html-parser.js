import { cleanPath } from "./file.js";

const SCRIPT_PATTERN = /<script\b[^>]*?\bsrc\s*=\s*(['"])(?<url>(?!https?:|\/\/)[^'"]+)\1[^>]*>[\s\S]*?<\/script>/gmi;
// [!] this might not work outside of JavaScript. Shared group names across different branches of an OR block typically not allowed in other engines
const STYLE_PATTERN = /<link\b(?:[^>]*\bhref\s*=\s*(['"])(?<url>(?!https?:|\/\/)[^"']*)\1[^>]*\brel\s*=\s*(['"])stylesheet\3|[^>]*\brel\s*=\s*(['"])stylesheet\4[^>]*\bhref\s*=\s*(['"])(?<url>(?!https?:|\/\/)[^"']*)\5)[^>]*>/gmi;


function createScriptTag (content) {
    const bytes = new TextEncoder().encode(content);
    const bstr = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    const b64 = btoa(bstr);
    const url = `data:text/javascript;base64,${b64}`;
    return `<script type="module" src="${url}"></script>`;
}

function createStyleTag (content) {
    return `<style>\n${content}\n</style>`;
}

function createUnknownTag (content) {
    return `<!-- UNKNOWN TYPE\n${content}\n-->`;
}

function resolveTypeFormatter (type) {
    return type === "script"
        ? createScriptTag
        : type === "style"
        ? createStyleTag
        : createUnknownTag;
}

function formatTagContent (url, tags) {
    const tag = tags.get(url);
    return resolveTypeFormatter(tag.type)(tag.content);
}

/**
 * Make the parent url the sole owner of child requirement
 */
function takeRequirement (parent, child, tags, order) {
    console.log(`${child} --> ${parent}`);
    for (const [url, tag] of tags) {
        if (!tag.resolved) tag.resolved = new Set();
        if (url === parent) {
            tag.resolved.add(child);
        } else {
            tag.resolved.delete(child);
        }
    }
    order.delete(child);
    order.add(child);
}

/**
 * Returns an ordered array of raw tags:
 * {
 *   ...<named match groups>,
 *   range: [<start index>, <end index>],
 * }
 */
function matchAllTags (content, pattern) {
    const found = [];
    for (const match of content.matchAll(pattern)) {
        const { index, groups } = match;
        const range = [index, index + match[0].length];
        found.push({ ...groups, range });
    }
    return found.sort((a, b) => a.index - b.index);
}

/**
 * Links required scripts to the foremost scripts in DOM
 */
function resolveTag (url, tags, order) {
    if (!order.has(url)) order.add(url);
    const tag = tags.get(url);
    if (!tag.required.size) return;
    const required = Array.from(tag.required).reverse();
    for (const u of required)
        takeRequirement(url, u, tags, order);
    for (const u of required)
        resolveTag(u, tags, order);
}

function resolveTags (tags) {
    const order = new Set();
    for (const [url] of tags)
        resolveTag(url, tags, order);
    return order;
}

function aggregateTag (url, tags) {
    const { resolved } = tags.get(url);
    let content = `<!-- ${url} -->\n` + formatTagContent(url, tags);
    if (resolved?.size)
        content = Array.from(resolved).map((u) => aggregateTag(u, tags)).join("\n") + "\n" + content;
    return content;
}

function collectTags (order, tags) {
    const written = new Set();
    const collected = [];
    for (const url of order) {
        if (written.has(url)) {
            collected.push("");
            continue;
        }
        collected.push(aggregateTag(url, tags));
        written.add(url);
        for (const u of tags.get(url).resolved) written.add(u);
    }
    return collected;
}

function splitContent (content, tags) {
    const slices = [];
    const indexes = [0];
    for (const [_, {range = undefined}] of tags)
        if (range) indexes.push(range[0], range[1]);
    indexes.push(content.length);
    for (let i = 0; i < indexes.length; i += 2)
        slices.push(content.slice(indexes[i], indexes[i+1]));
    return slices;
}

export function parse (content) {
    const styles = new Map();
    const scripts = new Map();
    for (const { url, range } of matchAllTags(content, SCRIPT_PATTERN))
        scripts.set(cleanPath(url), range);
    for (const { url, range } of matchAllTags(content, STYLE_PATTERN))
        styles.set(cleanPath(url), range);
    return { scripts, styles };
}

/**
 * Expects `tags` to be an ordered `Map` of:
 *
 * {
 *   <url>: {
 *     required: <ordered Set of urls>,
 *     content: <substring to insert>,
 *     type: "script" | "style",
 *     range?: [<start index>, <end index>]
 *   }
 * }
 *
 */
export function bundle (content, tags, moduleMapName) {
    const ordrer = resolveTags(tags);
    const insert = collectTags(ordrer, tags);
    const slices = splitContent(content, tags);
    console.log(tags);
    let result = slices[0] + createScriptTag(`window.${moduleMapName} = new Map();`) + "\n";
    for (let i = 1; i < slices.length; i++)
        result += insert[i-1] + slices[i];
    return result;
}
