#!/bin/bash

# SockMap Build Script

set -e  # Exit on any error

echo "Building SockMap..."

# Change to backend directory
cd "$(dirname "$0")/.."

# Create necessary directories
mkdir -p bin obj

# Build the project
make clean
make

echo "Build completed successfully!"
echo "Binary location: $(pwd)/bin/sockmap"

# Test the binary
if [ -f "bin/sockmap" ]; then
    echo "Testing binary..."
    ./bin/sockmap -h
    echo "Binary test passed!"
else
    echo "Error: Binary not found after build"
    exit 1
fi