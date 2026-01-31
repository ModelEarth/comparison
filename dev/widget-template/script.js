// Configuration
const CONFIG = {
    dataRepo: 'https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019/',
    // Use a more reliable CORS proxy that doesn't require activation
    corsProxies: [
        'https://api.allorigins.win/raw?url=',  // Primary - no activation needed
        'https://corsproxy.io/?',                // Backup option
        'https://cors-anywhere.herokuapp.com/'   // Last resort
    ],
    countries: { 'US': 'United States', 'IN': 'India', 'RU': 'Russia' },
    flows: ['domestic', 'exports', 'imports'],
    environmentalFactors: ['air', 'water', 'energy', 'land', 'materials', 'employment'],
    requestTimeout: 10000 // ms
};

// Factor groupings with comprehensive keyword mapping (from Antariksh + Loren)
const FACTOR_GROUPINGS = {
    air: {
        title: '🌫️ Air Emissions & Climate Impact',
        description: 'Greenhouse gas emissions, air pollutants, and climate impacts',
        keywords: ['air', 'emissions to air', 'ghg', 'co2', 'ch4', 'nox', 'so2', 'pm']
    },
    employment: {
        title: '👥 Employment & Social Impact', 
        description: 'Job creation, labor intensity, and social impacts',
        keywords: ['employment', 'labour', 'labor', 'jobs', 'workers', 'hours']
    },
    energy: {
        title: '⚡ Energy & Resource Intensity',
        description: 'Energy consumption patterns and resource integration',
        keywords: ['energy', 'energy use', 'electricity', 'gas', 'oil', 'coal']
    },
    water: {
        title: '💧 Water Usage & Sustainability',
        description: 'Water consumption, withdrawal, and sustainability metrics',
        keywords: ['water', 'water consumption', 'water use', 'water withdrawal']
    },
    land: {
        title: '🌱 Land Use & Biodiversity',
        description: 'Land occupation, biodiversity impacts, and soil quality',
        keywords: ['land', 'land use', 'land occupation', 'habitat']
    },
    materials: {
        title: '🏗️ Materials & Circular Economy',
        description: 'Material flows, extraction, and circular economy indicators',
        keywords: ['materials', 'material use', 'resources', 'minerals', 'metals', 'ores']
    }
};

// Global state with better structure
let state = {
    selectedCountries: ['US', 'IN', 'RU'],
    selectedFactor: 'air', // Default to air
    industryData: {},
    factorData: {},
    factorMapping: {}, // Maps factor_id -> environmental group
    tradeData: {}, // Maps country -> flow -> data
    tradeLookup: {}, // Fast lookup: country -> flow -> trade_id -> trade object
    charts: {},
    loadingErrors: [],
    dataLoadingComplete: false,
    cacheTimestamp: null
};

