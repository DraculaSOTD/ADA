#!/bin/bash

# Setup script for automatic deployment on git push
# This creates a git post-commit hook

HOOK_FILE="/home/calvin/Websites/ADA/.git/hooks/post-commit"

echo "Setting up automatic deployment on git commit..."

# Create the post-commit hook
cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

# Git post-commit hook for automatic deployment
# Automatically deploys to ada.datapulseai.co after each commit

echo "🚀 Auto-deploying to production..."

# Run the quick deploy script
/home/calvin/Websites/ADA/quick-deploy.sh

echo "✅ Auto-deployment complete!"
EOF

# Make the hook executable
chmod +x "$HOOK_FILE"

echo "✅ Auto-deployment hook installed!"
echo ""
echo "Now, every time you commit changes, they will automatically be deployed to ada.datapulseai.co"
echo ""
echo "To disable auto-deployment, run:"
echo "  rm $HOOK_FILE"