#!/bin/bash
set -euo pipefail

LATEST=$(curl --silent "https://api.github.com/repos/SpellcraftAI/llmshell/releases/latest" | jq -r .tag_name)
VERSION="${1:-$LATEST}"

if [[ ${OS:-} = Windows_NT ]]; then
  echo "Only Linux and MacOS are supported for now. Use WSL for Windows."
  exit 1
fi

# Create installation directory
install_dir="$HOME/llmshell"
mkdir -p "$install_dir"

# Download and extract llmshell directly
echo "Downloading and extracting llmshell version $VERSION..."
echo -n "Progress: "

# For debugging:
# cat llmshell.tar.gz | tar -xz -C "$install_dir" & pid=$!
curl -L "https://github.com/SpellcraftAI/llmshell/releases/download/$VERSION/llmshell.tar.gz" | tar -xz -C "$install_dir" & pid=$!
while kill -0 $pid 2>/dev/null; do
    echo -n "."
    sleep 1
done
wait $pid
exit_status=$?

if [ $exit_status -ne 0 ]; then
    echo " failed!"
    echo "Error: Failed to download or extract llmshell. Please check your internet connection and try again."
    exit 1
fi

echo " done!"

# Add to PATH in .zshrc, .bashrc, and .bash_profile if they exist
rc_files=("$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile")
updated_files=()

for shell_rc in "${rc_files[@]}"; do
    if [[ -f "$shell_rc" ]]; then
        if grep -q "export PATH=.*$install_dir/bin" "$shell_rc"; then
            echo "llmshell already in PATH in $shell_rc"
        else
            echo "export PATH=\"\$PATH:$install_dir/bin\"" >> "$shell_rc"
            echo "llmshell added to PATH in $shell_rc"
            updated_files+=("$shell_rc")
        fi
    fi
done

if [ ${#updated_files[@]} -eq 0 ]; then
    echo "Warning: No shell configuration files (.zshrc, .bashrc, or .bash_profile) were updated. PATH not modified."
else
    echo "Installation complete. PATH updated in: ${updated_files[*]}"
    echo "Please restart your terminal or run one of the following commands to use llmshell:"
    for file in "${updated_files[@]}"; do
        echo "  source $file"
    done
fi