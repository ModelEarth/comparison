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
    updateChordChart();
    updateSankeyChart();
    updateGaugeChart();
    updateAreaChart();
    updateTreemapChart();
    
    // Update Flow-Rings visualization when countries change
    if (typeof updateFlowVisualization === 'function') {
        updateFlowVisualization();
    }
}

// ==========================================
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

function updateChordChart() {
    const chartDiv = document.getElementById('chart-chord');
    if (!charts.chord) {
        charts.chord = echarts.init(chartDiv);
    }

    if (selectedCountries.size === 0) {
        charts.chord.setOption({
            title: {
                text: 'Select countries to view relationships',
                left: 'center',
                top: 'middle',
                textStyle: { color: '#999', fontSize: 14 }
            }
        });
        return;
    }

    // Create data structure for circular graph
    const countries = Array.from(selectedCountries);
    const nodes = [];
    const links = [];
    
    // Create nodes
    countries.forEach((code, idx) => {
        const total = calculateTotalForCountry(code, currentFactorGroup);
        nodes.push({
            id: code,
            name: COUNTRIES[code]?.name || code,
            value: total,
            symbolSize: Math.max(30, Math.min(80, Math.sqrt(total) / 100)),
            itemStyle: {
                color: COUNTRIES[code]?.color || '#999',
                borderColor: '#fff',
                borderWidth: 3,
                shadowBlur: 10,
                shadowColor: 'rgba(0,0,0,0.3)'
            },
            label: {
                show: true,
                position: 'bottom',
                distance: 15,
                fontSize: 13,
                fontWeight: 600,
                color: '#2c3e50'
            }
        });
    });
    
    // Create links between countries
    countries.forEach((fromCode, fromIdx) => {
        countries.forEach((toCode, toIdx) => {
            if (fromCode === toCode) {
                // Self-loop for domestic
                const domestic = calculateTotalByFlow(fromCode, currentFactorGroup, 'domestic');
                if (domestic > 0) {
                    links.push({
                        source: fromCode,
                        target: fromCode,
                        value: domestic,
                        lineStyle: {
                            width: Math.max(2, Math.min(15, Math.sqrt(domestic) / 500)),
                            color: COUNTRIES[fromCode]?.color || '#999',
                            opacity: 0.6,
                            curveness: 0.8
                        }
                    });
                }
            } else {
                // Connection between different countries
                const exports = calculateTotalByFlow(fromCode, currentFactorGroup, 'exports');
                const imports = calculateTotalByFlow(toCode, currentFactorGroup, 'imports');
                const flow = (exports + imports) / 2;
                
                if (flow > 0) {
                    links.push({
                        source: fromCode,
                        target: toCode,
                        value: flow,
                        lineStyle: {
                            width: Math.max(1, Math.min(10, Math.sqrt(flow) / 1000)),
                            color: COUNTRIES[fromCode]?.color || '#999',
                            opacity: 0.4,
                            curveness: 0.3
                        }
                    });
                }
            }
        });
    });

    const option = {
        title: {
            text: 'Trade Flow Connections',
            left: 'center',
            top: 20,
            textStyle: {
                fontSize: 20,
                fontWeight: 600,
                color: '#2c3e50'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: params => {
                if (params.dataType === 'edge') {
                    const source = params.data.source;
                    const target = params.data.target;
                    const value = params.data.value;
                    if (source === target) {
                        return `<b>${COUNTRIES[source]?.name}</b><br/>
                                Domestic: ${formatNumber(value)}`;
                    }
                    return `<b>${COUNTRIES[source]?.name} → ${COUNTRIES[target]?.name}</b><br/>
                            Flow: ${formatNumber(value)}`;
                } else if (params.dataType === 'node') {
                    const code = params.data.id;
                    const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
                    const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
                    const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
                    return `<b>${params.data.name}</b><br/>
                            Domestic: ${formatNumber(domestic)}<br/>
                            Exports: ${formatNumber(exports)}<br/>
                            Imports: ${formatNumber(imports)}<br/>
                            Total: ${formatNumber(params.data.value)}`;
                }
            }
        },
        series: [{
            type: 'graph',
            layout: 'circular',
            circular: {
                rotateLabel: false
            },
            data: nodes,
            links: links,
            roam: true,
            label: {
                show: true,
                position: 'bottom',
                fontSize: 13,
                fontWeight: 600
            },
            lineStyle: {
                curveness: 0.3,
                opacity: 0.5
            },
            emphasis: {
                focus: 'adjacency',
                label: {
                    fontSize: 15,
                    fontWeight: 700
                },
                lineStyle: {
                    width: 'bolder',
                    opacity: 0.8
                }
            },
            animationDuration: 2000,
            animationEasing: 'cubicOut'
        }]
    };
    
    charts.chord.setOption(option, true);
    
    // Resize after animation
    setTimeout(() => {
        if (charts.chord && !charts.chord.isDisposed()) {
            charts.chord.resize();
        }
    }, 2100);
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
            
            // Sync Flow-Rings visualization with selected factor
            if (typeof syncFlowRingsWithFactor === 'function') {
                syncFlowRingsWithFactor();
            }
            
            // Sync Chord-Sankey visualization with selected factor
            if (typeof updateChordSankey === 'function') {
                updateChordSankey();
            }
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
// ==========================================
// SIMPLE FLOW-RINGS VISUALIZATION
// Simplified version for debugging
// ==========================================

console.log('Flow-Rings Script Loading...');

// Global state - MUST be declared before any functions use it
if (typeof window.FlowRingsState === 'undefined') {
    window.FlowRingsState = {
        initialized: false,
        svg: null,
        data: null
    };
}

// Make it easily accessible
var FlowRingsState = window.FlowRingsState;

console.log('FlowRingsState initialized:', FlowRingsState);

// Simple initialization that definitely works
function initFlowRingsSimple() {
    console.log('=== FLOW-RINGS INIT START ===');
    
    // 1. Check D3
    if (typeof d3 === 'undefined') {
        console.error('❌ D3 not loaded!');
        alert('D3.js not loaded! Check internet connection.');
        return;
    }
    console.log('✓ D3.js loaded');
    
    // 2. Check container
    const container = document.getElementById('flow-rings-viz');
    if (!container) {
        console.error('❌ Container not found!');
        alert('Flow-Rings container not found! Check HTML.');
        return;
    }
    console.log('✓ Container found');
    
    // 3. Check if already initialized
    if (FlowRingsState.initialized) {
        console.log('Already initialized, just updating...');
        updateFlowRingsSimple();
        return;
    }
    
    // 4. Create SVG
    const width = container.clientWidth || 800;
    const height = 800; // Increased from 600 to 800 for full rings visibility
    
    console.log(`Creating SVG: ${width}x${height}`);
    
    // Remove old SVG if exists
    d3.select('#flow-rings-viz').selectAll('*').remove();
    
    FlowRingsState.svg = d3.select('#flow-rings-viz')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('border', '2px solid #ccc')
        .style('background', '#f9f9f9');
    
    console.log('✓ SVG created');
    
    // 5. Add test circle to verify SVG works
    FlowRingsState.svg.append('circle')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', 50)
        .attr('fill', '#4fc3f7');
    
    FlowRingsState.svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', 'white')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text('FLOW-RINGS');
    
    console.log('✓ Test circle added');
    
    // 6. Initialize category toggles
    initCategoryToggles();
    
    FlowRingsState.initialized = true;
    console.log('=== FLOW-RINGS INIT COMPLETE ===');
    
    // 7. Sync with dashboard factor on first load
    if (typeof currentFactorGroup !== 'undefined') {
        syncFlowRingsWithFactor();
    }
    
    // 8. Try to render actual visualization
    setTimeout(() => {
        console.log('Attempting full render...');
        renderActualVisualization();
    }, 1000);
}

function initCategoryToggles() {
    const container = document.getElementById('category-toggles');
    if (!container) {
        console.warn('Category toggles container not found');
        return;
    }
    
    const categories = ['AIR', 'WATER', 'ENERGY', 'LAND', 'MATERIALS', 'EMPLOYMENT'];
    
    container.innerHTML = ''; // Clear existing
    
    // Initialize active categories based on current factor selection
    if (!FlowRingsState.activeCategories) {
        // Get current factor from dashboard
        const currentFactor = typeof currentFactorGroup !== 'undefined' ? currentFactorGroup : 'air';
        FlowRingsState.activeCategories = new Set([currentFactor.toUpperCase()]);
    }
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        // Check if this category matches the current factor
        const isActive = FlowRingsState.activeCategories.has(cat);
        btn.className = isActive ? 'category-toggle active' : 'category-toggle';
        btn.textContent = cat;
        btn.onclick = () => {
            btn.classList.toggle('active');
            const isNowActive = btn.classList.contains('active');
            
            if (isNowActive) {
                FlowRingsState.activeCategories.add(cat);
            } else {
                FlowRingsState.activeCategories.delete(cat);
            }
            
            console.log(`Toggled ${cat}: ${isNowActive}`);
            console.log('Active categories:', Array.from(FlowRingsState.activeCategories));
            
            // Re-render visualization
            renderActualVisualization();
        };
        container.appendChild(btn);
    });
    
    console.log('✓ Category toggles created');
    console.log('Initial active category:', Array.from(FlowRingsState.activeCategories));
}