// Utility: Parse CSV with timeout and better error handling
async function fetchWithTimeout(url, timeout = CONFIG.requestTimeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    console.log(`📥 Fetching: ${url}`);
    
    try {
        // GitHub needs specific headers to avoid 400 errors
        const headers = {
            'Accept': 'application/vnd.github.v3.raw, text/plain, */*',
            'Cache-Control': 'no-cache',
            'User-Agent': 'ModelEarth-Dashboard/1.0'
        };
        
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: headers,
            mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '(no response body)');
            console.error(`❌ Fetch failed: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`❌ Fetch error for ${url}:`, error.message);
        throw error;
    }
}

// Utility: Try multiple CORS proxies
async function fetchWithCORSFallback(url, timeout = CONFIG.requestTimeout) {
    console.log(`📥 Trying direct fetch: ${url}`);
    
    try {
        return await fetchWithTimeout(url, timeout);
    } catch (directError) {
        console.warn(`Direct fetch failed, trying CORS proxies...`);
        
        for (let i = 0; i < CONFIG.corsProxies.length; i++) {
            const proxyUrl = CONFIG.corsProxies[i] + encodeURIComponent(url);
            console.log(`📥 Trying CORS proxy ${i + 1}: ${CONFIG.corsProxies[i]}`);
            
            try {
                return await fetchWithTimeout(proxyUrl, timeout);
            } catch (proxyError) {
                console.warn(`Proxy ${i + 1} failed (${proxyError.message}), trying next...`);
                if (i === CONFIG.corsProxies.length - 1) {
                    throw new Error(`All fetch methods failed. Last error: ${proxyError.message}`);
                }
            }
        }
    }
}

// Utility: Normalize CSV row field names
function normalizeCSVRow(row, mappings = {}) {
    const normalized = { ...row };
    Object.entries(mappings).forEach(([oldField, newField]) => {
        if (normalized[oldField] && !normalized[newField]) {
            normalized[newField] = normalized[oldField];
        }
    });
    return normalized;
}

// Utility: Format numbers for display
function formatNumber(num) {
    if (num === 0 || isNaN(num)) return '0';
    const absNum = Math.abs(num);
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Initialize the dashboard
async function initDashboard() {
    try {
        console.log('🚀 Initializing dashboard...');
        updateDebug('Loading reference data...');
        
        // Load reference data
        await loadReferenceData();
        updateDebug('Reference data loaded ✓');
        
        // Debug: Show loaded reference data
        console.log('📊 Reference Data Summary:');
        console.log(`   Industries: ${Object.keys(state.industryData).length}`);
        console.log(`   Factors: ${Object.keys(state.factorData).length}`);
        console.log(`   Factor Mappings: ${Object.keys(state.factorMapping).length}`);
        console.table(state.factorMapping);
        
        // Load country data
        updateDebug('Loading country trade data...');
        await loadCountryData();
        updateDebug('Country data loaded ✓');
        
        // Debug: Show loaded country data
        console.log('🌍 Country Data Summary:');
        Object.entries(state.tradeData).forEach(([country, flows]) => {
            console.log(`${country}:`);
            Object.entries(flows).forEach(([flow, data]) => {
                console.log(`  ${flow}: ${data.trade?.length || 0} trades, ${data.tradeFactor?.length || 0} factors`);
                if (data.tradeFactor && data.tradeFactor.length > 0) {
                    console.log(`    Sample trade_factor row:`, data.tradeFactor[0]);
                }
            });
        });
        
        // Initialize map
        updateDebug('Initializing map...');
        initMap();
        updateDebug('Map initialized ✓');
        
        // Set default factor
        if (state.selectedFactor === '') {
            state.selectedFactor = CONFIG.environmentalFactors[0];
        }
        
        console.log(`Selected factor: ${state.selectedFactor}`);
        
        // Test calculation for first country
        const testCountry = state.selectedCountries[0];
        if (testCountry) {
            const testImpact = calculateCountryImpact(testCountry);
            console.log(`Test impact for ${testCountry}: ${testImpact}`);
        }
        
        // Render initial visualizations
        updateDebug('Rendering visualizations...');
        renderVisualizations();
        updateDebug('Dashboard ready! ✓');
        
        state.dataLoadingComplete = true;
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        updateDebug(`Error: ${error.message}`, true);
        state.loadingErrors.push(error.message);
    }
}

// Load reference data (industry.csv, factor.csv) with robust error handling
async function loadReferenceData() {
    try {
        // First, let's verify the repo is accessible
        updateDebug('Verifying data source...');
        
        // Load industry data
        try {
            const industryUrl = CONFIG.dataRepo + 'industry.csv';
            updateDebug(`Loading industry data from: ${industryUrl}`);
            
            const industryResponse = await fetchWithCORSFallback(industryUrl);
            
            const industryText = await industryResponse.text();
            
            if (!industryText || industryText.length === 0) {
                throw new Error('Industry CSV is empty');
            }
            
            // Check if we got HTML error page instead of CSV
            if (industryText.includes('<!DOCTYPE') || industryText.includes('<html')) {
                throw new Error('Received HTML instead of CSV - check repository path');
            }
            
            const industryParsed = Papa.parse(industryText, { 
                header: true, 
                skipEmptyLines: true,
                dynamicTyping: false,
                error: (err) => console.error('PapaParse error:', err)
            });
            
            if (!industryParsed.data || industryParsed.data.length === 0) {
                throw new Error('No industry data parsed');
            }
            
            state.industryData = {};
            industryParsed.data.forEach(row => {
                const normalizedRow = normalizeCSVRow(row, {
                    'id': 'industry_id',
                    'label': 'name',
                    'industry_name': 'name',
                    'cat': 'category'
                });
                
                const id = normalizedRow.industry_id || normalizedRow.id;
                if (id && id.trim()) {
                    state.industryData[id.trim()] = {
                        name: normalizedRow.name || normalizedRow.label || id,
                        category: normalizedRow.category || 'OTHER'
                    };
                }
            });
            console.log(`✓ Loaded ${Object.keys(state.industryData).length} industries`);
            updateDebug(`✓ Industry data loaded (${Object.keys(state.industryData).length} records)`);
        } catch (error) {
            console.warn('⚠️ Warning loading industry data:', error.message);
            state.loadingErrors.push(`Industry data: ${error.message}`);
            updateDebug(`⚠️ Using fallback industry data: ${error.message}`);
            // Use fallback industry data
            state.industryData = getDefaultIndustryData();
        }
        
        // Load factor data
        try {
            const factorUrl = CONFIG.dataRepo + 'factor.csv';
            updateDebug(`Loading factor data from: ${factorUrl}`);
            
            const factorResponse = await fetchWithCORSFallback(factorUrl);
            
            const factorText = await factorResponse.text();
            
            if (!factorText || factorText.length === 0) {
                throw new Error('Factor CSV is empty');
            }
            
            // Check if we got HTML error page instead of CSV
            if (factorText.includes('<!DOCTYPE') || factorText.includes('<html')) {
                throw new Error('Received HTML instead of CSV - check repository path');
            }
            
            const factorParsed = Papa.parse(factorText, { 
                header: true, 
                skipEmptyLines: true,
                dynamicTyping: false,
                error: (err) => console.error('PapaParse error:', err)
            });
            
            if (!factorParsed.data || factorParsed.data.length === 0) {
                throw new Error('No factor data parsed');
            }
            
            state.factorData = {};
            state.factorMapping = {};
            
            factorParsed.data.forEach(row => {
                const normalizedRow = normalizeCSVRow(row, {
                    'id': 'factor_id',
                    'ext': 'extension',
                    'units': 'unit'
                });
                
                const id = normalizedRow.factor_id || normalizedRow.id;
                if (id && id.trim()) {
                    const idTrim = id.trim();
                    state.factorData[idTrim] = {
                        unit: normalizedRow.unit || '',
                        stressor: normalizedRow.stressor || normalizedRow.name || '',
                        extension: normalizedRow.extension || ''
                    };
                    
                    // Map factor to environmental group
                    const extension = (normalizedRow.extension || normalizedRow.stressor || '').toLowerCase();
                    const group = mapFactorGroup(extension);
                    state.factorMapping[idTrim] = group;
                    
                    // Debug first few mappings
                    if (Object.keys(state.factorMapping).length <= 5) {
                        console.log(`Factor mapping: ${idTrim} -> "${extension}" -> ${group}`);
                    }
                }
            });
            console.log(`✓ Loaded ${Object.keys(state.factorData).length} factors`);
            console.log(`Factor mapping sample:`, Object.fromEntries(Object.entries(state.factorMapping).slice(0, 10)));
            updateDebug(`✓ Factor data loaded (${Object.keys(state.factorData).length} records)`);
        } catch (error) {
            console.warn('⚠️ Warning loading factor data:', error.message);
            state.loadingErrors.push(`Factor data: ${error.message}`);
            updateDebug(`⚠️ Using fallback factor data: ${error.message}`);
            // Use fallback factor data
            const fallbackData = getDefaultFactorData();
            state.factorData = fallbackData.factorData;
            state.factorMapping = fallbackData.factorMapping;
        }
        
    } catch (error) {
        console.error('Error in loadReferenceData:', error);
        throw error;
    }
}

// Get fallback industry data
function getDefaultIndustryData() {
    return {
        'PADDY': { name: 'Paddy rice', category: 'AGRIC' },
        'WHEAT': { name: 'Wheat', category: 'AGRIC' },
        'CEREA': { name: 'Cereal grains nec', category: 'AGRIC' },
        'MEATA': { name: 'Meat animals nec', category: 'AGRIC' },
        'COALM': { name: 'Coal mining', category: 'ENERG' },
        'CHEMI': { name: 'Chemicals', category: 'MANUF' },
        'MEAT9': { name: 'Meat products nec', category: 'MANUF' },
        'TEXTI': { name: 'Textiles', category: 'MANUF' }
    };
}

// Get fallback factor data
function getDefaultFactorData() {
    return {
        factorData: {
            'CO2': { unit: 'kt', stressor: 'CO2', extension: 'air' },
            'CH4': { unit: 'kt', stressor: 'CH4', extension: 'air' },
            'WATER': { unit: 'ML', stressor: 'Water', extension: 'water' },
            'ENERGY': { unit: 'TJ', stressor: 'Energy', extension: 'energy' },
            'EMP': { unit: 'jobs', stressor: 'Employment', extension: 'employment' }
        },
        factorMapping: {
            'CO2': 'air',
            'CH4': 'air',
            'WATER': 'water',
            'ENERGY': 'energy',
            'EMP': 'employment'
        }
    };
}

// Map factor extension to environmental groups with comprehensive keywords
function mapFactorGroup(extension) {
    if (!extension) return 'other';
    
    const extLower = extension.toLowerCase();
    
    for (const [group, config] of Object.entries(FACTOR_GROUPINGS)) {
        for (const keyword of config.keywords) {
            if (extLower.includes(keyword.toLowerCase())) {
                return group;
            }
        }
    }
    
    return 'other';
}

// Load country-specific trade data with improved error handling
async function loadCountryData() {
    for (const country of state.selectedCountries) {
        state.tradeData[country] = {
            domestic: { trade: [], tradeFactor: [] },
            exports: { trade: [], tradeFactor: [] },
            imports: { trade: [], tradeFactor: [] }
        };
        state.tradeLookup[country] = {
            domestic: {},
            exports: {},
            imports: {}
        };
        
        for (const flow of CONFIG.flows) {
            try {
                // Try UPPERCASE first (standard format), then lowercase as fallback
                const countryPathUpper = country.toUpperCase();
                const countryPathLower = country.toLowerCase();
                const tradeUrlUpper = CONFIG.dataRepo + `${countryPathUpper}/${flow}/trade.csv`;
                const tradeUrlLower = CONFIG.dataRepo + `${countryPathLower}/${flow}/trade.csv`;
                const tradeFactorUrlUpper = CONFIG.dataRepo + `${countryPathUpper}/${flow}/trade_factor.csv`;
                const tradeFactorUrlLower = CONFIG.dataRepo + `${countryPathLower}/${flow}/trade_factor.csv`;

                updateDebug(`Loading ${country} ${flow} data...`);

                // Load trade data
                try {
                    let tradeUrl = tradeUrlUpper;
                    console.log(`📥 Trying: ${tradeUrl}`);
                    let tradeResponse;
                    
                    try {
                        tradeResponse = await fetchWithCORSFallback(tradeUrl);
                    } catch (error1) {
                        // Try lowercase if uppercase fails
                        console.warn(`Uppercase path failed, trying lowercase...`);
                        tradeUrl = tradeUrlLower;
                        console.log(`📥 Trying: ${tradeUrl}`);
                        tradeResponse = await fetchWithCORSFallback(tradeUrl);
                    }
                    
                    const tradeText = await tradeResponse.text();
                    
                    // Check for HTML error response
                    if (tradeText.includes('<!DOCTYPE') || tradeText.includes('<html')) {
                        throw new Error('Received HTML (404 or 400 error page)');
                    }
                    
                    const tradeParsed = Papa.parse(tradeText, { 
                        header: true, 
                        skipEmptyLines: true,
                        dynamicTyping: false,
                        error: (err) => console.error('PapaParse error:', err)
                    });
                    
                    if (tradeParsed.data && tradeParsed.data.length > 0) {
                        state.tradeData[country][flow].trade = tradeParsed.data
                            .map(r => normalizeCSVRow(r, { 'trade_id': 'id' }))
                            .filter(r => r && (r.id || r.trade_id));
                        
                        // Build lookup for fast access
                        state.tradeData[country][flow].trade.forEach(t => {
                            const tradeId = t.id || t.trade_id;
                            state.tradeLookup[country][flow][tradeId] = t;
                        });
                        
                        updateDebug(`✓ ${country} ${flow} trade: ${state.tradeData[country][flow].trade.length} records`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not load ${country} ${flow} trade.csv:`, error.message);
                    state.loadingErrors.push(`${country} ${flow} trade: ${error.message}`);
                    updateDebug(`⚠️ ${country} ${flow} trade failed: ${error.message}`);
                }

                // Load trade_factor data
                try {
                    let tradeFactorUrl = tradeFactorUrlUpper;
                    console.log(`📥 Trying: ${tradeFactorUrl}`);
                    let tradeFactorResponse;
                    
                    try {
                        tradeFactorResponse = await fetchWithCORSFallback(tradeFactorUrl);
                    } catch (error1) {
                        // Try lowercase if uppercase fails
                        console.warn(`Uppercase path failed, trying lowercase...`);
                        tradeFactorUrl = tradeFactorUrlLower;
                        console.log(`📥 Trying: ${tradeFactorUrl}`);
                        tradeFactorResponse = await fetchWithCORSFallback(tradeFactorUrl);
                    }
                    
                    const tradeFactorText = await tradeFactorResponse.text();
                    
                    // Check for HTML error response
                    if (tradeFactorText.includes('<!DOCTYPE') || tradeFactorText.includes('<html')) {
                        throw new Error('Received HTML (404 or 400 error page)');
                    }
                    
                    const tradeFactorParsed = Papa.parse(tradeFactorText, { 
                        header: true, 
                        skipEmptyLines: true,
                        dynamicTyping: false,
                        error: (err) => console.error('PapaParse error:', err)
                    });
                    
                    if (tradeFactorParsed.data && tradeFactorParsed.data.length > 0) {
                        state.tradeData[country][flow].tradeFactor = tradeFactorParsed.data
                            .map(r => normalizeCSVRow(r, { 
                                'factor': 'factor_id',
                                'trade': 'trade_id'
                            }))
                            .filter(r => r && (r.trade_id || r.id));
                        
                        updateDebug(`✓ ${country} ${flow} trade_factor: ${state.tradeData[country][flow].tradeFactor.length} records`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not load ${country} ${flow} trade_factor.csv:`, error.message);
                    state.loadingErrors.push(`${country} ${flow} trade_factor: ${error.message}`);
                    updateDebug(`⚠️ ${country} ${flow} trade_factor failed: ${error.message}`);
                }

                console.log(`✓ Loaded ${country} ${flow} data`);
            } catch (error) {
                console.warn(`⚠️ Error loading ${country} ${flow} data:`, error);
                state.loadingErrors.push(`${country} ${flow}: ${error.message}`);
            }
        }
    }
}

// Calculate total environmental impact for a country (with debugging)
function calculateCountryImpact(country, factorGroup = null) {
    const targetGroup = factorGroup || state.selectedFactor;
    let total = 0;
    let debugInfo = {
        country,
        targetGroup,
        flows: {}
    };
    
    if (!state.tradeData[country]) {
        console.warn(`No trade data for ${country}`);
        return 0;
    }
    
    CONFIG.flows.forEach(flow => {
        const flowData = state.tradeData[country][flow];
        debugInfo.flows[flow] = {
            tradeCount: flowData?.trade?.length || 0,
            factorCount: flowData?.tradeFactor?.length || 0,
            matches: 0,
            sum: 0
        };
        
        if (flowData?.tradeFactor) {
            flowData.tradeFactor.forEach((row, idx) => {
                const factorId = row.factor_id || row.factor;
                const group = state.factorMapping[factorId];
                const value = parseFloat(row.impact_value) || parseFloat(row.coefficient) || 0;
                
                // Debug first few rows
                if (idx < 2) {
                    console.log(`  ${flow} row ${idx}: factorId=${factorId}, group=${group}, value=${value}, match=${!targetGroup || group === targetGroup}`);
                }
                
                if (!targetGroup || group === targetGroup) {
                    const safeValue = Math.max(0, value);
                    total += safeValue;
                    debugInfo.flows[flow].matches++;
                    debugInfo.flows[flow].sum += safeValue;
                }
            });
        }
    });
    
    console.log(`Impact calculation for ${country} (target: ${targetGroup}):`, debugInfo);
    return total;
}

// Initialize Leaflet map with improved interaction
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.warn('Map element not found');
        return;
    }
    
    const map = L.map('map').setView([20, 0], 3);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Country coordinates
    const countryCoords = {
        'US': [37.0902, -95.7129],
        'IN': [20.5937, 78.9629],
        'RU': [61.5240, 105.3188]
    };
    
    // Add markers for each country
    Object.entries(countryCoords).forEach(([code, coords]) => {
        const isSelected = state.selectedCountries.includes(code);
        const marker = L.circleMarker(coords, {
            radius: 15,
            fillColor: isSelected ? '#4CAF50' : '#cccccc',
            color: '#333',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(map);
        
        marker.bindPopup(`<strong>${CONFIG.countries[code]}</strong><br/>${code}`);
        
        // Toggle country on click
        marker.on('click', () => {
            const idx = state.selectedCountries.indexOf(code);
            if (idx > -1) {
                state.selectedCountries.splice(idx, 1);
                marker.setStyle({ fillColor: '#cccccc' });
            } else {
                state.selectedCountries.push(code);
                marker.setStyle({ fillColor: '#4CAF50' });
            }
            updateDebug(`Toggled ${CONFIG.countries[code]}`);
            renderVisualizations();
        });
    });
    
    // Handle window resize for map
    window.addEventListener('resize', () => {
        setTimeout(() => map.invalidateSize(), 100);
    });
}

// Render all visualizations with improved performance
function renderVisualizations() {
    if (state.selectedCountries.length === 0) {
        updateDebug('No countries selected', true);
        return;
    }
    
    try {
        renderSummaryCards();
        renderCountryChart();
        renderTradeFlowChart();
        renderIndustryChart();
        generateInsights();
    } catch (error) {
        console.error('Error rendering visualizations:', error);
        updateDebug(`Render error: ${error.message}`, true);
    }
}

// Render summary cards with dynamic styling
function renderSummaryCards() {
    const container = document.getElementById('summary-cards');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.selectedCountries.forEach(country => {
        const totalImpact = calculateCountryImpact(country);
        
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <h3>${CONFIG.countries[country]}</h3>
            <div class="card-value">${formatNumber(totalImpact)}</div>
            <p class="card-label">Total Impact Units</p>
            <p class="card-factor">${state.selectedFactor ? capitalizeWord(state.selectedFactor) : 'All Factors'}</p>
        `;
        container.appendChild(card);
    });
}

