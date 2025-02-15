const animations = {
    slideIn: { duration: 0.4, ease: "power3.out" },
    fadeIn: { duration: 0.3, ease: "power2.out" },
    fadeOut: { duration: 0.2, ease: "power2.in" },
    scale: { duration: 0.3, ease: "back.out(1.7)" },
    toast: { 
        in: { duration: 0.4, ease: "power3.out" },
        out: { duration: 0.3, ease: "power3.in", delay: 2.5 }
    },
    sidebar: {
        panel: { duration: 0.6, ease: "power3.out" },
        items: { duration: 0.4, ease: "power2.out", stagger: 0.03 }
    }
};

let mainTimeline = gsap.timeline();

function updateLineNumbers() {
    const editor = document.getElementById('editor');
    const lines = editor.value.split('\n');
    const lineNumbers = lines.map((_, index) => index + 1).join('\n');
    editor.setAttribute('data-lines', lineNumbers);
}

document.getElementById('editor').addEventListener('input', updateLineNumbers);
document.getElementById('editor').addEventListener('scroll', function() {
    document.querySelector('.line-numbers').scrollTop = this.scrollTop;
});

updateLineNumbers();

let openTabs = [];
let activeTab = null;

function openFile(filepath) {

    if (openTabs.find(tab => tab.filepath === filepath)) {
        switchToTab(filepath);
        return;
    }

    fetch(`/read-file/${encodeURIComponent(filepath)}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const newTab = {
                    filepath: filepath,
                    filename: filepath.split('/').pop(),
                    content: data.content
                };
                openTabs.push(newTab);
                switchToTab(filepath);
                updateTabBar();
            }
        });
}

function switchToTab(filepath) {
    const tab = openTabs.find(tab => tab.filepath === filepath);
    if (!tab) return;

    const prevTab = activeTab;
    activeTab = tab;

    const tl = gsap.timeline();
    const editor = document.getElementById('editor');
    const preview = document.querySelector('.mne-preview');

    if (prevTab?.filepath.endsWith('.mne')) {
        isPreviewMode = false;
    }

    if (prevTab) {
        prevTab.content = editor.value;
        tl.to([editor, preview], {
            opacity: 0,
            y: 10,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
                editor.value = tab.content;
                updateLineNumbers();

                if (tab.filepath.endsWith('.mne')) {
                    if (preview) preview.style.display = 'block';
                    updatePreview();
                    setTimeout(showPreviewHint, 1000);
                } else {
                    if (preview) preview.style.display = 'none';
                }
            }
        }).to(editor, {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: "power2.out"
        });
    } else {
        editor.value = tab.content;
        updateLineNumbers();

        if (tab.filepath.endsWith('.mne')) {
            if (preview) {
                preview.style.display = 'block';
                updatePreview();
            }
            setTimeout(showPreviewHint, 1000);
        } else {
            if (preview) preview.style.display = 'none';
        }
    }

    updateTabBar();
    updateEditorToolbar();
}

function closeTab(filepath, event) {
    event.stopPropagation();
    const index = openTabs.findIndex(tab => tab.filepath === filepath);
    if (index !== -1) {
        const closingTab = openTabs[index];
        openTabs.splice(index, 1);

        if (closingTab.filepath.endsWith('.mne')) {
            const preview = document.querySelector('.mne-preview');
            if (preview) {
                gsap.to(preview, {
                    opacity: 0,
                    x: 50,
                    duration: animations.slideIn.duration,
                    ease: animations.slideIn.ease,
                    onComplete: () => {
                        preview.style.display = 'none';
                        preview.remove(); 
                    }
                });
            }
            isPreviewMode = false;
        }

        if (activeTab && activeTab.filepath === filepath) {
            const nextTab = openTabs[Math.min(index, openTabs.length - 1)];
            activeTab = nextTab || null;

            if (activeTab) {
                document.getElementById('editor').value = activeTab.content;
                updateLineNumbers();

                if (activeTab.filepath.endsWith('.mne')) {
                    setTimeout(showPreviewHint, 1000);
                }
            } else {
                document.getElementById('editor').value = '';
            }
        }

        updateTabBar();
    }
}

const fadeInConfig = {
    opacity: 1,
    duration: 0.3,
    ease: "power2.out"
};

const fadeOutConfig = {
    opacity: 0,
    duration: 0.2,
    ease: "power2.in"
};

function updateTabBar() {
    const tabBar = document.getElementById('tab-bar');
    const welcomeScreen = document.querySelector('.welcome-screen');
    const saveButton = document.getElementById('save-btn');

    if (openTabs.length === 0) {
        tabBar.innerHTML = ''; 
        document.getElementById('editor').value = '';
        document.getElementById('editor').disabled = true;
        welcomeScreen.classList.remove('hidden');
        if (saveButton) {
            saveButton.disabled = true;
        }

        gsap.from(".placeholder-tab", {
            y: -20,
            opacity: 0,
            duration: 0.4,
            ease: "back.out(1.4)"
        });
    } else {
        tabBar.innerHTML = openTabs.map(tab => {
            const isRunnable = tab.filepath.startsWith('script');
            return `
                <div class="tab ${activeTab && activeTab.filepath === tab.filepath ? 'active' : ''}" 
                     onclick="switchToTab('${tab.filepath}')">
                    <span>${tab.filename}</span>
                    ${isRunnable ? `
                        <span class="run-btn" onclick="event.stopPropagation(); runAutomation(event);" title="Run (Ctrl+R)">
                            <span class="material-icons">play_arrow</span>
                        </span>
                    ` : ''}
                    <span class="close-btn" onclick="event.stopPropagation(); closeTab('${tab.filepath}', event)">×</span>
                </div>
            `;
        }).join('');
        document.getElementById('editor').disabled = false;
        welcomeScreen.classList.add('hidden');
        if (saveButton) {
            saveButton.disabled = false;
        }

        gsap.from(".tab:not(.animated)", {
            scale: 0.8,
            opacity: 0,
            duration: 0.3,
            stagger: 0.05,
            ease: "back.out(1.7)",
            onComplete: function() {
                document.querySelectorAll('.tab').forEach(tab => tab.classList.add('animated'));
            }
        });
    }

    if (activeTab && activeTab.filepath.endsWith('.mne')) {
        showPreviewHint();
    } else if (isPreviewMode) {
        togglePreview();
    }
}

function saveContent() {
    if (!activeTab) return;

    const content = document.getElementById('editor').value;
    activeTab.content = content;

    const saveButton = document.getElementById('save-btn');
    if (!saveButton) return; 

    gsap.to(saveButton, {
        backgroundColor: 'rgba(46, 125, 50, 0.2)',
        borderColor: 'rgba(46, 125, 50, 0.3)',
        scale: 0.95,
        duration: 0.2,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
        onComplete: () => {
            saveButton.style.removeProperty('background-color');
            saveButton.style.removeProperty('border-color');
        }
    });

    fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            content: content,
            filename: activeTab.filepath
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('File saved', 'save');
        } else {
            showToast('Error saving file', 'error');
        }
    })
    .catch(error => {
        console.error('Save error:', error);
        showToast('Error saving file', 'error');
    });
}

function openSettings() {
    const panel = document.querySelector('.settings-panel');
    const settingsBtn = document.getElementById('settings-btn'); 

    panel.classList.add('open');
    settingsBtn.disabled = true;

    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
    document.querySelector('.settings-nav-item[data-section="editor"]').classList.add('active');
    document.getElementById('editor-section').classList.add('active');

    gsap.fromTo(panel,
        { opacity: 0, y: 20 },
        { 
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: "power3.out",
            onStart: () => panel.style.display = 'flex'
        }
    );
}

function closeSettings() {
    const panel = document.querySelector('.settings-panel');
    const settingsBtn = document.getElementById('settings-btn'); 

    gsap.to(panel, {
        opacity: 0,
        y: 20,
        duration: 0.2,
        ease: "power3.in",
        onComplete: () => {
            panel.classList.remove('open');
            panel.style.display = 'none';
            settingsBtn.disabled = false;
        }
    });
}

document.getElementById('editor').addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
    }
});

let createMode = null;

function showCreateInput(mode) {
    createMode = mode;
    const container = document.getElementById('create-input-container');
    const input = document.getElementById('create-input');
    const hint = container.querySelector('.input-hint');

    container.style.display = 'block';
    input.value = '';
    input.placeholder = mode === 'file' ? 'filename.ext' : 'folder-name';
    hint.textContent = mode === 'file' ? 
        'Press Enter to create file, Esc to cancel' : 
        'Press Enter to create folder, Esc to cancel';
    input.focus();

    gsap.fromTo(container, 
        { height: 0, opacity: 0 },
        { 
            height: "auto", 
            opacity: 1, 
            duration: 0.3,
            ease: "power2.out",
            onStart: () => container.style.display = 'block'
        }
    );
}

function cancelCreate() {
    const container = document.getElementById('create-input-container');

    gsap.to(container, {
        height: 0,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
            container.style.display = 'none';
            document.getElementById('create-input').value = '';
            createMode = null;
        }
    });
}

function showConfirmDialog(options) {
    let dialog = document.querySelector('.confirm-dialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        document.body.appendChild(dialog);
    }

    const buttons = options.buttons.map(btn => `
        <button class="confirm-btn ${btn.type || ''}" id="${btn.id}">
            ${btn.text}
        </button>
    `).join('');

    dialog.innerHTML = `
        <p>${options.message}</p>
        ${options.input ? `
            <input type="text" 
                id="${options.input.id}" 
                value="${options.input.value}" 
                class="confirm-input"
                placeholder="${options.input.placeholder || ''}"
            >
        ` : ''}
        <div class="confirm-actions">
            ${buttons}
        </div>
    `;

    dialog.style.display = 'block';
    gsap.fromTo(dialog,
        { 
            scale: 0.9,
            y: 20,
            opacity: 0
        },
        { 
            scale: 1,
            y: 0,
            opacity: 1,
            duration: 0.3,
            ease: "back.out(1.7)"
        }
    );

    options.buttons.forEach(btn => {
        const buttonEl = dialog.querySelector(`#${btn.id}`);
        buttonEl.onclick = () => {
            if (btn.onClick) btn.onClick();
            hideConfirmDialog();
        };
    });

    if (options.input) {
        const input = dialog.querySelector(`#${options.input.id}`);
        input.focus();
        if (options.input.selectRange) {
            const dotIndex = input.value.lastIndexOf('.');
            input.setSelectionRange(0, dotIndex > 0 ? dotIndex : input.value.length);
        }
    }
}

