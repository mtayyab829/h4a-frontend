'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface AnalyticsData {
  slug: string;
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
  clicks: number;
  analytics: {
    referrers: Record<string, number>;
    browsers: Record<string, number>;
    browserVersions: Record<string, number>;
    devices: Record<string, number>;
    deviceModels: Record<string, number>;
    os: Record<string, number>;
    osVersions: Record<string, number>;
    countries: Record<string, number>;
    regions: Record<string, number>;
    cities: Record<string, number>;
    languages: Record<string, number>;
    timezones: Record<string, number>;
    clicksByDate: Record<string, number>;
    clicksByHour: Record<string, number>;
    clicksByDayOfWeek: Record<string, number>;
    screenResolutions: Record<string, number>;
    utmSources: Record<string, number>;
    utmMediums: Record<string, number>;
    utmCampaigns: Record<string, number>;
    deviceTypes: { mobile: number; tablet: number; desktop: number };
    platforms?: Record<string, number>;
    inAppBrowsers?: Record<string, number>;
  };
}

const COLORS = ['#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
const CHART_COLORS = ['#000000', '#1f2937', '#374151', '#4b5563', '#6b7280'];

export default function AnalyticsPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'geo' | 'tech' | 'sources' | 'campaigns'>('overview');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/analytics/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Link not found');
          }
          throw new Error('Failed to fetch analytics');
        }
        
        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchAnalytics();
    }
  }, [slug]);

  // Transform data for charts
  const getClicksByDateData = () => {
    if (!data?.analytics?.clicksByDate) return [];
    return Object.entries(data.analytics.clicksByDate)
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  };

  const getClicksByHourData = () => {
    if (!data?.analytics?.clicksByHour) return [];
    return Object.entries(data.analytics.clicksByHour)
      .map(([hour, clicks]) => ({ hour: `${hour}:00`, clicks }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  };

  const getDeviceTypesData = () => {
    if (!data?.analytics?.deviceTypes) return [];
    const { mobile, tablet, desktop } = data.analytics.deviceTypes;
    return [
      { name: 'Desktop', value: desktop || 0 },
      { name: 'Mobile', value: mobile || 0 },
      { name: 'Tablet', value: tablet || 0 },
    ].filter(d => d.value > 0);
  };

  const getTopItems = (obj: Record<string, number> | undefined, limit = 5) => {
    if (!obj) return [];
    return Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  };

  const getDayOfWeekData = () => {
    if (!data?.analytics?.clicksByDayOfWeek) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, index) => ({
      day,
      clicks: data.analytics.clicksByDayOfWeek[index.toString()] || 0,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
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
          <Link href="/dashboard" className="text-black underline hover:no-underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-2 inline-block">
                ← Back to Home
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-500 mt-1 text-sm truncate max-w-md">
                {data.shortUrl}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-black">{data.clicks.toLocaleString()}</p>
              <p className="text-gray-500 text-sm">Total Clicks</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'geo', label: 'Geography' },
              { id: 'tech', label: 'Technology' },
              { id: 'sources', label: 'Sources' },
              { id: 'campaigns', label: 'Campaigns' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Clicks"
                value={data.clicks}
                icon="📊"
              />
              <StatCard
                title="Countries"
                value={Object.keys(data.analytics.countries || {}).length}
                icon="🌍"
              />
              <StatCard
                title="Unique Browsers"
                value={Object.keys(data.analytics.browsers || {}).length}
                icon="🌐"
              />
              <StatCard
                title="Referrers"
                value={Object.keys(data.analytics.referrers || {}).length}
                icon="🔗"
              />
            </div>

            {/* Clicks Over Time */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Clicks Over Time</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getClicksByDateData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#000" 
                      strokeWidth={2}
                      dot={{ fill: '#000', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#000' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Device Types & Hours */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Types</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getDeviceTypesData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getDeviceTypesData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Clicks by Day of Week</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getDayOfWeekData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="#000" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'geo' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <DataTable title="Top Countries" data={getTopItems(data.analytics.countries, 10)} icon="🌍" />
              <DataTable title="Top Regions" data={getTopItems(data.analytics.regions, 10)} icon="📍" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <DataTable title="Top Cities" data={getTopItems(data.analytics.cities, 10)} icon="🏙️" />
              <DataTable title="Timezones" data={getTopItems(data.analytics.timezones, 10)} icon="🕐" />
            </div>
          </div>
        )}

        {activeTab === 'tech' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <DataTable title="Browsers" data={getTopItems(data.analytics.browsers, 10)} icon="🌐" />
              <DataTable title="Operating Systems" data={getTopItems(data.analytics.os, 10)} icon="💻" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <DataTable title="Devices" data={getTopItems(data.analytics.devices, 10)} icon="📱" />
              <DataTable title="Screen Resolutions" data={getTopItems(data.analytics.screenResolutions, 10)} icon="🖥️" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <DataTable title="Languages" data={getTopItems(data.analytics.languages, 10)} icon="🗣️" />
              <DataTable title="Device Models" data={getTopItems(data.analytics.deviceModels, 10)} icon="📲" />
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 Platforms</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getTopItems(data.analytics.platforms, 8)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getTopItems(data.analytics.platforms, 8).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <DataTable title="Platforms" data={getTopItems(data.analytics.platforms, 10)} icon="📲" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <DataTable title="In-App Browsers" data={getTopItems(data.analytics.inAppBrowsers, 10)} icon="📦" />
              <DataTable title="Top Referrers" data={getTopItems(data.analytics.referrers, 10)} icon="🔗" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Referrers</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getTopItems(data.analytics.referrers, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#000" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {Object.keys(data.analytics.utmSources || {}).length === 0 &&
             Object.keys(data.analytics.utmMediums || {}).length === 0 &&
             Object.keys(data.analytics.utmCampaigns || {}).length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Campaign Data Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Add UTM parameters to your short links to track campaign performance.
                  <br />
                  Example: <code className="bg-gray-100 px-2 py-1 rounded text-sm">?utm_source=twitter&utm_medium=social</code>
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-6">
                  <DataTable title="UTM Sources" data={getTopItems(data.analytics.utmSources, 10)} icon="📡" />
                  <DataTable title="UTM Mediums" data={getTopItems(data.analytics.utmMediums, 10)} icon="📺" />
                  <DataTable title="UTM Campaigns" data={getTopItems(data.analytics.utmCampaigns, 10)} icon="🎯" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Link Info */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Link Information</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Short URL</p>
              <a href={data.shortUrl} target="_blank" rel="noopener noreferrer" className="text-black font-medium hover:underline">
                {data.shortUrl}
              </a>
            </div>
            <div>
              <p className="text-gray-500">Original URL</p>
              <a href={data.originalUrl} target="_blank" rel="noopener noreferrer" className="text-black font-medium hover:underline truncate block max-w-full">
                {data.originalUrl}
              </a>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="text-gray-900">{new Date(data.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            <div>
              <p className="text-gray-500">Analytics URL</p>
              <p className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                /analytics/{slug}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// Data Table Component
function DataTable({ 
  title, 
  data, 
  icon,
  showAll = false 
}: { 
  title: string; 
  data: { name: string; value: number }[];
  icon: string;
  showAll?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span>{icon}</span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No data available</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-900 truncate">{item.name || 'Unknown'}</span>
                  <span className="text-sm font-medium text-gray-600 ml-2">
                    {item.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-black rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