// Function to sync with dashboard factor selection
function syncFlowRingsWithFactor() {
    if (typeof currentFactorGroup === 'undefined') return;
    
    const factor = currentFactorGroup.toUpperCase();
    console.log(`Syncing Flow-Rings with factor: ${factor}`);
    
    // Update active categories to match current factor
    FlowRingsState.activeCategories = new Set([factor]);
    
    // Update toggle button states
    document.querySelectorAll('.category-toggle').forEach(btn => {
        const category = btn.textContent;
        if (category === factor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Re-render if initialized
    if (FlowRingsState.initialized) {
        renderActualVisualization();
    }
}

function renderActualVisualization() {
    console.log('=== RENDERING ACTUAL VISUALIZATION ===');
    
    // Check if we have selected countries
    if (typeof selectedCountries === 'undefined') {
        console.warn('selectedCountries not defined yet');
        showMessage('Dashboard not fully loaded. Click "Render Visualization" button.');
        return;
    }
    
    if (selectedCountries.size === 0) {
        console.log('No countries selected');
        showMessage('Select countries from the dashboard above');
        return;
    }
    
    console.log(`Selected countries: ${Array.from(selectedCountries).join(', ')}`);
    
    // Check if we have COUNTRIES data
    if (typeof COUNTRIES === 'undefined') {
        console.error('COUNTRIES object not defined');
        showMessage('Dashboard data not loaded');
        return;
    }
    
    console.log('✓ Dashboard data available');
    
    // Get active categories
    const activeCategories = FlowRingsState.activeCategories 
        ? Array.from(FlowRingsState.activeCategories).map(c => c.toLowerCase())
        : ['air', 'water', 'energy', 'land', 'materials', 'employment'];
    
    if (activeCategories.length === 0) {
        showMessage('Select at least one category to display');
        return;
    }
    
    console.log(`Active categories: ${activeCategories.join(', ')}`);
    
    // Clear SVG
    FlowRingsState.svg.selectAll('*').remove();
    
    const width = parseInt(FlowRingsState.svg.attr('width'));
    const height = parseInt(FlowRingsState.svg.attr('height'));
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw simple concentric rings
    const countries = Array.from(selectedCountries);
    const categories = activeCategories;
    const allColors = {
        'air': '#FF6B6B',
        'water': '#4ECDC4',
        'energy': '#FFD93D',
        'land': '#6BCF7F',
        'materials': '#A78BFA',
        'employment': '#FB923C'
    };
    
    // Calculate ring dimensions to fit within SVG with padding
    const padding = 60; // Padding from edges
    const maxRadius = Math.min(width, height) / 2 - padding;
    const innerRadius = 50;
    const availableSpace = maxRadius - innerRadius;
    const numRings = categories.length;
    const ringWidth = availableSpace / (numRings * 1.2); // 1.2 for gaps
    const ringGap = ringWidth * 0.2;
    
    console.log(`Drawing ${categories.length} rings for ${countries.length} countries`);
    console.log(`SVG size: ${width}x${height}, Max radius: ${maxRadius}, Ring width: ${ringWidth.toFixed(1)}`);
    
    categories.forEach((category, catIndex) => {
        const radius = innerRadius + catIndex * (ringWidth + ringGap);
        const color = allColors[category] || '#999';
        
        // Draw ring background
        FlowRingsState.svg.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', radius + ringWidth / 2)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', ringWidth)
            .attr('opacity', 0.3);
        
        // Draw ring label
        FlowRingsState.svg.append('text')
            .attr('x', centerX)
            .attr('y', centerY - radius - ringWidth - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', color)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(category.toUpperCase());
        
        // Draw country arcs
        const anglePerCountry = (Math.PI * 2) / countries.length;
        
        countries.forEach((countryCode, countryIndex) => {
            const startAngle = anglePerCountry * countryIndex - Math.PI / 2;
            const endAngle = startAngle + anglePerCountry * 0.9; // 90% to leave gaps
            
            const arc = d3.arc()
                .innerRadius(radius)
                .outerRadius(radius + ringWidth)
                .startAngle(startAngle)
                .endAngle(endAngle);
            
            FlowRingsState.svg.append('path')
                .attr('d', arc)
                .attr('transform', `translate(${centerX}, ${centerY})`)
                .attr('fill', color)
                .attr('opacity', 0.7)
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .attr('class', 'flow-arc')
                .style('cursor', 'pointer')
                .on('mouseenter', function(event) {
                    d3.select(this).attr('opacity', 1);
                    showTooltip(countryCode, category, event);
                })
                .on('mousemove', function(event) {
                    updateTooltipPosition(event);
                })
                .on('mouseleave', function() {
                    d3.select(this).attr('opacity', 0.7);
                    hideTooltip();
                });
            
            // Add country label if arc is big enough
            if (countries.length <= 8) {
                const labelAngle = (startAngle + endAngle) / 2;
                const labelRadius = radius + ringWidth / 2;
                const labelX = centerX + Math.cos(labelAngle) * labelRadius;
                const labelY = centerY + Math.sin(labelAngle) * labelRadius;
                
                FlowRingsState.svg.append('text')
                    .attr('x', labelX)
                    .attr('y', labelY)
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em')
                    .attr('fill', 'white')
                    .attr('font-size', '10px')
                    .attr('font-weight', 'bold')
                    .style('pointer-events', 'none')
                    .text(countryCode);
            }
        });
    });
    
    // Add center label
    FlowRingsState.svg.append('text')
        .attr('x', centerX)
        .attr('y', centerY)
        .attr('text-anchor', 'middle')
        .attr('fill', '#333')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text(`${countries.length} Countries`);
    
    FlowRingsState.svg.append('text')
        .attr('x', centerX)
        .attr('y', centerY + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '12px')
        .text(`${categories.length} Active ${categories.length === 1 ? 'Category' : 'Categories'}`);
    
    console.log('✓ Visualization rendered successfully!');
}

function showMessage(text) {
    if (!FlowRingsState.svg) return;
    
    FlowRingsState.svg.selectAll('*').remove();
    
    const width = parseInt(FlowRingsState.svg.attr('width'));
    const height = parseInt(FlowRingsState.svg.attr('height'));
    
    FlowRingsState.svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#999')
        .attr('font-size', '18px')
        .text(text);
}

function showTooltip(countryCode, category, event) {
    console.log('=== TOOLTIP SHOW CALLED ===');
    console.log('Country:', countryCode);
    console.log('Category:', category);
    console.log('Event:', event);
    
    const tooltip = document.getElementById('flow-tooltip');
    console.log('Tooltip element:', tooltip);
    
    if (!tooltip) {
        console.error('❌ CRITICAL: Tooltip element #flow-tooltip not found in DOM!');
        console.log('Available elements with "tooltip":', document.querySelectorAll('[id*="tooltip"]'));
        alert('ERROR: Tooltip element not found! Check console.');
        return;
    }
    
    console.log('✓ Tooltip element found');
    console.log('Current classes:', tooltip.className);
    console.log('Current style:', tooltip.style.cssText);
    
    const countryName = COUNTRIES[countryCode]?.name || countryCode;
    const countryFlag = COUNTRIES[countryCode]?.flag || '🌍';
    
    // Get data for this country and category
    let value = 0;
    let details = '';
    
    if (typeof calculateTotalByFlow === 'function') {
        const domestic = calculateTotalByFlow(countryCode, category, 'domestic');
        const exports = calculateTotalByFlow(countryCode, category, 'exports');
        const imports = calculateTotalByFlow(countryCode, category, 'imports');
        const total = domestic + exports + imports;
        
        value = total;
        details = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="opacity: 0.9;">🏭 Domestic:</span>
                    <strong>${formatNumber(domestic)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="opacity: 0.9;">📤 Exports:</span>
                    <strong>${formatNumber(exports)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="opacity: 0.9;">📥 Imports:</span>
                    <strong>${formatNumber(imports)}</strong>
                </div>
            </div>
        `;
        console.log('Data calculated - Total:', formatNumber(total));
    }
    
    tooltip.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">${countryFlag}</span>
            <div>
                <div style="font-weight: bold; font-size: 14px;">${countryName}</div>
                <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">${category}</div>
            </div>
        </div>
        ${value > 0 ? `
            <div style="margin-bottom: 6px;">
                <div style="font-size: 11px; opacity: 0.8; margin-bottom: 2px;">Total Impact:</div>
                <div style="font-size: 16px; font-weight: bold; color: #4fc3f7;">${formatNumber(value)}</div>
            </div>
        ` : ''}
        ${details}
    `;
    
    console.log('✓ Tooltip content set');
    
    // Make visible using class
    tooltip.classList.add('visible');
    console.log('✓ Added "visible" class');
    console.log('Classes after add:', tooltip.className);
    
    // Also set inline styles as backup
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
    console.log('✓ Inline styles set');
    
    // Position immediately
    if (event) {
        updateTooltipPosition(event);
        console.log('✓ Tooltip positioned');
    }
    
    console.log('=== TOOLTIP SHOULD BE VISIBLE NOW ===');
    console.log('Final computed style:', window.getComputedStyle(tooltip).display);
    console.log('Final opacity:', window.getComputedStyle(tooltip).opacity);
    console.log('Final visibility:', window.getComputedStyle(tooltip).visibility);
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('flow-tooltip');
    if (!tooltip) return;
    
    const offsetX = 15;
    const offsetY = 15;
    
    // Use clientX/clientY for fixed position elements
    let x = event.clientX + offsetX;
    let y = event.clientY + offsetY;
    
    // Keep tooltip on screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (x + tooltipRect.width > window.innerWidth) {
        x = event.clientX - tooltipRect.width - offsetX;
    }
    if (y + tooltipRect.height > window.innerHeight) {
        y = event.clientY - tooltipRect.height - offsetY;
    }
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function positionTooltip(event) {
    // Alias for compatibility
    updateTooltipPosition(event);
}

function hideTooltip() {
    const tooltip = document.getElementById('flow-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
        // Also reset inline styles to ensure it hides
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
    }
    console.log('✓ Tooltip hidden');
}

function updateFlowRingsSimple() {
    console.log('Updating Flow-Rings...');
    renderActualVisualization();
}

// Export functions globally
window.initFlowRingsSimple = initFlowRingsSimple;
window.updateFlowRingsSimple = updateFlowRingsSimple;
window.renderFlowRings = renderActualVisualization;
window.syncFlowRingsWithFactor = syncFlowRingsWithFactor;

// Auto-initialize
console.log('Setting up auto-initialization...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, waiting 2 seconds...');
        setTimeout(initFlowRingsSimple, 2000);
    });
} else {
    console.log('DOM already loaded, initializing in 2 seconds...');
    setTimeout(initFlowRingsSimple, 2000);
}

console.log('Flow-Rings Script Loaded!');
console.log('Manual commands: initFlowRingsSimple(), renderFlowRings(), syncFlowRingsWithFactor()');

// ==========================================
// CHORD-SANKEY HYBRID FOR TRADE FLOWS
// Advanced interactive visualization combining chord and sankey diagrams
// ==========================================

console.log('Chord-Sankey Hybrid Script Loading...');

// Global state for Chord-Sankey
if (typeof window.ChordSankeyState === 'undefined') {
    window.ChordSankeyState = {
        initialized: false,
        svg: null,
        data: null,
        selectedFlow: null,
        animating: false,
        hoveredCountry: null,
        clickedCountry: null
    };
}

var ChordSankeyState = window.ChordSankeyState;

// Color scale for environmental impact (gradient from low to high impact)
const impactColorScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(d3.interpolateRgbBasis([
        '#2ecc71', // Low impact (green)
        '#f39c12', // Medium impact (orange)
        '#e74c3c'  // High impact (red)
    ]));

// Initialize Chord-Sankey visualization
function initChordSankey() {
    console.log('=== CHORD-SANKEY INIT START ===');
    
    // Check D3
    if (typeof d3 === 'undefined') {
        console.error('❌ D3 not loaded!');
        return;
    }
    console.log('✓ D3.js loaded');
    
    // Check container
    const container = document.getElementById('chart-chord-sankey');
    if (!container) {
        console.error('❌ Container not found!');
        return;
    }
    console.log('✓ Container found');
    
    // Check if already initialized
    if (ChordSankeyState.initialized) {
        console.log('Already initialized, updating...');
        updateChordSankey();
        return;
    }
    
    // Create SVG
    const width = container.clientWidth || 1000;
    const height = 700;
    
    console.log(`Creating SVG: ${width}x${height}`);
    
    // Remove old SVG if exists
    d3.select('#chart-chord-sankey').selectAll('*').remove();
    
    ChordSankeyState.svg = d3.select('#chart-chord-sankey')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Add definitions for gradients and glows
    const defs = ChordSankeyState.svg.append('defs');
    
    // Create glow filter
    const filter = defs.append('filter')
        .attr('id', 'chord-glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
    
    filter.append('feGaussianBlur')
        .attr('stdDeviation', '4')
        .attr('result', 'coloredBlur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    
    // Create stronger glow for hover
    const filterHover = defs.append('filter')
        .attr('id', 'chord-glow-hover')
        .attr('x', '-100%')
        .attr('y', '-100%')
        .attr('width', '300%')
        .attr('height', '300%');
    
    filterHover.append('feGaussianBlur')
        .attr('stdDeviation', '8')
        .attr('result', 'coloredBlur');
    
    const feMergeHover = filterHover.append('feMerge');
    feMergeHover.append('feMergeNode').attr('in', 'coloredBlur');
    feMergeHover.append('feMergeNode').attr('in', 'SourceGraphic');
    
    console.log('✓ SVG created with filters');
    
    ChordSankeyState.initialized = true;
    console.log('=== CHORD-SANKEY INIT COMPLETE ===');
    
    // Render visualization
    setTimeout(() => {
        renderChordSankey();
    }, 500);
}

function renderChordSankey() {
    console.log('=== RENDERING CHORD-SANKEY ===');
    
    // Check if we have selected countries
    if (typeof selectedCountries === 'undefined' || selectedCountries.size === 0) {
        showChordMessage('Select at least 2 countries to view trade flows');
        return;
    }
    
    if (selectedCountries.size < 2) {
        showChordMessage('Select at least 2 countries to view trade flows');
        return;
    }
    
    console.log(`Selected countries: ${Array.from(selectedCountries).join(', ')}`);
    
    // Clear SVG
    ChordSankeyState.svg.selectAll('g').remove();
    
    const width = parseInt(ChordSankeyState.svg.attr('width'));
    const height = parseInt(ChordSankeyState.svg.attr('height'));
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 120;
    
    // Prepare data
    const countries = Array.from(selectedCountries);
    const n = countries.length;
    
    // Calculate trade flows and environmental impacts
    const flowData = calculateTradeFlows(countries);
    
    // Create chord layout
    const chordGenerator = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);
    
    const chords = chordGenerator(flowData.matrix);
    
    // Create arc generator for country segments
    const arc = d3.arc()
        .innerRadius(radius - 30)
        .outerRadius(radius);
    
    // Create ribbon generator for flows
    const ribbon = d3.ribbon()
        .radius(radius - 35);
    
    // Main group
    const g = ChordSankeyState.svg.append('g')
        .attr('transform', `translate(${centerX},${centerY})`);
    
    // Add background circles for depth
    g.append('circle')
        .attr('r', radius + 10)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.05)')
        .attr('stroke-width', 1);
    
    g.append('circle')
        .attr('r', radius - 40)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.03)')
        .attr('stroke-width', 1);
    
    // Draw country arcs (outer ring)
    const arcs = g.append('g')
        .selectAll('g')
        .data(chords.groups)
        .enter()
        .append('g')
        .attr('class', 'country-arc-group');
    
    arcs.append('path')
        .attr('class', 'country-arc')
        .attr('d', arc)
        .attr('fill', (d, i) => COUNTRIES[countries[i]].color)
        .attr('stroke', 'rgba(255,255,255,0.3)')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .style('filter', 'url(#chord-glow)')
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
            handleCountryHover(d.index, true, this);
        })
        .on('mouseleave', function(event, d) {
            handleCountryHover(d.index, false, this);
        })
        .on('click', function(event, d) {
            handleCountryClick(d.index, this);
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .attr('opacity', 0.8);
    
    // Add country labels
    arcs.append('text')
        .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr('dy', '.35em')
        .attr('transform', d => {
            const angle = d.angle * 180 / Math.PI - 90;
            const rotate = angle > 90 ? angle + 180 : angle;
            return `rotate(${angle}) translate(${radius + 15}) rotate(${angle > 90 ? 180 : 0})`;
        })
        .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
        .attr('fill', 'white')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('opacity', 0)
        .text((d, i) => countries[i])
        .transition()
        .duration(800)
        .delay((d, i) => i * 100 + 500)
        .attr('opacity', 1);
    
    // Add country flags
    arcs.append('text')
        .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr('transform', d => {
            const angle = d.angle * 180 / Math.PI - 90;
            return `rotate(${angle}) translate(${radius + 40})`;
        })
        .attr('text-anchor', 'middle')
        .attr('font-size', '20px')
        .attr('opacity', 0)
        .text((d, i) => COUNTRIES[countries[i]].flag)
        .transition()
        .duration(800)
        .delay((d, i) => i * 100 + 700)
        .attr('opacity', 1);
    
    // Draw trade flow ribbons (connections)
    const ribbons = g.append('g')
        .attr('class', 'ribbons')
        .selectAll('path')
        .data(chords)
        .enter()
        .append('path')
        .attr('class', 'trade-ribbon')
        .attr('d', ribbon)
        .attr('fill', d => {
            const impact = flowData.impacts[d.source.index][d.target.index];
            return impactColorScale(impact);
        })
        .attr('opacity', 0)
        .attr('stroke', 'none')
        .style('filter', 'url(#chord-glow)')
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
            handleRibbonHover(d, true, this);
        })
        .on('mouseleave', function(event, d) {
            handleRibbonHover(d, false, this);
        })
        .on('click', function(event, d) {
            handleRibbonClick(d, this);
        });
    
    // Animate ribbons with staggered delay
    ribbons.transition()
        .duration(1200)
        .delay((d, i) => 1000 + i * 50)
        .attr('opacity', d => {
            const value = d.source.value;
            const maxValue = d3.max(chords, c => c.source.value);
            return 0.3 + (value / maxValue) * 0.5;
        });
    
    // Add animated particles along ribbons
    setTimeout(() => {
        addFlowParticles(g, chords, ribbon, countries, flowData);
    }, 2000);
    
    // Add center title
    g.append('text')
        .attr('x', 0)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '24px')
        .attr('font-weight', 'bold')
        .attr('opacity', 0)
        .text('Global Trade Flows')
        .transition()
        .duration(1000)
        .delay(2500)
        .attr('opacity', 1);
    
    g.append('text')
        .attr('x', 0)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.7)')
        .attr('font-size', '14px')
        .attr('opacity', 0)
        .text(`${countries.length} Countries • ${currentFactorGroup.toUpperCase()} Impact`)
        .transition()
        .duration(1000)
        .delay(2700)
        .attr('opacity', 1);
    
    // Add legend
    addImpactLegend(g, radius);
    
    console.log('✓ Chord-Sankey rendered successfully!');
}

