class MNEParser {
    static initialize() {
        if (typeof hljs !== 'undefined') {
            hljs.configure({
                ignoreUnescapedHTML: true
            });
            hljs.highlightAll();
        }
    }

    static parse(text) {
        let html = text;

        const codeBlocks = new Map();
        html = this.preserveCodeBlocks(html, codeBlocks);

        html = html.replace(/\r\n/g, '\n')
                  .replace(/\n{3,}/g, '\n\n')
                  .replace(/^(\s*\n)+/, '');

        html = html.split(/\n\n+/).map(block => {
            block = block.trim();
            if (!block) return '';

            if (block.includes('|') && block.includes('\n')) {
                return this.processTable(block);
            }

            if (block.includes('\n')) {
                return block.split('\n').map(line => this.processBlock(line)).join('\n');
            }
            
            return this.processBlock(block);
        }).join('\n\n');

        html = this.restoreCodeBlocks(html, codeBlocks);
        html = this.parseInlineElements(html);

        return html;
    }

    static processBlock(block) {
        const headerMatch = block.match(/^(#{1,6})\s+(.*?)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const content = headerMatch[2].trim();
            return `<h${level}>${content}</h${level}>`;
        }

        if (block.match(/^[*+-]\s+/)) {
            const items = block.split('\n')
                .filter(item => item.trim())
                .map(item => `<li>${item.replace(/^[*+-]\s+/, '')}</li>`)
                .join('');
            return `<ul>${items}</ul>`;
        }

        if (block.match(/^\d+\.\s+/)) {
            const items = block.split('\n')
                .filter(item => item.trim())
                .map(item => `<li>${item.replace(/^\d+\.\s+/, '')}</li>`)
                .join('');
            return `<ol>${items}</ol>`;
        }

        if (block.startsWith('>')) {
            const content = block.split('\n')
                .map(line => line.replace(/^>\s?/, ''))
                .join('<br>');
            return `<blockquote>${content}</blockquote>`;
        }

        if (block.match(/^-{3,}$/)) {
            return '<hr>';
        }

        return block.startsWith('<') ? block : `<p>${block}</p>`;
    }

    static processTable(block) {
        const rows = block.trim().split('\n');
        
        if (rows.length < 2) return block;

        const headerCells = this.parseTableRow(rows[0]);

        const delimiterRow = rows[1];
        if (!delimiterRow.match(/^\s*\|[-:\s|]*\|\s*$/)) return block;

        const alignments = delimiterRow.split('|')
            .filter(cell => cell.trim())
            .map(cell => {
                cell = cell.trim();
                if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
                if (cell.endsWith(':')) return 'right';
                return 'left';
            });

        const bodyRows = rows.slice(2).map(row => this.parseTableRow(row));

        return `<div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        ${headerCells.map((cell, i) => 
                            `<th class="text-${alignments[i] || 'left'}">${cell}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${bodyRows.map(row => 
                        `<tr>${row.map((cell, i) => 
                            `<td class="text-${alignments[i] || 'left'}">${cell}</td>`
                        ).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>
        </div>`;
    }

    static parseTableRow(row) {
        return row.split('|')
            .filter((cell, i, arr) => i > 0 && i < arr.length - 1)
            .map(cell => cell.trim());
    }

    static preserveCodeBlocks(text, codeBlocks) {
        return text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const id = `CODE_BLOCK_${codeBlocks.size}`;
            const validLang = this.getValidLanguage(lang);
            
            codeBlocks.set(id, {
                code: code.trim(),
                language: validLang
            });
            
            return id;
        });
    }

    static getValidLanguage(lang) {
        const aliases = {
            'js': 'javascript',
            'py': 'python',
            'md': 'markdown',
            'sh': 'bash',
            'shell': 'bash',
            'html': 'xml',
            'yml': 'yaml',
            'rb': 'ruby'
        };

        const normalized = (lang || '').toLowerCase();
        return aliases[normalized] || normalized;
    }

    static restoreCodeBlocks(text, codeBlocks) {
        let result = text;
        for (const [id, data] of codeBlocks) {
            const { code, language } = data;
            
            const html = `
                <pre><code class="${language ? `language-${language}` : ''}">${this.escapeHtml(code)}</code></pre>
            `.trim();
            
            result = result.replace(id, html);
        }
        
        if (typeof hljs !== 'undefined') {
            setTimeout(() => {
                document.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightElement(block);
                });
            }, 0);
        }
        
        return result;
    }

    static parseInlineElements(text) {
        const elements = [
            [/\*\*(.*?)\*\*/g, '<strong>$1</strong>'],
            [/\*(.*?)\*/g, '<em>$1</em>'],
            [/`(.*?)`/g, '<code>$1</code>'],
            [/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>']
        ];

        elements.forEach(([pattern, replacement]) => {
            text = text.replace(pattern, replacement);
        });

        return text;
    }

    static escapeHtml(text) {
        const escapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, char => escapes[char]);
    }

    static preview(text) {
        if (!text.trim()) {
            return `<div class="mne-preview-empty">
                <em>Start typing to see the preview...</em>
            </div>`;
        }
        return this.parse(text);
    }
}

window.MNEParser = MNEParser;
MNEParser.initialize();
