import { Metadata } from 'next';
import ClientRedirect from './ClientRedirect';

interface SlugPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/url/${slug}`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });
    
    if (!response.ok) {
      return {
        title: 'Link not found | LinkShortener',
      };
    }
    
    return {
      title: 'Redirecting... | LinkShortener',
    };
  } catch (error) {
    return {
      title: 'Error | LinkShortener',
    };
  }
}

export default async function SlugPage({ params }: SlugPageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  try {
    // Add cache busting parameter to prevent caching issues
    const timestamp = Date.now();
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/url/${slug}?_=${timestamp}`;
    
    console.log('Fetching from API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      next: { revalidate: 0 } // Don't cache this request
    });
    
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          </div>
        );
      }
      
      if (response.status === 410) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          </div>
        );
      }
      
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">

        </div>
      );
    }
    
    const data = await response.json();
    console.log('API Response data:', data);
    
    if (!data.originalUrl) {
      console.error('Missing originalUrl in API response');
      throw new Error('Invalid API response: missing originalUrl');
    }
    
    // Make sure the URL has a protocol
    let targetUrl = data.originalUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    console.log('Redirecting to:', targetUrl);
    
    // Instead of using server-side redirect, use the client-side component
    // This approach is more reliable across different Next.js deployment environments
    return <ClientRedirect url={targetUrl} slug={slug} />;
    
  } catch (error) {
    console.error('Error redirecting:', error);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
     
      </div>
    );
  }
} 