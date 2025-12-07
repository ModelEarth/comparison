// ALL 14 COUNTRIES VERIFIED IN DATASET
const COUNTRIES = {
    US: { name: 'United States', coords: [37.09, -95.71], flag: '🇺🇸', color: '#4A90E2', region: 'Americas' },
    CA: { name: 'Canada', coords: [56.13, -106.35], flag: '🇨🇦', color: '#E74C3C', region: 'Americas' },
    BR: { name: 'Brazil', coords: [-14.24, -51.93], flag: '🇧🇷', color: '#27AE60', region: 'Americas' },
    
    GB: { name: 'United Kingdom', coords: [55.38, -3.44], flag: '🇬🇧', color: '#3498DB', region: 'Europe' },
    DE: { name: 'Germany', coords: [51.17, 10.45], flag: '🇩🇪', color: '#9B59B6', region: 'Europe' },
    FR: { name: 'France', coords: [46.23, 2.21], flag: '🇫🇷', color: '#E67E22', region: 'Europe' },
    IT: { name: 'Italy', coords: [41.87, 12.57], flag: '🇮🇹', color: '#1ABC9C', region: 'Europe' },
    RU: { name: 'Russia', coords: [61.52, 105.31], flag: '🇷🇺', color: '#C0392B', region: 'Europe' },
    
    CN: { name: 'China', coords: [35.86, 104.20], flag: '🇨🇳', color: '#E74C3C', region: 'Asia' },
    JP: { name: 'Japan', coords: [36.20, 138.25], flag: '🇯🇵', color: '#F39C12', region: 'Asia' },
    IN: { name: 'India', coords: [20.59, 78.96], flag: '🇮🇳', color: '#16A085', region: 'Asia' },
    KR: { name: 'South Korea', coords: [35.91, 127.77], flag: '🇰🇷', color: '#8E44AD', region: 'Asia' },
    
    AU: { name: 'Australia', coords: [-25.27, 133.78], flag: '🇦🇺', color: '#D35400', region: 'Oceania' },
    
    WM: { name: 'Middle East', coords: [29.31, 47.48], flag: '🌍', color: '#7F8C8D', region: 'Middle East' }
};

const DATA_BASE_PATH = 'https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019';
const TRADE_FLOWS = ['domestic', 'exports', 'imports'];

let selectedCountries = new Set(['US']);
let industryLookup = {};
let factorLookup = {};
let tradeData = {};
let tradeLookup = {};
let currentFactorGroup = 'air';
let dataLoadingComplete = false;
let loadingErrors = [];

let map;
let markers = {};
let charts = {};

const FACTOR_GROUP_MAPPING = {
    'air': ['Air', 'Emissions to air', 'GHG emissions'],
    'water': ['Water', 'Emissions to water', 'Water use'],
    'energy': ['Energy', 'Energy use'],
    'land': ['Land', 'Land use'],
    'materials': ['Materials', 'Material use', 'Resources'],
    'employment': ['Employment', 'Labour']
};

const ALL_FACTOR_GROUPS = ['air', 'water', 'energy', 'land', 'materials', 'employment'];

function getFactorGroup(extension) {
    if (!extension) return 'other';
    const extLower = extension.toLowerCase();
    
    for (const [group, keywords] of Object.entries(FACTOR_GROUP_MAPPING)) {
        for (const keyword of keywords) {
            if (extLower.includes(keyword.toLowerCase())) {
                return group;
            }
        }
    }
    return 'other';
}

function debugLog(message, isError = false) {
    const debugDiv = document.getElementById('debug-log');
    const timestamp = new Date().toLocaleTimeString();
    const className = isError ? 'error' : 'success';
    debugDiv.innerHTML += `<div class="log-entry ${className}">[${timestamp}] ${message}</div>`;
    debugDiv.scrollTop = debugDiv.scrollHeight;
    console.log(message);
}

function showStatus(message, isError = false) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isError ? 'status-message error' : 'status-message';
        statusEl.style.display = 'block';
        
        if (!isError && dataLoadingComplete) {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }
    debugLog(message, isError);
}