function calculateTradeFlows(countries) {
    const n = countries.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    const impacts = Array(n).fill(0).map(() => Array(n).fill(0));
    
    let maxFlow = 0;
    
    // Calculate flows between countries
    countries.forEach((sourceCode, i) => {
        countries.forEach((targetCode, j) => {
            if (i !== j) {
                // Export from source to target
                const exportValue = calculateTotalByFlow(sourceCode, currentFactorGroup, 'exports');
                const importValue = calculateTotalByFlow(targetCode, currentFactorGroup, 'imports');
                
                // Flow is average of export and import (simplified)
                const flow = (exportValue + importValue) / (2 * n);
                matrix[i][j] = flow;
                
                if (flow > maxFlow) maxFlow = flow;
                
                // Calculate environmental impact (normalized)
                const domesticSource = calculateTotalByFlow(sourceCode, currentFactorGroup, 'domestic');
                const domesticTarget = calculateTotalByFlow(targetCode, currentFactorGroup, 'domestic');
                const totalImpact = domesticSource + domesticTarget + exportValue + importValue;
                
                impacts[i][j] = totalImpact;
            }
        });
    });
    
    // Normalize impacts to 0-1 range
    const maxImpact = d3.max(impacts.flat());
    if (maxImpact > 0) {
        impacts.forEach((row, i) => {
            row.forEach((val, j) => {
                impacts[i][j] = val / maxImpact;
            });
        });
    }
    
    return { matrix, impacts };
}

