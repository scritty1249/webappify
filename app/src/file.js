export async function read (file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

export function download (content, filename) {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.html`;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function cleanPath (str) {
    let result = str.trim();
    if (result.startsWith("./") || result.startsWith(".\\"))
        result = result.slice(2);
    if (result.endsWith("/") || result.endsWith("\\"))
        result = result.slice(0, -1);
    return result;
}
