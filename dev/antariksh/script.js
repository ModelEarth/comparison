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
        return;
    }
    
    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        const country = COUNTRIES[code];
        const card = document.createElement('div');
        card.className = 'country-card';
        card.style.borderLeft = `4px solid ${country.color}`;
        
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

function updateStoryline() {
    const container = document.getElementById('storyline-content');
    
    if (selectedCountries.size === 0) {
        container.innerHTML = '<p class="storyline-empty">Select countries to see their environmental impact story</p>';
        return;
    }
    
    let storylineHTML = '<div class="storyline-wrapper">';
    
    Array.from(selectedCountries).forEach((code, index) => {
        if (!COUNTRIES[code]) return;
        
        const country = COUNTRIES[code];
        const total = calculateTotalForCountry(code, currentFactorGroup);
        const domestic = calculateTotalByFlow(code, currentFactorGroup, 'domestic');
        const exports = calculateTotalByFlow(code, currentFactorGroup, 'exports');
        const imports = calculateTotalByFlow(code, currentFactorGroup, 'imports');
        
        const dominantFlow = Math.max(domestic, exports, imports);
        let flowType = 'domestic production';
        if (dominantFlow === exports) flowType = 'export activities';
        if (dominantFlow === imports) flowType = 'import activities';
        
        const percentage = total > 0 ? ((dominantFlow / total) * 100).toFixed(0) : 0;
        
        storylineHTML += `
            <div class="storyline-card" style="border-left: 5px solid ${country.color}">
                <div class="storyline-header">
                    <span class="storyline-flag"><span class="fi fi-${code.toLowerCase()}" style="display:inline-block;width:28px;height:21px;"></span></span>
                    <h3>${country.name}</h3>
                    <span class="storyline-chapter">Chapter ${index + 1}</span>
                </div>
                <div class="storyline-body">
                    <p class="storyline-lead">
                        In 2019, <strong>${country.name}</strong>'s ${currentFactorGroup} impact story begins with 
                        <strong>${flowType}</strong>, accounting for <strong>${percentage}%</strong> of its total footprint.
                    </p>
                    <div class="storyline-metrics">
                        <div class="storyline-metric">
                            <div class="metric-icon">🏭</div>
                            <div class="metric-content">
                                <span class="metric-label">Domestic Impact</span>
                                <span class="metric-value">${formatNumber(domestic)}</span>
                            </div>
                        </div>
                        <div class="storyline-metric">
                            <div class="metric-icon">📤</div>
                            <div class="metric-content">
                                <span class="metric-label">Export Impact</span>
                                <span class="metric-value">${formatNumber(exports)}</span>
                            </div>
                        </div>
                        <div class="storyline-metric">
                            <div class="metric-icon">📥</div>
                            <div class="metric-content">
                                <span class="metric-label">Import Impact</span>
                                <span class="metric-value">${formatNumber(imports)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="storyline-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${total > 0 ? (domestic/total)*100 : 0}%; background: ${country.color}"></div>
                            <div class="progress-fill" style="width: ${total > 0 ? (exports/total)*100 : 0}%; background: ${country.color}; opacity: 0.7"></div>
                            <div class="progress-fill" style="width: ${total > 0 ? (imports/total)*100 : 0}%; background: ${country.color}; opacity: 0.4"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    storylineHTML += '</div>';
    container.innerHTML = storylineHTML;
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
    const chartDiv = document.getElementById('chart-pie');
    if (!charts.pie) {
        charts.pie = echarts.init(chartDiv);
    }

    const data = [];
    selectedCountries.forEach(code => {
        if (!COUNTRIES[code]) return;
        
        TRADE_FLOWS.forEach(flow => {
            const value = calculateTotalByFlow(code, currentFactorGroup, flow);
            if (value > 0) {
                data.push({
                    name: `[${code}] ${COUNTRIES[code].name} - ${flow}`,
                    value: value,
                    itemStyle: {
                        color: COUNTRIES[code].color,
                        opacity: flow === 'domestic' ? 1 : (flow === 'exports' ? 0.8 : 0.6)
                    }
                });
            }
        });
    });

    const option = {
        animationDuration: 1500,
        animationEasing: 'cubicInOut',
        tooltip: {
            trigger: 'item',
            formatter: params => `${params.name}<br/>${formatNumber(params.value)} (${params.percent}%)`,
            backgroundColor: 'rgba(50,50,50,0.9)',
            borderColor: '#333',
            borderWidth: 1,
            textStyle: {
                color: '#fff',
                fontSize: 13
            }
        },
        legend: {
            type: 'scroll',
            orient: 'vertical',
            right: 10,
            top: 'center',
            textStyle: { 
                fontSize: 11,
                lineHeight: 16
            },
            pageIconSize: 12,
            pageTextStyle: {
                fontSize: 11
            }
        },
        series: [{
            type: 'pie',
            radius: ['35%', '65%'],
            center: ['40%', '50%'],
            roseType: 'area',
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 8,
                borderColor: '#fff',
                borderWidth: 3
            },
            label: {
                show: true,
                position: 'outside',
                fontSize: 11,
                lineHeight: 14,
                formatter: '{d}%',
                color: '#333'
            },
            labelLine: {
                show: true,
                length: 10,
                length2: 10,
                smooth: 0.3
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 13,
                    fontWeight: 'bold'
                },
                itemStyle: {
                    shadowBlur: 15,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.4)'
                },
                scale: true,
                scaleSize: 8
            },
            data: data
        }]
    };

    charts.pie.setOption(option, true);
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
        const gaugeChart = echarts.init(gaugeChartDiv);
        
        charts[`gauge-${code}`] = gaugeChart;
        
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
        
        setTimeout(() => {
            gaugeChart.setOption({
                series: [{
                    data: [{
                        value: percentage.toFixed(1)
                    }]
                }]
            });
        }, 100);
    });
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
    
    debugLog(`📊 PERFORMANCE METRICS:`);
    debugLog(`   • Total files loaded: ${filesLoaded}`);
    debugLog(`   • Countries: ${Object.keys(COUNTRIES).length}`);
    debugLog(`   • Load time: ${loadTime} seconds`);
    debugLog(`   • Files per second: ${(filesLoaded / loadTime).toFixed(1)}`);
    debugLog(`   • Errors: ${loadingErrors.length}`);
    
    debugLog('Updating UI...');
    updateUI();
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
    
    initMap();
    
    const factorSelect = document.getElementById('factor-group');
    if (factorSelect) {
        factorSelect.addEventListener('change', (e) => {
            currentFactorGroup = e.target.value;
            debugLog(`Factor group changed to: ${currentFactorGroup}`);
            updateUI();
        });
    }
    
    window.addEventListener('resize', () => {
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    });
    
    // Update button states to show USA as selected
    updateCountryButtonStates();
    
    loadAllData();
});

window.toggleCountry = toggleCountry;
window.selectAllCountries = selectAllCountries;
window.clearAllCountries = clearAllCountries;
window.toggleRegion = toggleRegion;