'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

export default function ImagePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const analyticsRef = useRef(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Send analytics when file is loaded (and not password protected)
  useEffect(() => {
    if (fileInfo && !needsPassword && !analyticsRef.current) {
      analyticsRef.current = true;
      sendAnalytics();
    }
  }, [fileInfo, needsPassword]);

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
      
      console.log('Image analytics sent');
    } catch (error) {
      console.error('Error sending image analytics:', error);
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
      } else {
        setImageUrl(`${apiUrl}/api/file/${slug}/data`);
      }
    } catch (err) {
      setError('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    setImageUrl(`${apiUrl}/api/file/${slug}/data?password=${encodeURIComponent(password)}`);
    setNeedsPassword(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const text = fileInfo?.originalName || 'Check out this image';
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
  };

  const shareToWhatsApp = () => {
    const text = fileInfo?.originalName || 'Check out this image';
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = fileInfo?.originalName || 'Check out this image';
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
  };

  const shareViaEmail = () => {
    const subject = fileInfo?.originalName || 'Shared Image';
    const body = `Check out this image: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const downloadImage = async () => {
    if (downloading) return;
    
    if (!fileInfo) {
      toast.error('File information not available');
      return;
    }
    
    // Check if password is required but not provided
    if (fileInfo.hasPassword && !password && needsPassword) {
      toast.error('Please enter the password first');
      return;
    }
    
    setDownloading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Use imageUrl if available (already has password if needed), otherwise build from scratch
      let dataUrl = imageUrl;
      if (!dataUrl) {
        // Build the data URL - always build from scratch to ensure it's correct
        dataUrl = `${apiUrl}/api/file/${slug}/data`;
        if (fileInfo.hasPassword && password) {
          dataUrl += `?password=${encodeURIComponent(password)}`;
        }
      }
      
      console.log('Downloading from:', dataUrl);
      console.log('File info:', { slug, hasPassword: fileInfo.hasPassword, password: password ? '***' : 'none' });
      console.log('API URL:', apiUrl);
      
      // Step 1: Fetch image data (no download count increment)
      let response: Response;
      try {
        response = await fetch(dataUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': fileInfo.mimeType || 'image/*',
          },
        });
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        // If fetch fails, it might be a CORS or network issue
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          toast.error('Network error: Unable to connect to server. Please check your connection and try again.');
        } else {
          toast.error(`Download failed: ${fetchError.message || 'Unknown error'}`);
        }
        setDownloading(false);
        return;
      }
      
      console.log('Download response status:', response.status, response.statusText);
      
      if (response.status === 401) {
        toast.error('Invalid password. Please enter the correct password.');
        setDownloading(false);
        return;
      }
      
      if (!response.ok) {
        let errorMessage = 'Failed to download image';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        console.error('Download fetch error:', response.status, errorMessage);
        toast.error(errorMessage);
        setDownloading(false);
        return;
      }
      
      // Step 2: Create blob and download (frontend-rendered)
      const blob = await response.blob();
      console.log('Blob created:', blob.size, 'bytes, type:', blob.type);
      
      if (!blob || blob.size === 0) {
        toast.error('Downloaded file is empty');
        setDownloading(false);
        return;
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileInfo.originalName || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up after a short delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      // Step 3: Increment download count on backend (fire and forget)
      fetch(`${apiUrl}/api/file/${slug}/increment-download`, {
        method: 'POST',
        credentials: 'include',
      }).catch(err => {
        console.error('Error incrementing download count:', err);
        // Don't fail the download if count increment fails
      });
      
      toast.success('Download started!');
    } catch (error: any) {
      console.error('Download error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      const errorMessage = error.message || 'Failed to download image. Please check your connection and try again.';
      toast.error(errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl font-bold text-white mb-2">{error}</h1>
          <p className="text-gray-400 mb-6">This image may have been deleted or expired.</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Password Protected</h1>
            <p className="text-gray-600 mt-1">Enter the password to view this image</p>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent mb-4"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-900 transition-colors"
            >
              View Image
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Image Display */}
      <div className="flex-1 flex items-center justify-center p-4 pb-24">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={fileInfo?.originalName || 'Image'}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onError={() => setError('Failed to load image')}
          />
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>

            {/* Download */}
            <button
              onClick={downloadImage}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 rounded-full hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
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
                  Download
                </>
              )}
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-white/20 hidden sm:block"></div>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-2">
              {/* Facebook */}
              <button
                onClick={shareToFacebook}
                className="p-2.5 bg-[#1877F2] rounded-full hover:opacity-90 transition-opacity"
                title="Share on Facebook"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* Twitter/X */}
              <button
                onClick={shareToTwitter}
                className="p-2.5 bg-black rounded-full hover:opacity-90 transition-opacity border border-white/20"
                title="Share on X"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* WhatsApp */}
              <button
                onClick={shareToWhatsApp}
                className="p-2.5 bg-[#25D366] rounded-full hover:opacity-90 transition-opacity"
                title="Share on WhatsApp"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>

              {/* Telegram */}
              <button
                onClick={shareToTelegram}
                className="p-2.5 bg-[#0088cc] rounded-full hover:opacity-90 transition-opacity"
                title="Share on Telegram"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </button>

              {/* LinkedIn */}
              <button
                onClick={shareToLinkedIn}
                className="p-2.5 bg-[#0A66C2] rounded-full hover:opacity-90 transition-opacity"
                title="Share on LinkedIn"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </button>

              {/* Email */}
              <button
                onClick={shareViaEmail}
                className="p-2.5 bg-gray-600 rounded-full hover:opacity-90 transition-opacity"
                title="Share via Email"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
