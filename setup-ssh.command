#!/bin/bash
# Double-click this file to set up SSH keys for GitHub
# It will guide you through each step

clear
echo "========================================="
echo "  GitHub SSH Key Setup"
echo "========================================="
echo ""

# Step 1: Check for existing keys
echo "Step 1: Checking for existing SSH keys..."
if [ -f ~/.ssh/id_ed25519 ]; then
    echo "✓ SSH key already exists!"
    echo ""
    echo "Your public key:"
    cat ~/.ssh/id_ed25519.pub
    echo ""
else
    if [ -f ~/.ssh/id_rsa ]; then
        echo "✓ Old-style SSH key (RSA) exists!"
        echo ""
        echo "Your public key:"
        cat ~/.ssh/id_rsa.pub
        echo ""
    else
        echo "No SSH key found. Let's create one."
        echo ""
        echo "Press Enter to generate a new SSH key..."
        read

        ssh-keygen -t ed25519 -C "amitoj@amitoj.co"

        echo ""
        echo "✓ SSH key created!"
        echo ""
        echo "Your public key:"
        cat ~/.ssh/id_ed25519.pub
        echo ""
    fi
fi

# Step 2: Copy to clipboard
echo ""
echo "Step 2: Copying public key to clipboard..."
if [ -f ~/.ssh/id_ed25519.pub ]; then
    cat ~/.ssh/id_ed25519.pub | pbcopy
else
    cat ~/.ssh/id_rsa.pub | pbcopy
fi
echo "✓ Key copied to clipboard!"
echo ""

# Step 3: Instructions
echo "Step 3: Add key to GitHub"
echo "========================================="
echo ""
echo "1. Go to: https://github.com/settings/keys"
echo "2. Click 'New SSH Key'"
echo "3. Paste (Cmd+V) - the key is already copied"
echo "4. Click 'Add SSH Key'"
echo ""
echo "Press Enter when you've added the key to GitHub..."
read

# Step 4: Test connection
echo ""
echo "Step 4: Testing connection to GitHub..."
echo ""
ssh -T git@github.com 2>&1

echo ""
echo "========================================="
echo ""
echo "If you see 'Hi [username]! You've successfully authenticated...'"
echo "then you're all set!"
echo ""
echo "Drop a note in your Inbox saying 'SSH setup complete'"
echo "and I'll push the website to GitHub."
echo ""
echo "Press Enter to close..."
read
