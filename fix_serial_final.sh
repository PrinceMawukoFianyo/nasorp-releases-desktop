#!/bin/bash
echo "=== Fixing serial number generation ==="

# Read the file
mapfile -t lines < prisma/seed.ts

# Find and fix the problematic line (line 872)
for i in "${!lines[@]}"; do
  # Look for the exact pattern
  if [[ "${lines[$i]}" == *"const serialNum = \`\${poLine.item.sku}-\${receipt.id.substring(0, 4)}-\${String(j + 1).padStart(4, \"0\")}\`"* ]]; then
    echo "Found at line $((i+1)): ${lines[$i]}"
    
    # Replace with the fixed code
    lines[$i]="              const timestamp = Date.now().toString(36).slice(-4);"
    lines[$((i+1))]="              const randomStr = Math.random().toString(36).substring(2, 6);"
    lines[$((i+2))]="              const serialNum = \`\${poLine.item.sku}-\${receipt.id.substring(0, 4)}-\${String(j + 1).padStart(4, \"0\")}-\${timestamp}\${randomStr}\`;"
    
    echo "Fixed lines $((i+1))-$((i+3))"
    break
  fi
done

# Write back to file
printf "%s\n" "${lines[@]}" > prisma/seed.ts
echo "✓ Seed file updated"
