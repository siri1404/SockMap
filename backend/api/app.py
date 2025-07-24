#!/usr/bin/env python3
"""
SockMap API Server
Flask wrapper for the C sockmap binary
"""

import subprocess
import json
import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend connections

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Path to the compiled sockmap binary
SOCKMAP_BINARY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'bin', 'sockmap')

def run_sockmap_command(args=None):
    """Execute the sockmap binary and return parsed results"""
    try:
        # Build command
        cmd = [SOCKMAP_BINARY, '-j']  # JSON output
        if args:
            cmd.extend(args)
        
        # Add single scan mode (no continuous monitoring)
        cmd.extend(['-t', '0'])
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        # Run the command
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30  # 30 second timeout
        )
        
        if result.returncode != 0:
            logger.error(f"Command failed with return code {result.returncode}")
            logger.error(f"stderr: {result.stderr}")
            return None
        
        # Parse JSON output
        try:
            data = json.loads(result.stdout)
            return data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON output: {e}")
            logger.error(f"stdout: {result.stdout}")
            return None
            
    except subprocess.TimeoutExpired:
        logger.error("Command timed out")
        return None
    except FileNotFoundError:
        logger.error(f"Binary not found: {SOCKMAP_BINARY}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'binary_exists': os.path.exists(SOCKMAP_BINARY),
        'binary_path': SOCKMAP_BINARY
    })

@app.route('/api/trace-sockets', methods=['GET'])
def trace_sockets():
    """Main endpoint to get socket, memory, and process information"""
    try:
        data = run_sockmap_command()
        
        if data is None:
            return jsonify({
                'error': 'Failed to execute sockmap command',
                'sockets': [],
                'memory': [],
                'processes': []
            }), 500
        
        return jsonify(data)
        
    except Exception as e:
        logger.error(f"Error in trace_sockets: {e}")
        return jsonify({
            'error': str(e),
            'sockets': [],
            'memory': [],
            'processes': []
        }), 500

@app.route('/api/sockets', methods=['GET'])
def get_sockets():
    """Get only socket information"""
    try:
        data = run_sockmap_command()
        
        if data is None:
            return jsonify({'error': 'Failed to get socket data', 'sockets': []}), 500
        
        return jsonify({
            'sockets': data.get('sockets', []),
            'timestamp': data.get('timestamp')
        })
        
    except Exception as e:
        logger.error(f"Error in get_sockets: {e}")
        return jsonify({'error': str(e), 'sockets': []}), 500

@app.route('/api/memory', methods=['GET'])
def get_memory():
    """Get only memory mapping information"""
    try:
        data = run_sockmap_command()
        
        if data is None:
            return jsonify({'error': 'Failed to get memory data', 'memory': []}), 500
        
        return jsonify({
            'memory': data.get('memory', []),
            'timestamp': data.get('timestamp')
        })
        
    except Exception as e:
        logger.error(f"Error in get_memory: {e}")
        return jsonify({'error': str(e), 'memory': []}), 500

@app.route('/api/processes', methods=['GET'])
def get_processes():
    """Get only process information"""
    try:
        data = run_sockmap_command()
        
        if data is None:
            return jsonify({'error': 'Failed to get process data', 'processes': []}), 500
        
        return jsonify({
            'processes': data.get('processes', []),
            'timestamp': data.get('timestamp')
        })
        
    except Exception as e:
        logger.error(f"Error in get_processes: {e}")
        return jsonify({'error': str(e), 'processes': []}), 500

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    """Get or set configuration options"""
    if request.method == 'GET':
        return jsonify({
            'scan_interval': 5,
            'output_format': 'json',
            'verbose': False
        })
    
    # POST - update configuration
    config = request.get_json()
    # In a real implementation, you'd store this configuration
    # and pass it to the sockmap binary
    return jsonify({'status': 'updated', 'config': config})

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Check if binary exists
    if not os.path.exists(SOCKMAP_BINARY):
        print(f"Warning: Binary not found at {SOCKMAP_BINARY}")
        print("Make sure to compile the C code first:")
        print("  cd backend && make")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Listen on all interfaces, not just localhost
        port=5000,
        debug=True
    )