// Calculate impact for a specific flow (optimized)
function calculateFlowImpact(country, flow, factorGroup = null) {
    let total = 0;
    const targetGroup = factorGroup || state.selectedFactor;
    const flowData = state.tradeData[country]?.[flow];
    
    if (flowData?.tradeFactor) {
        flowData.tradeFactor.forEach(row => {
            const factorId = row.factor_id || row.factor;
            const group = state.factorMapping[factorId];
            if (!targetGroup || group === targetGroup) {
                const value = parseFloat(row.impact_value) || parseFloat(row.coefficient) || 0;
                total += Math.max(0, value);
            }
        });
    }
    
    return total;
}

// Render country comparison bar chart with improved styling
function renderCountryChart() {
    const chartDom = document.getElementById('country-chart');
    if (!chartDom) return;
    
    if (!state.charts.country) {
        state.charts.country = echarts.init(chartDom);
    }
    
    const data = state.selectedCountries.map(country => ({
        country: CONFIG.countries[country],
        value: calculateCountryImpact(country)
    })).sort((a, b) => b.value - a.value);
    
    const option = {
        tooltip: { 
            trigger: 'axis',
            formatter: '{b}: {c}'
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.country),
            axisLabel: { interval: 0, rotate: 0 }
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: (val) => formatNumber(val) }
        },
        series: [{
            data: data.map(d => d.value),
            type: 'bar',
            itemStyle: { 
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#4CAF50' },
                    { offset: 1, color: '#2E7D32' }
                ])
            },
            smooth: true
        }],
        grid: { left: '10%', right: '5%', bottom: '10%', top: '5%', containLabel: true },
        animation: true
    };
    
    state.charts.country.setOption(option);
}