function formatNumber(num) {
    if (num === 0 || isNaN(num)) return '0';
    const absNum = Math.abs(num);
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function getCountryFlag(code) {
    // Return HTML for flag icon in charts
    if (code === 'WM') {
        return '🌍'; // Globe emoji for Middle East
    }
    return `{flag|}{name|${COUNTRIES[code]?.name || code}}`;
}

function getCountryFlagHTML(code) {
    // Return actual HTML with flag for rich text in charts
    if (code === 'WM') {
        return `🌍 ${COUNTRIES[code]?.name || code}`;
    }
    // Using Unicode combining characters for flag representation in charts
    const countryName = COUNTRIES[code]?.name || code;
    return `{flag|}{a|${countryName}}`;
}

function initMap() {
    debugLog('Initializing map...');
    map = L.map('map').setView([30, 20], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    Object.entries(COUNTRIES).forEach(([code, country]) => {
        const marker = L.marker(country.coords).addTo(map);
        marker.bindPopup(`<b>${country.flag} ${country.name}</b><br>Click to select`);
        marker.on('click', () => toggleCountry(code));
        markers[code] = marker;
    });
    debugLog('Map initialized successfully');
}

function toggleCountry(code) {
    if (!COUNTRIES[code]) {
        debugLog(`Country ${code} not found in dataset`, true);
        return;
    }
    
    if (selectedCountries.has(code)) {
        selectedCountries.delete(code);
        debugLog(`Deselected ${COUNTRIES[code].name}`);
    } else {
        selectedCountries.add(code);
        debugLog(`Selected ${COUNTRIES[code].name}`);
    }
    updateCountryButtonStates();
    updateUI();
}

function selectAllCountries() {
    Object.keys(COUNTRIES).forEach(code => selectedCountries.add(code));
    debugLog('Selected all countries');
    updateCountryButtonStates();
    updateUI();
}

function clearAllCountries() {
    selectedCountries.clear();
    debugLog('Cleared all country selections');
    updateCountryButtonStates();
    updateUI();
}

function toggleRegion(regionId) {
    const regionDiv = document.getElementById(`region-${regionId}`);
    const toggle = event.currentTarget;
    const arrow = toggle.querySelector('.toggle-arrow');
    
    if (regionDiv.style.display === 'none') {
        regionDiv.style.display = 'flex';
        arrow.textContent = '▲';
        toggle.classList.add('active');
    } else {
        regionDiv.style.display = 'none';
        arrow.textContent = '▼';
        toggle.classList.remove('active');
    }
}

function updateCountryButtonStates() {
    document.querySelectorAll('.country-btn').forEach(btn => {
        const country = btn.dataset.country;
        if (country && selectedCountries.has(country)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateUI() {
    updateCountryCards();
    updateStoryline();
    updateCharts();
    updateAdvancedCharts();
    updateInsights();
}

function updateCountryCards() {
    const container = document.getElementById('country-cards');
    container.innerHTML = '';
    
    if (selectedCountries.size === 0) {
        container.innerHTML = '<p class="empty-message">Select countries on the map to view data</p>';
        container.classList.remove('carousel-mode');
        stopCarouselAnimation();
        removeCarouselNavigation();
        return;
    }
    
    // Enable carousel mode for 3+ countries
    const isCarousel = selectedCountries.size >= 3;
    container.classList.toggle('carousel-mode', isCarousel);
    
    const countriesArray = Array.from(selectedCountries);
    
    countriesArray.forEach((code, index) => {
        if (!COUNTRIES[code]) return;
        
        const country = COUNTRIES[code];
        const card = document.createElement('div');
        card.className = 'country-card';
        card.style.borderLeft = `4px solid ${country.color}`;
        card.dataset.index = index;
        
        const total = calculateTotalForCountry(code, currentFactorGroup);
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
        
        card.innerHTML = `
            <div class="card-header">
                <span class="flag"><span class="fi fi-${code.toLowerCase()}" style="display:inline-block;width:24px;height:18px;margin-right:8px;"></span></span>
                <h3>${country.name}</h3>
                <button class="remove-btn" onclick="toggleCountry('${code}')">×</button>
            </div>
            <div class="card-body">
                <div class="stat">
                    <span class="stat-label">Total ${currentFactorGroup}:</span>
                    <span class="stat-value">${formatNumber(total)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Domestic:</span>
                    <span class="stat-value">${formatNumber(domestic)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Exports:</span>
                    <span class="stat-value">${formatNumber(exports)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Imports:</span>
                    <span class="stat-value">${formatNumber(imports)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Add carousel controls
    if (isCarousel) {
        addCarouselNavigation();
    } else {
        removeCarouselNavigation();
        stopCarouselAnimation();
    }
}

function calculateTotalForCountry(code, factorGroup) {
    if (!tradeData[code]) return 0;
    
    let total = 0;
    TRADE_FLOWS.forEach(flow => {
        total += calculateTotalByFlow(code, factorGroup, flow);
    });
    return total;
}

function calculateTotalByFlow(code, factorGroup, flow) {
    if (!tradeData[code] || !tradeData[code][flow] || !tradeData[code][flow].trade_factor) {
        return 0;
    }
    
    const tradeFactorData = tradeData[code][flow].trade_factor;
    let total = 0;
    
    tradeFactorData.forEach(row => {
        const factorId = row.factor_id;
        const factor = factorLookup[factorId];
        
        if (factor && factor.group === factorGroup) {
            const value = parseFloat(row.impact_value) || parseFloat(row.coefficient) || 0;
            total += value;
        }
    });
    
    return total;
}

function calculateByIndustry(code, factorGroup) {
    const result = {};
    
    if (!tradeData[code]) return result;
    
    TRADE_FLOWS.forEach(flow => {
        if (!tradeData[code][flow] || !tradeData[code][flow].trade_factor) return;
        
        const tradeFactorData = tradeData[code][flow].trade_factor;
        
        tradeFactorData.forEach(row => {
            const factorId = row.factor_id;
            const factor = factorLookup[factorId];
            
            if (factor && factor.group === factorGroup) {
                const tradeId = row.trade_id;
                const trade = tradeLookup[code]?.[flow]?.[tradeId];
                
                if (trade) {
                    const industryId = trade.industry_id;
                    const industry = industryLookup[industryId];
                    const industryName = industry ? industry.name : industryId;
                    
                    const value = parseFloat(row.impact_value) || parseFloat(row.coefficient) || 0;
                    result[industryName] = (result[industryName] || 0) + value;
                }
            }
        });
    });
    
    return result;
}

let currentTimelineView = 'journey';

function switchTimelineView(view) {
    currentTimelineView = view;
    
    // Update button states
    document.querySelectorAll('.timeline-view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update content
    updateStoryline();
}

function updateStoryline() {
    const container = document.getElementById('storyline-content');
    
    if (selectedCountries.size === 0) {
        container.innerHTML = '<p class="storyline-empty">Select countries to begin your environmental impact journey 🌍</p>';
        container.className = 'timeline-journey';
        return;
    }
    
    // Set view class
    container.className = `timeline-journey view-${currentTimelineView}`;
    
    // Render based on current view
    if (currentTimelineView === 'journey') {
        container.innerHTML = renderJourneyView();
    } else if (currentTimelineView === 'comparison') {
        container.innerHTML = renderComparisonView();
    } else if (currentTimelineView === 'flow') {
        container.innerHTML = renderFlowView();
    }
}

function renderJourneyView() {
    let html = '';
    
    Array.from(selectedCountries).forEach((code, index) => {
        if (!COUNTRIES[code]) return;
        
        const country = COUNTRIES[code];
        const total = calculateTotalForCountry(code, currentFactorGroup);
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
        
        const maxFlow = Math.max(domestic, exports, imports);
        const domesticHeight = total > 0 ? (domestic / maxFlow) * 100 : 0;
        const exportsHeight = total > 0 ? (exports / maxFlow) * 100 : 0;
        const importsHeight = total > 0 ? (imports / maxFlow) * 100 : 0;
        
        // Generate insights for this country
        const insights = generateCountryInsights(code, { total, domestic, exports, imports });
        
        // Country card content
        const countryCard = `
            <div class="journey-content" style="border-top: 4px solid ${country.color}">
                <div class="journey-header">
                    ${index % 2 === 0 ? `
                        <span class="journey-flag"><span class="fi fi-${code.toLowerCase()}"></span></span>
                        <h3 class="journey-title">${country.name}</h3>
                    ` : `
                        <h3 class="journey-title">${country.name}</h3>
                        <span class="journey-flag"><span class="fi fi-${code.toLowerCase()}"></span></span>
                    `}
                </div>
                <div class="journey-stats">
                    <div class="journey-stat" style="background: linear-gradient(135deg, ${country.color}20, ${country.color}10)">
                        <div class="stat-icon-large">🏭</div>
                        <span class="stat-label-large">Domestic</span>
                        <span class="stat-value-large">${formatNumber(domestic)}</span>
                    </div>
                    <div class="journey-stat" style="background: linear-gradient(135deg, ${country.color}15, ${country.color}08)">
                        <div class="stat-icon-large">📤</div>
                        <span class="stat-label-large">Exports</span>
                        <span class="stat-value-large">${formatNumber(exports)}</span>
                    </div>
                    <div class="journey-stat" style="background: linear-gradient(135deg, ${country.color}10, ${country.color}05)">
                        <div class="stat-icon-large">📥</div>
                        <span class="stat-label-large">Imports</span>
                        <span class="stat-value-large">${formatNumber(imports)}</span>
                    </div>
                </div>
                <div class="journey-flow-viz">
                    <div class="flow-bars">
                        <div class="flow-bar" style="height: ${domesticHeight}%; background: ${country.color}">
                            <span class="flow-label">Domestic</span>
                        </div>
                        <div class="flow-bar" style="height: ${exportsHeight}%; background: ${country.color}; opacity: 0.7">
                            <span class="flow-label">Exports</span>
                        </div>
                        <div class="flow-bar" style="height: ${importsHeight}%; background: ${country.color}; opacity: 0.4">
                            <span class="flow-label">Imports</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insight card content
        const insightCard = `
            <div class="journey-insight">
                <span class="insight-badge">💡 Key Insights</span>
                <h4 class="insight-title">${country.name} Analysis</h4>
                <ul class="insight-points">
                    ${insights.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>
        `;
        
        // Marker
        const marker = `
            <div class="journey-marker" style="background: ${country.color}; color: white;">
                ${index + 1}
            </div>
        `;
        
        // Zigzag pattern: even indices go left, odd indices go right
        html += `
            <div class="journey-node">
                ${index % 2 === 0 ? `
                    ${countryCard}
                    ${marker}
                    ${insightCard}
                ` : `
                    ${insightCard}
                    ${marker}
                    ${countryCard}
                `}
            </div>
        `;
    });
    
    return html;
}

function renderComparisonView() {
    let html = '';
    
    Array.from(selectedCountries).forEach((code) => {
        if (!COUNTRIES[code]) return;
        
        const country = COUNTRIES[code];
        const total = calculateTotalForCountry(code, currentFactorGroup);
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
        
        const domesticPct = total > 0 ? ((domestic / total) * 100).toFixed(1) : 0;
        const exportsPct = total > 0 ? ((exports / total) * 100).toFixed(1) : 0;
        const importsPct = total > 0 ? ((imports / total) * 100).toFixed(1) : 0;
        
        html += `
            <div class="comparison-card" style="border-top: 5px solid ${country.color}">
                <div class="journey-header">
                    <span class="journey-flag"><span class="fi fi-${code.toLowerCase()}"></span></span>
                    <h3 class="journey-title">${country.name}</h3>
                </div>
                <div class="journey-stats">
                    <div class="journey-stat">
                        <div class="stat-icon-large">🏭</div>
                        <span class="stat-label-large">Domestic</span>
                        <span class="stat-value-large" title="${formatNumber(domestic)}">${formatNumber(domestic)}</span>
                        <span style="color: ${country.color};">${domesticPct}%</span>
                    </div>
                    <div class="journey-stat">
                        <div class="stat-icon-large">📤</div>
                        <span class="stat-label-large">Exports</span>
                        <span class="stat-value-large" title="${formatNumber(exports)}">${formatNumber(exports)}</span>
                        <span style="color: ${country.color};">${exportsPct}%</span>
                    </div>
                    <div class="journey-stat">
                        <div class="stat-icon-large">📥</div>
                        <span class="stat-label-large">Imports</span>
                        <span class="stat-value-large" title="${formatNumber(imports)}">${formatNumber(imports)}</span>
                        <span style="color: ${country.color};">${importsPct}%</span>
                    </div>
                </div>
                <div class="comparison-total">
                    <div class="comparison-total-label">Total Impact</div>
                    <div class="comparison-total-value" style="color: ${country.color}" title="${formatNumber(total)}">${formatNumber(total)}</div>
                </div>
            </div>
        `;
    });
    
    return html;
}

function renderFlowView() {
    let html = '';
    
    Array.from(selectedCountries).forEach((code, index) => {
        if (!COUNTRIES[code]) return;
        
        const country = COUNTRIES[code];
        const total = calculateTotalForCountry(code, currentFactorGroup);
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
        
        html += `
            <div class="flow-node" style="border-left: 6px solid ${country.color}">
                <div class="journey-header" style="justify-content: flex-start;">
                    <span class="journey-flag"><span class="fi fi-${code.toLowerCase()}"></span></span>
                    <h3 class="journey-title">${country.name}</h3>
                    <div style="margin-left: auto; font-size: 1.4rem; font-weight: 700; color: ${country.color}">
                        ${formatNumber(total)}
                    </div>
                </div>
                
                <div class="flow-animation">
                    <div class="flow-particle" style="background: ${country.color}"></div>
                    <div class="flow-particle" style="background: ${country.color}; opacity: 0.7"></div>
                    <div class="flow-particle" style="background: ${country.color}; opacity: 0.4"></div>
                </div>
                
                <div class="journey-stats">
                    <div class="journey-stat" style="background: linear-gradient(135deg, ${country.color}20, ${country.color}10)">
                        <div class="stat-icon-large">🏭</div>
                        <span class="stat-label-large">Domestic Flow</span>
                        <span class="stat-value-large">${formatNumber(domestic)}</span>
                    </div>
                    <div class="journey-stat" style="background: linear-gradient(135deg, ${country.color}15, ${country.color}08)">
                        <div class="stat-icon-large">📤</div>
                        <span class="stat-label-large">Export Flow</span>
                        <span class="stat-value-large">${formatNumber(exports)}</span>
                    </div>
                    <div class="journey-stat" style="background: linear-gradient(135deg, ${country.color}10, ${country.color}05)">
                        <div class="stat-icon-large">📥</div>
                        <span class="stat-label-large">Import Flow</span>
                        <span class="stat-value-large">${formatNumber(imports)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

function updateCharts() {
    if (!dataLoadingComplete) return;
    
    if (selectedCountries.size === 0) {
        ['comparison', 'tradeflow', 'industry'].forEach(type => {
            if (charts[type]) charts[type].clear();
        });
        return;
    }
    
    updateComparisonChart();
    updateTradeflowChart();
    updateIndustryChart();
}

function updateAdvancedCharts() {
    if (!dataLoadingComplete) return;
    
    if (selectedCountries.size === 0) {
        ['bubble', 'pie', 'radar', 'heatmap', 'sankey', 'area', 'treemap'].forEach(type => {
            if (charts[type]) charts[type].clear();
        });
        // Clear all gauge charts
        Object.keys(charts).forEach(key => {
            if (key.startsWith('gauge-')) {
                charts[key].dispose();
                delete charts[key];
            }
        });
        return;
    }
    
    updateBubbleChart();
    updatePieChart();
    updateRadarChart();
    updateHeatmapChart();
    updateSankeyChart();
    updateGaugeChart();
    updateAreaChart();
    updateTreemapChart();
}

function updateComparisonChart() {
    const chartDiv = document.getElementById('chart-comparison');
    if (!charts.comparison) {
        charts.comparison = echarts.init(chartDiv);
    }

    const countries = Array.from(selectedCountries).filter(code => COUNTRIES[code]);
    const data = countries.map(code => ({
        name: COUNTRIES[code].name,
        code: code,
        value: calculateTotalForCountry(code, currentFactorGroup),
        itemStyle: { 
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: COUNTRIES[code].color },
                { offset: 1, color: COUNTRIES[code].color + 'cc' }
            ]),
            shadowBlur: 10,
            shadowColor: COUNTRIES[code].color + '40',
            shadowOffsetY: 5
        }
    }));

    const option = {
        animationDuration: 1500,
        animationEasing: 'elasticOut',
        backgroundColor: 'transparent',
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '8%',
            containLabel: true
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                const p = params[0];
                const code = data[p.dataIndex].code;
                const flagClass = code === 'WM' ? '' : `<span class="fi fi-${code.toLowerCase()}" style="display:inline-block;width:20px;height:15px;margin-right:8px;vertical-align:middle;"></span>`;
                return `${flagClass}<strong>${p.name}</strong><br/>${formatNumber(p.value)}`;
            },
            backgroundColor: 'rgba(50,50,50,0.9)',
            borderColor: '#333',
            borderWidth: 1,
            textStyle: {
                color: '#fff',
                fontSize: 13
            },
            padding: 12
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.code + '\n' + d.name.split(' ')[0]),
            axisLabel: { 
                interval: 0, 
                rotate: countries.length > 4 ? 25 : 0,
                color: '#666',
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 16
            },
            axisLine: {
                lineStyle: {
                    color: '#ddd',
                    width: 2
                }
            }
        },
        yAxis: {
            type: 'value',
            name: 'Total Impact',
            nameTextStyle: {
                fontSize: 12,
                fontWeight: 600,
                color: '#333'
            },
            axisLabel: { 
                formatter: value => formatNumber(value),
                color: '#666',
                fontSize: 11
            },
            axisLine: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0',
                    type: 'dashed'
                }
            }
        },
        series: [{
            type: 'bar',
            data: data,
            barWidth: '60%',
            label: {
                show: true,
                position: 'top',
                formatter: params => formatNumber(params.value),
                fontSize: 12,
                fontWeight: 600,
                color: '#333'
            },
            itemStyle: {
                borderRadius: [10, 10, 0, 0]
            }
        }]
    };

    charts.comparison.setOption(option, true);
}

function updateTradeflowChart() {
    const chartDiv = document.getElementById('chart-tradeflow');
    if (!charts.tradeflow) {
        charts.tradeflow = echarts.init(chartDiv);
    }

    const countries = Array.from(selectedCountries).filter(code => COUNTRIES[code]);
    if (countries.length === 0) {
        charts.tradeflow.clear();
        return;
    }

    const series = TRADE_FLOWS.map(flow => ({
        name: flow.charAt(0).toUpperCase() + flow.slice(1),
        type: 'bar',
        stack: 'total',
        data: countries.map(code => calculateTotalByFlow(code, currentFactorGroup, flow))
    }));

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                let result = `<strong>${params[0].axisValue}</strong><br/>`;
                params.forEach(p => {
                    result += `${p.marker} ${p.seriesName}: ${formatNumber(p.value)}<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: TRADE_FLOWS.map(f => f.charAt(0).toUpperCase() + f.slice(1))
        },
        xAxis: {
            type: 'category',
            data: countries.map(code => COUNTRIES[code].name)
        },
        yAxis: {
            type: 'value',
            name: 'Impact by Trade Flow',
            axisLabel: { formatter: value => formatNumber(value) }
        },
        series: series
    };

    charts.tradeflow.setOption(option, true);
}

function updateIndustryChart() {
    const chartDiv = document.getElementById('chart-industry');
    if (!charts.industry) {
        charts.industry = echarts.init(chartDiv);
    }

    const countries = Array.from(selectedCountries).filter(code => COUNTRIES[code]);
    if (countries.length === 0) {
        charts.industry.clear();
        return;
    }

    const allIndustries = new Set();
    const countriesData = {};

    countries.forEach(code => {
        const industryTotals = calculateByIndustry(code, currentFactorGroup);
        countriesData[code] = industryTotals;
        Object.keys(industryTotals).forEach(ind => allIndustries.add(ind));
    });

    let industries = Array.from(allIndustries);
    const industriesWithData = industries
        .map(ind => ({
            name: ind,
            total: countries.reduce((sum, code) => 
                sum + (countriesData[code][ind] || 0), 0)
        }))
        .filter(ind => ind.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

    industries = industriesWithData.map(ind => ind.name);

    if (industries.length === 0) {
        charts.industry.setOption({
            title: {
                text: 'No industry data available',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#999', fontSize: 14 }
            }
        });
        return;
    }

    const series = countries.map(code => ({
        name: COUNTRIES[code].name,
        type: 'bar',
        data: industries.map(ind => countriesData[code][ind] || 0),
        itemStyle: { color: COUNTRIES[code].color }
    }));

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                let result = `Industry: ${params[0].axisValue}<br/>`;
                params.forEach(p => {
                    result += `${p.marker} ${p.seriesName}: ${formatNumber(p.value)}<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: countries.map(code => COUNTRIES[code].name)
        },
        xAxis: {
            type: 'category',
            data: industries,
            axisLabel: {
                interval: 0,
                rotate: 45,
                fontSize: 10
            }
        },
        yAxis: {
            type: 'value',
            name: 'Impact by Industry',
            axisLabel: { formatter: value => formatNumber(value) }
        },
        grid: {
            bottom: 120,
            left: 60,
            right: 40
        }
    };

    charts.industry.setOption(option, true);
}

function updateBubbleChart() {
    const chartDiv = document.getElementById('chart-bubble');
    if (!charts.bubble) {
        charts.bubble = echarts.init(chartDiv);
    }

    const data = Array.from(selectedCountries).filter(code => COUNTRIES[code]).map(code => {
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        const total = calculateTotalForCountry(code, currentFactorGroup);
        
        return {
            name: COUNTRIES[code].name,
            code: code,
            value: [domestic, exports, total],
            itemStyle: { 
                color: COUNTRIES[code].color,
                opacity: 0.75,
                shadowBlur: 10,
                shadowColor: COUNTRIES[code].color,
                shadowOffsetY: 3
            }
        };
    });

    const option = {
        animationDuration: 2000,
        animationEasing: 'cubicOut',
        backgroundColor: 'transparent',
        grid: {
            left: '8%',
            right: '8%',
            top: '12%',
            bottom: '12%'
        },
        tooltip: {
            formatter: params => {
                const code = params.data.code;
                const flagHTML = code === 'WM' ? '' : `<span class="fi fi-${code.toLowerCase()}" style="display:inline-block;width:20px;height:15px;margin-right:8px;vertical-align:middle;"></span>`;
                return `${flagHTML}<strong>${params.name}</strong><br/>
                        Domestic: ${formatNumber(params.value[0])}<br/>
                        Exports: ${formatNumber(params.value[1])}<br/>
                        <strong>Total Impact: ${formatNumber(params.value[2])}</strong>`;
            },
            backgroundColor: 'rgba(50,50,50,0.9)',
            borderColor: '#333',
            borderWidth: 1,
            textStyle: {
                color: '#fff',
                fontSize: 13
            },
            padding: 12
        },
        xAxis: {
            name: 'Domestic Impact',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: {
                fontSize: 13,
                fontWeight: 600,
                color: '#333'
            },
            axisLabel: { 
                formatter: value => formatNumber(value),
                color: '#666',
                fontSize: 11
            },
            axisLine: {
                lineStyle: {
                    color: '#ddd',
                    width: 2
                }
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0',
                    type: 'dashed'
                }
            }
        },
        yAxis: {
            name: 'Export Impact',
            nameLocation: 'middle',
            nameGap: 50,
            nameTextStyle: {
                fontSize: 13,
                fontWeight: 600,
                color: '#333'
            },
            axisLabel: { 
                formatter: value => formatNumber(value),
                color: '#666',
                fontSize: 11
            },
            axisLine: {
                lineStyle: {
                    color: '#ddd',
                    width: 2
                }
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0',
                    type: 'dashed'
                }
            }
        },
        series: [{
            type: 'scatter',
            symbolSize: d => Math.sqrt(d[2]) / 800 + 30,
            data: data,
            label: {
                show: true,
                position: 'top',
                formatter: function(params) {
                    return params.data.code;
                },
                fontSize: 13,
                fontWeight: 700,
                color: '#333',
                distance: 8
            },
            emphasis: {
                focus: 'self',
                scale: 1.3,
                itemStyle: {
                    shadowBlur: 20,
                    shadowColor: 'rgba(0,0,0,0.3)'
                }
            }
        }]
    };

    charts.bubble.setOption(option, true);
}

function updatePieChart() {
    updatePieChartExports();
    updatePieChartImports();
}

function updatePieChartExports() {
    const chartDiv = document.getElementById('chart-pie-exports');
    if (!chartDiv) return;
    
    if (!charts.pieExports) {
        charts.pieExports = echarts.init(chartDiv);
    }

    const data = [];
    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        // Add domestic and exports only
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        
        if (domestic > 0) {
            data.push({
                name: `[${code}] ${COUNTRIES[code].name} - domestic`,
                value: domestic,
                itemStyle: {
                    color: COUNTRIES[code].color,
                    opacity: 1
                }
            });
        }
        
        if (exports > 0) {
            data.push({
                name: `[${code}] ${COUNTRIES[code].name} - exports`,
                value: exports,
                itemStyle: {
                    color: COUNTRIES[code].color,
                    opacity: 0.6
                }
            });
        }
    });

    const option = {
        animationDuration: 1500,
        animationEasing: 'elasticOut',
        tooltip: {
            trigger: 'item',
            formatter: params => `<strong>${params.name}</strong><br/>${formatNumber(params.value)} <span style="color: #888">(${params.percent}%)</span>`,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#ddd',
            borderWidth: 1,
            textStyle: {
                color: '#333',
                fontSize: 12
            },
            padding: 12,
            extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
        },
        legend: {
            type: 'scroll',
            orient: 'horizontal',
            bottom: 5,
            left: 'center',
            textStyle: { 
                fontSize: 10,
                color: '#555'
            },
            pageIconSize: 10,
            itemGap: 15,
            icon: 'circle'
        },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '42%'],
            roseType: 'radius',
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 3,
                shadowBlur: 8,
                shadowColor: 'rgba(0, 0, 0, 0.15)'
            },
            label: {
                show: true,
                position: 'outside',
                fontSize: 11,
                fontWeight: 'bold',
                lineHeight: 14,
                formatter: '{d}%',
                color: '#333'
            },
            labelLine: {
                show: true,
                length: 10,
                length2: 10,
                smooth: 0.3,
                lineStyle: {
                    width: 2
                }
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 13,
                    fontWeight: 'bold'
                },
                itemStyle: {
                    shadowBlur: 20,
                    shadowOffsetX: 0,
                    shadowOffsetY: 5,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                },
                scale: true,
                scaleSize: 10
            },
            data: data
        }]
    };

    charts.pieExports.setOption(option, true);
}

function updatePieChartImports() {
    const chartDiv = document.getElementById('chart-pie-imports');
    if (!chartDiv) return;
    
    if (!charts.pieImports) {
        charts.pieImports = echarts.init(chartDiv);
    }

    const data = [];
    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        // Add domestic and imports only
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
        
        if (domestic > 0) {
            data.push({
                name: `[${code}] ${COUNTRIES[code].name} - domestic`,
                value: domestic,
                itemStyle: {
                    color: COUNTRIES[code].color,
                    opacity: 1
                }
            });
        }
        
        if (imports > 0) {
            data.push({
                name: `[${code}] ${COUNTRIES[code].name} - imports`,
                value: imports,
                itemStyle: {
                    color: COUNTRIES[code].color,
                    opacity: 0.4
                }
            });
        }
    });

    const option = {
        animationDuration: 1500,
        animationEasing: 'elasticOut',
        tooltip: {
            trigger: 'item',
            formatter: params => `<strong>${params.name}</strong><br/>${formatNumber(params.value)} <span style="color: #888">(${params.percent}%)</span>`,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#ddd',
            borderWidth: 1,
            textStyle: {
                color: '#333',
                fontSize: 12
            },
            padding: 12,
            extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
        },
        legend: {
            type: 'scroll',
            orient: 'horizontal',
            bottom: 5,
            left: 'center',
            textStyle: { 
                fontSize: 10,
                color: '#555'
            },
            pageIconSize: 10,
            itemGap: 15,
            icon: 'circle'
        },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '42%'],
            roseType: 'radius',
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 3,
                shadowBlur: 8,
                shadowColor: 'rgba(0, 0, 0, 0.15)'
            },
            label: {
                show: true,
                position: 'outside',
                fontSize: 11,
                fontWeight: 'bold',
                lineHeight: 14,
                formatter: '{d}%',
                color: '#333'
            },
            labelLine: {
                show: true,
                length: 10,
                length2: 10,
                smooth: 0.3,
                lineStyle: {
                    width: 2
                }
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 13,
                    fontWeight: 'bold'
                },
                itemStyle: {
                    shadowBlur: 20,
                    shadowOffsetX: 0,
                    shadowOffsetY: 5,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                },
                scale: true,
                scaleSize: 10
            },
            data: data
        }]
    };

    charts.pieImports.setOption(option, true);
}

function updateRadarChart() {
    const chartDiv = document.getElementById('chart-radar');
    if (!charts.radar) {
        charts.radar = echarts.init(chartDiv);
    }

    const countries = Array.from(selectedCountries).filter(code => COUNTRIES[code]);
    
    const indicator = ALL_FACTOR_GROUPS.map(group => ({
        name: group.toUpperCase(),
        max: Math.max(...countries.map(code => calculateTotalForCountry(code, group) || 1))
    }));

    const series = countries.map(code => {
        return {
            name: `[${code}] ${COUNTRIES[code].name}`,
            type: 'radar',
            data: [{
                value: ALL_FACTOR_GROUPS.map(group => calculateTotalForCountry(code, group)),
                name: `[${code}] ${COUNTRIES[code].name}`,
                itemStyle: { color: COUNTRIES[code].color },
                areaStyle: { opacity: 0.3 }
            }]
        };
    });

    const option = {
        tooltip: {},
        legend: {
            data: countries.map(code => {
                return `[${code}] ${COUNTRIES[code].name}`;
            })
        },
        radar: {
            indicator: indicator,
            shape: 'polygon',
            splitNumber: 4
        },
        series: series
    };

    charts.radar.setOption(option, true);
}

function updateHeatmapChart() {
    const chartDiv = document.getElementById('chart-heatmap');
    if (!charts.heatmap) {
        charts.heatmap = echarts.init(chartDiv);
    }

    const countries = Array.from(selectedCountries).filter(code => COUNTRIES[code]);
    
    const data = [];
    countries.forEach((code, i) => {
        ALL_FACTOR_GROUPS.forEach((group, j) => {
            const value = calculateTotalForCountry(code, group);
            data.push([j, i, value]);
        });
    });

    const option = {
        tooltip: {
            position: 'top',
            formatter: params => {
                const country = countries[params.value[1]];
                const group = ALL_FACTOR_GROUPS[params.value[0]];
                return `[${country}] ${COUNTRIES[country].name}<br/>${group}: ${formatNumber(params.value[2])}`;
            }
        },
        grid: {
            height: '50%',
            top: '10%'
        },
        xAxis: {
            type: 'category',
            data: ALL_FACTOR_GROUPS.map(g => g.toUpperCase()),
            splitArea: { show: true }
        },
        yAxis: {
            type: 'category',
            data: countries.map(code => {
                return `[${code}] ${COUNTRIES[code].name}`;
            }),
            splitArea: { show: true }
        },
        visualMap: {
            min: 0,
            max: Math.max(...data.map(d => d[2])),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%'
        },
        series: [{
            type: 'heatmap',
            data: data,
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };

    charts.heatmap.setOption(option, true);
}

function updateSankeyChart() {
    const chartDiv = document.getElementById('chart-sankey');
    if (!charts.sankey) {
        charts.sankey = echarts.init(chartDiv);
    }

    const nodes = [];
    const links = [];
    
    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        nodes.push({ name: COUNTRIES[code].name });
        
        TRADE_FLOWS.forEach(flow => {
            const flowName = `${flow.charAt(0).toUpperCase() + flow.slice(1)}`;
            if (!nodes.find(n => n.name === flowName)) {
                nodes.push({ name: flowName });
            }
            
            const value = calculateTotalByFlow(code, currentFactorGroup, flow);
            if (value > 0) {
                links.push({
                    source: COUNTRIES[code].name,
                    target: flowName,
                    value: value
                });
            }
        });
    });

    const option = {
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            formatter: params => {
                if (params.dataType === 'edge') {
                    return `${params.data.source} → ${params.data.target}<br/>${formatNumber(params.value)}`;
                }
                return params.name;
            }
        },
        series: [{
            type: 'sankey',
            data: nodes,
            links: links,
            emphasis: {
                focus: 'adjacency'
            },
            lineStyle: {
                color: 'gradient',
                curveness: 0.5
            }
        }]
    };

    charts.sankey.setOption(option, true);
}

function updateGaugeChart() {
    const gaugesContainer = document.getElementById('gauges-container');
    if (!gaugesContainer) return;
    
    gaugesContainer.innerHTML = '';
    
    if (selectedCountries.size === 0) {
        gaugesContainer.innerHTML = '<p class="empty-message">Select countries to view intensity gauges</p>';
        return;
    }

    const allCountries = Object.keys(COUNTRIES);
    const allTotals = allCountries.map(c => calculateTotalForCountry(c, currentFactorGroup));
    const maxTotal = Math.max(...allTotals.filter(t => t > 0));
    
    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        const gaugeDiv = document.createElement('div');
        gaugeDiv.className = 'gauge-item';
        gaugeDiv.innerHTML = `
            <div class="gauge-header">
                <span class="gauge-flag">${COUNTRIES[code].flag}</span>
                <h4>${COUNTRIES[code].name}</h4>
            </div>
            <div id="gauge-${code}" class="gauge-chart"></div>
            <div class="gauge-footer">
                <span class="gauge-value">${formatNumber(calculateTotalForCountry(code, currentFactorGroup))}</span>
                <span class="gauge-label">${currentFactorGroup} impact</span>
            </div>
        `;
        gaugesContainer.appendChild(gaugeDiv);
        
        const total = calculateTotalForCountry(code, currentFactorGroup);
        const percentage = maxTotal > 0 ? (total / maxTotal * 100) : 0;
        
        const gaugeChartDiv = document.getElementById(`gauge-${code}`);
        
        // Ensure the div has dimensions before initializing chart
        if (gaugeChartDiv.offsetWidth === 0 || gaugeChartDiv.offsetHeight === 0) {
            console.warn(`Gauge div for ${code} has zero dimensions`);
        }
        
        const gaugeChart = echarts.init(gaugeChartDiv);
        
        charts[`gauge-${code}`] = gaugeChart;
        
        // Use ResizeObserver to handle container size changes
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                if (gaugeChart && !gaugeChart.isDisposed()) {
                    gaugeChart.resize();
                }
            });
            resizeObserver.observe(gaugeChartDiv);
        }
        
        const option = {
            series: [{
                type: 'gauge',
                startAngle: 180,
                endAngle: 0,
                center: ['50%', '60%'],
                radius: '80%',
                min: 0,
                max: 100,
                splitNumber: 4,
                axisLine: {
                    lineStyle: {
                        width: 5,
                        color: [
                            [0.3, '#67C23A'],
                            [0.7, '#E6A23C'],
                            [1, '#F56C6C']
                        ]
                    }
                },
                pointer: {
                    icon: 'path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z',
                    length: '60%',
                    width: 7,
                    offsetCenter: [0, '15%'],
                    itemStyle: {
                        color: COUNTRIES[code].color
                    }
                },
                axisTick: {
                    length: 4,
                    lineStyle: {
                        color: 'auto',
                        width: 1
                    }
                },
                splitLine: {
                    length: 7,
                    lineStyle: {
                        color: 'auto',
                        width: 2
                    }
                },
                axisLabel: {
                    color: '#666',
                    fontSize: 8,
                    distance: -24,
                    formatter: value => {
                        if (value === 0) return '0';
                        if (value === 100) return '100';
                        if (value === 50) return '50';
                        return '';
                    }
                },
                title: {
                    show: false
                },
                detail: {
                    show: false
                },
                data: [{
                    value: 0
                }],
                animationDuration: 2000,
                animationEasing: 'cubicInOut'
            }]
        };
        
        gaugeChart.setOption(option);
        
        // Resize immediately after creation to fix initial layout
        setTimeout(() => {
            gaugeChart.resize();
        }, 50);
        
        setTimeout(() => {
            gaugeChart.setOption({
                series: [{
                    data: [{
                        value: percentage.toFixed(1)
                    }]
                }]
            });
            // Resize again after animation
            setTimeout(() => {
                gaugeChart.resize();
            }, 100);
        }, 100);
    });
    
    // Final resize of all gauges after all are created
    setTimeout(() => {
        selectedCountries.forEach(code => {
            if (charts[`gauge-${code}`]) {
                charts[`gauge-${code}`].resize();
            }
        });
    }, 300);
}

function updateAreaChart() {
    const chartDiv = document.getElementById('chart-area');
    if (!charts.area) {
        charts.area = echarts.init(chartDiv);
    }

    const countries = Array.from(selectedCountries).filter(code => COUNTRIES[code]);
    
    const series = TRADE_FLOWS.map(flow => ({
        name: flow.charAt(0).toUpperCase() + flow.slice(1),
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
            focus: 'series'
        },
        data: countries.map(code => calculateTotalByFlow(code, currentFactorGroup, flow))
    }));

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            }
        },
        legend: {
            data: TRADE_FLOWS.map(f => f.charAt(0).toUpperCase() + f.slice(1))
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: countries.map(code => COUNTRIES[code].name)
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: value => formatNumber(value) }
        },
        series: series
    };

    charts.area.setOption(option, true);
}

function updateTreemapChart() {
    const chartDiv = document.getElementById('chart-treemap');
    if (!charts.treemap) {
        charts.treemap = echarts.init(chartDiv);
    }

    const data = [];
    
    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        const country = COUNTRIES[code];
        const children = TRADE_FLOWS.map(flow => ({
            name: flow,
            value: calculateTotalByFlow(code, currentFactorGroup, flow)
        })).filter(f => f.value > 0);
        
        const total = children.reduce((sum, f) => sum + f.value, 0);
        
        if (total > 0) {
            data.push({
                name: country.name,
                value: total,
                itemStyle: { color: country.color },
                children: children
            });
        }
    });

    const option = {
        animationDuration: 1800,
        animationEasing: 'cubicOut',
        tooltip: {
            formatter: params => `${params.name}<br/>Impact: ${formatNumber(params.value)}`
        },
        series: [{
            type: 'treemap',
            data: data,
            leafDepth: 2,
            roam: false,
            nodeClick: 'zoomToNode',
            label: {
                show: true,
                formatter: '{b}',
                fontSize: 12
            },
            upperLabel: {
                show: true,
                height: 30,
                fontSize: 14,
                fontWeight: 'bold'
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                gapWidth: 2
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 20,
                    shadowColor: 'rgba(0,0,0,0.3)',
                    borderColor: '#333',
                    borderWidth: 3
                },
                label: {
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            levels: [
                {
                    itemStyle: {
                        borderColor: '#777',
                        borderWidth: 0,
                        gapWidth: 2
                    },
                    upperLabel: {
                        show: false
                    }
                },
                {
                    itemStyle: {
                        borderColor: '#555',
                        borderWidth: 5,
                        gapWidth: 1
                    }
                },
                {
                    colorSaturation: [0.35, 0.5],
                    itemStyle: {
                        borderWidth: 3,
                        gapWidth: 1,
                        borderColorSaturation: 0.6
                    }
                }
            ]
        }]
    };

    charts.treemap.setOption(option, true);
}

function updateInsights() {
    const insightsDiv = document.getElementById('insights');
    
    if (selectedCountries.size === 0) {
        insightsDiv.innerHTML = '<p>Select countries on the map to view insights.</p>';
        return;
    }

    const insights = [];
    const totals = [];

    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        const total = calculateTotalForCountry(code, currentFactorGroup);
        totals.push({ code, total });
    });

    totals.sort((a, b) => b.total - a.total);

    if (totals.length > 0 && totals[0].total > 0) {
        insights.push(`${COUNTRIES[totals[0].code].name} has the highest ${currentFactorGroup} impact (${formatNumber(totals[0].total)}) among selected countries.`);
        
        if (totals.length > 1 && totals[1].total > 0) {
            const ratio = (totals[0].total / totals[1].total).toFixed(2);
            insights.push(`This is ${ratio}x higher than ${COUNTRIES[totals[1].code].name}.`);
        }
    }

    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
        const total = domestic + exports + imports;

        if (total > 0) {
            const domesticPct = ((domestic / total) * 100).toFixed(1);
            const exportsPct = ((exports / total) * 100).toFixed(1);
            const importsPct = ((imports / total) * 100).toFixed(1);
            
            const flows = [
                { name: 'domestic', pct: parseFloat(domesticPct), value: domestic },
                { name: 'exports', pct: parseFloat(exportsPct), value: exports },
                { name: 'imports', pct: parseFloat(importsPct), value: imports }
            ].sort((a, b) => b.pct - a.pct);
            
            insights.push(`${COUNTRIES[code].name}: ${flows[0].name} production accounts for ${flows[0].pct}% of ${currentFactorGroup} impact.`);
        }
    });

    if (insights.length > 0) {
        const html = '<ul>' + insights.map(i => `<li>${i}</li>`).join('') + '</ul>';
        insightsDiv.innerHTML = html;
    } else {
        insightsDiv.innerHTML = '<p>No insights available. Data may not be loaded correctly.</p>';
    }
}

async function loadCSV(path) {
    return new Promise((resolve) => {
        debugLog(`Loading: ${path}`);
        Papa.parse(path, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: results => {
                if (results.data && results.data.length > 0) {
                    debugLog(`✓ Loaded ${path}: ${results.data.length} rows`);
                    resolve(results.data);
                } else {
                    debugLog(`⚠ ${path}: File empty or no data`, true);
                    loadingErrors.push(`${path}: Empty or no data`);
                    resolve([]);
                }
            },
            error: err => {
                debugLog(`✗ ERROR loading ${path}: ${err.message}`, true);
                loadingErrors.push(`${path}: ${err.message}`);
                resolve([]);
            }
        });
    });
}

async function loadAllData() {
    const startTime = performance.now();
    showStatus('Starting data load...');
    loadingErrors = [];
    
    debugLog('=== LOADING REFERENCE DATA ===');
    showStatus('Loading reference data (industry.csv, factor.csv)...');
    
    const industryData = await loadCSV(`${DATA_BASE_PATH}/industry.csv`);
    const factorData = await loadCSV(`${DATA_BASE_PATH}/factor.csv`);
    
    industryData.forEach(row => {
        const id = row.industry_id;
        if (id) {
            industryLookup[id] = {
                name: row.name || id,
                category: row.category || ''
            };
        }
    });
    
    factorData.forEach(row => {
        const id = row.factor_id;
        if (id) {
            const group = getFactorGroup(row.extension);
            factorLookup[id] = {
                stressor: row.stressor || '',
                extension: row.extension || '',
                unit: row.unit || '',
                group: group
            };
        }
    });
    
    debugLog(`Industry lookup: ${Object.keys(industryLookup).length} entries`);
    debugLog(`Factor lookup: ${Object.keys(factorLookup).length} entries`);
    
    debugLog('=== LOADING COUNTRY TRADE DATA ===');
    
    // LOAD ALL 14 COUNTRIES
    for (const code of Object.keys(COUNTRIES)) {
        debugLog(`--- Loading ${COUNTRIES[code].name} (${code}) ---`);
        showStatus(`Loading data for ${COUNTRIES[code].name}...`);
        
        tradeData[code] = {};
        tradeLookup[code] = {};
        
        for (const flow of TRADE_FLOWS) {
            debugLog(`  Flow: ${flow}`);
            tradeData[code][flow] = {};
            tradeLookup[code][flow] = {};
            
            const tradePath = `${DATA_BASE_PATH}/${code}/${flow}/trade.csv`;
            const tradeRows = await loadCSV(tradePath);
            tradeData[code][flow].trade = tradeRows;
            
            tradeRows.forEach(row => {
                if (row.trade_id) {
                    tradeLookup[code][flow][row.trade_id] = row;
                }
            });
            
            const tradeFactorPath = `${DATA_BASE_PATH}/${code}/${flow}/trade_factor.csv`;
            const tradeFactorData = await loadCSV(tradeFactorPath);
            tradeData[code][flow].trade_factor = tradeFactorData;
            
            if (tradeFactorData.length > 0) {
                debugLog(`    trade_factor: ${tradeFactorData.length} rows`);
            }
        }
    }
    
    dataLoadingComplete = true;
    
    const endTime = performance.now();
    const loadTime = ((endTime - startTime) / 1000).toFixed(2);
    const filesLoaded = 2 + (Object.keys(COUNTRIES).length * 3 * 2);
    
    if (loadingErrors.length > 0) {
        showStatus(`⚠ Data load complete with ${loadingErrors.length} errors. Check debug panel.`, true);
        debugLog(`=== LOAD SUMMARY: ${loadingErrors.length} ERRORS ===`, true);
    } else {
        showStatus(`✓ All data loaded successfully in ${loadTime}s!`);
        debugLog('=== ALL DATA LOADED SUCCESSFULLY ===');
    }
    
    dataLoadingComplete = true;
    updateUI();
}

// ==========================================
// SIDEBAR TOGGLE FUNCTIONALITY
// ==========================================

function initializeSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const mapWrapper = document.querySelector('.map-controls-wrapper');
    
    if (toggleBtn && mapWrapper) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = mapWrapper.classList.toggle('sidebar-collapsed');
            toggleBtn.classList.toggle('collapsed', isCollapsed);
            
            // Resize map when sidebar toggles
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 300);
        });
    }
}

// ==========================================
// CAROUSEL NAVIGATION FOR COUNTRY CARDS
// ==========================================

function addCarouselNavigation() {
    removeCarouselNavigation(); // Remove existing buttons first
    
    const summarySection = document.querySelector('.summary-section');
    if (!summarySection) return;
    
    // Create prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-nav prev';
    prevBtn.innerHTML = '&#8249;'; // Left arrow
    prevBtn.setAttribute('aria-label', 'Previous cards');
    prevBtn.onclick = () => scrollCarousel('left');
    
    // Create next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-nav next';
    nextBtn.innerHTML = '&#8250;'; // Right arrow
    nextBtn.setAttribute('aria-label', 'Next cards');
    nextBtn.onclick = () => scrollCarousel('right');
    
    summarySection.appendChild(prevBtn);
    summarySection.appendChild(nextBtn);
    
    // Update button states
    updateCarouselButtons();
    
    // Add scroll listener to update buttons
    const container = document.getElementById('country-cards');
    if (container) {
        container.addEventListener('scroll', updateCarouselButtons);
    }
}

function removeCarouselNavigation() {
    const buttons = document.querySelectorAll('.carousel-nav');
    buttons.forEach(btn => btn.remove());
}

function scrollCarousel(direction) {
    const container = document.getElementById('country-cards');
    if (!container) return;
    
    const scrollAmount = 350; // Card width + gap
    const currentScroll = container.scrollLeft;
    
    if (direction === 'left') {
        container.scrollTo({
            left: currentScroll - scrollAmount,
            behavior: 'smooth'
        });
    } else {
        container.scrollTo({
            left: currentScroll + scrollAmount,
            behavior: 'smooth'
        });
    }
    
    // Update buttons after scroll
    setTimeout(updateCarouselButtons, 300);
}

function updateCarouselButtons() {
    const container = document.getElementById('country-cards');
    const prevBtn = document.querySelector('.carousel-nav.prev');
    const nextBtn = document.querySelector('.carousel-nav.next');
    
    if (!container || !prevBtn || !nextBtn) return;
    
    const isAtStart = container.scrollLeft <= 10;
    const isAtEnd = container.scrollLeft >= (container.scrollWidth - container.clientWidth - 10);
    
    prevBtn.disabled = isAtStart;
    nextBtn.disabled = isAtEnd;
}

function positionCarouselCards(count) {
    // Cards position themselves naturally with flexbox
    // No manual positioning needed
}

function startCarouselAnimation() {
    // Auto-scroll is now handled by user interaction only
    // Removed auto-scrolling to let users control with buttons/scroll
}

function stopCarouselAnimation() {
    // Nothing to stop - no auto animation
}

// ==========================================
// FACTOR BUTTON SELECTION
// ==========================================

function initializeFactorButtons() {
    const factorButtons = document.querySelectorAll('.factor-btn');
    
    factorButtons.forEach(button => {
        button.addEventListener('click', () => {
            factorButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFactorGroup = button.dataset.factor;
            debugLog(`Factor group changed to: ${currentFactorGroup}`);
            updateUI();
        });
    });
}

// ==========================================
// TIMELINE INSIGHTS GENERATION
// ==========================================

function generateCountryInsights(code, data) {
    const country = COUNTRIES[code];
    if (!country) return [];
    
    const { total, domestic, exports, imports } = data;
    
    const domesticPct = total > 0 ? ((domestic / total) * 100).toFixed(1) : 0;
    const exportsPct = total > 0 ? ((exports / total) * 100).toFixed(1) : 0;
    const importsPct = total > 0 ? ((imports / total) * 100).toFixed(1) : 0;
    
    const flows = [
        { type: 'domestic', value: domestic, pct: domesticPct },
        { type: 'exports', value: exports, pct: exportsPct },
        { type: 'imports', value: imports, pct: importsPct }
    ];
    flows.sort((a, b) => b.value - a.value);
    
    const dominant = flows[0];
    const secondary = flows[1];
    
    const insights = [];
    
    if (dominant && dominant.pct > 50) {
        insights.push(`${country.name}'s ${currentFactorGroup} impact is dominated by ${dominant.type} activities (${dominant.pct}%)`);
    } else if (dominant) {
        insights.push(`${country.name} has a balanced ${currentFactorGroup} footprint across different trade flows`);
    }
    
    if (secondary && secondary.pct > 25) {
        insights.push(`${secondary.type.charAt(0).toUpperCase() + secondary.type.slice(1)} contributes significantly at ${secondary.pct}% of total impact`);
    } else if (imports < 1) {
        insights.push(`Minimal import-related ${currentFactorGroup} impact suggests strong domestic production`);
    } else if (exports > domestic) {
        insights.push(`Export-oriented economy with ${exportsPct}% of ${currentFactorGroup} from exported goods`);
    }
    
    return insights;
}

// ==========================================
// EXTERNAL PIE LEGEND
// ==========================================

function createExternalLegend(data) {
    const legendContainer = document.getElementById('pie-legend');
    if (!legendContainer) return;
    
    let html = '';
    const totalValue = data.reduce((sum, d) => sum + d.value, 0);
    
    data.forEach(item => {
        const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
        html += `
            <div class="pie-legend-item">
                <div class="pie-legend-color" style="background: ${item.itemStyle.color}; opacity: ${item.itemStyle.opacity}"></div>
                <div class="pie-legend-text">${item.name}</div>
                <div class="pie-legend-value">${pct}%</div>
            </div>
        `;
    });
    
    legendContainer.innerHTML = html;
}

window.addEventListener('DOMContentLoaded', () => {
    debugLog('Page loaded, initializing...');
    
    const toggleBtn = document.getElementById('toggle-debug');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const logDiv = document.getElementById('debug-log');
            if (logDiv.style.display === 'none') {
                logDiv.style.display = 'block';
                toggleBtn.textContent = 'Hide';
            } else {
                logDiv.style.display = 'none';
                toggleBtn.textContent = 'Show';
            }
        });
    }
    
    // Initialize sidebar toggle
    initializeSidebarToggle();
    
    initMap();
    
    // Initialize factor buttons
    initializeFactorButtons();
    
    // Debounced resize handler for better performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 250);
    });
    
    // Update button states to show USA as selected
    updateCountryButtonStates();
    
    loadAllData();
});

window.toggleCountry = toggleCountry;
window.selectAllCountries = selectAllCountries;
window.clearAllCountries = clearAllCountries;
window.toggleRegion = toggleRegion;
window.switchTimelineView = switchTimelineView;