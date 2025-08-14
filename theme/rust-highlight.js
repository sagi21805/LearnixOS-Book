document.addEventListener("DOMContentLoaded", () => {
    const rustKeywords = [
        "as", "break", "const", "continue", "crate", "else", "enum", "extern",
        "false", "fn", "for", "if", "impl", "in", "let", "loop", "match",
        "mod", "move", "mut", "pub", "ref", "return", "self",
        "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where",
        "while", "async", "await", "dyn", "abstract", "become", "box", "final",
        "macro", "override", "priv", "try", "typeof", "unsized", "virtual",
        "yield", "union"
    ];

    const builtinTypes = [
        "u8", "u16", "u32", "u64", "u128", "usize",
        "i8", "i16", "i32", "i64", "i128", "isize",
        "f32", "f64", "bool", "char", "str"
    ];

    const builtinTypeRegex = new RegExp(`\\b(${builtinTypes.join("|")})\\b`, "g");
    const fnDeclRegex = /\bfn\s+([a-zA-Z0-9_]+)/g;
    const fnParamRegex = /\(\s*([a-z_][a-zA-Z0-9_]*)\s*:/g;
    const declRegex = /\b(struct|enum|trait|impl)\s+([A-Z][a-zA-Z0-9_]*)/g;
    const varDeclRegex = /\b(let|mut|const)\s+([a-z_][a-zA-Z0-9_]*)/g;
    const typeRegex = /\b([A-Z][a-zA-Z0-9_]*(?:<[^>]+>)?)/g;
    const traitAsRegex = /<[^>]+as\s+([A-Z][a-zA-Z0-9_]*)>/g;
    const macroCallRegex = /\b([a-z_][a-zA-Z0-9_]*)!\s*\(/g;
    const fnCallRegex = /\b([a-z_][a-zA-Z0-9_]*)\b(?!\s*!)(\s*)\(/g;
    const globalConstRegex = /\b([A-Z][A-Z0-9_]+)\b/g;
    const turbofishFnCallRegex = /\.([a-z_][a-zA-Z0-9_]*)::&lt;([A-Z][a-zA-Z0-9_]*(?:<[^>]+>)?)&gt;\s*\(/g;

    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function isFullCommentLine(lineHtml) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = lineHtml;
        const children = [...tempDiv.childNodes];
        for (let node of children) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") return false;
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (!node.classList.contains("hljs-comment")) return false;
            }
        }
        return true;
    }

    function splitPreservingSpans(html) {
        const parts = [];
        const regex = /<span class="hljs-(comment|string|char)">.*?<\/span>/g;
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ safe: true, text: html.slice(lastIndex, match.index) });
            }
            parts.push({ safe: false, text: match[0] });
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < html.length) {
            parts.push({ safe: true, text: html.slice(lastIndex) });
        }
        return parts;
    }

    document.querySelectorAll("code.language-rust").forEach(code => {
        code.style.overflowX = "auto";
        code.style.whiteSpace = "pre";

        const lines = code.innerHTML.split("\n");
        const declaredVars = new Set();

        // First pass: collect declared variables from let/mut/const, function params, and field assignments
        lines.forEach(line => {
            if (isFullCommentLine(line)) return;
            const text = line.replace(/<[^>]+>/g, "");
            let match;

            while ((match = varDeclRegex.exec(text)) !== null) {
                if (!rustKeywords.includes(match[2])) declaredVars.add(match[2]);
            }

            while ((match = fnParamRegex.exec(text)) !== null) {
                if (!rustKeywords.includes(match[1])) declaredVars.add(match[1]);
            }

            const colonFieldRegex = /\b([a-z_][a-zA-Z0-9_]*)\s*:(?!:)/g;
            while ((match = colonFieldRegex.exec(text)) !== null) {
                if (!rustKeywords.includes(match[1])) declaredVars.add(match[1]);
            }
        });

        let varUseRegex = null;
        if (declaredVars.size > 0) {
            varUseRegex = new RegExp(`\\b(${[...declaredVars].map(escapeRegex).join("|")})\\b`, "g");
        }

        const processedLines = lines.map(line => {
            if (isFullCommentLine(line)) return line;

            const parts = splitPreservingSpans(line);
            const rebuilt = parts.map(part => {
                if (!part.safe) return part.text;

                let modified = part.text;

                modified = modified.replace(turbofishFnCallRegex, (_, fnName, typeName) =>
                    `.<span class="hljs-turbofish">${fnName}</span>::&lt;<span class="hljs-type">${typeName}</span>&gt;(`
                );
                modified = modified.replace(fnDeclRegex, (_, name) =>
                    `fn <span class="hljs-function">${name}</span>`
                );
                modified = modified.replace(declRegex, (_, kind, name) =>
                    `<span class="hljs-keyword">${kind}</span> <span class="hljs-struct">${name}</span>`
                );
                modified = modified.replace(varDeclRegex, (_, kind, name) =>
                    `${kind} <span class="hljs-variable">${name}</span>`
                );
                modified = modified.replace(fnParamRegex, (_, name) =>
                    `(<span class="hljs-variable">${name}</span>:`
                );
                modified = modified.replace(/\b([a-z_][a-zA-Z0-9_]*)\b(?=\s*:)/g, (_, name) =>
                    declaredVars.has(name)
                        ? `<span class="hljs-variable">${name}</span>`
                        : name
                );
                modified = modified.replace(typeRegex, (_, name) =>
                    `<span class="hljs-type">${name}</span>`
                );
                modified = modified.replace(builtinTypeRegex, '<span class="hljs-type">$1</span>');

                // Highlight variable usage BEFORE module paths
                if (varUseRegex) {
                    modified = modified.replace(varUseRegex, '<span class="hljs-variable">$1</span>');
                }

                // Highlight module paths with each segment wrapped separately as types

                modified = modified.replace(traitAsRegex, m =>
                    m.replace(/([A-Z][a-zA-Z0-9_]*)/, '<span class="hljs-trait">$1</span>')
                );
                modified = modified.replace(macroCallRegex, (_, name) =>
                    `<span class="hljs-macro">${name}!</span>(`
                );
                modified = modified.replace(fnCallRegex, (_, name, space) =>
                    `<span class="hljs-title">${name}</span>${space}(`
                );
                modified = modified.replace(globalConstRegex, '<span class="hljs-global">$1</span>');


                return modified;
            });

            return rebuilt.join("");
        });

        code.innerHTML = processedLines.join("\n");

        // Reclassify built-in macros like println!
        code.innerHTML = code.innerHTML.replace(
            /<span class="hljs-built_in">([a-z_][a-zA-Z0-9_]*)!<\/span>/g,
            '<span class="hljs-macro">$1!</span>'
        );
    });
});