// Render trade flow breakdown chart (stacked)
function renderTradeFlowChart() {
    const chartDom = document.getElementById('trade-flow-chart');
    if (!chartDom) return;
    
    if (!state.charts.tradeFlow) {
        state.charts.tradeFlow = echarts.init(chartDom);
    }
    
    // Aggregate flow data by country
    const flowDataByCountry = {};
    state.selectedCountries.forEach(country => {
        flowDataByCountry[country] = {};
        CONFIG.flows.forEach(flow => {
            flowDataByCountry[country][flow] = calculateFlowImpact(country, flow);
        });
    });
    
    const option = {
        tooltip: { 
            trigger: 'axis',
            formatter: '{b}: {c}'
        },
        legend: {
            data: CONFIG.flows.map(f => capitalizeWord(f)),
            bottom: 0
        },
        xAxis: {
            type: 'category',
            data: state.selectedCountries.map(c => CONFIG.countries[c])
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: (val) => formatNumber(val) }
        },
        series: CONFIG.flows.map((flow, idx) => ({
            name: capitalizeWord(flow),
            data: state.selectedCountries.map(c => flowDataByCountry[c][flow]),
            type: 'bar',
            stack: 'total',
            itemStyle: { 
                color: ['#2196F3', '#FF9800', '#9C27B0'][idx % 3]
            }
        })),
        grid: { left: '10%', right: '5%', bottom: '15%', top: '5%', containLabel: true },
        animation: true
    };
    
    state.charts.tradeFlow.setOption(option);
}

