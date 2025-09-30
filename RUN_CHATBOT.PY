import subprocess
import sys
import webbrowser
import time
from threading import Timer
import os
import signal


def open_browser():
    """Open the browser to the chatbot interface"""
    # Wait a moment for the server to start
    time.sleep(1.5)
    webbrowser.open('http://localhost:5000')


def start_chatbot():
    """Start the chatbot server"""
    print("Starting HR Analytics SmartBot...")
    print("Server will be available at http://localhost:5000")
    print("Press Ctrl+C to stop the server")

    # Open browser after a delay
    Timer(1.5, open_browser).start()

    try:
        # Run the Flask app
        subprocess.run([sys.executable, 'chatbot.py'])
    except KeyboardInterrupt:
        print("\nShutting down SmartBot server...")
        sys.exit(0)


if __name__ == '__main__':
    start_chatbot()