function hideConfirmDialog() {
    const dialog = document.querySelector('.confirm-dialog');
    if (dialog) {
        gsap.to(dialog, {
            scale: 0.9,
            y: 20,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => dialog.style.display = 'none'
        });
    }
}

function createFileOrFolder(value, mode, force = false) {
    const endpoint = mode === 'folder' ? '/create-directory' : '/create-file';
    const payload = mode === 'folder' ? 
        { dirname: value, force } : 
        { filename: value, force };

    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'exists') {
            showConfirmDialog({
                message: `${mode === 'folder' ? 'Folder' : 'File'} "${value}" already exists. Replace it?`,
                buttons: [
                    {
                        id: 'replace-cancel',
                        text: 'Cancel',
                        onClick: () => {}
                    },
                    {
                        id: 'replace-confirm',
                        text: 'Replace',
                        type: 'danger',
                        onClick: () => createFileOrFolder(value, mode, true)
                    }
                ]
            });
        } else if (data.status === 'success') {
            loadWorkspaceFiles();
            document.getElementById('create-input').value = '';
            document.getElementById('create-input-container').style.display = 'none';
            createMode = null;
        }
    });
}

document.getElementById('create-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const value = this.value.trim();
        if (!value) return;
        createFileOrFolder(value, createMode);
    } else if (e.key === 'Escape') {
        this.value = '';
        document.getElementById('create-input-container').style.display = 'none';
        createMode = null;
    }
});