// Render industry breakdown chart with optimized top 10
function renderIndustryChart() {
    const chartDom = document.getElementById('industry-chart');
    if (!chartDom) return;
    
    if (!state.charts.industry) {
        state.charts.industry = echarts.init(chartDom);
    }
    
    const industryImpact = {};
    
    // Aggregate industry impact across all selected countries and flows
    state.selectedCountries.forEach(country => {
        CONFIG.flows.forEach(flow => {
            const flowData = state.tradeData[country]?.[flow];
            if (flowData?.trade && flowData?.tradeFactor) {
                flowData.tradeFactor.forEach(tfRow => {
                    const factorId = tfRow.factor_id || tfRow.factor;
                    const group = state.factorMapping[factorId];
                    
                    if (!state.selectedFactor || group === state.selectedFactor) {
                        const tradeId = tfRow.trade_id || tfRow.id;
                        const tradeRow = state.tradeLookup[country]?.[flow]?.[tradeId];
                        
                        if (tradeRow) {
                            const industryId = tradeRow.industry_id;
                            const industryName = state.industryData[industryId]?.name || industryId;
                            const value = parseFloat(tfRow.impact_value) || parseFloat(tfRow.coefficient) || 0;
                            industryImpact[industryName] = (industryImpact[industryName] || 0) + Math.max(0, value);
                        }
                    }
                });
            }
        });
    });
    
    const sortedIndustries = Object.entries(industryImpact)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const option = {
        tooltip: { 
            trigger: 'axis',
            formatter: '{b}: {c}'
        },
        xAxis: {
            type: 'category',
            data: sortedIndustries.map(d => d[0]),
            axisLabel: { interval: 0, rotate: 45, fontSize: 10 }
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: (val) => formatNumber(val) }
        },
        series: [{
            data: sortedIndustries.map(d => d[1]),
            type: 'bar',
            itemStyle: { 
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#FF9800' },
                    { offset: 1, color: '#E65100' }
                ])
            }
        }],
        grid: { left: '10%', right: '5%', bottom: '25%', top: '5%', containLabel: true },
        animation: true
    };
    
    state.charts.industry.setOption(option);
}

