'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface UrlData {
  _id: string;
  slug: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clicks: number;
  type: 'url';
}

interface FileData {
  _id: string;
  slug: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  expiresAt: string | null;
  downloads: number;
  views: number;
  type: 'image' | 'file';
}

type ItemData = UrlData | FileData;
type SortField = 'clicks' | 'createdAt' | 'slug';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'url' | 'image' | 'file';

export default function DashboardPage() {
  const [urls, setUrls] = useState<UrlData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        // Fetch both URLs and files in parallel
        const [urlsResponse, filesResponse] = await Promise.all([
          fetch(`${apiUrl}/api/urls`),
          fetch(`${apiUrl}/api/files`)
        ]);
        
        if (!urlsResponse.ok) {
          throw new Error('Failed to fetch URLs');
        }
        
        const urlsData = await urlsResponse.json();
        setUrls(urlsData.map((u: any) => ({ ...u, type: 'url' })));

        // Files might not exist yet, so handle gracefully
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          // The API returns { files: [...], pagination: {...} }
          const filesArray = filesData.files || filesData;
          if (Array.isArray(filesArray)) {
            setFiles(filesArray.map((f: any) => ({
              ...f,
              type: f.mimeType?.startsWith('image/') ? 'image' : 'file'
            })));
          }
        }
      } catch (err: any) {
        setError(err.message);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Combine and filter items
  const allItems = useMemo(() => {
    const combined: ItemData[] = [
      ...urls,
      ...files
    ];
    return combined;
  }, [urls, files]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...allItems];

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        if (item.type === 'url') {
          return item.slug.toLowerCase().includes(query) ||
            (item as UrlData).originalUrl.toLowerCase().includes(query);
        } else {
          return item.slug.toLowerCase().includes(query) ||
            (item as FileData).originalName.toLowerCase().includes(query);
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'clicks') {
        const aClicks = a.type === 'url' ? (a as UrlData).clicks : (a as FileData).views;
        const bClicks = b.type === 'url' ? (b as UrlData).clicks : (b as FileData).views;
        comparison = aClicks - bClicks;
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'slug') {
        comparison = a.slug.localeCompare(b.slug);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allItems, searchQuery, sortField, sortOrder, filterType]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const copyToClipboard = (item: ItemData) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    let url: string;
    
    if (item.type === 'url') {
      url = `${baseUrl}/${item.slug}`;
    } else if (item.type === 'image') {
      url = `${baseUrl}/i/${item.slug}`;
    } else {
      url = `${baseUrl}/f/${item.slug}`;
    }
    
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getItemLink = (item: ItemData) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    if (item.type === 'url') {
      return `${baseUrl}/${item.slug}`;
    } else if (item.type === 'image') {
      return `${baseUrl}/i/${item.slug}`;
    } else {
      return `${baseUrl}/f/${item.slug}`;
    }
  };

  // Stats
  const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);
  const totalViews = files.reduce((sum, file) => sum + file.views, 0);
  const totalLinks = urls.length;
  const totalFiles = files.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-black underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Create Link
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload File
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-gray-500 text-sm">Short Links</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalLinks.toLocaleString()}</p>
          </motion.div>
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-gray-500 text-sm">Link Clicks</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalClicks.toLocaleString()}</p>
          </motion.div>
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <p className="text-gray-500 text-sm">Uploaded Files</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalFiles.toLocaleString()}</p>
          </motion.div>
          <motion.div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <p className="text-gray-500 text-sm">File Views</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalViews.toLocaleString()}</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by slug, URL, or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black"
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black text-sm"
              >
                <option value="all">All Types</option>
                <option value="url">🔗 Links</option>
                <option value="image">🖼️ Images</option>
                <option value="file">📄 Files</option>
              </select>
              
              {/* Sort */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black text-sm"
              >
                <option value="createdAt">Date Created</option>
                <option value="clicks">Clicks/Views</option>
                <option value="slug">Slug</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-500">
              Found {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
          )}
        </motion.div>

        {/* Items Table */}
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No items found' : 'No items yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? 'Try adjusting your search query or filter'
                  : 'Create your first short link or upload a file to get started'}
              </p>
              {!searchQuery && (
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-900"
                  >
                    Create Link
                  </Link>
                  <Link
                    href="/upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Upload File
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black"
                      onClick={() => handleSort('slug')}
                    >
                      <div className="flex items-center gap-1">
                        Short Link
                        {sortField === 'slug' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destination / Name
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black"
                      onClick={() => handleSort('clicks')}
                    >
                      <div className="flex items-center gap-1">
                        Clicks/Views
                        {sortField === 'clicks' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {sortField === 'createdAt' && (
                          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item, index) => (
                    <motion.tr
                      key={item._id}
                      className="hover:bg-gray-50 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.type === 'url' 
                            ? 'bg-blue-100 text-blue-800' 
                            : item.type === 'image'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.type === 'url' ? '🔗 Link' : item.type === 'image' ? '🖼️ Image' : '📄 File'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.type === 'url' ? (
                          <Link
                            href={`/analytics/${item.slug}`}
                            className="text-black font-medium hover:underline flex items-center gap-2"
                          >
                            <span className="text-gray-400">/</span>
                            {item.slug}
                          </Link>
                        ) : (
                          <a
                            href={getItemLink(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black font-medium hover:underline flex items-center gap-2"
                          >
                            <span className="text-gray-400">/{item.type === 'image' ? 'i' : 'f'}/</span>
                            {item.slug}
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.type === 'url' ? (
                          <a
                            href={(item as UrlData).originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-black text-sm truncate block max-w-xs"
                            title={(item as UrlData).originalUrl}
                          >
                            {truncateText((item as UrlData).originalUrl)}
                          </a>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-sm truncate max-w-xs" title={(item as FileData).originalName}>
                              {truncateText((item as FileData).originalName, 40)}
                            </span>
                            <span className="text-gray-400 text-xs">
                              ({formatFileSize((item as FileData).size)})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {item.type === 'url' 
                              ? (item as UrlData).clicks.toLocaleString() 
                              : (item as FileData).views.toLocaleString()}
                          </span>
                          {((item.type === 'url' ? (item as UrlData).clicks : (item as FileData).views) > 0) && (
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.type === 'url' ? 'bg-blue-500' : item.type === 'image' ? 'bg-purple-500' : 'bg-gray-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    ((item.type === 'url' ? (item as UrlData).clicks : (item as FileData).views) / 
                                    Math.max(...allItems.map(i => i.type === 'url' ? (i as UrlData).clicks : (i as FileData).views))) * 100, 
                                    100
                                  )}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyToClipboard(item)}
                            className="p-2 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-colors"
                            title="Copy link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <Link
                            href={item.type === 'url' ? `/analytics/${item.slug}` : `/file-analytics/${item.slug}`}
                            className="p-2 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-colors"
                            title="View analytics"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </Link>
                          <a
                            href={getItemLink(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-colors"
                            title="Open link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Results count */}
        {filteredItems.length > 0 && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredItems.length} of {allItems.length} items
          </p>
        )}
      </main>
    </div>
  );
}