function loadWorkspaceFiles() {
    return fetch('/workspace-files')
        .then(response => response.json())
        .then(data => {
            const workspaceFiles = document.getElementById('workspace-files');

            return gsap.to(workspaceFiles.children, {
                opacity: 0,
                y: -10,
                duration: 0.2,
                ease: "power2.in",
                stagger: 0.02
            }).then(() => {

                workspaceFiles.innerHTML = renderFileTree(data.files);

                return gsap.from('.file-item, .directory-item', {
                    opacity: 0,
                    x: -20,
                    duration: 0.3,
                    ease: "power2.out",
                    stagger: 0.03,
                    clearProps: "all"
                });
            });
        });
}

window.loadWorkspaceFiles = loadWorkspaceFiles;

let activeContextItem = null;

function renderFileTree(items) {

    items.sort((a, b) => {
        if (settings.sortOrder === 'type') {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'directory' ? -1 : 1;
        } else if (settings.sortOrder === 'name') {
            return a.name.localeCompare(b.name);
        } else if (settings.sortOrder === 'date') {
            return b.modified - a.modified;
        }
    });

    const tree = items.map(item => {
        if (item.type === 'directory') {
            return `
                <div class="directory-item">
                    <div class="file-item">
                        <div class="file-item-content" onclick="toggleDirectory(this)">
                            <span class="material-icons">folder</span>
                            <span>${item.name}</span>
                        </div>
                        <div class="file-item-actions">
                            <span class="action-icon" onclick="showRenameDialog('${item.path}', 'folder')">
                                <span class="material-icons">edit</span>
                            </span>
                            <span class="action-icon delete" onclick="showDeleteConfirmation('${item.path}', 'folder')">
                                <span class="material-icons">delete</span>
                            </span>
                        </div>
                    </div>
                    <div class="directory-content">
                        ${renderFileTree(item.children)}
                    </div>
                </div>
            `;
        } else {
            const isRunnable = item.name.startsWith('script');
            return `
                <div class="file-item" ${isRunnable ? 'data-runnable="true"' : ''}>
                    <div class="file-item-content" onclick="openFile('${item.path}')">
                        <span class="material-icons">description</span>
                        <span>${getDisplayName(item.name, 'file')}</span>
                    </div>
                    <div class="file-item-actions">
                        <span class="action-icon" onclick="showRenameDialog('${item.path}', 'file')">
                            <span class="material-icons">edit</span>
                        </span>
                        <span class="action-icon delete" onclick="showDeleteConfirmation('${item.path}', 'file')">
                            <span class="material-icons">delete</span>
                        </span>
                    </div>
                </div>
            `;
        }
    }).join('');
    return tree;
}

function toggleDirectory(element) {
    const directoryItem = element.closest('.directory-item');
    const content = directoryItem.querySelector('.directory-content');
    const icon = element.querySelector('.material-icons');

    const isExpanded = directoryItem.classList.contains('expanded');

    if (isExpanded) {
        gsap.to(content, {
            height: 0,
            opacity: 0,
            duration: 0.3,
            ease: "power2.inOut",
            onComplete: () => {
                directoryItem.classList.remove('expanded');
            }
        });
    } else {
        directoryItem.classList.add('expanded');
        gsap.fromTo(content,
            { height: 0, opacity: 0 },
            { 
                height: "auto",
                opacity: 1,
                duration: 0.3,
                ease: "power2.out"
            }
        );
    }
}

function hideContextMenus() {

}

function showContextMenu() {

}

function handleContextAction(action, type) {
    if (!activeContextItem) return;

    switch (action) {
        case 'save':
            saveContent();
            break;
        case 'rename':
            showRenameDialog(activeContextItem, type);
            break;
        case 'delete':
            showDeleteConfirmation(activeContextItem, type);
            break;
    }
    hideContextMenus();
}

function showRenameDialog(path, type) {
    const currentName = path.split('/').pop();
    showConfirmDialog({
        message: `Rename ${type}:`,
        input: {
            id: 'rename-input',
            value: currentName,
            placeholder: type === 'file' ? 'filename.ext' : 'folder-name',
            selectRange: true
        },
        buttons: [
            {
                id: 'rename-cancel',
                text: 'Cancel',
                onClick: () => {}
            },
            {
                id: 'rename-confirm',
                text: 'Rename',
                type: 'primary',
                onClick: () => {
                    const newName = document.getElementById('rename-input').value.trim();
                    if (newName && newName !== currentName) {
                        renameItem(path, newName, type);
                    }
                }
            }
        ]
    });
}

function renameItem(oldPath, newName, type) {
    fetch('/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newName, type })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            loadWorkspaceFiles();
            if (type === 'file') {
                updateTabsAfterRename(oldPath, data.newPath);
            }
        }
    });
}

function updateTabsAfterRename(oldPath, newPath) {
    const tab = openTabs.find(tab => tab.filepath === oldPath);
    if (tab) {
        tab.filepath = newPath;
        tab.filename = newPath.split('/').pop();
        updateTabBar();
    }
}

