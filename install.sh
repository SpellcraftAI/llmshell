set -euo pipefail

if [[ ${OS:-} = Windows_NT ]]; then
  echo "Only Linux and MacOS are supported for now. Use WSL for Windows."
  exit 1
fi

# Create installation directory
install_dir="$HOME/llmshell"
mkdir -p "$install_dir"

# Download and install llmshell
echo "Downloading llmshell..."
curl -L "https://github.com/SpellcraftAI/llmshell/releases/download/v0.0.1/llmshell.tar.gz" -o "$install_dir/llmshell.tar.gz"

echo "Extracting llmshell..."
echo -n "Progress: "
tar -xzf "$install_dir/llmshell.tar.gz" -C "$install_dir" & pid=$!
while kill -0 $pid 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo " done!"

# Clean up the downloaded tar.gz file
rm "$install_dir/llmshell.tar.gz"

# Add to PATH in .zshrc, .bashrc, and .bash_profile if they exist
rc_files=("$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile")
updated_files=()

for shell_rc in "${rc_files[@]}"; do
    if [[ -f "$shell_rc" ]]; then
        if grep -q "export PATH=.*$install_dir" "$shell_rc"; then
            echo "llmshell already in PATH in $shell_rc"
        else
            echo "export PATH=\"\$PATH:$install_dir\"" >> "$shell_rc"
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