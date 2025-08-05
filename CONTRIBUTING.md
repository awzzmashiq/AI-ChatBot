# Contributing to Study Buddy

Thank you for your interest in contributing to Study Buddy! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### 1. Fork the Repository
1. Go to the [Study Buddy repository](https://github.com/yourusername/study-buddy)
2. Click the "Fork" button in the top right corner
3. Clone your forked repository to your local machine

### 2. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes
- Follow the coding standards outlined below
- Write tests for new functionality
- Update documentation as needed

### 4. Test Your Changes
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### 5. Commit Your Changes
```bash
git add .
git commit -m "feat: add new feature description"
```

### 6. Push and Create a Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with a clear description of your changes.

## 📋 Coding Standards

### Python (Backend)
- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Write docstrings for functions and classes
- Keep functions small and focused
- Use meaningful variable and function names

### JavaScript/React (Frontend)
- Use ES6+ features
- Follow React best practices
- Use functional components with hooks
- Keep components small and reusable
- Use meaningful variable and function names

### General
- Write clear, descriptive commit messages
- Use conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `style:` for formatting changes
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

## 🧪 Testing

### Backend Testing
- Write unit tests for new functions
- Test API endpoints
- Use pytest for testing framework
- Aim for good test coverage

### Frontend Testing
- Write unit tests for components
- Test user interactions
- Use React Testing Library
- Test accessibility features

## 📚 Documentation

- Update README.md if adding new features
- Add inline comments for complex logic
- Update API documentation if changing endpoints
- Include setup instructions for new features

## 🔒 Security

- Never commit sensitive information (API keys, passwords, etc.)
- Use environment variables for configuration
- Validate all user inputs
- Follow security best practices

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, browser, versions)
5. **Screenshots** if applicable
6. **Error messages** or logs

## 💡 Feature Requests

When suggesting features:

1. **Clear description** of the feature
2. **Use case** and benefits
3. **Implementation ideas** (optional)
4. **Priority level** (low, medium, high)

## 🏷️ Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `question`: Further information is requested

## 📞 Getting Help

If you need help:

1. Check existing issues and pull requests
2. Search the documentation
3. Create a new issue with the `question` label
4. Join our community discussions

## 🎉 Recognition

Contributors will be recognized in:

- The project README
- Release notes
- GitHub contributors page

Thank you for contributing to Study Buddy! 🚀 