function showDeleteConfirmation(path, type) {
    const name = path.split('/').pop();
    showConfirmDialog({
        message: `Are you sure you want to delete ${type} "${name}"?`,
        buttons: [
            {
                id: 'delete-cancel',
                text: 'Cancel',
                onClick: () => {}
            },
            {
                id: 'delete-confirm',
                text: 'Delete',
                type: 'danger',
                onClick: () => deleteItem(path, type)
            }
        ]
    });
}

function deleteItem(path, type) {
    fetch('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            loadWorkspaceFiles();
            if (type === 'file') {
                closeTab(path, new Event('click'));
            }
        }
    });
}

function initializeEditor() {
    updateTabBar(); 
    document.getElementById('editor').disabled = true;
    updateLineNumbers();
}

document.addEventListener('DOMContentLoaded', () => {

    const tl = gsap.timeline();

    tl.from('.side-panel', {
        x: -50,
        opacity: 0,
        duration: animations.sidebar.panel.duration,
        ease: animations.sidebar.panel.ease
    }).from('.panel-header', {
        opacity: 0,
        y: -20,
        duration: 0.4,
        ease: "power2.out"
    }, "-=0.3").from('.action-buttons', {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.1
    }, "-=0.2");

    setTimeout(loadWorkspaceFiles, animations.sidebar.panel.duration * 1000);

    initializeEditor();

    gsap.from('.main-content', {
        opacity: 0,
        duration: 0.5,
        delay: 0.2,
        ease: "power2.out"
    });

    gsap.from('.control-center', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        delay: 0.4,
        ease: "back.out(1.7)"
    });

    loadSettings();

    document.getElementById('settings-close').addEventListener('click', closeSettings);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const panel = document.querySelector('.settings-panel');
            if (panel.classList.contains('open')) {
                closeSettings();
            }
        }
    });

    document.getElementById('ui-density').addEventListener('change', function(e) {
        settings.density = e.target.value;
        saveSettings();
        applyDensity(e.target.value);
    });

    document.getElementById('font-family').addEventListener('change', function(e) {
        settings.fontFamily = e.target.value;
        saveSettings();
        applyFontFamily(e.target.value);
    });

    document.getElementById('cursor-style').addEventListener('change', function(e) {
        settings.cursorStyle = e.target.value;
        saveSettings();
        applyCursorStyle(e.target.value);
    });

    const toggles = document.querySelectorAll('.toggle input[type="checkbox"]');
    toggles.forEach(toggle => {

        const indicator = toggle.nextElementSibling.querySelector('.toggle-indicator');
        toggle.checked = settings[toggle.id.replace(/-/g, '')] || false;
        gsap.set(indicator, { x: toggle.checked ? 20 : 0 });

        toggle.addEventListener('change', function() {
            const isChecked = this.checked;
            const indicator = this.nextElementSibling.querySelector('.toggle-indicator');

            gsap.to(indicator, {
                x: isChecked ? 20 : 0,
                duration: 0.3,
                ease: "power2.out"
            });

            switch(this.id) {
                case 'show-extensions':
                    settings.showExtensions = isChecked;
                    loadWorkspaceFiles();
                    break;
                case 'auto-save':
                    settings.autoSave = isChecked;
                    if (isChecked) {
                        enableAutoSave();
                        showToast('Auto-save enabled', 'save');
                    } else {
                        showToast('Auto-save disabled', 'save_alt');
                    }
                    break;
                case 'line-wrap':
                    settings.lineWrap = isChecked;
                    const editor = document.getElementById('editor');
                    editor.style.whiteSpace = isChecked ? 'pre-wrap' : 'pre';
                    showToast(`Line wrap ${isChecked ? 'enabled' : 'disabled'}`, 'wrap_text');
                    break;
                case 'auto-backup':
                    settings.autoBackup = isChecked;
                    if (isChecked) {
                        enableAutoBackup();
                        showToast('Auto-backup enabled', 'backup');
                    } else {
                        showToast('Auto-backup disabled', 'backup_disabled');
                    }
                    break;
            }

            saveSettings();
        });
    });
});

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const saveButton = document.getElementById('save-btn');
        if (saveButton && !saveButton.disabled) {
            saveContent();
        }
    }
});

function openSettings() {
    const panel = document.querySelector('.settings-panel');
    const settingsBtn = document.getElementById('settings-btn'); 

    panel.classList.add('open');
    settingsBtn.disabled = true;

    gsap.fromTo(panel,
        { opacity: 0, y: 20 },
        { 
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: "power3.out",
            onStart: () => panel.style.display = 'flex'
        }
    );
}

function closeSettings() {
    const panel = document.querySelector('.settings-panel');
    const settingsBtn = document.getElementById('settings-btn'); 

    gsap.to(panel, {
        opacity: 0,
        y: 20,
        duration: 0.2,
        ease: "power3.in",
        onComplete: () => {
            panel.classList.remove('open');
            panel.style.display = 'none';
            settingsBtn.disabled = false;
        }
    });
}

let settings = {
    showExtensions: true,
    autoSave: false,
    lineWrap: false,
    theme: 'dark',
    density: 'comfortable',
    fontFamily: 'jetbrains',
    cursorStyle: 'line',
    sortOrder: 'type',
    autoBackup: false
};

