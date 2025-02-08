import os
import shutil
import time
from datetime import datetime
import json
from werkzeug.exceptions import HTTPException
from flask import Flask, render_template, request, jsonify, current_app

app = Flask(__name__)

WORKSPACE_DIR = os.path.join(os.path.dirname(__file__), 'workspace')

# Create workspace directory if it doesn't exist
if not os.path.exists(WORKSPACE_DIR):
    os.makedirs(WORKSPACE_DIR)

# Add error handlers
@app.errorhandler(HTTPException)
def handle_exception(e):
    response = e.get_response()
    response.data = json.dumps({
        "code": e.code,
        "name": e.name,
        "description": e.description,
    })
    response.content_type = "application/json"
    return response

@app.errorhandler(Exception)
def handle_unexpected_error(e):
    current_app.logger.error('Unexpected error: %s', str(e))
    return jsonify({
        "status": "error",
        "message": "An unexpected error occurred"
    }), 500

@app.route('/')
def index():
    return render_template('index.html')

# Update save endpoint with atomic write
@app.route('/save', methods=['POST'])
def save():
    content = request.json.get('content', '')
    filename = request.json.get('filename', 'untitled.txt')
    filepath = os.path.join(WORKSPACE_DIR, filename)
    temp_filepath = filepath + '.tmp'
    
    try:
        # Write to temporary file first
        with open(temp_filepath, 'w') as f:
            f.write(content)
        
        # Then rename it to the target file (atomic operation)
        os.replace(temp_filepath, filepath)
        return jsonify({"status": "success"})
    except Exception as e:
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except:
                pass
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/create-file', methods=['POST'])
def create_file():
    filename = request.json.get('filename', '')
    force = request.json.get('force', False)
    
    if not filename:
        return jsonify({"status": "error", "message": "No filename provided"})
    
    # Add .mne extension if no extension is provided
    if '.' not in filename:
        filename = f"{filename}.mne"
    
    filepath = os.path.join(WORKSPACE_DIR, filename)
    
    if os.path.exists(filepath) and not force:
        return jsonify({"status": "exists"})
    
    try:
        with open(filepath, 'w') as f:
            f.write('')
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/create-directory', methods=['POST'])
def create_directory():
    dirname = request.json.get('dirname', '')
    force = request.json.get('force', False)
    
    if not dirname:
        return jsonify({"status": "error", "message": "No directory name provided"})
    
    dirpath = os.path.join(WORKSPACE_DIR, dirname)
    
    if os.path.exists(dirpath) and not force:
        return jsonify({"status": "exists"})
    
    try:
        if force and os.path.exists(dirpath):
            shutil.rmtree(dirpath)
        os.makedirs(dirpath)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/workspace-files')
def workspace_files():
    def scan_directory(path):
        items = []
        for entry in os.scandir(path):
            # Skip .backups directory
            if entry.name == '.backups':
                continue
                
            relative_path = os.path.relpath(entry.path, WORKSPACE_DIR)
            modified_time = os.path.getmtime(entry.path)
            
            if entry.is_file():
                items.append({
                    "name": entry.name,
                    "type": "file",
                    "path": relative_path,
                    "modified": modified_time
                })
            elif entry.is_dir():
                items.append({
                    "name": entry.name,
                    "type": "directory",
                    "path": relative_path,
                    "modified": modified_time,
                    "children": scan_directory(entry.path)
                })
        return items
    
    files = scan_directory(WORKSPACE_DIR)
    return jsonify({"files": files})

@app.route('/read-file/<path:filepath>')
def read_file(filepath):
    try:
        full_path = os.path.join(WORKSPACE_DIR, filepath)
        if not os.path.exists(full_path):
            return jsonify({"status": "error", "message": "File not found"})
            
        with open(full_path, 'r') as f:
            content = f.read()
        return jsonify({"status": "success", "content": content})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/rename', methods=['POST'])
def rename():
    old_path = request.json.get('oldPath', '')
    new_name = request.json.get('newName', '')
    item_type = request.json.get('type', '')
    
    if not old_path or not new_name:
        return jsonify({"status": "error", "message": "Missing parameters"})
    
    try:
        # Add .mne extension if no extension is provided and it's a file
        if item_type == 'file' and '.' not in new_name:
            new_name = f"{new_name}.mne"
            
        old_full_path = os.path.join(WORKSPACE_DIR, old_path)
        new_full_path = os.path.join(WORKSPACE_DIR, os.path.dirname(old_path), new_name)
        
        os.rename(old_full_path, new_full_path)
        return jsonify({
            "status": "success",
            "newPath": os.path.relpath(new_full_path, WORKSPACE_DIR)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/delete', methods=['POST'])
def delete():
    path = request.json.get('path', '')
    item_type = request.json.get('type', '')
    
    if not path:
        return jsonify({"status": "error", "message": "No path provided"})
    
    try:
        full_path = os.path.join(WORKSPACE_DIR, path)
        if item_type == 'folder':
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/create-backup', methods=['POST'])
def create_backup():
    filepath = request.json.get('filepath', '')
    content = request.json.get('content', '')
    timestamp = request.json.get('timestamp', '')
    
    if not filepath or not content:
        return jsonify({"status": "error", "message": "Missing parameters"})
    
    try:
        # Create backups directory if it doesn't exist
        backup_dir = os.path.join(WORKSPACE_DIR, '.backups', os.path.dirname(filepath))
        os.makedirs(backup_dir, exist_ok=True)
        
        # Create backup file
        filename = os.path.basename(filepath)
        backup_path = os.path.join(backup_dir, f"{filename}.{timestamp}.bak")
        
        with open(backup_path, 'w') as f:
            f.write(content)
            
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# Add auto-cleanup for temporary files
@app.before_first_request
def cleanup_temp_files():
    try:
        for root, _, files in os.walk(WORKSPACE_DIR):
            for file in files:
                if file.endswith('.tmp'):
                    try:
                        os.remove(os.path.join(root, file))
                    except:
                        pass
    except Exception as e:
        current_app.logger.error('Cleanup error: %s', str(e))

if __name__ == '__main__':
    app.run(debug=True)