function handleCountryHover(index, isEnter, element) {
    const countries = Array.from(selectedCountries);
    const countryCode = countries[index];
    
    if (isEnter) {
        ChordSankeyState.hoveredCountry = index;
        
        // Highlight arc
        d3.select(element)
            .transition()
            .duration(200)
            .attr('opacity', 1)
            .style('filter', 'url(#chord-glow-hover)');
        
        // Dim other arcs
        d3.selectAll('.country-arc')
            .filter((d, i) => i !== index)
            .transition()
            .duration(200)
            .attr('opacity', 0.3);
        
        // Highlight related ribbons
        d3.selectAll('.trade-ribbon')
            .filter(d => d.source.index === index || d.target.index === index)
            .transition()
            .duration(200)
            .attr('opacity', 0.9)
            .style('filter', 'url(#chord-glow-hover)');
        
        // Dim other ribbons
        d3.selectAll('.trade-ribbon')
            .filter(d => d.source.index !== index && d.target.index !== index)
            .transition()
            .duration(200)
            .attr('opacity', 0.1);
        
        // Show tooltip
        showChordTooltip(countryCode, 'country', event);
        
    } else {
        ChordSankeyState.hoveredCountry = null;
        
        // Reset if not clicked
        if (ChordSankeyState.clickedCountry === null) {
            d3.select(element)
                .transition()
                .duration(200)
                .attr('opacity', 0.8)
                .style('filter', 'url(#chord-glow)');
            
            d3.selectAll('.country-arc')
                .transition()
                .duration(200)
                .attr('opacity', 0.8)
                .style('filter', 'url(#chord-glow)');
            
            d3.selectAll('.trade-ribbon')
                .transition()
                .duration(200)
                .attr('opacity', d => {
                    const maxValue = d3.max(d3.selectAll('.trade-ribbon').data(), c => c.source.value);
                    return 0.3 + (d.source.value / maxValue) * 0.5;
                })
                .style('filter', 'url(#chord-glow)');
        }
        
        hideChordTooltip();
    }
}

