#!/usr/bin/env python3

def fix_indentation(filename):
    """
    Reads a Python file, ensures consistent indentation using spaces,
    and writes it back to the same file.
    """
    print(f"Processing {filename}")
    
    # Read the file content
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Process the lines to ensure consistent spacing
    fixed_lines = []
    for line in lines:
        # Replace tabs with spaces (4 spaces per tab)
        clean_line = line.replace('\t', '    ')
        # Remove any trailing whitespace
        clean_line = clean_line.rstrip() + '\n'
        fixed_lines.append(clean_line)
    
    # Write the processed content back to the file
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)
    
    print(f"Fixed indentation in {filename}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python fix_indentation.py <filename>")
        sys.exit(1)
    
    filename = sys.argv[1]
    fix_indentation(filename) 