import * as js from "./js-parser.js";
import * as html from "./html-parser.js";
import { read, cleanPath } from "./file.js";

const MODULE_MAP_NAME = "__BUNDLE_MODULE_MAP";

function getIndexFileName (files) {
    for (const { name } of files)
        if (name.endsWith(".html"))
            return name;
}

function moduleNameGenerator () {
    return crypto.randomUUID();
}

function createScriptTag (url, tagRanges, tags, filedata) {
    if (tags.has(url)) return;
    if (!filedata.has(url)) throw new Error(`Unable to resolve content for script file ${url}`);
    const rawContent = filedata.get(url);
    const required = js.parse(rawContent);
    const tag = { required, type: "script" };
    if (tagRanges.has(url)) tag.range = tagRanges.get(url);
    tags.set(url, tag);
    for (const u of required) createScriptTag(u, tagRanges, tags, filedata);
}

function createStyleTag (url, tagRanges, tags, filedata) {
    if (tags.has(url)) return;
    if (!filedata.has(url)) throw new Error(`Unable to resolve content for stylesheet ${url}`);
    if (!tagRanges.has(url)) throw new Error(`Unable to resolve range for stylesheet ${url}`);
    const content = filedata.get(url);
    const range = tagRanges.get(url);
    const required = new Set();
    tags.set(url, {
        range,
        required,
        content,
        type: "style"
    });
}

function resolveScriptTags (tagRanges, tags, modules, filedata) {
    for (const url of tagRanges.keys())
        createScriptTag(url, tagRanges, tags, filedata);
    for (const { required } of tags.values())
        for (const url of required)
            if (!modules.has(url))
                modules.set(url, moduleNameGenerator());
}

function resolveStyleTags (tagRanges, tags, filedata) {
    for (const url of tagRanges.keys())
        createStyleTag(url, tagRanges, tags, filedata);
}

function populateScriptTag (url, tags, modules, filedata) {
    const tag = tags.get(url);
    if (!tag || tag.content) return;
    if (!filedata.has(url)) throw new Error(`Unable to resolve content for script file ${url}`);
    tag.content = js.bundle(filedata.get(url), modules, url, MODULE_MAP_NAME);
    for (const u of tag.required)
        populateScriptTag(u, tags, modules, filedata);
}

function populateTags (tags, modules, filedata) {
    for (const [url, {type}] of tags) {
        if (type === "script")
            populateScriptTag(url, tags, modules, filedata);
    }
}

export async function bundle (files) {
    const FILEDATA = new Map();
    for (const file of files) {
        const content = await read(file);
        FILEDATA.set(cleanPath(file.name), content);
    }
    const indexFileContent = FILEDATA.get(getIndexFileName(files));
    const ranges = html.parse(indexFileContent);
    const tags = new Map();
    const modules = new Map();
    resolveScriptTags(ranges.scripts, tags, modules, FILEDATA);
    resolveStyleTags(ranges.styles, tags, FILEDATA);
    populateTags(tags, modules, FILEDATA);
    FILEDATA.clear();
    return html.bundle(indexFileContent, tags, MODULE_MAP_NAME);
}