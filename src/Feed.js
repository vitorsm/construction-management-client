import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Post from './Post';
import GenericScreen from './GenericScreen';
import { checkAuthError } from './apiUtils';
import { API_BASE_URL } from './config';
import './Feed.css';

function Feed() {
  const { projectId } = useParams();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState(null);

  const fetchProject = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
    }
  }, [projectId]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/feed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (checkAuthError(response)) {
          return;
        }
        throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchPosts();
  }, [fetchProject, fetchPosts]);

  const handleLoadMore = () => {
    // TODO: Implement API call to fetch more posts
    console.log('Loading more posts...');
  };

  return (
    <GenericScreen
      title={project ? project.name : 'Project Feed'}
      backPath={`/projects/${projectId}`}
    >
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading posts...</p>
        </div>
      )}
      
      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchPosts}>
            Retry
          </button>
        </div>
      )}
      
      {!loading && !error && (
        <>
          <div className="posts-list">
            {posts.length === 0 ? (
              <div className="no-posts">
                <p>No posts found.</p>
              </div>
            ) : (
              posts.map(post => (
                <Post key={post.id} post={post} />
              ))
            )}
          </div>
          {posts.length > 0 && (
            <div className="load-more-container">
              <button className="load-more-button" onClick={handleLoadMore}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </GenericScreen>
  );
}

export default Feed;