// Generate dynamic insights with richer analysis
function generateInsights() {
    const insights = [];
    
    if (state.selectedCountries.length === 0) {
        insights.push('📍 Select countries from the map to view comparison data');
    } else {
        const selectedCount = state.selectedCountries.length;
        const factorLabel = state.selectedFactor ? capitalizeWord(state.selectedFactor) : 'all environmental factors';
        
        insights.push(`📊 Comparing ${selectedCount} ${selectedCount === 1 ? 'country' : 'countries'} for ${factorLabel}`);
        
        // Find country with highest impact
        const impacts = state.selectedCountries.map(c => ({
            country: CONFIG.countries[c],
            code: c,
            impact: calculateCountryImpact(c)
        }));
        
        if (impacts.length > 0) {
            const highest = impacts.reduce((max, curr) => curr.impact > max.impact ? curr : max);
            const lowest = impacts.reduce((min, curr) => curr.impact < min.impact ? curr : min);
            
            insights.push(`🔝 ${highest.country} leads with ${formatNumber(highest.impact)} impact units`);
            
            if (highest.code !== lowest.code) {
                const ratio = (highest.impact / (lowest.impact || 1)).toFixed(1);
                insights.push(`📈 ${highest.country} has ${ratio}x more impact than ${lowest.country}`);
            }
        }
        
        // Flow analysis
        const flowImpacts = CONFIG.flows.map(flow => ({
            flow: capitalizeWord(flow),
            impact: state.selectedCountries.reduce((sum, c) => sum + calculateFlowImpact(c, flow), 0)
        })).sort((a, b) => b.impact - a.impact);
        
        if (flowImpacts[0].impact > 0) {
            const percentage = ((flowImpacts[0].impact / flowImpacts.reduce((sum, f) => sum + f.impact, 1)) * 100).toFixed(0);
            insights.push(`🌍 ${flowImpacts[0].flow} accounts for ${percentage}% of environmental impact`);
        }
        
        // Industry analysis
        const industryCount = state.selectedCountries.reduce((count, country) => {
            return count + (state.tradeData[country]?.domestic?.trade?.length || 0);
        }, 0);
        
        insights.push(`🏭 Data covers ${industryCount} trade records across all flows`);
    }
    
    // Display insights
    const insightsList = document.getElementById('insights-list');
    if (insightsList) {
        insightsList.innerHTML = insights.map(insight => `<li>${insight}</li>`).join('');
    }
}