function saveSettings() {
    try {
        localStorage.setItem('editor-settings', JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

function loadSettings() {
    const savedSettings = localStorage.getItem('editor-settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }

    updateSettingButton('show-extensions', settings.showExtensions);
    updateSettingButton('auto-save', settings.autoSave);
    updateSettingButton('line-wrap', settings.lineWrap);
    updateSettingButton('auto-backup', settings.autoBackup);

    document.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;
    document.getElementById('ui-density').value = settings.density;
    document.getElementById('font-family').value = settings.fontFamily;
    document.getElementById('cursor-style').value = settings.cursorStyle;
    document.getElementById('sort-order').value = settings.sortOrder;

    if (settings.autoSave) enableAutoSave();
    if (settings.autoBackup) enableAutoBackup();
    if (settings.lineWrap) {
        document.getElementById('editor').style.whiteSpace = 'pre-wrap';
    }
    applyTheme(settings.theme);
    applyDensity(settings.density);
    applyFontFamily(settings.fontFamily);
    applyCursorStyle(settings.cursorStyle);
}

function updateSettingButton(id, isEnabled) {
    const button = document.getElementById(id);
    button.dataset.state = isEnabled ? 'on' : 'off';
    button.querySelector('.button-label').textContent = isEnabled ? 'On' : 'Off';
}

document.addEventListener('DOMContentLoaded', () => {

    const settingButtons = document.querySelectorAll('.setting-button');
    settingButtons.forEach(button => {
        button.addEventListener('click', function() {
            try {
                const isEnabled = this.dataset.state !== 'on';
                this.dataset.state = isEnabled ? 'on' : 'off';
                this.querySelector('.button-label').textContent = isEnabled ? 'On' : 'Off';

                const settingId = this.id;
                switch(settingId) {
                    case 'show-extensions':
                        settings.showExtensions = isEnabled;
                        loadWorkspaceFiles();
                        break;
                    case 'auto-save':
                        settings.autoSave = isEnabled;
                        if (isEnabled) {
                            enableAutoSave();
                            showToast('Auto-save enabled', 'save');
                        } else {
                            showToast('Auto-save disabled', 'save_alt');
                        }
                        break;
                    case 'line-wrap':
                        settings.lineWrap = isEnabled;
                        const editor = document.getElementById('editor');
                        editor.style.whiteSpace = isEnabled ? 'pre-wrap' : 'pre';
                        showToast(`Line wrap ${isEnabled ? 'enabled' : 'disabled'}`, 'wrap_text');
                        break;
                    case 'auto-backup':
                        settings.autoBackup = isEnabled;
                        if (isEnabled) {
                            enableAutoBackup();
                            showToast('Auto-backup enabled', 'backup');
                        } else {
                            showToast('Auto-backup disabled', 'backup_disabled');
                        }
                        break;
                }

                saveSettings();

                gsap.to(this, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    ease: "power2.out"
                });
            } catch (error) {
                console.error('Error handling setting button click:', error);
            }
        });
    });
});

let autoSaveTimeout;
function enableAutoSave() {
    document.getElementById('editor').addEventListener('input', function() {
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        if (!settings.autoSave || !activeTab) return;

        autoSaveTimeout = setTimeout(() => {
            saveContent();
        }, 1000);
    });
}

document.getElementById('show-extensions').addEventListener('change', function(e) {
    settings.showExtensions = e.target.checked;
    saveSettings();
    loadWorkspaceFiles();
});

document.getElementById('sort-order').addEventListener('change', function(e) {
    settings.sortOrder = e.target.value;
    saveSettings();
    loadWorkspaceFiles();
});

document.getElementById('auto-backup').addEventListener('change', function(e) {
    settings.autoBackup = e.target.checked;
    saveSettings();
    if (e.target.checked) {
        enableAutoBackup();
    }
});

function enableAutoBackup() {

    const originalSaveContent = window.saveContent;
    window.saveContent = async function() {
        if (!activeTab) return;

        await originalSaveContent();

        if (settings.autoBackup) {
            createBackup(activeTab.filepath);
        }
    };
}

function createBackup(filepath) {
    const content = document.getElementById('editor').value;
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');

    fetch('/create-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            filepath: filepath,
            content: content,
            timestamp: timestamp
        })
    });
}

function getDisplayName(name, type) {
    if (type === 'directory' || settings.showExtensions) {
        return name;
    }
    return name.substring(0, name.lastIndexOf('.')) || name;
}

document.getElementById('show-extensions').addEventListener('change', function(e) {
    settings.showExtensions = e.target.checked;
    saveSettings();
    loadWorkspaceFiles(); 
});

let isPreviewMode = false;
let previewTimeout = null;

function updatePreview() {
    if (!isPreviewMode || !activeTab?.filepath.endsWith('.mne')) return;

    const preview = document.querySelector('.mne-preview');
    const content = document.getElementById('editor').value;
    preview.innerHTML = MNEParser.preview(content);
}

function debouncePreview() {
    if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewTimeout = null;
    }

    previewTimeout = setTimeout(() => {
        updatePreview();

        previewTimeout = null;
    }, 150);
}

document.getElementById('editor').addEventListener('input', debouncePreview);

function togglePreview() {
    if (!activeTab?.filepath.endsWith('.mne')) return;

    if (activeTab.filepath.startsWith('script')) {
        showToast('Preview is not available for automation scripts', 'info');
        return;
    }

    const editor = document.getElementById('editor');
    const editorWrapper = editor.parentElement;
    let preview = document.querySelector('.mne-preview');

    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'mne-preview';
        editorWrapper.appendChild(preview);
    }

    isPreviewMode = !isPreviewMode;

    const tl = gsap.timeline();

    if (isPreviewMode) {
        preview.style.display = 'block';
        tl.to(editor, {
            width: '50%',
            duration: animations.slideIn.duration,
            ease: animations.slideIn.ease
        })
        .to(preview, {
            opacity: 1,
            x: 0,
            duration: animations.slideIn.duration,
            ease: animations.slideIn.ease
        }, "-=0.3");

        updatePreview();
    } else {
        tl.to(preview, {
            opacity: 0,
            x: 50,
            duration: animations.slideIn.duration,
            ease: animations.slideIn.ease,
            onComplete: () => preview.style.display = 'none'
        })
        .to(editor, {
            width: '100%',
            duration: animations.slideIn.duration,
            ease: animations.slideIn.ease
        }, "-=0.2");
    }
}

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (activeTab && activeTab.filepath.endsWith('.mne')) {

            if (activeTab.filepath.startsWith('script')) {
                showToast('Preview is not available for automation scripts', 'info');
                return;
            }
            togglePreview();
        }
    }
});

