# LIDE (Lightweight Integrated Development Environment)
**Personally, I have no intention on further adding any features for now, if you find a bug please create an issue and I will work towards fixing it.**

A minimalist, browser-based text editor with modern features and a clean interface.

## Images
![LIDE_ONE](https://github.com/user-attachments/assets/4b32890d-c301-4fdc-bbed-bdc0640f0423)
![LIDE_TWO](https://github.com/user-attachments/assets/44e88b5b-1ad4-403f-883a-1b58e732ee92)
![LIDE_THREE](https://github.com/user-attachments/assets/20b9a690-8745-4979-92d0-3a2dc9287a07)

## Features

- 🚀 Fast and lightweight
- 📝 Real-time preview for markdown-like files (.mne)
- 🎨 Multiple themes (Dark, Darker, Light)
- ⚡ Auto-save and auto-backup
- 📁 File tree workspace
- ⚙️ Customizable settings
- 🔤 Multiple font families
- 📏 Line wrapping
- 🎯 Different cursor styles
- 🤖 Built-in automation support

## Requirements

- Python 3.7+
- Flask 2.0.1
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/gtsrhythm/Lide.git
   cd lide
   ```

2. Run the setup script:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Development Setup

1. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run in development mode:
   ```bash
   ./run.sh dev
   ```

## Deployment

1. For production deployment:
   ```bash
   ./run.sh prod
   ```

2. Using Docker:
   ```bash
   docker build -t lide .
   docker run -p 8000:8000 lide
   ```

## Configuration

The editor can be configured through the settings panel (⚙️):

- Interface density (Compact/Comfortable/Spacious)
- Theme selection
- Font family
- Auto-save preferences
- File display options

## Directory Structure

```
lide/
├── app.py              # Flask application
├── requirements.txt    # Python dependencies
├── run.sh             # Setup/run script
├── static/            # Static assets
│   ├── style.css      # Styles
│   ├── script.js      # Main JavaScript
│   └── mne-parser.js  # MNE file parser
├── templates/         # HTML templates
│   └── index.html     # Main page
└── workspace/         # User files
    └── .backups/      # Automatic backups
```

## Automation Features

LIDE supports a powerful automation system through `.mne` files using an intuitive scripting syntax:

### Basic Usage

Create automations using code fences or triple colons:

```automation
// Simple command example
create src/
create src/index.js
print "Project initialized!"
```

or

:::automation
// Task example
task "scaffold" {
    name: "myproject"
    template: "web"
}
:::

### Key Features

1. **Simple Commands**
   - File operations: `create`, `delete`
   - Output: `print`, `success`, `error`
   - Flow control: `sleep`, `if/else`

2. **Task System**
   - Predefined task templates
   - Custom task definitions
   - Async/await support

3. **Error Handling**
   - Try/catch blocks
   - Error reporting
   - Status feedback

### Example Scripts

1. **Project Setup**
```automation
fn setup() {
    print "Initializing project..."
    
    // Create structure
    create "src/"
    create "tests/"
    create "docs/"
    
    // Add base files
    writeFile("src/index.js", "console.log('Hello World');")
    writeFile("README.md", "# My Project\n\nAn awesome project.")
    
    success "Project ready!"
}
```

2. **File Processing**
```automation
task "process-files" {
    source: "data/"
    pattern: "*.txt"
    operation: "uppercase"
}
```

### Built-in Tasks

| Task Name | Description | Parameters |
|-----------|-------------|------------|
| scaffold | Create project structure | name, template |
| cleanup | Remove temp files | target |
| deploy | Deploy files | dest, mode |

### Best Practices

1. **Organization**
   - Group related operations
   - Use descriptive names
   - Add comments for complex logic

2. **Error Handling**
   - Always include try/catch
   - Provide user feedback
   - Clean up on failure

3. **Performance**
   - Batch file operations
   - Use async when possible
   - Minimize sleep usage

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [highlight.js](https://highlightjs.org/) for syntax highlighting
- [Material Icons](https://material.io/resources/icons/) for the UI icons
- [GSAP](https://greensock.com/gsap/) for animations
