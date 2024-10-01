#!/bin/bash

set -euo pipefail

install_dir="$HOME/llmshell"
rc_files=("$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile")
updated_files=()

# Function to remove the PATH line from a file
remove_path_line() {
    local file="$1"
    local temp_file=$(mktemp)
    grep -v "export PATH=.*$install_dir" "$file" > "$temp_file" || true
    mv "$temp_file" "$file"
}

# Remove PATH entries from shell configuration files
for shell_rc in "${rc_files[@]}"; do
    if [[ -f "$shell_rc" ]]; then
        if grep -q "export PATH=.*$install_dir" "$shell_rc"; then
            remove_path_line "$shell_rc"
            updated_files+=("$shell_rc")
            echo "Removed llmshell from PATH in $shell_rc"
        fi
    fi
done

# Remove the installation directory
if [[ -d "$install_dir" ]]; then
    rm -rf "$install_dir"
    echo "Removed $install_dir"
else
    echo "$install_dir does not exist"
fi

# Provide feedback
if [ ${#updated_files[@]} -eq 0 ]; then
    echo "No shell configuration files were modified."
else
    echo "Uninstallation complete. PATH entries removed from: ${updated_files[*]}"
    echo "Please restart your terminal or run one of the following commands to update your PATH:"
    for file in "${updated_files[@]}"; do
        echo "  source $file"
    done
fi

echo "llmshell has been uninstalled."