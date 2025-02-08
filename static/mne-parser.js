class MNEParser {
    static initialize() {
        // Initialize highlight.js
        if (typeof hljs !== 'undefined') {
            hljs.configure({
                ignoreUnescapedHTML: true
            });
            hljs.highlightAll();
        }
    }

    static parse(text) {
        let html = text;

        // Pre-process code blocks to protect their formatting
        const codeBlocks = new Map();
        html = this.preserveCodeBlocks(html, codeBlocks);

        // Pre-process to normalize line endings and remove extra spaces
        html = html.replace(/\r\n/g, '\n')
                  .replace(/\n{3,}/g, '\n\n')
                  .replace(/^(\s*\n)+/, '');  // Remove leading empty lines

        // Process blocks
        html = html.split(/\n\n+/).map(block => {
            block = block.trim();
            if (!block) return '';

            // Check if block is a table
            if (block.includes('|') && block.includes('\n')) {
                return this.processTable(block);
            }

            // Headers - now handling each line separately
            if (block.includes('\n')) {
                return block.split('\n').map(line => this.processBlock(line)).join('\n');
            }
            
            return this.processBlock(block);
        }).join('\n\n');

        // Restore code blocks
        html = this.restoreCodeBlocks(html, codeBlocks);

        // Inline elements
        html = this.parseInlineElements(html);

        return html;
    }

    static processBlock(block) {
        // Headers
        const headerMatch = block.match(/^(#{1,6})\s+(.*?)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const content = headerMatch[2].trim();
            return `<h${level}>${content}</h${level}>`;
        }

        // Lists
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

        // Blockquotes
        if (block.startsWith('>')) {
            const content = block.split('\n')
                .map(line => line.replace(/^>\s?/, ''))
                .join('<br>');
            return `<blockquote>${content}</blockquote>`;
        }

        // Horizontal rules
        if (block.match(/^-{3,}$/)) {
            return '<hr>';
        }

        // Regular paragraph
        return block.startsWith('<') ? block : `<p>${block}</p>`;
    }

    static processTable(block) {
        const rows = block.trim().split('\n');
        
        // Need at least header row and delimiter row
        if (rows.length < 2) return block;

        // Process header row
        const headerCells = this.parseTableRow(rows[0]);

        // Validate delimiter row
        const delimiterRow = rows[1];
        if (!delimiterRow.match(/^\s*\|[-:\s|]*\|\s*$/)) return block;

        // Get alignment from delimiter row
        const alignments = delimiterRow.split('|')
            .filter(cell => cell.trim())
            .map(cell => {
                cell = cell.trim();
                if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
                if (cell.endsWith(':')) return 'right';
                return 'left';
            });

        // Process body rows
        const bodyRows = rows.slice(2).map(row => this.parseTableRow(row));

        // Build table HTML
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
            .filter((cell, i, arr) => i > 0 && i < arr.length - 1) // Remove first/last empty cells
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
        // Normalize common language aliases
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
            
            // Create code block HTML
            const html = `
                <pre><code class="${language ? `language-${language}` : ''}">${this.escapeHtml(code)}</code></pre>
            `.trim();
            
            result = result.replace(id, html);
        }
        
        // Initialize highlighting
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
        // Order matters: process bold before italic
        const elements = [
            [/\*\*(.*?)\*\*/g, '<strong>$1</strong>'],     // **bold**
            [/\*(.*?)\*/g, '<em>$1</em>'],                 // *italic*
            [/`(.*?)`/g, '<code>$1</code>'],               // `code`
            [/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>'] // [link](url)
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

// Initialize MNE Parser
window.MNEParser = MNEParser;
MNEParser.initialize();
