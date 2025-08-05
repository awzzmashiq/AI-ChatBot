import React, { useState, useEffect } from 'react';
import './Documents.css';

function Documents({ onClose }) {
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);

    useEffect(() => {
        fetchDocuments();
        fetchStats();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/documents', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch documents');
            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (err) {
            console.error('Fetch documents error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/documents/stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data.stats || {});
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        
        try {
            const res = await fetch(`http://localhost:5000/api/documents/${docId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!res.ok) throw new Error('Failed to delete document');
            
            const data = await res.json();
            if (data.success) {
                fetchDocuments();
                fetchStats();
            }
        } catch (err) {
            console.error('Delete document error:', err);
            window.alert('Failed to delete document');
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (err) {
            return 'Unknown';
        }
    };

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return '📄';
            case 'doc':
            case 'docx': return '📝';
            case 'txt': return '📄';
            case 'jpg':
            case 'jpeg':
            case 'png': return '🖼️';
            case 'mp3':
            case 'wav':
            case 'm4a': return '🎵';
            default: return '📁';
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content documents-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="header-content">
                        <div className="header-icon">📁</div>
                        <div>
                            <h2>Document Manager</h2>
                            <p>Manage your uploaded documents</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="close">✕</button>
                </div>

                {/* Stats Cards */}
                <div className="stats-section">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">📄</div>
                            <div className="stat-info">
                                <p>Total Documents</p>
                                <h3>{stats.total_documents || 0}</h3>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">💾</div>
                            <div className="stat-info">
                                <p>Total Size</p>
                                <h3>{formatFileSize(stats.total_size_bytes || 0)}</h3>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-info">
                                <p>File Types</p>
                                <h3>{Object.keys(stats.file_types || {}).length}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="search-section">
                    <div className="search-container">
                        <div className="search-icon">🔍</div>
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Documents List */}
                <div className="documents-list">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="loading-spinner">⏳</div>
                            <p>Loading documents...</p>
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📁</div>
                            <h3>{searchTerm ? 'No documents found' : 'No documents yet'}</h3>
                            <p>{searchTerm ? 'Try adjusting your search terms' : 'Upload your first document to get started'}</p>
                        </div>
                    ) : (
                        filteredDocuments.map((doc) => (
                            <div key={doc.filename} className="document-item" onClick={() => setSelectedDocument(doc)}>
                                <div className="document-content">
                                    <div className="document-icon">{getFileIcon(doc.filename)}</div>
                                    <div className="document-info">
                                        <h4>{doc.filename}</h4>
                                        <div className="document-meta">
                                            <span>{formatDate(doc.upload_date)}</span>
                                            <span>{formatFileSize(doc.size || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="document-actions">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(doc.filename);
                                            }}
                                            className="action-button delete"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Documents; 