let hintTimeout = null;
let lastHintTime = 0;
const HINT_INTERVAL = 30000; 

function showPreviewHint() {
    if (!activeTab?.filepath.endsWith('.mne')) return;
    if (isPreviewMode) return;

    if (activeTab.filepath.startsWith('script')) return;

    const now = Date.now();
    if (now - lastHintTime < HINT_INTERVAL) return;

    lastHintTime = now;
    showToast('Press Ctrl+P to preview', 'lightbulb');
}

document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {

        document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const sectionId = `${item.dataset.section}-section`;
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const panel = document.querySelector('.settings-panel');
        if (panel.classList.contains('open')) {
            closeSettings();
        }
    }
});

document.querySelectorAll('input[name="theme"]').forEach(input => {
    input.addEventListener('change', function(e) {
        const newTheme = e.target.value;
        settings.theme = newTheme;
        saveSettings();
        applyTheme(newTheme);
    });
});

function applyTheme(theme) {

    document.body.classList.remove('theme-dark', 'theme-darker', 'theme-light');

    document.body.classList.add(`theme-${theme}`);

    gsap.fromTo(document.body,
        { opacity: 0.8 },
        { 
            opacity: 1, 
            duration: 0.3,
            ease: "power2.out"
        }
    );

    showToast(`Theme changed to ${theme}`, 'palette');
}

function showToast(message, icon = 'info') {
    toastManager.show(message, icon);
}

function applyDensity(density) {
    document.body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    document.body.classList.add(`density-${density}`);
    showToast(`Interface density changed to ${density}`, 'format_size');
}

function applyFontFamily(family) {
    document.body.classList.remove('font-jetbrains', 'font-fira', 'font-ubuntu');
    document.body.classList.add(`font-${family}`);
    showToast(`Font changed to ${family.replace(/^\w/, c => c.toUpperCase())}`, 'font_download');
}

function applyCursorStyle(style) {
    document.body.classList.remove('cursor-line', 'cursor-block', 'cursor-underscore');
    document.body.classList.add(`cursor-${style}`);
    showToast(`Cursor style changed to ${style}`, 'text_fields');
}

const toastManager = {
    queue: [],
    isDisplaying: false,
    minInterval: 2000, 
    lastToastTime: 0,

    show(message, icon = 'info') {
        this.queue.push({ message, icon });
        this.processQueue();
    },

    processQueue() {
        if (this.isDisplaying || this.queue.length === 0) return;

        const now = Date.now();
        if (now - this.lastToastTime < this.minInterval) {
            setTimeout(() => this.processQueue(), this.minInterval - (now - this.lastToastTime));
            return;
        }

        this.isDisplaying = true;
        const { message, icon } = this.queue.shift();
        this.displayToast(message, icon);
    },

    displayToast(message, icon) {
        let toast = document.querySelector('.hint-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'hint-toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `
            <span class="material-icons">${icon}</span>
            ${message}
        `;

        const tl = gsap.timeline({
            onComplete: () => {
                this.isDisplaying = false;
                this.lastToastTime = Date.now();
                this.processQueue();
            }
        });

        tl.fromTo(toast,
            { opacity: 0, y: -10 },
            { opacity: 0.7, y: 0, duration: 0.3, ease: "power2.out" }
        ).to(toast, {
            opacity: 0,
            y: -10,
            duration: 0.3,
            delay: 2,
            ease: "power2.in"
        });
    }
};

function showToast(message, icon = 'info') {
    toastManager.show(message, icon);
}

function initializeSettingButtons() {
    const settingButtons = document.querySelectorAll('.setting-button');
    settingButtons.forEach(button => {
        button.addEventListener('click', function() {
            const isEnabled = this.dataset.state !== 'on';
            const settingId = this.id;

            gsap.to(this, {
                scale: 0.95,
                duration: 0.1,
                ease: "power2.out",
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    this.dataset.state = isEnabled ? 'on' : 'off';
                    this.querySelector('.button-label').textContent = isEnabled ? 'On' : 'Off';

                    handleSettingChange(settingId, isEnabled);
                }
            });
        });
    });
}

function handleSettingChange(settingId, isEnabled) {
    switch(settingId) {
        case 'show-extensions':
            settings.showExtensions = isEnabled;
            loadWorkspaceFiles();
            showToast(`File extensions ${isEnabled ? 'shown' : 'hidden'}`, 'visibility');
            break;
        case 'auto-save':
            settings.autoSave = isEnabled;
            if (isEnabled) {
                enableAutoSave();
                showToast('Auto-save enabled', 'save');
            } else {
                showToast('Auto-save disabled', 'save_alt');
            }
            break;
        case 'line-wrap':
            settings.lineWrap = isEnabled;
            const editor = document.getElementById('editor');
            editor.style.whiteSpace = isEnabled ? 'pre-wrap' : 'pre';
            showToast(`Line wrap ${isEnabled ? 'enabled' : 'disabled'}`, 'wrap_text');
            break;
        case 'auto-backup':
            settings.autoBackup = isEnabled;
            if (isEnabled) {
                enableAutoBackup();
                showToast('Auto-backup enabled', 'backup');
            } else {
                showToast('Auto-backup disabled', 'backup_disabled');
            }
            break;
    }
    saveSettings();
}

