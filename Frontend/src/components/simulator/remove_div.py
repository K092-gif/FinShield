import re

path = '/home/kamonpku/projects/FinShield/Frontend/src/components/simulator/OverviewTool.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's use regex to find: {/* ── Dividend Comparison Card ── */} and remove it up to the next parent element
# Specifically we can match:
# {/* ── Dividend Comparison Card ── */}
# {(userDivRate > 0 || aiDivRate > 0) && (
#   ...
# )}

pattern = r'\s*\{\/\*\s*──\s*Dividend\s*Comparison\s*Card\s*──\s*\*\/\}\s*\{\(\s*userDivRate\s*>\s*0\s*\|\|\s*aiDivRate\s*>\s*0\s*\)\s*&&\s*\([\s\S]*?\)\}'
content, count = re.subn(pattern, '', content)
print(f'Regex matched and removed {count} block(s).')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

