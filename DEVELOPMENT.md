# Development Guide

## Setting Up the Development Environment

### Prerequisites
- Python 3.9 or higher
- Node.js 16 or higher
- Git LFS (for large file storage)

### Initial Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/temp_step.git
   cd temp_step
   ```

2. Install Git LFS:
   ```
   # macOS
   brew install git-lfs
   
   # Ubuntu/Debian
   sudo apt-get install git-lfs
   
   # Initialize Git LFS
   git lfs install
   ```

3. Create a virtual environment (DO NOT COMMIT THIS):
   ```
   # Create the virtual environment
   python -m venv venv
   
   # Activate it
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

4. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Install JavaScript dependencies:
   ```
   npm install
   ```

6. Run the setup script:
   ```
   ./install_dependencies.sh
   ```

## Development Best Practices

### Working with Virtual Environments

The `.gitignore` file is configured to exclude virtual environments from Git tracking. Do not attempt to commit the virtual environment to the repository.

### Working with Large Files

- Model files (`.pt`, `.ckpt`, `.bin`) are tracked with Git LFS.
- Do not commit large binary files without adding them to Git LFS first.
- Add patterns for new large file types to `.gitattributes` before committing them.

### Adding New Dependencies

1. Install the new dependency inside your virtual environment:
   ```
   pip install some-package
   ```

2. Update `requirements.txt`:
   ```
   pip freeze > requirements.txt
   ```
   
3. Edit the requirements.txt file to remove unwanted or environment-specific packages.

## Common Issues

### "File too large" error on GitHub push

This usually happens when you're trying to push large files that shouldn't be tracked by Git. Solutions:

1. Ensure the file is added to `.gitignore` if it shouldn't be tracked
2. Use Git LFS for the file if it needs to be tracked (add to `.gitattributes`)
3. If the file is already in Git history, use the `cleanup_repo.sh` script to remove it

### Handling large model files

Model files should be tracked with Git LFS. To add a new model file:

```
git lfs track "*.pt"
git add .gitattributes
git add my-model.pt
git commit -m "Add new model file"
``` 