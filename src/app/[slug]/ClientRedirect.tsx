'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

interface ClientRedirectProps {
  url: string;
  slug: string;
}

// Bot detection function
function detectBot(ua: string): boolean {
  const botPatterns = [
    /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
    /googlebot/i, /bingbot/i, /yandex/i, /baiduspider/i,
    /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
    /pinterest/i, /whatsapp/i, /telegrambot/i, /discordbot/i,
    /slackbot/i, /applebot/i, /semrushbot/i, /ahrefsbot/i,
    /mj12bot/i, /dotbot/i, /petalbot/i, /bytespider/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
    /playwright/i, /cypress/i, /electron/i,
    /wget/i, /curl/i, /httpie/i, /python-requests/i, /axios/i,
    /fetch/i, /node-fetch/i, /got\//i, /scrapy/i,
  ];
  
  return botPatterns.some(pattern => pattern.test(ua));
}

// Generate a unique visitor ID based on device fingerprint
function generateVisitorId(): string {
  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      (navigator as any).deviceMemory || 0,
      navigator.maxTouchPoints || 0,
      navigator.platform || '',
      // Canvas fingerprint (simplified)
      getCanvasFingerprint(),
    ];
    
    // Create a hash from the components
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to base36 for shorter string
    return Math.abs(hash).toString(36) + Date.now().toString(36).slice(-4);
  } catch {
    return 'unknown-' + Math.random().toString(36).slice(2, 10);
  }
}

// Simple canvas fingerprint
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 30);
    ctx.fillStyle = '#069';
    ctx.fillText('h4a.us', 2, 15);
    
    return canvas.toDataURL().slice(-50);
  } catch {
    return 'canvas-error';
  }
}