function handleCountryClick(index, element) {
    const countries = Array.from(selectedCountries);
    
    if (ChordSankeyState.clickedCountry === index) {
        // Unclick
        ChordSankeyState.clickedCountry = null;
        
        // Reset all
        d3.selectAll('.country-arc')
            .transition()
            .duration(300)
            .attr('opacity', 0.8)
            .style('filter', 'url(#chord-glow)');
        
        d3.selectAll('.trade-ribbon')
            .transition()
            .duration(300)
            .attr('opacity', d => {
                const maxValue = d3.max(d3.selectAll('.trade-ribbon').data(), c => c.source.value);
                return 0.3 + (d.source.value / maxValue) * 0.5;
            })
            .style('filter', 'url(#chord-glow)');
        
    } else {
        // Click new country
        ChordSankeyState.clickedCountry = index;
        
        // Keep this country and its connections highlighted
        d3.select(element)
            .transition()
            .duration(300)
            .attr('opacity', 1)
            .style('filter', 'url(#chord-glow-hover)');
        
        d3.selectAll('.country-arc')
            .filter((d, i) => i !== index)
            .transition()
            .duration(300)
            .attr('opacity', 0.2);
        
        d3.selectAll('.trade-ribbon')
            .filter(d => d.source.index === index || d.target.index === index)
            .transition()
            .duration(300)
            .attr('opacity', 0.9)
            .style('filter', 'url(#chord-glow-hover)');
        
        d3.selectAll('.trade-ribbon')
            .filter(d => d.source.index !== index && d.target.index !== index)
            .transition()
            .duration(300)
            .attr('opacity', 0.05);
        
        console.log(`Locked focus on ${countries[index]}`);
    }
}

function handleRibbonHover(d, isEnter, element) {
    const countries = Array.from(selectedCountries);
    const sourceCountry = countries[d.source.index];
    const targetCountry = countries[d.target.index];
    
    if (isEnter) {
        // Highlight this ribbon
        d3.select(element)
            .transition()
            .duration(200)
            .attr('opacity', 1)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('filter', 'url(#chord-glow-hover)');
        
        // Dim others
        d3.selectAll('.trade-ribbon')
            .filter(ribbon => ribbon !== d)
            .transition()
            .duration(200)
            .attr('opacity', 0.1);
        
        // Show flow tooltip
        showFlowTooltip(sourceCountry, targetCountry, d.source.value, event);
        
    } else {
        if (ChordSankeyState.clickedCountry === null) {
            d3.select(element)
                .transition()
                .duration(200)
                .attr('opacity', 0.6)
                .attr('stroke', 'none')
                .style('filter', 'url(#chord-glow)');
            
            d3.selectAll('.trade-ribbon')
                .transition()
                .duration(200)
                .attr('opacity', ribbon => {
                    const maxValue = d3.max(d3.selectAll('.trade-ribbon').data(), c => c.source.value);
                    return 0.3 + (ribbon.source.value / maxValue) * 0.5;
                })
                .attr('stroke', 'none');
        }
        
        hideChordTooltip();
    }
}

function handleRibbonClick(d, element) {
    console.log(`Flow from ${d.source.index} to ${d.target.index}, value: ${formatNumber(d.source.value)}`);
    
    // Pulse animation
    d3.select(element)
        .transition()
        .duration(200)
        .attr('opacity', 1)
        .transition()
        .duration(200)
        .attr('opacity', 0.6)
        .transition()
        .duration(200)
        .attr('opacity', 1);
}

function addFlowParticles(g, chords, ribbon, countries, flowData) {
    const particles = g.append('g')
        .attr('class', 'flow-particles');
    
    // Create particles for top flows
    const topFlows = chords
        .filter(d => d.source.value > 0)
        .sort((a, b) => b.source.value - a.source.value)
        .slice(0, Math.min(10, chords.length));
    
    topFlows.forEach((chord, i) => {
        const path = ribbon(chord);
        const pathLength = path ? 500 : 0; // Approximate
        
        if (pathLength === 0) return;
        
        // Create multiple particles per flow
        for (let p = 0; p < 3; p++) {
            const particle = particles.append('circle')
                .attr('r', 4)
                .attr('fill', impactColorScale(flowData.impacts[chord.source.index][chord.target.index]))
                .attr('opacity', 0)
                .style('filter', 'url(#chord-glow)');
            
            animateParticle(particle, chord, ribbon, p * 0.33);
        }
    });
}

function animateParticle(particle, chord, ribbon, offset) {
    const duration = 3000;
    
    function animate() {
        particle
            .transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .attrTween('transform', () => {
                return t => {
                    const adjustedT = ((t + offset) % 1);
                    const point = ribbon.centroid ? ribbon.centroid(chord) : [0, 0];
                    
                    // Simplified path animation
                    const angle = chord.source.startAngle + (chord.target.startAngle - chord.source.startAngle) * adjustedT;
                    const radius = (chord.source.value / 2) * (1 - Math.abs(adjustedT - 0.5) * 2);
                    
                    const x = Math.cos(angle - Math.PI / 2) * radius;
                    const y = Math.sin(angle - Math.PI / 2) * radius;
                    
                    return `translate(${x}, ${y})`;
                };
            })
            .attr('opacity', t => {
                const adjustedT = ((t + offset) % 1);
                return Math.sin(adjustedT * Math.PI) * 0.8;
            })
            .on('end', animate);
    }
    
    animate();
}

function addImpactLegend(g, radius) {
    const legendGroup = g.append('g')
        .attr('class', 'impact-legend')
        .attr('transform', `translate(${-radius - 80}, ${-radius + 50})`);
    
    legendGroup.append('text')
        .attr('x', 0)
        .attr('y', -15)
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text('Environmental Impact');
    
    const legendScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 150]);
    
    // Gradient bar
    const gradient = legendGroup.append('defs')
        .append('linearGradient')
        .attr('id', 'impact-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
    
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#e74c3c');
    
    gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', '#f39c12');
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#2ecc71');
    
    legendGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 20)
        .attr('height', 150)
        .attr('fill', 'url(#impact-gradient)')
        .attr('rx', 4);
    
    legendGroup.append('text')
        .attr('x', 30)
        .attr('y', 5)
        .attr('fill', 'rgba(255,255,255,0.8)')
        .attr('font-size', '10px')
        .text('High');
    
    legendGroup.append('text')
        .attr('x', 30)
        .attr('y', 150)
        .attr('fill', 'rgba(255,255,255,0.8)')
        .attr('font-size', '10px')
        .text('Low');
}

function showChordMessage(text) {
    if (!ChordSankeyState.svg) return;
    
    ChordSankeyState.svg.selectAll('*').remove();
    
    const width = parseInt(ChordSankeyState.svg.attr('width'));
    const height = parseInt(ChordSankeyState.svg.attr('height'));
    
    ChordSankeyState.svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '18px')
        .attr('opacity', 0.7)
        .text(text);
}