// Update debug panel with timestamps and error tracking
function updateDebug(message, isError = false) {
    const debugContent = document.getElementById('debug-content');
    if (!debugContent) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const className = isError ? 'error' : 'success';
    const entry = document.createElement('p');
    entry.className = className;
    entry.textContent = `[${timestamp}] ${message}`;
    
    debugContent.appendChild(entry);
    debugContent.scrollTop = debugContent.scrollHeight;
    
    // Keep debug log size manageable (max 50 lines)
    const lines = debugContent.querySelectorAll('p');
    if (lines.length > 50) {
        lines[0].remove();
    }
}

// Initialize country selector widget
function initCountrySelectorWidget() {
    const countryList = document.getElementById('country-list');
    const clearBtn = document.getElementById('clear-all-countries');
    const toggleBtn = document.getElementById('toggle-country-list');
    const widget = document.querySelector('.country-selector-widget.map-widget');
    
    if (!countryList || !widget) return;
    
    // Country emojis mapping
    const countryEmojis = {
        'US': '🇺🇸',
        'IN': '🇮🇳',
        'RU': '🇷🇺'
    };
    
    // Populate country list
    Object.entries(CONFIG.countries).forEach(([code, name]) => {
        const isSelected = state.selectedCountries.includes(code);
        const item = document.createElement('div');
        item.className = `country-item ${isSelected ? 'selected' : ''}`;
        item.id = `country-item-${code}`;
        item.innerHTML = `
            <div class="country-flag">${countryEmojis[code]}</div>
            <div class="country-name">${name}</div>
            <div class="country-checkbox"></div>
        `;
        
        // Click handler
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = state.selectedCountries.indexOf(code);
            
            if (idx > -1) {
                state.selectedCountries.splice(idx, 1);
                item.classList.remove('selected');
                updateDebug(`❌ Deselected ${name}`);
            } else {
                state.selectedCountries.push(code);
                item.classList.add('selected');
                updateDebug(`✅ Selected ${name}`);
            }
            
            renderVisualizations();
        });
        
        countryList.appendChild(item);
    });
    
    // Toggle list visibility
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            widget.classList.toggle('collapsed');
            toggleBtn.classList.toggle('collapsed');
        });
    }
    
    // Clear all button
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.selectedCountries.length > 0) {
                state.selectedCountries = [];
                document.querySelectorAll('.country-item').forEach(item => {
                    item.classList.remove('selected');
                });
                updateDebug('🗑️ Cleared all selections');
                renderVisualizations();
            }
        });
    }
    
    // Close widget when clicking outside
    document.addEventListener('click', (e) => {
        if (!widget.contains(e.target) && widget.classList.contains('collapsed')) {
            // Don't auto-open when clicked outside
        }
    });
}

