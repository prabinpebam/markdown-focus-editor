/**
 * syntaxHighlighter.js — Lightweight regex-based tokenizer for grayscale syntax highlighting.
 *
 * All highlighting is in shades of grey — no color.
 * Keywords are bold, comments are italic, everything else uses opacity to create hierarchy.
 *
 * Architecture:
 *   tokenize(code, language) → [{type, text}, ...]
 *   tokensToHtml(tokens) → HTML string with <span class="tok-*"> wrappers
 *   highlight(codeElement, language) → applies highlighting to a <code> element
 */

const syntaxHighlighter = {

    // ══════════════════════════════════════════════════════════════
    // LANGUAGE GRAMMARS
    // Each grammar is an array of { type, pattern } rules.
    // First match wins. Patterns must use 'g' flag; they're reset per run.
    // ══════════════════════════════════════════════════════════════

    grammars: {
        javascript: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /`(?:\\[\s\S]|[^`\\])*`|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g },
            { type: 'keyword',     pattern: /\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/g },
            { type: 'builtin',     pattern: /\b(?:Array|Boolean|Date|Error|Function|JSON|Map|Math|Number|Object|Promise|Proxy|RegExp|Set|String|Symbol|WeakMap|WeakSet|console|document|window|global|globalThis|module|process|require|undefined|null|true|false|NaN|Infinity)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/g },
            { type: 'operator',    pattern: /=>|[+\-*/%=!<>&|^~?:]+|\.{3}/g },
            { type: 'punctuation', pattern: /[{}()[\];,.]/g },
        ],

        typescript: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /`(?:\\[\s\S]|[^`\\])*`|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g },
            { type: 'keyword',     pattern: /\b(?:abstract|as|async|await|break|case|catch|class|const|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|is|keyof|let|namespace|new|of|override|private|protected|public|readonly|return|satisfies|static|super|switch|this|throw|try|type|typeof|var|void|while|with|yield)\b/g },
            { type: 'builtin',     pattern: /\b(?:Array|Boolean|Date|Error|Function|JSON|Map|Math|Number|Object|Promise|RegExp|Set|String|Symbol|any|bigint|boolean|never|number|object|string|symbol|undefined|null|true|false|unknown|void)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_$][\w$]*(?=\s*[<(])/g },
            { type: 'operator',    pattern: /=>|[+\-*/%=!<>&|^~?:]+|\.{3}/g },
            { type: 'punctuation', pattern: /[{}()[\];,.]/g },
        ],

        python: [
            { type: 'comment',     pattern: /#.*$/gm },
            { type: 'string',      pattern: /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g },
            { type: 'decorator',   pattern: /@\w+/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?j?)\b/g },
            { type: 'keyword',     pattern: /\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g },
            { type: 'builtin',     pattern: /\b(?:True|False|None|print|len|range|int|str|float|list|dict|set|tuple|type|isinstance|enumerate|zip|map|filter|sorted|open|input|super|self|cls|__init__|__name__|__main__)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*\()/g },
            { type: 'operator',    pattern: /[+\-*/%=!<>&|^~:@]+|\.{3}/g },
            { type: 'punctuation', pattern: /[{}()[\];,.]/g },
        ],

        html: [
            { type: 'comment',     pattern: /<!--[\s\S]*?-->/g },
            { type: 'tag',         pattern: /<\/?[a-zA-Z][\w-]*|\/?>|>/g },
            { type: 'attribute',   pattern: /\b[a-zA-Z-]+(?=\s*=)/g },
            { type: 'string',      pattern: /"[^"]*"|'[^']*'/g },
            { type: 'value',       pattern: /=\s*/g },
        ],

        css: [
            { type: 'comment',     pattern: /\/\*[\s\S]*?\*\//g },
            { type: 'string',      pattern: /"[^"]*"|'[^']*'/g },
            { type: 'keyword',     pattern: /@(?:import|media|keyframes|font-face|charset|supports|page|namespace)\b/g },
            { type: 'property',    pattern: /[\w-]+(?=\s*:)/g },
            { type: 'number',      pattern: /#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|s|ms|deg|rad|fr)?\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z-]+(?=\s*\()/g },
            { type: 'punctuation', pattern: /[{}();:,]/g },
        ],

        json: [
            { type: 'property',    pattern: /"(?:\\[\s\S]|[^"\\])*"(?=\s*:)/g },
            { type: 'string',      pattern: /"(?:\\[\s\S]|[^"\\])*"/g },
            { type: 'number',      pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g },
            { type: 'builtin',     pattern: /\b(?:true|false|null)\b/g },
            { type: 'punctuation', pattern: /[{}[\]:,]/g },
        ],

        bash: [
            { type: 'comment',     pattern: /#.*$/gm },
            { type: 'string',      pattern: /"(?:\\[\s\S]|[^"\\])*"|'[^']*'|\$'(?:\\[\s\S]|[^'\\])*'/g },
            { type: 'keyword',     pattern: /\b(?:if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|select|time|coproc)\b/g },
            { type: 'builtin',     pattern: /\b(?:echo|printf|read|cd|pwd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|find|sort|uniq|wc|head|tail|chmod|chown|export|source|alias|exit|return|local|declare|set|unset|shift|test|eval|exec|trap)\b/g },
            { type: 'variable',    pattern: /\$\{?[\w#@*!?-]+\}?/g },
            { type: 'operator',    pattern: /[|&;<>]+|&&|\|\|/g },
            { type: 'punctuation', pattern: /[{}()[\]]/g },
        ],

        sql: [
            { type: 'comment',     pattern: /--.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /'(?:''|[^'])*'/g },
            { type: 'keyword',     pattern: /\b(?:SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|INNER|LEFT|RIGHT|OUTER|CROSS|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|SET|VALUES|BEGIN|END|COMMIT|ROLLBACK|GRANT|REVOKE|CASCADE|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|AUTO_INCREMENT|IF|ELSE|THEN|WHEN|CASE|DECLARE|CURSOR|FETCH|INT|VARCHAR|TEXT|BOOLEAN|DATE|TIMESTAMP|FLOAT|DECIMAL|SERIAL)\b/gi },
            { type: 'function',    pattern: /\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|NOW|CURRENT_TIMESTAMP|UPPER|LOWER|TRIM|LENGTH|SUBSTRING|CONCAT|REPLACE|ROUND|CEIL|FLOOR|ABS)\b/gi },
            { type: 'number',      pattern: /\b\d+(?:\.\d+)?\b/g },
            { type: 'operator',    pattern: /[=<>!]+|[+\-*/%]/g },
            { type: 'punctuation', pattern: /[();,.*]/g },
        ],

        c: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])'/g },
            { type: 'keyword',     pattern: /\b(?:auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|_Bool|_Complex|_Imaginary)\b/g },
            { type: 'type',        pattern: /\b(?:int|char|float|double|void|long|short|unsigned|signed|size_t|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t|bool|FILE|NULL)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*\()/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fFlLuU]*)\b/g },
            { type: 'operator',    pattern: /->|[+\-*/%=!<>&|^~?:]+/g },
            { type: 'punctuation', pattern: /[{}()[\];,.#]/g },
        ],

        cpp: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /R"([^(]*)\([\s\S]*?\)\1"|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])'/g },
            { type: 'keyword',     pattern: /\b(?:alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\b/g },
            { type: 'type',        pattern: /\b(?:string|vector|map|set|list|array|pair|tuple|shared_ptr|unique_ptr|optional|variant|size_t|int8_t|uint8_t|int16_t|uint16_t|int32_t|uint32_t|int64_t|uint64_t|nullptr_t|true|false|NULL|std)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*[<(])/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fFlLuU]*)\b/g },
            { type: 'operator',    pattern: /->|::|[+\-*/%=!<>&|^~?:]+/g },
            { type: 'punctuation', pattern: /[{}()[\];,.#]/g },
        ],

        csharp: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /\$?"(?:\\[\s\S]|[^"\\])*"|@"(?:""|[^"])*"|'(?:\\[\s\S]|[^'\\])'/g },
            { type: 'keyword',     pattern: /\b(?:abstract|as|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|partial|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|while|yield|record|init|required|with)\b/g },
            { type: 'builtin',     pattern: /\b(?:true|false|null|Console|String|Math|List|Dictionary|Task|Action|Func|Nullable|IEnumerable|IList|IDictionary|Exception|Object|Type|Attribute|Guid|DateTime|TimeSpan)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*[<(])/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fFdDmM]?)\b/g },
            { type: 'operator',    pattern: /=>|[+\-*/%=!<>&|^~?:]+/g },
            { type: 'punctuation', pattern: /[{}()[\];,.]/g },
        ],

        java: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])'/g },
            { type: 'decorator',   pattern: /@\w+/g },
            { type: 'keyword',     pattern: /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|var|yield|record|sealed|permits|non-sealed)\b/g },
            { type: 'builtin',     pattern: /\b(?:true|false|null|System|String|Integer|Boolean|Double|Float|Long|Short|Byte|Character|Object|Class|Math|List|Map|Set|ArrayList|HashMap|HashSet|Optional|Stream|Collections|Arrays|Exception|RuntimeException|IOException|Thread|Runnable)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*[<(])/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fFdDlL]?)\b/g },
            { type: 'operator',    pattern: /->|[+\-*/%=!<>&|^~?:]+/g },
            { type: 'punctuation', pattern: /[{}()[\];,.]/g },
        ],

        rust: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /r#*"[\s\S]*?"#*|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])'/g },
            { type: 'keyword',     pattern: /\b(?:as|async|await|break|const|continue|crate|dyn|else|enum|extern|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|type|union|unsafe|use|where|while|yield|abstract|become|box|do|final|macro|override|priv|try|typeof|unsized|virtual)\b/g },
            { type: 'type',        pattern: /\b(?:bool|char|f32|f64|i8|i16|i32|i64|i128|isize|str|u8|u16|u32|u64|u128|usize|String|Vec|Option|Result|Box|Rc|Arc|Cell|RefCell|HashMap|HashSet|BTreeMap|BTreeSet|Some|None|Ok|Err|true|false)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*[!<(])/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?:_\d+)*[iu]?(?:8|16|32|64|128|size)?)\b/g },
            { type: 'operator',    pattern: /=>|->|::|[+\-*/%=!<>&|^~?:]+/g },
            { type: 'punctuation', pattern: /[{}()[\];,.#]/g },
        ],

        go: [
            { type: 'comment',     pattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /`[^`]*`|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])'/g },
            { type: 'keyword',     pattern: /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g },
            { type: 'builtin',     pattern: /\b(?:true|false|nil|iota|append|cap|close|complex|copy|delete|imag|len|make|new|panic|print|println|real|recover|bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*\()/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?i?)\b/g },
            { type: 'operator',    pattern: /:=|<-|[+\-*/%=!<>&|^]+/g },
            { type: 'punctuation', pattern: /[{}()[\];,.]/g },
        ],

        ruby: [
            { type: 'comment',     pattern: /#.*$|=begin[\s\S]*?=end/gm },
            { type: 'string',      pattern: /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|%[qQwWiIrx]?[{(\[<][\s\S]*?[})\]>]/g },
            { type: 'keyword',     pattern: /\b(?:alias|and|begin|break|case|class|def|defined\?|do|else|elsif|end|ensure|for|if|in|module|next|nil|not|or|redo|rescue|retry|return|self|super|then|undef|unless|until|when|while|yield|__FILE__|__LINE__|__ENCODING__)\b/g },
            { type: 'builtin',     pattern: /\b(?:true|false|nil|puts|print|p|gets|require|require_relative|include|extend|attr_accessor|attr_reader|attr_writer|raise|lambda|proc|block_given\?|Array|Hash|String|Integer|Float|Symbol|Regexp|IO|File|Dir|Kernel|Comparable|Enumerable)\b/g },
            { type: 'variable',    pattern: /@{1,2}\w+|\$\w+/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*[!?]?(?=\s*[({])/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g },
            { type: 'operator',    pattern: /=>|<=>|[+\-*/%=!<>&|^~?:]+|\.{2,3}/g },
            { type: 'punctuation', pattern: /[{}()[\];,.]/g },
        ],

        php: [
            { type: 'comment',     pattern: /\/\/.*$|#.*$|\/\*[\s\S]*?\*\//gm },
            { type: 'string',      pattern: /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g },
            { type: 'keyword',     pattern: /\b(?:abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|readonly|require|require_once|return|static|switch|this|throw|trait|try|unset|use|var|while|xor|yield|yield from)\b/gi },
            { type: 'variable',    pattern: /\$[a-zA-Z_]\w*/g },
            { type: 'builtin',     pattern: /\b(?:true|false|null|self|parent|TRUE|FALSE|NULL|__CLASS__|__DIR__|__FILE__|__FUNCTION__|__LINE__|__METHOD__|__NAMESPACE__|__TRAIT__)\b/g },
            { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*\()/g },
            { type: 'number',      pattern: /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g },
            { type: 'operator',    pattern: /=>|->|::|[+\-*/%=!<>&|^~?.:]+/g },
            { type: 'punctuation', pattern: /[{}()[\];,]/g },
        ],

        yaml: [
            { type: 'comment',     pattern: /#.*$/gm },
            { type: 'property',    pattern: /^[\w][\w .-]*(?=\s*:)/gm },
            { type: 'string',      pattern: /"(?:\\[\s\S]|[^"\\])*"|'(?:''|[^'])*'/g },
            { type: 'builtin',     pattern: /\b(?:true|false|null|yes|no|on|off)\b/gi },
            { type: 'number',      pattern: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g },
            { type: 'keyword',     pattern: /---|\.\.\./g },
            { type: 'punctuation', pattern: /[:\-[\]{}|>]/g },
        ],

        xml: [
            { type: 'comment',     pattern: /<!--[\s\S]*?-->/g },
            { type: 'tag',         pattern: /<\/?[a-zA-Z][\w:.-]*|\/?>|>/g },
            { type: 'attribute',   pattern: /\b[\w:.-]+(?=\s*=)/g },
            { type: 'string',      pattern: /"[^"]*"|'[^']*'/g },
        ],

        markdown: [
            { type: 'keyword',     pattern: /^#{1,6}\s+.+$/gm },
            { type: 'operator',    pattern: /^[*\-+]\s|^\d+\.\s|^>/gm },
            { type: 'string',      pattern: /\*\*[^*]+\*\*|\*[^*]+\*/g },
            { type: 'tag',         pattern: /\[([^\]]+)\]\([^)]+\)/g },
            { type: 'comment',     pattern: /`[^`]+`|```[\s\S]*?```/g },
        ],

        plaintext: [],
    },

    // ══════════════════════════════════════════════════════════════
    // TOKENIZER
    // ══════════════════════════════════════════════════════════════

    /**
     * Tokenize a code string into typed tokens.
     * @param {string} code - Raw code text
     * @param {string} language - Language identifier
     * @returns {Array<{type: string, text: string}>}
     */
    tokenize(code, language) {
        const grammar = this.grammars[language] || this.grammars.plaintext;
        if (grammar.length === 0) {
            return [{ type: 'plain', text: code }];
        }

        // Collect all matches from all rules with their positions
        const matches = [];
        for (const rule of grammar) {
            const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
            let m;
            while ((m = regex.exec(code)) !== null) {
                matches.push({
                    type: rule.type,
                    text: m[0],
                    start: m.index,
                    end: m.index + m[0].length,
                });
                // Prevent infinite loops on zero-length matches
                if (m[0].length === 0) regex.lastIndex++;
            }
        }

        // Sort by start position, then by length (longer matches first)
        matches.sort((a, b) => a.start - b.start || b.text.length - a.text.length);

        // Build token list, resolving overlaps (first match at each position wins)
        const tokens = [];
        let pos = 0;

        for (const match of matches) {
            if (match.start < pos) continue; // Skip overlapping match

            // Add plain text before this match
            if (match.start > pos) {
                tokens.push({ type: 'plain', text: code.substring(pos, match.start) });
            }

            tokens.push({ type: match.type, text: match.text });
            pos = match.end;
        }

        // Add remaining text
        if (pos < code.length) {
            tokens.push({ type: 'plain', text: code.substring(pos) });
        }

        return tokens;
    },

    // ══════════════════════════════════════════════════════════════
    // RENDERING
    // ══════════════════════════════════════════════════════════════

    /**
     * Convert tokens to HTML string with span wrappers.
     * @param {Array<{type: string, text: string}>} tokens
     * @returns {string} HTML
     */
    tokensToHtml(tokens) {
        return tokens.map(t => {
            const escaped = this._escapeHtml(t.text);
            if (t.type === 'plain') return escaped;
            return `<span class="tok-${t.type}">${escaped}</span>`;
        }).join('');
    },

    /**
     * Highlight a <code> element in place. Preserves caret position.
     * @param {Element} codeElement - The <code> element inside a code block
     * @param {string} language - Language identifier
     */
    highlight(codeElement, language) {
        if (!codeElement) return;

        const lang = language || 'plaintext';
        const code = codeElement.textContent;
        if (!code || code.trim() === '') return;

        // Save caret position
        const caretOffset = this._getCaretOffset(codeElement);

        // Tokenize and render
        const tokens = this.tokenize(code, lang);
        const html = this.tokensToHtml(tokens);

        // Apply highlighted HTML
        codeElement.innerHTML = html;

        // Restore caret position
        if (caretOffset >= 0) {
            this._setCaretOffset(codeElement, caretOffset);
        }
    },

    // ══════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════

    _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Get caret offset as a character count from the start of the element.
     */
    _getCaretOffset(element) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !element.contains(sel.anchorNode)) return -1;

        const range = sel.getRangeAt(0).cloneRange();
        range.selectNodeContents(element);
        range.setEnd(sel.anchorNode, sel.anchorOffset);

        return range.toString().length;
    },

    /**
     * Set caret at a character offset within an element.
     */
    _setCaretOffset(element, offset) {
        const sel = window.getSelection();
        const range = document.createRange();

        let pos = 0;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;

        while ((node = walker.nextNode())) {
            const len = node.textContent.length;
            if (pos + len >= offset) {
                range.setStart(node, offset - pos);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
            pos += len;
        }

        // If offset is beyond content, place at end
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    },
};

export default syntaxHighlighter;
