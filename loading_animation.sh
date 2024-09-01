#!/bin/bash

echo "Starting a process..."
echo "Loading, please wait..."

for i in {1..30}; do
    echo -ne "\r\033[KLoading: ${sp:i++%${#sp}:1}" | tr '|/-\\' '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    sleep 0.1
done

echo -e "\r\033[KProcess completed successfully!"