// Helper function to capitalize words
function capitalizeWord(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

// Setup event listeners
function setupEventListeners() {
    const factorDropdown = document.getElementById('factor-dropdown');
    if (factorDropdown) {
        factorDropdown.addEventListener('change', (e) => {
            state.selectedFactor = e.target.value || CONFIG.environmentalFactors[0];
            updateDebug(`Factor changed to: ${capitalizeWord(state.selectedFactor)}`);
            renderVisualizations();
        });
    }
    
    // Initialize country selector widget
    initCountrySelectorWidget();
    
    // Handle window resize for charts
    window.addEventListener('resize', () => {
        // Debounce resize events
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            Object.values(state.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 250);
    });
}

// Diagnostic function - run in console to debug
window.debugDashboard = function() {
    console.clear();
    console.log('🔍 DASHBOARD DIAGNOSTIC REPORT');
    console.log('='.repeat(50));
    
    console.log('\n📦 STATE SUMMARY:');
    console.log(`Selected Countries: ${state.selectedCountries.join(', ')}`);
    console.log(`Selected Factor: ${state.selectedFactor}`);
    console.log(`Data Loading Complete: ${state.dataLoadingComplete}`);
    console.log(`Loading Errors: ${state.loadingErrors.length}`);
    if (state.loadingErrors.length > 0) {
        state.loadingErrors.forEach(err => console.warn(`  ⚠️ ${err}`));
    }
    
    console.log('\n🏭 REFERENCE DATA:');
    console.log(`Industries Loaded: ${Object.keys(state.industryData).length}`);
    console.log(`Factors Loaded: ${Object.keys(state.factorData).length}`);
    console.log(`Factor Mappings: ${Object.keys(state.factorMapping).length}`);
    console.log('Sample Factor Mappings:', Object.fromEntries(Object.entries(state.factorMapping).slice(0, 10)));
    
    console.log('\n🌍 COUNTRY DATA:');
    state.selectedCountries.forEach(country => {
        console.log(`\n${country}:`);
        CONFIG.flows.forEach(flow => {
            const flowData = state.tradeData[country]?.[flow];
            if (flowData) {
                console.log(`  ${flow}:`);
                console.log(`    trades: ${flowData.trade?.length || 0}`);
                console.log(`    trade_factors: ${flowData.tradeFactor?.length || 0}`);
                
                if (flowData.tradeFactor && flowData.tradeFactor.length > 0) {
                    const sample = flowData.tradeFactor[0];
                    console.log(`    sample row:`, {
                        factor_id: sample.factor_id,
                        trade_id: sample.trade_id,
                        impact_value: sample.impact_value,
                        coefficient: sample.coefficient
                    });
                }
            }
        });
    });
    
    console.log('\n📊 IMPACT CALCULATIONS:');
    state.selectedCountries.forEach(country => {
        const impact = calculateCountryImpact(country);
        console.log(`${country}: ${formatNumber(impact)} (raw: ${impact})`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Diagnostic complete. Check above for issues.');
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initDashboard();
    
    // Also show diagnostic after a short delay to allow data loading
    setTimeout(() => {
        console.log('\n💡 TIP: Run window.debugDashboard() in console to diagnose issues');
    }, 3000);
});
