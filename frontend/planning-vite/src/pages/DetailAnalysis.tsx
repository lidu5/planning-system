import React from 'react';
import { ArrowLeft, ExternalLink, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POWERBI_LINK = "https://app.powerbi.com/view?r=eyJrIjoiNDJjNDhiNTYtZWNjNS00YTRmLWFkMTYtYWQ3ODQyMmI0NzA2IiwidCI6ImRiNjE0MTI3LWVhZDYtNGYxMC1iNTM2LTlhYjcwMWQ5NGIyNCIsImMiOjh9";

export default function DetailAnalysis() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/minister-view');
  };

  const openPowerBI = () => {
    window.open(POWERBI_LINK, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="inline-flex items-center px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Minister View
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Detail Analysis</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-green-800 to-green-900 px-8 py-12">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-white mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-4">
                Detailed Analytics Dashboard
              </h2>
              <p className="text-green-100 text-lg max-w-2xl mx-auto">
                Access comprehensive agricultural performance analytics and insights through our PowerBI dashboard
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="text-center space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  Advanced Analytics Available
                </h3>
                <p className="text-green-700 mb-6">
                  For more detailed analytics data and comprehensive insights, please use the link below to access our PowerBI dashboard.
                </p>
                
                <button
                  onClick={openPowerBI}
                  className="inline-flex items-center px-6 py-3 bg-green-700 hover:bg-green-800 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Open PowerBI Dashboard
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Real-time Data</h4>
                  <p className="text-gray-600 text-sm">
                    Access up-to-date agricultural performance metrics
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Interactive Reports</h4>
                  <p className="text-gray-600 text-sm">
                    Drill down into specific sectors and indicators
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Custom Analytics</h4>
                  <p className="text-gray-600 text-sm">
                    Generate custom reports and insights
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
