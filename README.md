# Study Buddy - AI-Powered Learning Assistant

A modern, intelligent study assistant that helps students learn more effectively through AI-powered conversations, document analysis, and personalized study sessions.

## 🌟 Features

- **🤖 AI Chat Interface**: Interactive conversations with an AI assistant powered by Theta AI
- **📚 Document Upload & Analysis**: Upload PDFs, images, and documents for AI-powered analysis
- **🎤 Voice/Audio Input**: Speak your questions using voice-to-text technology
- **💾 Multiple Storage Options**: Choose between local storage or Google Drive integration
- **📝 Session Management**: Create, rename, and manage multiple study sessions
- **🔍 Document Search**: AI-powered search through your uploaded documents
- **🎨 Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **🔐 Secure Authentication**: JWT-based authentication with Google OAuth support

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Theta AI API key (free at [Theta AI](https://www.thetavideoapi.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/study-buddy.git
   cd study-buddy
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Configuration**
   ```bash
   cd backend
   cp env.example .env
   ```
   
   Edit `.env` and add your Theta AI API key:
   ```env
   THETA_API_KEY=your_actual_theta_api_key_here
   SECRET_KEY=your_jwt_secret_key_here
   ```

5. **Start the Application**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python app.py
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
study-buddy/
├── backend/                 # Flask API server
│   ├── app.py              # Main Flask application
│   ├── storage_manager.py  # Storage abstraction layer
│   ├── real_google_drive.py # Google Drive integration
│   ├── requirements.txt    # Python dependencies
│   └── env.example        # Environment template
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── App.js         # Main app component
│   ├── package.json       # Node.js dependencies
│   └── tailwind.config.js # Tailwind CSS configuration
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Required
THETA_API_KEY=your_theta_api_key_here
SECRET_KEY=your_jwt_secret_key_here

# Optional - Google Drive Integration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Google Drive Integration (Optional)

To enable Google Drive storage:

1. Create a Google Cloud Project
2. Enable Google Drive API
3. Create OAuth 2.0 credentials
4. Add credentials to your `.env` file
5. Configure redirect URIs in Google Cloud Console

## 🎯 Usage

### Basic Chat
1. Sign up or log in
2. Start typing your questions
3. Get AI-powered responses

### Document Upload
1. Click the upload button
2. Select your document (PDF, image, text)
3. Wait for processing
4. Ask questions about your document

### Voice Input
1. Click the microphone button
2. Speak your question
3. The AI will transcribe and respond

### Session Management
1. Create new study sessions
2. Rename sessions for organization
3. Switch between sessions
4. Each session maintains separate chat history

### Storage Options
1. **Local Storage**: Files stored on your device
2. **Google Drive**: Files stored in your Google Drive (requires setup)

## 🛠️ Development

### Backend Development
```bash
cd backend
python app.py
```

### Frontend Development
```bash
cd frontend
npm start
```

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

## 🔒 Security

- JWT-based authentication
- Secure cookie handling
- Environment variable protection
- CORS configuration
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Theta AI](https://www.thetavideoapi.com/) for AI capabilities
- [React](https://reactjs.org/) for the frontend framework
- [Flask](https://flask.palletsprojects.com/) for the backend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Google Drive API](https://developers.google.com/drive) for cloud storage

## 📞 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/study-buddy/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🔄 Updates

Stay updated with the latest features and bug fixes by:

1. Starring this repository
2. Watching for updates
3. Following the release notes

---

**Happy Studying! 📚✨** 