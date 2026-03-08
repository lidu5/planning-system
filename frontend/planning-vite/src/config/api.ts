const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;
  
  // Map based on how user accessed the site
  if (hostname === 'pms.moa.gov.et') {
    return 'http://pms.moa.gov.et';  // Domain access (port 80)
  }
  if (hostname === '10.10.20.233') {
    return 'http://10.10.20.233:8000';  // LAN access
  }
  if (hostname === '196.188.248.104') {
    return 'http://196.188.248.104:8000';  // Public access
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';  // Local development
  }
  
  // Default to domain
  return 'http://pms.moa.gov.et';
};

export const API_BASE_URL = getApiBaseUrl();