function showPreviewHint() {
    if (!activeTab?.filepath.endsWith('.mne')) return;
    if (isPreviewMode) return; 

    const now = Date.now();
    if (now - lastHintTime < HINT_INTERVAL) return;

    lastHintTime = now;
    showToast('Press Ctrl+P to preview', 'lightbulb');
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSettingButtons();

    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            const targetSection = document.getElementById(`${sectionId}-section`);

            gsap.to('.settings-section.active', {
                opacity: 0,
                y: 20,
                duration: 0.2,
                ease: "power2.in",
                onComplete: () => {
                    document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
                    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));

                    item.classList.add('active');
                    targetSection.classList.add('active');

                    gsap.fromTo(targetSection,
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
                    );
                }
            });
        });
    });
});

function initializeSettings() {

    const savedSettings = localStorage.getItem('editor-settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }

    Object.entries(settings).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
            const button = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (button) {
                button.dataset.state = value ? 'on' : 'off';
                button.querySelector('.button-label').textContent = value ? 'On' : 'Off';
            }
        }
    });

    document.getElementById('ui-density').value = settings.density;
    document.getElementById('font-family').value = settings.fontFamily;
    document.getElementById('cursor-style').value = settings.cursorStyle;
    document.getElementById('sort-order').value = settings.sortOrder;

    document.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;

    applyAllSettings();
}

function applyAllSettings() {

    if (settings.autoSave) enableAutoSave();
    if (settings.autoBackup) enableAutoBackup();
    if (settings.lineWrap) {
        document.getElementById('editor').style.whiteSpace = 'pre-wrap';
    }
    applyTheme(settings.theme);
    applyDensity(settings.density);
    applyFontFamily(settings.fontFamily);
    applyCursorStyle(settings.cursorStyle);
}

function handleSettingChange(settingId, isEnabled) {

    switch(settingId) {
        case 'show-extensions':
            settings.showExtensions = isEnabled;
            loadWorkspaceFiles();
            showToast(`File extensions ${isEnabled ? 'shown' : 'hidden'}`, 'visibility');
            break;
        case 'auto-save':
            settings.autoSave = isEnabled;
            if (isEnabled) {
                enableAutoSave();
                showToast('Auto-save enabled', 'save');
            } else {
                showToast('Auto-save disabled', 'save_alt');
            }
            break;
        case 'line-wrap':
            settings.lineWrap = isEnabled;
            const editor = document.getElementById('editor');
            editor.style.whiteSpace = isEnabled ? 'pre-wrap' : 'pre';
            showToast(`Line wrap ${isEnabled ? 'enabled' : 'disabled'}`, 'wrap_text');
            break;
        case 'auto-backup':
            settings.autoBackup = isEnabled;
            if (isEnabled) {
                enableAutoBackup();
                showToast('Auto-backup enabled', 'backup');
            } else {
                showToast('Auto-backup disabled', 'backup_disabled');
            }
            break;
    }

    saveSettings();
}

document.addEventListener('DOMContentLoaded', () => {

    initializeSettings();

    document.querySelectorAll('.setting-button').forEach(button => {
        button.addEventListener('click', function() {
            const isEnabled = this.dataset.state !== 'on';

            gsap.to(this, {
                scale: 0.95,
                duration: 0.1,
                ease: "power2.out",
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    this.dataset.state = isEnabled ? 'on' : 'off';
                    this.querySelector('.button-label').textContent = isEnabled ? 'On' : 'Off';
                    handleSettingChange(this.id, isEnabled);
                }
            });
        });
    });

    document.getElementById('ui-density').addEventListener('change', function(e) {
        settings.density = e.target.value;
        saveSettings();
        applyDensity(e.target.value);
    });

    document.getElementById('font-family').addEventListener('change', function(e) {
        settings.fontFamily = e.target.value;
        saveSettings();
        applyFontFamily(e.target.value);
    });

    document.getElementById('cursor-style').addEventListener('change', function(e) {
        settings.cursorStyle = e.target.value;
        saveSettings();
        applyCursorStyle(e.target.value);
    });

    document.getElementById('sort-order').addEventListener('change', function(e) {
        settings.sortOrder = e.target.value;
        saveSettings();
        loadWorkspaceFiles();
    });

    document.querySelectorAll('input[name="theme"]').forEach(input => {
        input.addEventListener('change', function(e) {
            settings.theme = e.target.value;
            saveSettings();
            applyTheme(e.target.value);
        });
    });
});

let isInitialLoad = true;

function initializeSettings() {

    const savedSettings = localStorage.getItem('editor-settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }

    isInitialLoad = true;

    Object.entries(settings).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
            const button = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (button) {
                button.dataset.state = value ? 'on' : 'off';
                button.querySelector('.button-label').textContent = value ? 'On' : 'Off';
            }
        }
    });

    document.getElementById('ui-density').value = settings.density;
    document.getElementById('font-family').value = settings.fontFamily;
    document.getElementById('cursor-style').value = settings.cursorStyle;
    document.getElementById('sort-order').value = settings.sortOrder;

    const themeInput = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
    if (themeInput) themeInput.checked = true;

    applyAllSettings(true);

    setTimeout(() => {
        isInitialLoad = false;
    }, 1000);
}

function applyAllSettings(silent = false) {
    if (settings.autoSave) enableAutoSave();
    if (settings.autoBackup) enableAutoBackup();
    if (settings.lineWrap) {
        document.getElementById('editor').style.whiteSpace = 'pre-wrap';
    }
    applyTheme(settings.theme, silent);
    applyDensity(settings.density, silent);
    applyFontFamily(settings.fontFamily, silent);
    applyCursorStyle(settings.cursorStyle, silent);
}

function showToast(message, icon = 'info') {
    if (!isInitialLoad) {
        toastManager.show(message, icon);
    }
}