function showChordTooltip(countryCode, type, event) {
    const tooltip = document.getElementById('chord-tooltip');
    if (!tooltip) return;
    
    const country = COUNTRIES[countryCode];
    const totalExports = calculateTotalByFlow(countryCode, currentFactorGroup, 'exports');
    const totalImports = calculateTotalByFlow(countryCode, currentFactorGroup, 'imports');
    const domestic = calculateTotalByFlow(countryCode, currentFactorGroup, 'domestic');
    
    tooltip.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 28px; margin-right: 10px;">${country.flag}</span>
            <div>
                <div style="font-weight: bold; font-size: 16px; color: ${country.color};">${country.name}</div>
                <div style="font-size: 11px; opacity: 0.8;">Trade Flow Analysis</div>
            </div>
        </div>
        <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="opacity: 0.9;">📤 Total Exports:</span>
                <strong style="color: #3498db;">${formatNumber(totalExports)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="opacity: 0.9;">📥 Total Imports:</span>
                <strong style="color: #e74c3c;">${formatNumber(totalImports)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="opacity: 0.9;">🏭 Domestic:</span>
                <strong style="color: #2ecc71;">${formatNumber(domestic)}</strong>
            </div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 10px; opacity: 0.7;">
            Click to lock focus • Hover ribbons for flow details
        </div>
    `;
    
    tooltip.classList.add('visible');
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
    
    updateChordTooltipPosition(event);
}

function showFlowTooltip(sourceCode, targetCode, value, event) {
    const tooltip = document.getElementById('chord-tooltip');
    if (!tooltip) return;
    
    const source = COUNTRIES[sourceCode];
    const target = COUNTRIES[targetCode];
    
    const impact = calculateTotalByFlow(sourceCode, currentFactorGroup, 'exports') + 
                   calculateTotalByFlow(targetCode, currentFactorGroup, 'imports');
    
    tooltip.innerHTML = `
        <div style="margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 24px; margin-right: 6px;">${source.flag}</span>
                    <span style="font-weight: 600; color: ${source.color};">${source.name}</span>
                </div>
                <span style="font-size: 20px; margin: 0 10px; opacity: 0.5;">→</span>
                <div style="display: flex; align-items: center;">
                    <span style="font-weight: 600; color: ${target.color};">${target.name}</span>
                    <span style="font-size: 24px; margin-left: 6px;">${target.flag}</span>
                </div>
            </div>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin-bottom: 8px;">
            <div style="text-align: center;">
                <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Trade Flow Volume</div>
                <div style="font-size: 20px; font-weight: bold; color: #4fc3f7;">${formatNumber(value)}</div>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span style="opacity: 0.8;">Environmental Impact:</span>
            <strong style="color: ${impactColorScale(impact / d3.max([impact, 1000000000]))};">${formatNumber(impact)}</strong>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 10px; opacity: 0.6; text-align: center;">
            Click for detailed breakdown
        </div>
    `;
    
    tooltip.classList.add('visible');
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
    
    updateChordTooltipPosition(event);
}

function updateChordTooltipPosition(event) {
    const tooltip = document.getElementById('chord-tooltip');
    if (!tooltip) return;
    
    const offsetX = 15;
    const offsetY = 15;
    
    let x = event.clientX + offsetX;
    let y = event.clientY + offsetY;
    
    const tooltipRect = tooltip.getBoundingClientRect();
    if (x + tooltipRect.width > window.innerWidth) {
        x = event.clientX - tooltipRect.width - offsetX;
    }
    if (y + tooltipRect.height > window.innerHeight) {
        y = event.clientY - tooltipRect.height - offsetY;
    }
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function hideChordTooltip() {
    const tooltip = document.getElementById('chord-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
    }
}

function updateChordSankey() {
    console.log('Updating Chord-Sankey...');
    renderChordSankey();
}

// Export functions globally
window.initChordSankey = initChordSankey;
window.updateChordSankey = updateChordSankey;
window.renderChordSankey = renderChordSankey;

console.log('Chord-Sankey Hybrid Script Loaded!');

// ==========================================
// CHORD-SANKEY HELPER FUNCTIONS
// Control functions for mode switching and interactions
// ==========================================

let chordMode = 'all';
let animationsEnabled = true;

function setChordMode(mode) {
    chordMode = mode;
    
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    console.log(`Chord mode set to: ${mode}`);
    
    // Re-render with new mode
    if (typeof renderChordSankey === 'function') {
        renderChordSankey();
    }
}

function resetChordFocus() {
    if (typeof ChordSankeyState !== 'undefined') {
        ChordSankeyState.clickedCountry = null;
        ChordSankeyState.hoveredCountry = null;
    }
    
    // Reset all visual elements
    if (typeof d3 !== 'undefined') {
        d3.selectAll('.country-arc')
            .transition()
            .duration(300)
            .attr('opacity', 0.8)
            .style('filter', 'url(#glow)');
        
        d3.selectAll('.trade-ribbon')
            .transition()
            .duration(300)
            .attr('opacity', d => {
                const maxValue = d3.max(d3.selectAll('.trade-ribbon').data(), c => c.source.value);
                return 0.3 + (d.source.value / maxValue) * 0.5;
            })
            .attr('stroke', 'none')
            .style('filter', 'url(#glow)');
    }
    
    console.log('Chord focus reset');
}

function toggleAnimations() {
    animationsEnabled = !animationsEnabled;
    
    const btn = event.currentTarget;
    const icon = btn.querySelector('.btn-icon');
    
    if (animationsEnabled) {
        icon.textContent = '✨';
        btn.style.opacity = '1';
        
        // Re-enable animations
        d3.selectAll('.flow-particles circle')
            .style('display', 'block');
        
        console.log('Animations enabled');
    } else {
        icon.textContent = '⏸️';
        btn.style.opacity = '0.6';
        
        // Hide animated particles
        d3.selectAll('.flow-particles circle')
            .style('display', 'none');
        
        console.log('Animations disabled');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, waiting for Chord-Sankey initialization...');
        setTimeout(() => {
            if (typeof initChordSankey === 'function') {
                initChordSankey();
            }
        }, 2500);
    });
} else {
    console.log('DOM already loaded, initializing Chord-Sankey...');
    setTimeout(() => {
        if (typeof initChordSankey === 'function') {
            initChordSankey();
        }
    }, 2500);
}

// Export helper functions
window.setChordMode = setChordMode;
window.resetChordFocus = resetChordFocus;
window.toggleAnimations = toggleAnimations;
window.exportChordSankeyAsSVG = exportChordSankeyAsSVG;
window.exportChordSankeyAsPNG = exportChordSankeyAsPNG;

// Export Chord-Sankey as SVG
function exportChordSankeyAsSVG() {
    console.log('Exporting Chord-Sankey as SVG...');
    
    const svg = document.querySelector('#chart-chord-sankey svg');
    if (!svg) {
        alert('No visualization to export. Please render the Chord-Sankey first.');
        return;
    }
    
    // Clone the SVG
    const svgClone = svg.cloneNode(true);
    
    // Get dimensions
    const width = svg.getAttribute('width') || svg.getBoundingClientRect().width;
    const height = svg.getAttribute('height') || svg.getBoundingClientRect().height;
    
    // Set dimensions on clone
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Add white background
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', '#0f0c29');
    svgClone.insertBefore(background, svgClone.firstChild);
    
    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    
    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `chord-sankey-${currentFactorGroup}-${new Date().getTime()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ SVG exported successfully!');
}

// Export Chord-Sankey as PNG
function exportChordSankeyAsPNG() {
    console.log('Exporting Chord-Sankey as PNG...');
    
    const svg = document.querySelector('#chart-chord-sankey svg');
    if (!svg) {
        alert('No visualization to export. Please render the Chord-Sankey first.');
        return;
    }
    
    // Get dimensions
    const width = svg.getAttribute('width') || svg.getBoundingClientRect().width;
    const height = svg.getAttribute('height') || svg.getBoundingClientRect().height;
    
    // Clone and prepare SVG
    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Add background
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', '#0f0c29');
    svgClone.insertBefore(background, svgClone.firstChild);
    
    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    
    // Create image from SVG
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = function() {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // 2x for higher resolution
        canvas.height = height * 2;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2); // Scale for higher resolution
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG and download
        canvas.toBlob(function(blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `chord-sankey-${currentFactorGroup}-${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
            URL.revokeObjectURL(url);
            
            console.log('✅ PNG exported successfully!');
        }, 'image/png');
    };
    
    img.onerror = function() {
        console.error('Failed to load SVG for PNG conversion');
        alert('Failed to export PNG. Please try again.');
        URL.revokeObjectURL(url);
    };
    
    img.src = url;
}

console.log('Chord-Sankey Helper Functions Loaded!');

// ==========================================
// PLOTLY 3D TOPOGRAPHIC SURFACE
// Reliable, production-ready solution
// ==========================================

console.log('🌍 Plotly Topographic Surface Loading...');

const PlotlyTopo = {
    container: null,
    mode: 'impact',
    currentFactor: 'air',
    plotData: null
};

// Country positions (normalized to 0-100 grid)
const COUNTRY_GRID = {
    US: { x: 15, y: 60, name: 'United States' },
    CN: { x: 75, y: 55, name: 'China' },
    DE: { x: 48, y: 70, name: 'Germany' },
    JP: { x: 85, y: 55, name: 'Japan' },
    GB: { x: 45, y: 72, name: 'United Kingdom' },
    FR: { x: 47, y: 65, name: 'France' },
    CA: { x: 18, y: 75, name: 'Canada' },
    BR: { x: 30, y: 25, name: 'Brazil' },
    IT: { x: 50, y: 62, name: 'Italy' },
    RU: { x: 70, y: 80, name: 'Russia' },
    IN: { x: 72, y: 45, name: 'India' },
    KR: { x: 82, y: 58, name: 'South Korea' },
    AU: { x: 85, y: 15, name: 'Australia' },
    MX: { x: 20, y: 48, name: 'Mexico' }
};

// Impact data
const COUNTRY_IMPACT = {
    US: { co2: 85, water: 72, energy: 88, land: 65, materials: 78, volume: 920 },
    CN: { co2: 92, water: 88, energy: 95, land: 82, materials: 90, volume: 950 },
    DE: { co2: 68, water: 55, energy: 72, land: 48, materials: 65, volume: 780 },
    JP: { co2: 75, water: 82, energy: 78, land: 58, materials: 72, volume: 820 },
    GB: { co2: 62, water: 48, energy: 65, land: 42, materials: 58, volume: 680 },
    FR: { co2: 58, water: 52, energy: 62, land: 45, materials: 55, volume: 650 },
    CA: { co2: 78, water: 68, energy: 82, land: 72, materials: 75, volume: 720 },
    BR: { co2: 72, water: 85, energy: 65, land: 88, materials: 68, volume: 580 },
    IT: { co2: 55, water: 48, energy: 58, land: 42, materials: 52, volume: 520 },
    RU: { co2: 88, water: 78, energy: 92, land: 85, materials: 82, volume: 680 },
    IN: { co2: 82, water: 92, energy: 85, land: 78, materials: 80, volume: 720 },
    KR: { co2: 72, water: 78, energy: 75, land: 62, materials: 70, volume: 780 },
    AU: { co2: 68, water: 58, energy: 72, land: 92, materials: 65, volume: 520 },
    MX: { co2: 65, water: 72, energy: 68, land: 75, materials: 62, volume: 480 }
};

// Initialize Plotly visualization
function initPlotlyTopo() {
    console.log('🎨 Initializing Plotly 3D Topography...');
    
    // Check if Plotly is loaded
    if (typeof Plotly === 'undefined') {
        console.error('❌ Plotly not loaded! Loading now...');
        loadPlotlyAndInit();
        return;
    }
    
    const container = document.getElementById('topo-3d-container');
    if (!container) {
        console.error('❌ Container not found');
        return;
    }
    
    PlotlyTopo.container = container;
    container.innerHTML = '<div id="plotly-chart" style="width: 100%; height: 100%;"></div>';
    
    // Create the 3D surface
    createPlotlySurface();
    
    // Hide loading
    const loading = document.getElementById('topo-loading');
    if (loading) {
        loading.style.display = 'none';
    }
    
    console.log('✅ Plotly 3D Topography Initialized!');
}

// Load Plotly dynamically if needed
function loadPlotlyAndInit() {
    const script = document.createElement('script');
    script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
    script.onload = () => {
        console.log('✅ Plotly loaded!');
        setTimeout(initPlotlyTopo, 100);
    };
    script.onerror = () => {
        console.error('❌ Failed to load Plotly');
        const container = document.getElementById('topo-3d-container');
        if (container) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #e74c3c;"><h3>Failed to load visualization library</h3><p>Please check your internet connection and refresh the page.</p></div>';
        }
    };
    document.head.appendChild(script);
}

// Create 3D surface plot
function createPlotlySurface() {
    const gridSize = 50;
    const z = createTerrainGrid(gridSize);
    
    // Create color scale based on elevation
    const colorscale = [
        [0, '#2ecc71'],      // Green (low)
        [0.33, '#3498db'],   // Blue
        [0.66, '#f39c12'],   // Orange
        [1, '#e74c3c']       // Red (high)
    ];
    
    const data = [{
        type: 'surface',
        z: z,
        colorscale: colorscale,
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "#42f462",
                project: { z: true }
            }
        },
        lighting: {
            ambient: 0.4,
            diffuse: 0.8,
            specular: 0.2,
            roughness: 0.5,
            fresnel: 0.2
        },
        hidesurface: false,
        showscale: true,
        colorbar: {
            title: 'Impact<br>Level',
            titleside: 'right',
            tickmode: 'linear',
            tick0: 0,
            dtick: 25,
            thickness: 20,
            len: 0.7,
            bgcolor: 'rgba(0,0,0,0)',
            bordercolor: 'rgba(255,255,255,0.2)',
            borderwidth: 1,
            tickfont: { color: '#ffffff', size: 10 },
            titlefont: { color: '#4a90e2', size: 12 }
        },
        hovertemplate: '<b>Impact: %{z:.0f}</b><br>Location: (%{x}, %{y})<extra></extra>'
    }];
    
    // Add country markers
    const selectedCountries = window.selectedCountries || Object.keys(COUNTRY_GRID);
    const markerX = [];
    const markerY = [];
    const markerZ = [];
    const markerText = [];
    const markerColors = [];
    
    selectedCountries.forEach(code => {
        const pos = COUNTRY_GRID[code];
        const impact = calculateImpact(code);
        
        if (pos) {
            markerX.push(pos.x);
            markerY.push(pos.y);
            markerZ.push(impact.elevation + 5); // Slightly above surface
            markerText.push(`<b>${pos.name}</b><br>Impact: ${Math.round(impact.elevation)}<br>CO₂: ${impact.co2}<br>Water: ${impact.water}`);
            markerColors.push(getImpactColor(impact.elevation));
        }
    });
    
    // Add marker trace
    data.push({
        type: 'scatter3d',
        mode: 'markers+text',
        x: markerX,
        y: markerY,
        z: markerZ,
        text: selectedCountries.map(code => COUNTRY_GRID[code]?.name || code),
        textposition: 'top center',
        textfont: {
            color: '#ffffff',
            size: 9,
            family: 'Arial, sans-serif'
        },
        marker: {
            size: 8,
            color: markerColors,
            symbol: 'diamond',
            line: {
                color: '#ffffff',
                width: 2
            }
        },
        hovertext: markerText,
        hoverinfo: 'text',
        showlegend: false
    });
    
    const layout = {
        title: {
            text: '3D Topographic Impact Map',
            font: {
                color: '#ffffff',
                size: 18,
                family: 'Inter, sans-serif'
            },
            y: 0.98,
            x: 0.5,
            xanchor: 'center',
            yanchor: 'top'
        },
        autosize: true,
        scene: {
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.3 },
                center: { x: 0, y: 0, z: -0.1 }
            },
            xaxis: {
                title: 'Longitude →',
                titlefont: { color: '#4a90e2', size: 10 },
                gridcolor: 'rgba(255,255,255,0.1)',
                showbackground: true,
                backgroundcolor: 'rgba(10,10,15,0.8)',
                tickfont: { color: '#888', size: 9 }
            },
            yaxis: {
                title: 'Latitude →',
                titlefont: { color: '#4a90e2', size: 10 },
                gridcolor: 'rgba(255,255,255,0.1)',
                showbackground: true,
                backgroundcolor: 'rgba(10,10,15,0.8)',
                tickfont: { color: '#888', size: 9 }
            },
            zaxis: {
                title: 'Impact →',
                titlefont: { color: '#4a90e2', size: 10 },
                gridcolor: 'rgba(255,255,255,0.1)',
                showbackground: true,
                backgroundcolor: 'rgba(10,10,15,0.8)',
                range: [0, 120],
                tickfont: { color: '#888', size: 9 }
            },
            aspectmode: 'manual',
            aspectratio: { x: 1, y: 1, z: 0.6 }
        },
        paper_bgcolor: 'rgba(10,10,15,0.95)',
        plot_bgcolor: 'rgba(10,10,15,0.95)',
        margin: { l: 0, r: 0, t: 40, b: 0 },
        hoverlabel: {
            bgcolor: 'rgba(10,10,15,0.95)',
            bordercolor: '#4a90e2',
            font: { color: '#ffffff', size: 11 }
        }
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage'],
        modeBarButtonsToAdd: [{
            name: 'Reset View',
            icon: Plotly.Icons.home,
            click: function() {
                Plotly.relayout('plotly-chart', {
                    'scene.camera': {
                        eye: { x: 1.5, y: 1.5, z: 1.3 },
                        center: { x: 0, y: 0, z: -0.1 }
                    }
                });
            }
        }]
    };
    
    Plotly.newPlot('plotly-chart', data, layout, config);
    
    PlotlyTopo.plotData = { data, layout, config };
}

// Create terrain grid with country peaks
function createTerrainGrid(size) {
    const grid = [];
    const selectedCountries = window.selectedCountries || Object.keys(COUNTRY_GRID);
    
    // Initialize base terrain
    for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) {
            row.push(5); // Base elevation
        }
        grid.push(row);
    }
    
    // Add country peaks
    selectedCountries.forEach(code => {
        const pos = COUNTRY_GRID[code];
        const impact = calculateImpact(code);
        
        if (!pos) return;
        
        const centerX = Math.round((pos.x / 100) * (size - 1));
        const centerY = Math.round((pos.y / 100) * (size - 1));
        const height = impact.elevation;
        const radius = 6;
        
        // Create gaussian-like peak
        for (let i = Math.max(0, centerY - radius); i < Math.min(size, centerY + radius); i++) {
            for (let j = Math.max(0, centerX - radius); j < Math.min(size, centerX + radius); j++) {
                const dx = j - centerX;
                const dy = i - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < radius) {
                    const falloff = 1 - (dist / radius);
                    const elevation = height * falloff * falloff; // Quadratic falloff
                    grid[i][j] = Math.max(grid[i][j], elevation);
                }
            }
        }
    });
    
    return grid;
}

// Calculate impact
function calculateImpact(code) {
    const data = COUNTRY_IMPACT[code] || { co2: 50, water: 50, energy: 50, land: 50, materials: 50, volume: 500 };
    
    const factorMap = {
        'air': data.co2,
        'water': data.water,
        'energy': data.energy,
        'land': data.land,
        'materials': data.materials,
        'employment': (data.co2 + data.energy) / 2
    };
    
    const impactValue = factorMap[PlotlyTopo.currentFactor] || data.co2;
    
    let elevation;
    if (PlotlyTopo.mode === 'impact') {
        elevation = impactValue;
    } else if (PlotlyTopo.mode === 'volume') {
        elevation = (data.volume / 1000) * 100;
    } else {
        elevation = (impactValue * 0.6) + ((data.volume / 1000) * 100 * 0.4);
    }
    
    return {
        elevation: Math.min(100, elevation),
        ...data
    };
}

// Get impact color
function getImpactColor(elevation) {
    if (elevation < 25) return '#2ecc71';
    if (elevation < 50) return '#3498db';
    if (elevation < 75) return '#f39c12';
    return '#e74c3c';
}

// Update mode
function updateTopoMode(mode) {
    PlotlyTopo.mode = mode;
    
    document.querySelectorAll('.topo-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    if (PlotlyTopo.plotData) {
        createPlotlySurface();
    }
}

// Update factor
function updateTopoFactor(factor) {
    PlotlyTopo.currentFactor = factor;
    
    if (PlotlyTopo.plotData) {
        createPlotlySurface();
    }
}

// Reset camera
function resetTopoCamera() {
    if (typeof Plotly !== 'undefined') {
        Plotly.relayout('plotly-chart', {
            'scene.camera': {
                eye: { x: 1.5, y: 1.5, z: 1.3 },
                center: { x: 0, y: 0, z: -0.1 }
            }
        });
    }
}

// Toggle auto-rotate
function toggleAutoRotate() {
    // Plotly doesn't have built-in auto-rotate, but we can implement it
    console.log('Auto-rotate toggle (manual rotation available via drag)');
}

// Export functions
window.initPlotlyTopo = initPlotlyTopo;
window.updateTopoMode = updateTopoMode;
window.updateTopoFactor = updateTopoFactor;
window.resetTopoCamera = resetTopoCamera;
window.toggleAutoRotate = toggleAutoRotate;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initPlotlyTopo, 500);
    });
} else {
    setTimeout(initPlotlyTopo, 500);
}

console.log('✅ Plotly Topographic Module Loaded');

// ==========================================
// TOPOGRAPHIC HELPER FUNCTIONS
// Integration with main dashboard
// ==========================================

// Reset camera to default position
function resetTopoCamera() {
    if (!TopoState.camera || !TopoState.controls) return;
    
    // Animate camera back to default
    const startPos = TopoState.camera.position.clone();
    const targetPos = new THREE.Vector3(15, 20, 15);
    const duration = 1500;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
        
        TopoState.camera.position.lerpVectors(startPos, targetPos, eased);
        TopoState.camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else if (TopoState.controls) {
            TopoState.controls.target.set(0, 0, 0);
            TopoState.controls.update();
        }
    }
    
    animate();
}

// Toggle auto-rotate
let autoRotateEnabled = true;
function toggleAutoRotate() {
    if (!TopoState.controls) return;
    
    autoRotateEnabled = !autoRotateEnabled;
    TopoState.controls.autoRotate = autoRotateEnabled;
    
    const btn = document.querySelector('.topo-view-controls button:last-child');
    if (btn) {
        btn.style.background = autoRotateEnabled 
            ? 'rgba(74, 144, 226, 0.3)' 
            : 'rgba(10, 10, 15, 0.8)';
    }
}

// Sync with dashboard factor selection
function syncTopoWithFactor(factor) {
    console.log(`Syncing topography with factor: ${factor}`);
    
    const factorMap = {
        'air': 'air',
        'water': 'water',
        'energy': 'energy',
        'land': 'land',
        'materials': 'materials',
        'employment': 'employment'
    };
    
    const mappedFactor = factorMap[factor] || 'air';
    updateTopoFactor(mappedFactor);
    
    // Update display
    const factorDisplay = document.getElementById('topo-current-factor');
    if (factorDisplay) {
        const factorNames = {
            'air': 'Air Quality',
            'water': 'Water Use',
            'energy': 'Energy Consumption',
            'land': 'Land Use',
            'materials': 'Materials',
            'employment': 'Employment Impact'
        };
        factorDisplay.textContent = factorNames[mappedFactor] || 'Air Quality';
    }
}

// Sync with selected countries
function syncTopoWithCountries(countries) {
    console.log(`Syncing topography with countries:`, countries);
    
    window.selectedCountries = countries;
    
    // Update count display
    const countDisplay = document.getElementById('topo-country-count');
    if (countDisplay) {
        countDisplay.textContent = countries.length;
    }
    
    // Rebuild if already initialized
    if (TopoState.scene) {
        rebuildTerrains();
    }
}

// Update mode display
function updateModeDisplay(mode) {
    const modeDisplay = document.getElementById('topo-current-mode');
    if (modeDisplay) {
        const modeNames = {
            'impact': 'Impact',
            'volume': 'Volume',
            'composite': 'Composite'
        };
        modeDisplay.textContent = modeNames[mode] || 'Impact';
    }
}

// Hook into existing factor button system
if (typeof initializeFactorButtons === 'function') {
    const originalInitialize = initializeFactorButtons;
    initializeFactorButtons = function() {
        originalInitialize();
        
        // Add topography sync to factor buttons
        const factorButtons = document.querySelectorAll('.factor-button');
        factorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const factor = button.dataset.factor;
                setTimeout(() => {
                    syncTopoWithFactor(factor);
                }, 100);
            });
        });
    };
}

// Export functions
window.resetTopoCamera = resetTopoCamera;
window.toggleAutoRotate = toggleAutoRotate;
window.syncTopoWithFactor = syncTopoWithFactor;
window.syncTopoWithCountries = syncTopoWithCountries;
window.updateModeDisplay = updateModeDisplay;

console.log('✅ Topographic helper functions loaded');