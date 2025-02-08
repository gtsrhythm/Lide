class MNEParser {
    // Define AutomationSystem class first, at the top of MNEParser
    static AutomationSystem = class {
        constructor(functions) {
            this.taskLibrary = new Map();
            this.utilities = {
                files: {
                    create: functions.createFile,
                    delete: functions.deleteFile,
                    read: functions.readFile,
                    write: functions.writeFile
                },
                folders: {
                    create: functions.createDirectory,
                    delete: functions.deleteDirectory
                },
                output: {
                    print: functions.print,
                    error: functions.printError,
                    success: functions.printSuccess,
                    clear: functions.clear
                },
                async sleep(ms) {
                    await functions.sleep(ms);
                }
            };
        }

        registerTask(name, description, fn) {
            this.taskLibrary.set(name, { description, fn });
        }

        async runTask(name, ...args) {
            const task = this.taskLibrary.get(name);
            if (!task) throw new Error(`Task "${name}" not found`);
            return await task.fn(...args);
        }
    };

    static initialize() {
        if (typeof hljs !== 'undefined') {
            hljs.configure({
                ignoreUnescapedHTML: true
            });
            hljs.highlightAll();
        }
        // Initialize automation functions first
        this.initializeAutomation();
        // Then create the automation system
        this.automation = new this.AutomationSystem(this.automationFunctions);
        // Register built-in tasks
        this.registerBuiltInTasks();
        this.terminalOutputs = new Map();
    }

    static initializeAutomation() {
        this.automationFunctions = {
            createFile: (path, content = '') => {
                return fetch('/create-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: path, force: true })
                }).then(r => r.json());
            },
            deleteFile: (path) => {
                return fetch('/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, type: 'file' })
                }).then(r => r.json());
            },
            readFile: async (path) => {
                const response = await fetch(`/read-file/${encodeURIComponent(path)}`);
                const data = await response.json();
                return data.content || '';
            },
            writeFile: (path, content) => {
                return fetch('/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: path, content })
                }).then(r => r.json());
            },
            createDirectory: (path) => {
                return fetch('/create-directory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dirname: path, force: true })
                }).then(r => r.json());
            },
            deleteDirectory: (path) => {
                return fetch('/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path, type: 'folder' })
                }).then(r => r.json());
            },
            print: (...args) => {
                const output = args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                this.appendToTerminal(this.currentAutomationId, output);
                return true;
            },
            
            printError: (...args) => {
                const output = args.join(' ');
                this.appendToTerminal(this.currentAutomationId, output, 'error');
                return true;
            },
            
            printSuccess: (...args) => {
                const output = args.join(' ');
                this.appendToTerminal(this.currentAutomationId, output, 'success');
                return true;
            },
            
            clear: () => {
                this.clearTerminal(this.currentAutomationId);
                return true;
            },
            sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
        };
    }

    static parse(text) {
        let html = text;
        
        // Handle automation blocks first to avoid syntax conflicts
        html = this.parseAutomationBlocks(html);
        
        // Continue with regular parsing
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

    static parseAutomationBlocks(text) {
        const pattern = /```automation\s*\n([\s\S]*?)\n```|:::automation\s*\n([\s\S]*?)\n:::/g;
        
        return text.replace(pattern, (match, code1, code2) => {
            const code = (code1 || code2).trim();
            const id = `automation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            
            try {
                // Parse simplified syntax
                const jsCode = MNEParser.convertToJavaScript(code);
                
                const executionBlock = `
                    <div class="automation-block" id="${id}">
                        <div class="automation-header">
                            <span class="automation-icon material-icons">auto_fix_high</span>
                            <span>Automation Script</span>
                            <div class="automation-controls">
                                <button onclick="MNEParser.showAutomationHelp('${id}')" class="automation-help" title="Show Help">
                                    <span class="material-icons">help_outline</span>
                                </button>
                                <button onclick="MNEParser.executeAutomation('${id}')" class="automation-run">
                                    <span class="material-icons">play_arrow</span>
                                    Run
                                </button>
                            </div>
                        </div>
                        <pre><code class="language-automation">${MNEParser.escapeHtml(code)}</code></pre>
                        <div class="automation-output" style="display: none;">
                            <div class="automation-status"></div>
                            <div class="automation-terminal"></div>
                        </div>
                    </div>
                `;

                if (!MNEParser.automationCode) MNEParser.automationCode = new Map();
                MNEParser.automationCode.set(id, jsCode);

                return executionBlock;
            } catch (error) {
                return `<div class="automation-block error">
                    <div class="automation-header">
                        <span class="automation-icon material-icons">error</span>
                        <span>Invalid Automation Script</span>
                    </div>
                    <pre><code class="language-automation">${MNEParser.escapeHtml(code)}</code></pre>
                    <div class="automation-error">${error.message}</div>
                </div>`;
            }
        });
    }

    static convertToJavaScript(code) {
        // Remove comments
        code = code.replace(/\/\/.*$/gm, '');
        
        // Parse task definitions
        if (code.includes('task')) {
            return MNEParser.parseTaskDefinition(code);
        }
        
        // Parse simple commands
        if (!code.includes('function') && !code.includes('=>')) {
            return MNEParser.parseSimpleCommands(code);
        }
        
        // Parse advanced code
        return MNEParser.parseAdvancedCode(code);
    }

    static parseTaskDefinition(code) {
        const taskPattern = /task\s+(['"])(.*?)\1\s*{([\s\S]*?)}/g;
        let jsCode = 'async function run() {\n';
        let match;
        
        while ((match = taskPattern.exec(code)) !== null) {
            const [_, quote, name, body] = match;
            const args = this.parseTaskArgs(body);
            jsCode += `  await MNEParser.automation.runTask('${name}', ${args});\n`;
        }
        
        return jsCode + '};\nrun();';
    }

    static parseTaskArgs(body) {
        const args = [];
        const lines = body.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;
            
            // Simple key-value pattern
            const match = trimmed.match(/(\w+):\s*(.+)/);
            if (match) {
                const [_, key, value] = match;
                args.push(value.trim());
            }
        }
        return args.join(', ');
    }

    static parseSimpleCommands(code) {
        const lines = code.split('\n').filter(line => line.trim());
        let jsCode = 'async function run() {\n';
        jsCode += '  const { files, folders, output } = MNEParser.automation.utilities;\n';
        
        for (const line of lines) {
            const command = line.trim();
            if (command.startsWith('create')) {
                const path = command.slice(7).trim();
                jsCode += `  await ${path.includes('.') ? 'files' : 'folders'}.create('${path}');\n`;
            } else if (command.startsWith('delete')) {
                const path = command.slice(7).trim();
                jsCode += `  await ${path.includes('.') ? 'files' : 'folders'}.delete('${path}');\n`;
            } else if (command.startsWith('print')) {
                const msg = command.slice(6).trim();
                jsCode += `  output.print(${msg});\n`;
            }
        }
        
        return jsCode + '};\nrun();';
    }

    static parseAdvancedCode(code) {
        try {
            let jsCode = code
                // Modern functions (both styles)
                .replace(/fn\s+(\w+)\s*\((.*?)\)/g, 'async function $1($2)')
                .replace(/fn\s*\((.*?)\)\s*=>/g, 'async ($1) =>')
                
                // Simple string interpolation - fix the regex to avoid lookbehind
                .replace(/("[^"]*)\{([^}]+)\}([^"]*")/g, '`$1${$2}$3')
                
                // Async sleep syntax
                .replace(/await\s+sleep\s+(\d+)/g, 'await sleep($1)')
                
                // Modern loop syntax
                .replace(/for\s+(\w+)\s+in\s+(\d+)\.\.(\d+)/g, 'for(let $1 = $2; $1 <= $3; $1++)')
                .replace(/for\s+(\w+)\s+in\s+(\w+)/g, 'for(const $1 of $2)')
                
                // Control structures
                .replace(/if\s+([^{]+?)\s*\{/g, 'if ($1) {')
                .replace(/\}\s*else\s*\{/g, '} else {')
                .replace(/\}\s*elif\s+([^{]+?)\s*\{/g, '} else if ($1) {')
                
                // Error handling
                .replace(/try\s*\{/g, 'try {')
                .replace(/\}\s*catch\s*\{/g, '} catch (error) {')
                
                // Keywords and symbols
                .replace(/\blet\b/g, 'let')
                .replace(/\bconst\b/g, 'const')
                .replace(/\bnil\b/g, 'null')
                .replace(/--/g, '//')
                .replace(/\bprint\b/g, 'print')
                .replace(/\berror\b/g, 'printError')
                .replace(/\bsuccess\b/g, 'printSuccess')
                .replace(/\bclear\b/g, 'clear')
                
                // End block replacements
                .replace(/\bend\b/g, '}');

            // Validate the resulting code
            Function(`"use strict";{${jsCode}}`);

            return `
                (async function() {
                    const { createFile, deleteFile, readFile, writeFile, 
                            createDirectory, deleteDirectory, print, printError,
                            printSuccess, clear, sleep } = MNEParser.automationFunctions;
                    try {
                        ${jsCode}
                    } catch (error) {
                        printError('Automation error:', error.message);
                        throw error;
                    }
                })()
            `;
        } catch (error) {
            throw new Error(`Invalid automation syntax: ${error.message}`);
        }
    }

    static async executeAutomation(id) {
        const block = document.getElementById(id);
        if (!block || !this.automationCode?.has(id)) return;
        
        const output = block.querySelector('.automation-output');
        const terminal = block.querySelector('.automation-terminal');
        
        try {
            output.style.display = 'block';
            this.currentAutomationId = id;
            this.clearTerminal(id);
            
            this.appendToTerminal(id, '> Starting automation...\n');
            
            const code = this.automationCode.get(id);
            await eval(code);
            
            this.appendToTerminal(id, '\n> Automation completed successfully', 'success');
            
            // Refresh workspace
            this.appendToTerminal(id, '\n> Refreshing workspace...', 'system');
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (window.loadWorkspaceFiles) {
                    await window.loadWorkspaceFiles();
                    this.appendToTerminal(id, '\n> Workspace refreshed', 'success');
                }
            } catch (error) {
                this.appendToTerminal(id, '\n> Failed to refresh workspace: ' + error.message, 'error');
            }
        } catch (error) {
            this.appendToTerminal(id, '\n> ' + error.message, 'error');
        } finally {
            this.currentAutomationId = null;
        }
    }

    static appendToTerminal(id, text, type = 'system') {
        const terminal = document.querySelector(`#${id} .automation-terminal`);
        if (!terminal) return;

        const line = document.createElement('div');
        line.className = `output-line ${type}`;
        line.textContent = text;
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    }

    static clearTerminal(id) {
        const terminal = document.querySelector(`#${id} .automation-terminal`);
        if (terminal) {
            terminal.innerHTML = '';
        }
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
                <div class="preview-hint">
                    <p>Create an automation block using:</p>
                    <pre>:::automation
fn setup() {
    print "Hello, automation!"
}
:::</pre>
                    <p>or with code fences:</p>
                    <pre>\`\`\`automation
fn setup() {
    print "Hello, automation!"
}
\`\`\`</pre>
                </div>
            </div>`;
        }
        // Use the same updated pattern for preview
        text = text.replace(/(?:```automation\n|\:{3}automation\n)([\s\S]*?)(?:\n```$|\n\:{3}$)/gm, '');
        return this.parse(text);
    }

    static registerBuiltInTasks() {
        this.automation.registerTask(
            'scaffold',
            'Create a basic project structure',
            async (projectName, template = 'basic') => {
                const { folders, files, output } = this.automation.utilities;
                
                output.print(`Creating ${template} project: ${projectName}`);
                
                await folders.create(projectName);
                
                if (template === 'basic') {
                    await files.create(`${projectName}/README.md`, '# ' + projectName);
                    await files.create(`${projectName}/src/main.js`, '// Main entry point');
                    await files.create(`${projectName}/src/styles.css`, '/* Styles */');
                }
                
                output.success('Project created successfully!');
            }
        );
    }

    static runAutomation(content) {
        const pattern = /```automation\n([\s\S]*?)\n```|:::automation\n([\s\S]*?)\n:::/g;
        const matches = content.match(pattern);
        
        if (!matches) {
            throw new Error('No automations found in file');
        }
        
        // Create a temporary container for automation blocks
        const container = document.createElement('div');
        container.id = 'temp-automation-container';
        container.style.display = 'none';
        document.body.appendChild(container);
        
        const automations = matches.map(block => {
            const codeMatch = block.match(/(?:```automation\n|:::automation\n)([\s\S]*?)(?:\n```|\n:::)/);
            const code = codeMatch[1].trim();
            const id = `automation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            
            // Create the automation block in DOM
            container.innerHTML += `
                <div class="automation-block" id="${id}">
                    <div class="automation-output">
                        <div class="automation-status"></div>
                        <div class="automation-terminal"></div>
                    </div>
                </div>
            `;
            
            // Store the code for execution
            if (!this.automationCode) this.automationCode = new Map();
            this.automationCode.set(id, this.convertToJavaScript(code));
            
            return { id, code };
        });
        
        return automations;
    }

    static cleanup() {
        const container = document.getElementById('temp-automation-container');
        if (container) {
            container.remove();
        }
        this.automationCode = new Map();
    }

    static showAutomationHelp(id) {
        const block = document.getElementById(id);
        const output = block.querySelector('.automation-output');
        const terminal = block.querySelector('.automation-terminal');
        
        output.style.display = 'block';
        terminal.innerHTML = `
            <div class="help-section">
                <h4>Quick Reference</h4>
                <pre>
// Simple commands:
create file.txt
create src/
delete file.txt
print "Message"

// Task usage:
task "scaffold" {
    name: "myproject"
    template: "basic"
}

// Advanced usage:
fn setup() {
    const { files, output } = automation.utilities;
    // Your code here
}
</pre>
            </div>
        `;
    }
}

// Initialize at the end
window.MNEParser = MNEParser;
MNEParser.initialize();
