# LIDE (Lightweight Integrated Development Environment)

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

LIDE supports custom automation scripts within `.mne` files using a simplified scripting syntax. Scripts can be created using either code fences or triple colons:

```automation
// Your automation code here
```

or

:::automation
// Your automation code here
:::

### Basic Syntax

1. **Simple Commands**
   ```automation
   create file.txt
   create src/
   delete file.txt
   print "Hello, World!"
   ```

2. **Functions**
   ```automation
   fn setup() {
       print "Starting setup..."
       createFile("config.json")
   }
   
   fn cleanup() {
       print "Cleaning up..."
   }
   ```

3. **Tasks**
   ```automation
   task "scaffold" {
       name: "myproject"
       template: "basic"
   }
   ```

### Built-in Functions

#### File Operations
- `createFile(path, content?)` - Create a new file
- `deleteFile(path)` - Delete a file
- `readFile(path)` - Read file content
- `writeFile(path, content)` - Write content to file

#### Directory Operations
- `createDirectory(path)` - Create a new directory
- `deleteDirectory(path)` - Delete a directory and its contents

#### Output Functions
- `print(...messages)` - Print normal messages
- `error(...messages)` - Print error messages in red
- `success(...messages)` - Print success messages in green
- `clear()` - Clear the output terminal

#### Utility Functions
- `sleep(ms)` - Pause execution for specified milliseconds

### Examples

1. **Project Scaffolding**
   ```automation
   fn setup() {
       createDirectory("src")
       createDirectory("tests")
       writeFile("src/main.js", "console.log('Hello!')")
       success "Project structure created!"
   }
   ```

2. **File Processing**
   ```automation
   fn processFiles() {
       const content = readFile("input.txt")
       writeFile("output.txt", content.toUpperCase())
       print "File processed successfully"
   }
   ```

3. **Using Built-in Tasks**
   ```automation
   task "scaffold" {
       name: "my-app"
       template: "basic"
   }
   
   task "cleanup" {
       target: "build/"
   }
   ```

4. **Advanced Flow Control**
   ```automation
   fn deploy() {
       try {
           print "Starting deployment..."
           for i in 1..3 {
               print `Step ${i}`
               await sleep 1000
           }
           success "Deployed successfully!"
       } catch {
           error "Deployment failed"
       }
   }
   ```

### Running Automations

1. Create a file with the `.mne` extension
2. Add your automation code using the syntax above
3. Run the automation using:
   - Click the "Run" button in the automation block
   - Use the keyboard shortcut `Ctrl+R`
   - Click the play button in the file tab

### Best Practices

1. Use descriptive function names
2. Add error handling with try/catch blocks
3. Provide user feedback with print functions
4. Break down complex tasks into smaller functions
5. Use sleep() to control execution timing

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