function applyTheme(theme, silent = false) {
    document.body.classList.remove('theme-dark', 'theme-darker', 'theme-light');
    document.body.classList.add(`theme-${theme}`);

    gsap.fromTo(document.body,
        { opacity: 0.8 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
    );

    if (!silent) {
        showToast(`Theme changed to ${theme}`, 'palette');
    }
}

function applyDensity(density, silent = false) {
    document.body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    document.body.classList.add(`density-${density}`);
    if (!silent) {
        showToast(`Interface density changed to ${density}`, 'format_size');
    }
}

function applyFontFamily(family, silent = false) {
    document.body.classList.remove('font-jetbrains', 'font-fira', 'font-ubuntu');
    document.body.classList.add(`font-${family}`);
    if (!silent) {
        showToast(`Font changed to ${family.replace(/^\w/, c => c.toUpperCase())}`, 'font_download');
    }
}

function applyCursorStyle(style, silent = false) {
    document.body.classList.remove('cursor-line', 'cursor-block', 'cursor-underscore');
    document.body.classList.add(`cursor-${style}`);
    if (!silent) {
        showToast(`Cursor style changed to ${style}`, 'text_fields');
    }
}

function handleSettingChange(settingId, isEnabled) {
    settings[settingId.replace(/-/g, '')] = isEnabled;

    switch(settingId) {
        case 'show-extensions':
            loadWorkspaceFiles();
            showToast(`File extensions ${isEnabled ? 'shown' : 'hidden'}`, 'visibility');
            break;
        case 'auto-save':
            if (isEnabled) {
                enableAutoSave();
                showToast('Auto-save enabled', 'save');
            } else {
                showToast('Auto-save disabled', 'save_alt');
            }
            break;
        case 'line-wrap':
            document.getElementById('editor').style.whiteSpace = isEnabled ? 'pre-wrap' : 'pre';
            showToast(`Line wrap ${isEnabled ? 'enabled' : 'disabled'}`, 'wrap_text');
            break;
        case 'auto-backup':
            if (isEnabled) {
                enableAutoBackup();
                showToast('Auto-backup enabled', 'backup');
            } else {
                showToast('Auto-backup disabled', 'backup_disabled');
            }
            break;
    }

    saveSettings();
}

document.addEventListener('DOMContentLoaded', () => {

    initializeSettings();

    document.querySelectorAll('.setting-button').forEach(button => {

        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', function() {
            const isEnabled = this.dataset.state !== 'on';

            gsap.to(this, {
                scale: 0.95,
                duration: 0.1,
                ease: "power2.out",
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    this.dataset.state = isEnabled ? 'on' : 'off';
                    this.querySelector('.button-label').textContent = isEnabled ? 'On' : 'Off';
                    handleSettingChange(this.id, isEnabled);
                }
            });
        });
    });
});

const DEBOUNCE_DELAYS = {
    autoSave: 1000,
    preview: 150,
    search: 300
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function saveContent() {
    if (!activeTab) return;

    const content = document.getElementById('editor').value;
    activeTab.content = content;

    const saveButton = document.getElementById('save-btn');
    if (!saveButton) return;

    saveButton.classList.add('loading');

    fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            content: content,
            filename: activeTab.filepath
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('File saved', 'save');
        } else {
            throw new Error(data.message || 'Error saving file');
        }
    })
    .catch(error => {
        console.error('Save error:', error);
        showToast('Error saving file', 'error');

        setTimeout(() => saveContent(), 2000);
    })
    .finally(() => {
        saveButton.classList.remove('loading');
    });
}

const debouncedSave = debounce(saveContent, DEBOUNCE_DELAYS.autoSave);

function enableAutoSave() {
    document.getElementById('editor').addEventListener('input', () => {
        if (settings.autoSave && activeTab) {
            debouncedSave();
        }
    });
}

function safeAnimate(element, animation, options = {}) {
    if (!element) return;
    try {
        return gsap.to(element, {
            ...animation,
            ...options,
            onError: error => {
                console.error('Animation error:', error);
            }
        });
    } catch (error) {
        console.error('Animation setup error:', error);
    }
}

window.addEventListener('beforeunload', (e) => {
    if (activeTab && document.getElementById('editor').value !== activeTab.content) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
    }
});

function runAutomation(event) {
    if (event) {
        event.stopPropagation(); 
    }
    if (!activeTab?.filepath.startsWith('script')) {
        showToast('Automations only work in script files', 'warning');
        return;
    }

    MNEParser.cleanup();

    const content = document.getElementById('editor').value;

    try {
        const automations = MNEParser.runAutomation(content);
        if (automations.length > 0) {

            automations.reduce((promise, { id }) => {
                return promise.then(() => MNEParser.executeAutomation(id));
            }, Promise.resolve())
            .catch(error => {
                showToast('Automation failed: ' + error.message, 'error');
            })
            .finally(() => {

                setTimeout(() => MNEParser.cleanup(), 1000);
            });
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function updateEditorToolbar() {
    const toolbar = document.querySelector('.editor-toolbar');
    if (!toolbar) return;

    if (activeTab?.filepath.startsWith('script')) {
        if (!document.querySelector('.run-automation-btn')) {
            const runBtn = document.createElement('button');
            runBtn.className = 'control-btn run-automation-btn';
            runBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
            runBtn.title = 'Run Automations (Ctrl+R)';
            runBtn.onclick = runAutomation;
            toolbar.appendChild(runBtn);
        }
    } else {
        const runBtn = document.querySelector('.run-automation-btn');
        if (runBtn) runBtn.remove();
    }
}

document.body.insertAdjacentHTML('beforeend', `
    <div class="automation-status" style="opacity: 0; transform: translateY(20px)">
        <div class="terminal"></div>
    </div>
`);

document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        runAutomation();
    }
});

document.addEventListener('DOMContentLoaded', () => {

    document.addEventListener('mouseover', e => {
        const fileItem = e.target.closest('.file-item[data-runnable="true"]');
        if (fileItem && !fileItem.title) {
            fileItem.title = 'Click to edit, press Ctrl+R to run';
        }
    });
});