# LIDE (Lightweight Integrated Development Environment)

A minimalist, browser-based text editor with modern features and a clean interface.

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
