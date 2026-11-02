import { bundle } from "./bundler.js";
import { download } from "./file.js";

function init () {
    const input = document.createElement("input");
    const submitBtn = document.createElement("button");
    input.type = "file";
    input.multiple = true;
    input.accept = ".html,.css,.js,text/html,text/css,application/javascript";
    submitBtn.textContent = "Submit";
    submitBtn.onclick = () => {
        bundle(input.files)
            .then((content) => download(content, "bundled"));
    }
    document.body.append(input, submitBtn);
}

window.onload = init;