// Helper to detect platform/source from user agent and referrer
function detectPlatform(ua: string, referrer: string): {
  platform: string;
  isInAppBrowser: boolean;
  appName: string | null;
} {
  const uaLower = ua.toLowerCase();
  const refLower = referrer.toLowerCase();
  
  // Detect in-app browsers (these have unique UA signatures)
  // Facebook
  if (uaLower.includes('fban') || uaLower.includes('fbav') || uaLower.includes('fb_iab')) {
    return { platform: 'Facebook', isInAppBrowser: true, appName: 'Facebook App' };
  }
  // Facebook Messenger
  if (uaLower.includes('messenger')) {
    return { platform: 'Messenger', isInAppBrowser: true, appName: 'Facebook Messenger' };
  }
  // Instagram
  if (uaLower.includes('instagram')) {
    return { platform: 'Instagram', isInAppBrowser: true, appName: 'Instagram App' };
  }
  // Twitter/X
  if (uaLower.includes('twitter') || uaLower.includes(' x/')) {
    return { platform: 'Twitter', isInAppBrowser: true, appName: 'Twitter/X App' };
  }
  // LinkedIn
  if (uaLower.includes('linkedin')) {
    return { platform: 'LinkedIn', isInAppBrowser: true, appName: 'LinkedIn App' };
  }
  // WhatsApp
  if (uaLower.includes('whatsapp')) {
    return { platform: 'WhatsApp', isInAppBrowser: true, appName: 'WhatsApp' };
  }
  // Telegram
  if (uaLower.includes('telegram')) {
    return { platform: 'Telegram', isInAppBrowser: true, appName: 'Telegram' };
  }
  // Snapchat
  if (uaLower.includes('snapchat')) {
    return { platform: 'Snapchat', isInAppBrowser: true, appName: 'Snapchat' };
  }
  // TikTok
  if (uaLower.includes('tiktok') || uaLower.includes('bytedance') || uaLower.includes('musical_ly')) {
    return { platform: 'TikTok', isInAppBrowser: true, appName: 'TikTok' };
  }
  // Pinterest
  if (uaLower.includes('pinterest')) {
    return { platform: 'Pinterest', isInAppBrowser: true, appName: 'Pinterest App' };
  }
  // Reddit
  if (uaLower.includes('reddit')) {
    return { platform: 'Reddit', isInAppBrowser: true, appName: 'Reddit App' };
  }
  // Discord
  if (uaLower.includes('discord')) {
    return { platform: 'Discord', isInAppBrowser: true, appName: 'Discord' };
  }
  // Slack
  if (uaLower.includes('slack')) {
    return { platform: 'Slack', isInAppBrowser: true, appName: 'Slack' };
  }
  // WeChat
  if (uaLower.includes('micromessenger') || uaLower.includes('wechat')) {
    return { platform: 'WeChat', isInAppBrowser: true, appName: 'WeChat' };
  }
  // Line
  if (uaLower.includes('line/')) {
    return { platform: 'Line', isInAppBrowser: true, appName: 'Line' };
  }
  // Viber
  if (uaLower.includes('viber')) {
    return { platform: 'Viber', isInAppBrowser: true, appName: 'Viber' };
  }
  // Skype
  if (uaLower.includes('skype')) {
    return { platform: 'Skype', isInAppBrowser: true, appName: 'Skype' };
  }
  // YouTube
  if (uaLower.includes('youtube')) {
    return { platform: 'YouTube', isInAppBrowser: true, appName: 'YouTube App' };
  }
  // Gmail (in-app)
  if (uaLower.includes('gsa/') || uaLower.includes('googleapp')) {
    return { platform: 'Google App', isInAppBrowser: true, appName: 'Google App' };
  }
  // Outlook/Microsoft
  if (uaLower.includes('outlook') || uaLower.includes('teams')) {
    return { platform: 'Microsoft', isInAppBrowser: true, appName: 'Microsoft App' };
  }
  
  // Detect from referrer if not in-app browser
  if (referrer && referrer !== 'direct') {
    try {
      const refHost = new URL(referrer).hostname.toLowerCase();
      
      // Social Media
      if (refHost.includes('facebook.com') || refHost.includes('fb.com') || refHost.includes('fbcdn.net')) {
        return { platform: 'Facebook', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('instagram.com')) {
        return { platform: 'Instagram', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('twitter.com') || refHost.includes('t.co') || refHost.includes('x.com')) {
        return { platform: 'Twitter', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('linkedin.com') || refHost.includes('lnkd.in')) {
        return { platform: 'LinkedIn', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('tiktok.com')) {
        return { platform: 'TikTok', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('pinterest.com') || refHost.includes('pin.it')) {
        return { platform: 'Pinterest', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('reddit.com')) {
        return { platform: 'Reddit', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('youtube.com') || refHost.includes('youtu.be')) {
        return { platform: 'YouTube', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('snapchat.com')) {
        return { platform: 'Snapchat', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('discord.com') || refHost.includes('discord.gg')) {
        return { platform: 'Discord', isInAppBrowser: false, appName: null };
      }
      
      // Search Engines
      if (refHost.includes('google.')) {
        return { platform: 'Google Search', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('bing.com')) {
        return { platform: 'Bing Search', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('duckduckgo.com')) {
        return { platform: 'DuckDuckGo', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('yahoo.')) {
        return { platform: 'Yahoo Search', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('baidu.com')) {
        return { platform: 'Baidu', isInAppBrowser: false, appName: null };
      }
      
      // Email Clients (web)
      if (refHost.includes('mail.google.com') || refHost.includes('gmail.com')) {
        return { platform: 'Gmail', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('outlook.live.com') || refHost.includes('outlook.office')) {
        return { platform: 'Outlook', isInAppBrowser: false, appName: null };
      }
      if (refHost.includes('mail.yahoo.com')) {
        return { platform: 'Yahoo Mail', isInAppBrowser: false, appName: null };
      }
      
      // Other
      return { platform: 'Web', isInAppBrowser: false, appName: null };
    } catch {
      // Invalid URL
    }
  }
  
  // Direct access or unknown
  return { platform: 'Direct', isInAppBrowser: false, appName: null };
}

// Helper to detect device type from user agent
function getDeviceInfo(ua: string) {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  
  let deviceType = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';
  
  // Detect OS
  let os = 'Unknown';
  let osVersion = '';
  if (/Windows NT 10/.test(ua)) { os = 'Windows'; osVersion = '10'; }
  else if (/Windows NT 6.3/.test(ua)) { os = 'Windows'; osVersion = '8.1'; }
  else if (/Windows NT 6.2/.test(ua)) { os = 'Windows'; osVersion = '8'; }
  else if (/Windows NT 6.1/.test(ua)) { os = 'Windows'; osVersion = '7'; }
  else if (/Windows/.test(ua)) { os = 'Windows'; }
  else if (/Mac OS X ([0-9_]+)/.test(ua)) { 
    os = 'macOS'; 
    const match = ua.match(/Mac OS X ([0-9_]+)/);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
  }
  else if (/Android ([0-9.]+)/.test(ua)) { 
    os = 'Android'; 
    const match = ua.match(/Android ([0-9.]+)/);
    osVersion = match ? match[1] : '';
  }
  else if (/iPhone OS ([0-9_]+)/.test(ua) || /iPad.*OS ([0-9_]+)/.test(ua)) { 
    os = 'iOS'; 
    const match = ua.match(/(?:iPhone|iPad).*OS ([0-9_]+)/);
    osVersion = match ? match[1].replace(/_/g, '.') : '';
  }
  else if (/Linux/.test(ua)) { os = 'Linux'; }
  else if (/CrOS/.test(ua)) { os = 'Chrome OS'; }
  
  // Detect Browser
  let browser = 'Unknown';
  let browserVersion = '';
  if (/Edg\/([0-9.]+)/.test(ua)) { 
    browser = 'Edge'; 
    const match = ua.match(/Edg\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }
  else if (/OPR\/([0-9.]+)/.test(ua) || /Opera\/([0-9.]+)/.test(ua)) { 
    browser = 'Opera'; 
    const match = ua.match(/(?:OPR|Opera)\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }
  else if (/Chrome\/([0-9.]+)/.test(ua) && !/Edg/.test(ua)) { 
    browser = 'Chrome'; 
    const match = ua.match(/Chrome\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }
  else if (/Safari\/([0-9.]+)/.test(ua) && !/Chrome/.test(ua)) { 
    browser = 'Safari'; 
    const match = ua.match(/Version\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }
  else if (/Firefox\/([0-9.]+)/.test(ua)) { 
    browser = 'Firefox'; 
    const match = ua.match(/Firefox\/([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }
  else if (/MSIE ([0-9.]+)/.test(ua) || /Trident.*rv:([0-9.]+)/.test(ua)) { 
    browser = 'Internet Explorer'; 
    const match = ua.match(/(?:MSIE |rv:)([0-9.]+)/);
    browserVersion = match ? match[1] : '';
  }
  
  return { deviceType, os, osVersion, browser, browserVersion, isMobile, isTablet };
}

// Fetch geolocation data from free IP API
async function fetchGeoLocation(): Promise<{
  country: string | null;
  countryCode: string | null;
  region: string | null;
  regionName: string | null;
  city: string | null;
  zip: string | null;
  lat: number | null;
  lon: number | null;
  isp: string | null;
  org: string | null;
  ip: string | null;
}> {
  try {
    // Using ip-api.com (free, no API key required, 45 requests/minute limit)
    const response = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,isp,org,query', {
      signal: AbortSignal.timeout(3000),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return {
          country: data.country || null,
          countryCode: data.countryCode || null,
          region: data.region || null,
          regionName: data.regionName || null,
          city: data.city || null,
          zip: data.zip || null,
          lat: data.lat || null,
          lon: data.lon || null,
          isp: data.isp || null,
          org: data.org || null,
          ip: data.query || null,
        };
      }
    }
  } catch (error) {
    console.log('Could not fetch geolocation:', error);
  }
  
  return {
    country: null,
    countryCode: null,
    region: null,
    regionName: null,
    city: null,
    zip: null,
    lat: null,
    lon: null,
    isp: null,
    org: null,
    ip: null,
  };
}

export default function ClientRedirect({ url, slug }: ClientRedirectProps) {
  const [progress, setProgress] = useState(0);
  const analyticsRef = useRef(false);
  const redirectRef = useRef(false);

  useEffect(() => {
    if (!url || !slug) return;

    const sendAnalyticsAndRedirect = async () => {
      // Prevent duplicate calls
      if (analyticsRef.current) return;
      analyticsRef.current = true;

      try {
        const ua = navigator.userAgent;
        const referrer = document.referrer || 'direct';
        const deviceInfo = getDeviceInfo(ua);
        const platformInfo = detectPlatform(ua, referrer);
        const searchParams = new URLSearchParams(window.location.search);
        
        console.log('Platform detected:', platformInfo);
        
        // Fetch geolocation data (runs in parallel with other data collection)
        const geoData = await fetchGeoLocation();
        console.log('Geolocation data:', geoData);
        
        // Collect comprehensive client-side data
        const analyticsData = {
          // Screen info
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          colorDepth: window.screen.colorDepth,
          pixelRatio: window.devicePixelRatio || 1,
          
          // Device info (client-side detection)
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          browserVersion: deviceInfo.browserVersion,
          os: deviceInfo.os,
          osVersion: deviceInfo.osVersion,
          isMobile: deviceInfo.isMobile,
          isTablet: deviceInfo.isTablet,
          isDesktop: !deviceInfo.isMobile && !deviceInfo.isTablet,
          
          // Platform/Source info (where the link was opened from)
          platform: platformInfo.platform,
          isInAppBrowser: platformInfo.isInAppBrowser,
          appName: platformInfo.appName,
          
          // Geolocation (from IP API)
          country: geoData.country,
          countryCode: geoData.countryCode,
          region: geoData.region,
          regionName: geoData.regionName,
          city: geoData.city,
          zip: geoData.zip,
          latitude: geoData.lat,
          longitude: geoData.lon,
          isp: geoData.isp,
          org: geoData.org,
          clientIp: geoData.ip,
          
          // Language & Locale
          language: navigator.language || 'en',
          languages: navigator.languages ? [...navigator.languages] : [navigator.language || 'en'],
          
          // Timezone
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffset: new Date().getTimezoneOffset(),
          
          // User agent (raw for server-side parsing)
          userAgent: ua,
          
          // Referrer
          referer: document.referrer || 'direct',
          
          // Page info
          pageUrl: window.location.href,
          
          // UTM parameters
          utmSource: searchParams.get('utm_source') || null,
          utmMedium: searchParams.get('utm_medium') || null,
          utmCampaign: searchParams.get('utm_campaign') || null,
          utmTerm: searchParams.get('utm_term') || null,
          utmContent: searchParams.get('utm_content') || null,
          
          // Connection info (if available)
          connectionType: (navigator as any).connection?.effectiveType || null,
          connectionDownlink: (navigator as any).connection?.downlink || null,
          connectionRtt: (navigator as any).connection?.rtt || null,
          connectionSaveData: (navigator as any).connection?.saveData || false,
          
          // Touch support
          touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
          maxTouchPoints: navigator.maxTouchPoints || 0,
          
          // System preferences
          prefersDarkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches || false,
          prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
          prefersContrast: window.matchMedia?.('(prefers-contrast: more)').matches || false,
          
          // Bot detection signals
          isBot: detectBot(ua),
          webdriver: !!(navigator as any).webdriver,
          hasPlugins: navigator.plugins?.length > 0,
          hasLanguages: (navigator.languages?.length || 0) > 0,
          
          // Unique visitor fingerprint (hash of device characteristics)
          visitorId: generateVisitorId(),
          
          // Additional device capabilities
          deviceMemory: (navigator as any).deviceMemory || null,
          hardwareConcurrency: navigator.hardwareConcurrency || null,
          
          // Timestamp
          clientTimestamp: new Date().toISOString(),
        };

        console.log('Sending analytics:', analyticsData);

        // Send analytics to backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/analytics/${slug}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(analyticsData),
          // Add a timeout
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          console.log('Analytics sent successfully');
        } else {
          console.error('Analytics response error:', response.status);
        }
      } catch (error) {
        console.error('Error sending analytics:', error);
        // Continue with redirect even if analytics fails
      }

      // Redirect after a short delay to show the loader
      setTimeout(() => {
        if (!redirectRef.current && url) {
          redirectRef.current = true;
          console.log('Redirecting to:', url);
          window.location.href = url;
        }
      }, 1200);
    };

    // Start analytics and redirect process
    sendAnalyticsAndRedirect();

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 6;
      });
    }, 70);

    // Fallback redirect in case something goes wrong
    const fallbackTimer = setTimeout(() => {
      if (!redirectRef.current && url) {
        redirectRef.current = true;
        console.log('Fallback redirect to:', url);
        window.location.href = url;
      }
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fallbackTimer);
    };
  }, [url, slug]);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 animate-pulse">
        <Image
          src="/h4a_lodder.jpg"
          alt="Harmony 4 All"
          width={600}
          height={240}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
} 