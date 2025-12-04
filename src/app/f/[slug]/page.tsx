'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface FileInfo {
  slug: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: string;
  createdAt: string;
  expiresAt: string | null;
  downloads: number;
  views: number;
  hasPassword: boolean;
}

// File type icons
const fileIcons: { [key: string]: string } = {
  'application/pdf': '📄',
  'application/zip': '📦',
  'application/x-zip-compressed': '📦',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-powerpoint': '📽️',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📽️',
  'text/plain': '📃',
  'text/csv': '📊',
  'application/json': '🔧',
  'audio/mpeg': '🎵',
  'audio/wav': '🎵',
  'video/mp4': '🎬',
  'video/webm': '🎬',
  'default': '📎'
};

// Helper to detect device type from user agent
function getDeviceInfo(ua: string) {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua);
  
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return {
    deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser,
    os
  };
}

// Fetch geolocation data
async function fetchGeoLocation(): Promise<{ country: string; city: string; region: string }> {
  try {
    const response = await fetch('https://ip-api.com/json/?fields=status,country,regionName,city', {
      signal: AbortSignal.timeout(3000)
    });
    const data = await response.json();
    if (data.status === 'success') {
      return {
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown'
      };
    }
  } catch (e) {
    console.log('Geo lookup failed');
  }
  return { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
}

// Detect platform
function detectPlatform(ua: string, referrer: string): string {
  const uaLower = ua.toLowerCase();
  const refLower = referrer.toLowerCase();
  
  // Social media platforms
  if (uaLower.includes('fban') || uaLower.includes('fbav') || refLower.includes('facebook')) return 'Facebook';
  if (uaLower.includes('instagram') || refLower.includes('instagram')) return 'Instagram';
  if (uaLower.includes('twitter') || refLower.includes('twitter') || refLower.includes('t.co')) return 'Twitter/X';
  if (uaLower.includes('linkedin') || refLower.includes('linkedin')) return 'LinkedIn';
  if (refLower.includes('reddit')) return 'Reddit';
  if (uaLower.includes('tiktok') || refLower.includes('tiktok')) return 'TikTok';
  
  // Messaging apps
  if (uaLower.includes('whatsapp')) return 'WhatsApp';
  if (uaLower.includes('telegram')) return 'Telegram';
  if (uaLower.includes('slack') || refLower.includes('slack')) return 'Slack';
  if (uaLower.includes('discord') || refLower.includes('discord')) return 'Discord';
  
  // Search engines
  if (refLower.includes('google.')) return 'Google Search';
  if (refLower.includes('bing.')) return 'Bing';
  if (refLower.includes('duckduckgo')) return 'DuckDuckGo';
  
  if (!referrer || referrer === 'direct') return 'Direct';
  return 'Other';
}

export default function FilePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const analyticsRef = useRef(false);

  // Send analytics when file is loaded
  useEffect(() => {
    if (fileInfo && !analyticsRef.current) {
      analyticsRef.current = true;
      sendAnalytics();
    }
  }, [fileInfo]);

  const sendAnalytics = async () => {
    try {
      const ua = navigator.userAgent;
      const deviceInfo = getDeviceInfo(ua);
      const referrer = document.referrer || 'direct';
      const geoData = await fetchGeoLocation();
      const platform = detectPlatform(ua, referrer);

      const analyticsData = {
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: ua,
        referer: referrer,
        pageUrl: window.location.href,
        country: geoData.country,
        city: geoData.city,
        region: geoData.region,
        platform: platform,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${apiUrl}/api/file/${slug}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsData),
        signal: AbortSignal.timeout(5000),
      });
      
      console.log('File analytics sent');
    } catch (error) {
      console.error('Error sending file analytics:', error);
    }
  };

  useEffect(() => {
    fetchFileInfo();
  }, [slug]);

  const fetchFileInfo = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/file/${slug}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'File not found');
        return;
      }

      setFileInfo(data);
      
      if (data.hasPassword) {
        setNeedsPassword(true);
      }
    } catch (err) {
      setError('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileInfo) return;
    
    setDownloading(true);
    setPasswordError(false);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Step 1: Fetch file data (no download count increment)
      // Use cache: 'default' so browser will use cached version if available
      let dataUrl = `${apiUrl}/api/file/${slug}/data`;
      if (password) {
        dataUrl += `?password=${encodeURIComponent(password)}`;
      }
      
      const response = await fetch(dataUrl, {
        method: 'GET',
        credentials: 'include',
        cache: 'default', // Browser will use cache if available (no re-fetch if cached)
      });
      
      if (response.status === 401) {
        setPasswordError(true);
        setError('Invalid password');
        setDownloading(false);
        return;
      }
      
      if (!response.ok) {
        try {
          const data = await response.json();
          setError(data.message || 'Download failed');
        } catch {
          setError(`Download failed: ${response.status} ${response.statusText}`);
        }
        setDownloading(false);
        return;
      }

      // Step 2: Create blob and download (frontend-rendered)
      // Browser will use cached response if available, so this should be fast
      const blob = await response.blob();
      
      // Verify blob is valid
      if (!blob || blob.size === 0) {
        setError('Downloaded file is empty');
        setDownloading(false);
        return;
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileInfo.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up after a short delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      // Step 3: Increment download count on backend (fire and forget)
      // Don't await - let it run in background
      fetch(`${apiUrl}/api/file/${slug}/increment-download`, {
        method: 'POST',
        credentials: 'include',
      })
        .then(() => {
          // Refresh file info to show updated download count
          fetchFileInfo();
        })
        .catch(err => {
          console.error('Error incrementing download count:', err);
          // Don't fail the download if count increment fails
        });
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string) => {
    return fileIcons[mimeType] || fileIcons['default'];
  };

  const getFileExtension = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
          <p className="text-gray-600 mb-6">This file may have been deleted or expired.</p>
          <div className="text-center pt-4 border-t border-gray-100">
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        {/* File Icon */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{fileInfo && getFileIcon(fileInfo.mimeType)}</div>
          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
            {fileInfo && getFileExtension(fileInfo.originalName)}
          </div>
        </div>

        {/* File Name */}
        <h1 className="text-xl font-bold text-gray-900 text-center mb-2 break-words">
          {fileInfo?.originalName}
        </h1>

        {/* File Info */}
        <div className="flex justify-center gap-4 text-sm text-gray-500 mb-6">
          <span>{fileInfo && formatFileSize(fileInfo.size)}</span>
          <span>•</span>
          <span>{fileInfo?.downloads} downloads</span>
        </div>

        {/* Expiration Warning */}
        {fileInfo?.expiresAt && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-center">
            <p className="text-sm text-amber-800">
              Expires: {formatDate(fileInfo.expiresAt)}
            </p>
          </div>
        )}

        {/* Password Input */}
        {needsPassword && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              This file is password protected
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              placeholder="Enter password"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                passwordError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {passwordError && (
              <p className="text-red-500 text-sm mt-1">Incorrect password</p>
            )}
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloading || (needsPassword && !password)}
          className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </>
          )}
        </button>

      </div>
    </div>
  );
}
