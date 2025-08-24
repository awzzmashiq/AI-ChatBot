#!/usr/bin/env python3
"""
Dockerfile Validation Script for Study Buddy AI Assistant
"""

import os
import re
import sys
from pathlib import Path

def check_file_exists(filepath):
    """Check if a file exists"""
    return Path(filepath).exists()

def validate_dockerfile():
    """Validate the Dockerfile for common issues"""
    print("🔍 Validating Dockerfile...")
    
    if not check_file_exists("Dockerfile"):
        print("❌ Dockerfile not found!")
        return False
    
    with open("Dockerfile", "r") as f:
        content = f.read()
    
    issues = []
    
    # Check for multi-stage build
    if "FROM node:18-alpine AS frontend-builder" not in content:
        issues.append("Missing frontend builder stage")
    
    if "FROM python:3.11-slim" not in content:
        issues.append("Missing Python runtime stage")
    
    # Check for essential commands
    if "COPY frontend/package*.json" not in content:
        issues.append("Missing frontend package.json copy")
    
    if "COPY backend/requirements.txt" not in content:
        issues.append("Missing backend requirements.txt copy")
    
    if "COPY --from=frontend-builder" not in content:
        issues.append("Missing frontend build copy")
    
    # Check for security
    if "USER appuser" not in content:
        issues.append("Missing non-root user setup")
    
    # Check for health check
    if "HEALTHCHECK" not in content:
        issues.append("Missing health check")
    
    if issues:
        print("❌ Issues found:")
        for issue in issues:
            print(f"   - {issue}")
        return False
    
    print("✅ Dockerfile validation passed!")
    return True

def validate_requirements():
    """Validate that required files exist"""
    print("🔍 Checking required files...")
    
    required_files = [
        "backend/requirements.txt",
        "frontend/package.json",
        "frontend/src/App.js",
        "backend/app.py"
    ]
    
    missing_files = []
    for file in required_files:
        if not check_file_exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        return False
    
    print("✅ All required files found!")
    return True

def validate_environment_template():
    """Validate environment template"""
    print("🔍 Checking environment template...")
    
    if not check_file_exists("env.production.template"):
        print("❌ Environment template not found!")
        return False
    
    with open("env.production.template", "r") as f:
        content = f.read()
    
    required_vars = ["THETA_API_KEY", "SECRET_KEY"]
    missing_vars = []
    
    for var in required_vars:
        if var not in content:
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        return False
    
    print("✅ Environment template validation passed!")
    return True

def main():
    """Main validation function"""
    print("🚀 Study Buddy AI Assistant - Docker Validation")
    print("=" * 50)
    
    checks = [
        validate_requirements,
        validate_dockerfile,
        validate_environment_template
    ]
    
    all_passed = True
    for check in checks:
        if not check():
            all_passed = False
        print()
    
    if all_passed:
        print("🎉 All validations passed! Your Docker setup is ready.")
        print("\n📋 Next steps:")
        print("1. Copy env.production.template to .env")
        print("2. Edit .env with your actual configuration")
        print("3. Run: docker build -t study-buddy-ai:latest .")
        print("4. Run: docker run -p 5000:5000 --env-file .env study-buddy-ai:latest")
    else:
        print("❌ Some validations failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
