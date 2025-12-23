// Global variables
let map;
let selectedCountries = new Set(['US', 'IN']);
let countryData = {};
let charts = {};
let csvData = {};
let tradeData = {};
let industryData = {};
let factorData = {};
let echartsInstances = {};
let currentAnalysisMode = 'air_emissions';
let currentIndustryFilter = 'all';

// Configuration
const DATA_CONFIG = {
    baseUrl: 'https://raw.githubusercontent.com/ModelEarth/trade-data/main',
    year: 2022,  // Can be changed to 2020, 2021, etc.
    availableYears: [2022] // Add more as data becomes available
};

// Helper function to build data URLs
function getDataUrl(path) {
    return `${DATA_CONFIG.baseUrl}/year/${DATA_CONFIG.year}/${path}`;
}

// Country information with coordinates and flags (alphabetized)
const COUNTRIES = {
    'AE': { name: 'United Arab Emirates', coords: [23.4241, 53.8478], flag: '🇦🇪', color: '#8e44ad' },
    'AU': { name: 'Australia', coords: [-25.2744, 133.7751], flag: '🇦🇺', color: '#607d8b' },
    'BR': { name: 'Brazil', coords: [-14.2350, -51.9253], flag: '🇧🇷', color: '#795548' },
    'CA': { name: 'Canada', coords: [56.1304, -106.3468], flag: '🇨🇦', color: '#e91e63' },
    'CN': { name: 'China', coords: [35.8617, 104.1954], flag: '🇨🇳', color: '#f39c12' },
    'DE': { name: 'Germany', coords: [51.1657, 10.4515], flag: '🇩🇪', color: '#9b59b6' },
    'FR': { name: 'France', coords: [46.2276, 2.2137], flag: '🇫🇷', color: '#e67e22' },
    'GB': { name: 'United Kingdom', coords: [55.3781, -3.4360], flag: '🇬🇧', color: '#34495e' },
    'IN': { name: 'India', coords: [20.5937, 78.9629], flag: '🇮🇳', color: '#e74c3c' },
    'IT': { name: 'Italy', coords: [41.8719, 12.5674], flag: '🇮🇹', color: '#2ecc71' },
    'JP': { name: 'Japan', coords: [36.2048, 138.2529], flag: '🇯🇵', color: '#1abc9c' },
    'KR': { name: 'South Korea', coords: [35.9078, 127.7669], flag: '🇰🇷', color: '#ff5722' },
    'RU': { name: 'Russia', coords: [61.5240, 105.3188], flag: '🇷🇺', color: '#d35400' },
    'SA': { name: 'Saudi Arabia', coords: [23.8859, 45.0792], flag: '🇸🇦', color: '#27ae60' },
    'US': { name: 'United States', coords: [39.8283, -98.5795], flag: '🇺🇸', color: '#3498db' },
    'ZA': { name: 'South Africa', coords: [-30.5595, 22.9375], flag: '🇿🇦', color: '#16a085' }
};

// Factor groupings for analysis
const FACTOR_GROUPINGS = {
    air_emissions: {
        title: '🌫️ Air Emissions & Climate Impact',
        description: 'Analyzing greenhouse gas emissions, air pollutants, and climate change impacts from trade activities (SDG 13)',
        factors: ['CO2', 'CH4', 'N2O', 'NOx', 'SO2', 'NH3', 'PM10', 'PM2.5', 'CO']
    },
    employment: {
        title: '👥 Employment & Social Impact', 
        description: 'Examining job creation, labor intensity, and social impacts of international trade (SDG 8)',
        factors: ['Employment people', 'Employment hours']
    },
    energy: {
        title: '⚡ Energy & Resource Intensity',
        description: 'Evaluating energy consumption patterns and renewable energy integration in trade (SDG 7)',
        factors: ['Energy use', 'Electricity', 'Natural gas', 'Oil', 'Coal']
    },
    water: {
        title: '💧 Water Usage & Sustainability',
        description: 'Assessing water consumption, withdrawal, and sustainability in trade networks (SDG 6)',
        factors: ['Water consumption', 'Water withdrawal']
    },
    materials: {
        title: '🏗️ Materials & Circular Economy',
        description: 'Analyzing material flows, extraction, and circular economy indicators in global trade',
        factors: ['Metal Ores', 'Non-Metallic Minerals', 'Fossil Fuels', 'Primary Crops']
    },
    health: {
        title: '🏥 Health & Environmental Quality',
        description: 'Evaluating health impacts and environmental quality effects of trade activities (SDG 3)',
        factors: ['As', 'Cd', 'Cr', 'Hg', 'Ni', 'Pb', 'HCB', 'PM10', 'PM2.5']
    }
};

// Industry category mappings
const INDUSTRY_CATEGORIES = {
    'AGRIC': ['PADDY', 'WHEAT', 'CEREA', 'VEGET', 'OILSE', 'SUGAR', 'PLANT', 'CROPS', 'CATTL', 'PIGS9', 'POULT', 'MEATA', 'ANIMA', 'RAWMI', 'WOOLS', 'MANUR', 'MANU1', 'FORES', 'FISHF'],
    'MANUF': ['MEAT9', 'FISHP', 'VEGOI', 'DAIRY', 'GRAIN', 'SUGAR', 'FOOD9', 'BEVER', 'TOBAC', 'TEXTI', 'WEARI', 'LEATH', 'WOOD9', 'PAPER', 'PRINT', 'COKE9', 'CHEMI', 'PHARM', 'RUBBE', 'PLAST', 'GLAS9', 'CEMEN', 'STEEL', 'ALUMI', 'METAL', 'COMPU', 'ELECT', 'MACHI', 'MOTOR', 'TRANS', 'FURNI', 'OTHER'],
    'ENERG': ['COAL9', 'LIGNI', 'OILGA', 'NATGA', 'OILPR', 'ELECT', 'GASMA', 'STEAM', 'WATER'],
    'CONST': ['CONST'],
    'TRANS': ['TRADE', 'LAND9', 'WATER', 'AIR99', 'AUXIL'],
    'SERVI': ['POST9', 'ACCOM', 'PUBLI', 'TELEC', 'FINAN', 'REALE', 'RENTAL', 'BUSIN', 'PUBAD', 'EDUCA', 'HEALT', 'ARTS9', 'OTHER', 'DOMES', 'EXTR9']
};

// Priority factors for analysis
const PRIORITY_FACTORS = {
    air_emissions: ['CO2', 'CH4', 'N2O', 'NOX', 'CO', 'SO2', 'NH3', 'PM10', 'PM2.5'],
    employment: ['Employment people', 'Employment hours'],
    energy: ['Energy use', 'Electricity', 'Natural gas', 'Oil'],
    water: ['Water consumption', 'Water withdrawal'],
    land: ['Cropland', 'Forest', 'Pastures', 'Artificial'],
    material: ['Metal Ores', 'Non-Metallic Minerals', 'Fossil Fuels', 'Primary Crops']
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadCountryData();
    setupEventListeners();
    updateCountryPanels();
    initializeCharts();
    loadTradeDataSystem();
    
    // Apply Motion.dev animations
    applyAnimations();
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        scrollWheelZoom: false // Disabled initially
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Add country markers
    Object.entries(COUNTRIES).forEach(([code, country]) => {
        const isSelected = selectedCountries.has(code);
        const marker = L.circleMarker(country.coords, {
            radius: isSelected ? 12 : 8,
            fillColor: isSelected ? country.color : '#95a5a6',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: isSelected ? 0.8 : 0.4
        }).addTo(map);

        // Create popup content
        const popupContent = createMapPopup(code, country, isSelected);
        marker.bindPopup(popupContent);

        // Handle marker click
        marker.on('click', () => toggleCountrySelection(code));
        
        // Store marker reference
        country.marker = marker;
    });

    updateMapLegend();
    createFloatingLegend();
    
    // Add scroll message overlay
    addScrollMessage();
    
    // Toggle scroll on map click
    map.on('click', toggleMapScroll);
    
    // Force map to invalidate size after initialization with multiple attempts
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
    
    // Additional size fixes for proper container filling
    setTimeout(() => {
        map.invalidateSize();
    }, 500);
    
    setTimeout(() => {
        map.invalidateSize();
    }, 1000);
}

// Create map popup content
function createMapPopup(code, country, isSelected) {
    const data = getCountryMockData(code);
    return `
        <div class="map-popup">
            <div class="popup-header">
                <span class="popup-flag">${country.flag}</span>
                <h3>${country.name}</h3>
                <span class="popup-status ${isSelected ? 'selected' : 'available'}">${isSelected ? 'Selected' : 'Available'}</span>
            </div>
            <div class="popup-metrics">
                <div class="popup-metric">
                    <strong>${data.tradeFlows.toLocaleString()}</strong>
                    <span>Trade Flows</span>
                </div>
                <div class="popup-metric">
                    <strong>${data.factorRelationships.toLocaleString()}</strong>
                    <span>Environmental Factors</span>
                </div>
                <div class="popup-metric">
                    <strong>${data.employmentIntensity}×</strong>
                    <span>Employment Intensity</span>
                </div>
            </div>
            <button onclick="toggleCountrySelection('${code}')" class="popup-btn">
                ${isSelected ? 'Deselect' : 'Select'} Country
            </button>
        </div>
    `;
}

// Toggle country selection
function toggleCountrySelection(countryCode) {
    if (selectedCountries.has(countryCode)) {
        if (selectedCountries.size > 1) {
            selectedCountries.delete(countryCode);
        } else {
            // Prevent deselecting the last country
            return;
        }
    } else {
        if (selectedCountries.size < 12) {
            selectedCountries.add(countryCode);
        } else {
            // Show message about maximum countries
            showNotification('Maximum 12 countries can be selected');
            return;
        }
    }

    updateMapMarkers();
    updateMapLegend();
    updateCountryPanels();
    updateCharts();
    updateSelectionCount();
    
    // Reload trade data for new country selection if system is loaded
    if (echartsInstances.chart1) {
        loadSelectedCountriesData().then(() => {
            updateAllCharts();
        }).catch(error => {
            console.warn('Could not reload trade data for new selection:', error);
        });
    }
}

// Update map markers based on selection
function updateMapMarkers() {
    Object.entries(COUNTRIES).forEach(([code, country]) => {
        const isSelected = selectedCountries.has(code);
        const marker = country.marker;
        
        marker.setStyle({
            radius: isSelected ? 12 : 8,
            fillColor: isSelected ? country.color : '#95a5a6',
            fillOpacity: isSelected ? 0.8 : 0.4
        });

        // Update popup content
        const popupContent = createMapPopup(code, country, isSelected);
        marker.setPopupContent(popupContent);
    });
}

// Create floating legend over map
function createFloatingLegend() {
    const mapContainer = document.getElementById('map');
    const legend = document.createElement('div');
    legend.id = 'floating-legend';
    legend.innerHTML = '<div id="legend-content"></div>';
    legend.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 10px;
        padding: 15px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        z-index: 1000;
        max-height: 400px;
        overflow-y: auto;
        min-width: 200px;
        font-size: 14px;
    `;
    
    mapContainer.appendChild(legend);
    updateMapLegend();
}

// Update map legend (now in floating legend)
function updateMapLegend() {
    const legendContent = document.getElementById('legend-content');
    if (!legendContent) return;
    
    legendContent.innerHTML = '';

    // Get all countries in alphabetical order by country code
    const sortedCountries = Object.entries(COUNTRIES).sort(([a], [b]) => a.localeCompare(b));
    
    sortedCountries.forEach(([code, country]) => {
        const countryItem = createCountryLegendItem(code, country);
        legendContent.appendChild(countryItem);
    });
}

// Create country legend item
function createCountryLegendItem(code, country) {
    const isSelected = selectedCountries.has(code);
    const item = document.createElement('div');
    item.className = 'legend-country-item';
    item.onclick = () => toggleCountrySelection(code);
    
    const orangeColor = '#f39c12'; // Same orange as China
    item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        margin: 2px 0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        ${isSelected ? `background-color: ${orangeColor}; border-left: 3px solid ${orangeColor};` : 'border-left: 3px solid transparent;'}
    `;
    
    item.innerHTML = `
        <span style="font-size: 16px;">${country.flag}</span>
        <span style="font-size: 15px; font-weight: ${isSelected ? '600' : '500'}; color: ${isSelected ? 'white' : '#666'};">${country.name}</span>
        ${isSelected ? `<span style="margin-left: auto; font-size: 14px; color: white;">✓</span>` : ''}
    `;
    
    // Add hover effect
    item.addEventListener('mouseenter', () => {
        if (!isSelected) {
            item.style.backgroundColor = '#f5f5f5';
        }
    });
    
    item.addEventListener('mouseleave', () => {
        if (!isSelected) {
            item.style.backgroundColor = 'transparent';
        }
    });
    
    return item;
}

// Load country data from CSV files
async function loadCountryData() {
    try {
        // In a real implementation, you would load actual CSV files
        // For now, we'll use mock data based on the actual results
        countryData = {
            'US': {
                tradeFlows: 188735,
                factorRelationships: 125148,
                airEmissions: 49177,
                employment: 4121,
                energy: 51907,
                land: 7170,
                materials: 6853,
                water: 5920
            },
            'IN': {
                tradeFlows: 93845,
                factorRelationships: 82073,
                airEmissions: 19813,
                employment: 24039,
                energy: 15840,
                land: 3223,
                materials: 1193,
                water: 17965
            }
        };

        // Generate mock data for other countries
        Object.keys(COUNTRIES).forEach(code => {
            if (!countryData[code]) {
                countryData[code] = generateMockCountryData(code);
            }
        });

    } catch (error) {
        console.error('Error loading country data:', error);
        showNotification('Error loading data. Using sample data.');
    }
}

// Generate mock data for countries
function generateMockCountryData(countryCode) {
    const baseValues = {
        'CN': { multiplier: 2.1, employment: 1.8, water: 1.4 },
        'DE': { multiplier: 0.8, employment: 0.6, water: 0.3 },
        'JP': { multiplier: 0.9, employment: 0.5, water: 0.4 },
        'GB': { multiplier: 0.7, employment: 0.4, water: 0.2 },
        'FR': { multiplier: 0.6, employment: 0.5, water: 0.3 },
        'IT': { multiplier: 0.5, employment: 0.7, water: 0.4 },
        'CA': { multiplier: 0.4, employment: 0.3, water: 0.5 },
        'BR': { multiplier: 0.6, employment: 1.2, water: 0.8 },
        'AU': { multiplier: 0.3, employment: 0.2, water: 0.6 },
        'KR': { multiplier: 0.8, employment: 0.9, water: 0.5 }
    };

    const base = baseValues[countryCode] || { multiplier: 0.5, employment: 0.5, water: 0.5 };
    const usData = countryData['US'] || {
        tradeFlows: 188735,
        factorRelationships: 125148,
        airEmissions: 49177,
        employment: 4121,
        energy: 51907,
        land: 7170,
        materials: 6853,
        water: 5920
    };

    return {
        tradeFlows: Math.round(usData.tradeFlows * base.multiplier),
        factorRelationships: Math.round(usData.factorRelationships * base.multiplier),
        airEmissions: Math.round(usData.airEmissions * base.multiplier),
        employment: Math.round(usData.employment * base.employment),
        energy: Math.round(usData.energy * base.multiplier),
        land: Math.round(usData.land * base.multiplier),
        materials: Math.round(usData.materials * base.multiplier),
        water: Math.round(usData.water * base.water)
    };
}

// Get mock data for a country
function getCountryMockData(countryCode) {
    const data = countryData[countryCode];
    if (!data) return { tradeFlows: 0, factorRelationships: 0, employmentIntensity: 0 };
    
    const employmentIntensity = data.employment / (data.tradeFlows / 1000);
    return {
        ...data,
        employmentIntensity: employmentIntensity.toFixed(1)
    };
}

// Update country panels
function updateCountryPanels() {
    const panelGrid = document.getElementById('panel-grid');
    panelGrid.innerHTML = '';
    
    const selectedCountriesArray = Array.from(selectedCountries);
    
    // Calculate grid columns based on number of countries
    const columns = Math.min(selectedCountriesArray.length, 4);
    panelGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    
    selectedCountriesArray.forEach(countryCode => {
        const country = COUNTRIES[countryCode];
        const data = countryData[countryCode];
        
        const panel = document.createElement('div');
        panel.className = 'country-panel';
        panel.style.setProperty('--country-color', country.color);
        
        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-flag">${country.flag}</span>
                <div class="panel-info">
                    <h3>${country.name}</h3>
                    <p>Export Trade Analysis 2019</p>
                </div>
            </div>
            <div class="panel-metrics">
                <div class="metric-card">
                    <span class="metric-value">${data.tradeFlows.toLocaleString()}</span>
                    <span class="metric-label">Trade Flows</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${data.factorRelationships.toLocaleString()}</span>
                    <span class="metric-label">Environmental Factors</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${data.airEmissions.toLocaleString()}</span>
                    <span class="metric-label">Air Emissions</span>
                </div>
                <div class="metric-card">
                    <span class="metric-value">${data.employment.toLocaleString()}</span>
                    <span class="metric-label">Employment</span>
                </div>
            </div>
        `;
        
        panelGrid.appendChild(panel);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            switchTab(category);
        });
    });

    // Map expand button
    document.getElementById('expand-map').addEventListener('click', () => {
        const mapElement = document.getElementById('map');
        mapElement.classList.toggle('expanded');
        
        // Resize map after animation
        setTimeout(() => {
            map.invalidateSize();
        }, 500);
    });

    // Update selection count
    updateSelectionCount();
}

// Switch between chart tabs
function switchTab(category) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    // Update chart sections
    document.querySelectorAll('.chart-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${category}-section`).classList.add('active');

    // Update charts for the active section
    updateChartsForCategory(category);
}

// Initialize all charts
function initializeCharts() {
    // Initialize charts for the active tab (air emissions by default)
    updateChartsForCategory('air');
}

// Update charts for specific category
function updateChartsForCategory(category) {
    // Update the dynamic analysis system instead of old static charts
    if (category === 'air' && echartsInstances.chart1) {
        updateAllCharts();
    } else {
        // Handle other legacy tabs if needed
        switch(category) {
            case 'water':
                createWaterCharts();
                break;
            case 'land':
                createLandUseCharts();
                break;
            case 'energy':
                createEnergyCharts();
                break;
            case 'material':
                createMaterialsCharts();
                break;
            case 'employment':
                createEmploymentCharts();
                break;
        }
    }
}

// Create air emissions charts
function createAirEmissionsCharts() {
    // Air Emissions Comparison Chart
    const ctx1 = document.getElementById('air-emissions-comparison');
    if (charts.airComparison) charts.airComparison.destroy();
    
    const selectedData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        value: countryData[code].airEmissions,
        color: COUNTRIES[code].color,
        flag: COUNTRIES[code].flag
    }));

    charts.airComparison = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: selectedData.map(d => `${d.flag} ${d.country}`),
            datasets: [{
                label: 'Air Emission Factors',
                data: selectedData.map(d => d.value),
                backgroundColor: selectedData.map(d => d.color + '80'),
                borderColor: selectedData.map(d => d.color),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Air Emissions Impact Comparison',
                    font: { size: 16, weight: 'bold' }
                },
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Factor Relationships'
                    }
                }
            }
        }
    });

    // CO2 Breakdown Chart
    const ctx2 = document.getElementById('co2-breakdown');
    if (charts.co2Breakdown) charts.co2Breakdown.destroy();
    
    charts.co2Breakdown = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Combustion CO2', 'Process CO2', 'Biogenic CO2'],
            datasets: [{
                data: [65, 25, 10],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'CO2 Emissions Breakdown',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });

    // Air Pollutants Radar Chart
    const ctx3 = document.getElementById('air-pollutants-radar');
    if (charts.airRadar) charts.airRadar.destroy();
    
    const radarData = Array.from(selectedCountries).slice(0, 2).map(code => ({
        label: `${COUNTRIES[code].flag} ${COUNTRIES[code].name}`,
        data: [
            Math.random() * 100, // CO2
            Math.random() * 100, // CH4
            Math.random() * 100, // N2O
            Math.random() * 100, // NOX
            Math.random() * 100, // SO2
            Math.random() * 100  // PM2.5
        ],
        borderColor: COUNTRIES[code].color,
        backgroundColor: COUNTRIES[code].color + '30'
    }));

    charts.airRadar = new Chart(ctx3, {
        type: 'radar',
        data: {
            labels: ['CO2', 'CH4', 'N2O', 'NOX', 'SO2', 'PM2.5'],
            datasets: radarData
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Air Pollutants Profile',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // Emissions Timeline
    const ctx4 = document.getElementById('emissions-timeline');
    if (charts.emissionsTimeline) charts.emissionsTimeline.destroy();
    
    const timelineData = Array.from(selectedCountries).map(code => ({
        label: `${COUNTRIES[code].flag} ${COUNTRIES[code].name}`,
        data: [
            Math.random() * 50000 + 30000,
            Math.random() * 50000 + 35000,
            Math.random() * 50000 + 40000,
            countryData[code].airEmissions,
            Math.random() * 50000 + 45000
        ],
        borderColor: COUNTRIES[code].color,
        backgroundColor: COUNTRIES[code].color + '20',
        tension: 0.4
    }));

    charts.emissionsTimeline = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: ['2015', '2016', '2017', '2018', '2019'],
            datasets: timelineData
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Air Emissions Trend (2015-2019)',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Emission Factors'
                    }
                }
            }
        }
    });
}

// Create water charts
function createWaterCharts() {
    // Water Usage Comparison
    const ctx1 = document.getElementById('water-usage-comparison');
    if (!ctx1) {
        console.warn('water-usage-comparison canvas not found');
        return;
    }
    
    if (charts.waterComparison) {
        charts.waterComparison.destroy();
    }
    
    const selectedData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        consumption: countryData[code].water * 0.6,
        withdrawal: countryData[code].water * 0.4,
        color: COUNTRIES[code].color,
        flag: COUNTRIES[code].flag
    }));

    charts.waterComparison = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: selectedData.map(d => `${d.flag} ${d.country}`),
            datasets: [
                {
                    label: 'Water Consumption',
                    data: selectedData.map(d => d.consumption),
                    backgroundColor: '#3498db80',
                    borderColor: '#3498db',
                    borderWidth: 2
                },
                {
                    label: 'Water Withdrawal',
                    data: selectedData.map(d => d.withdrawal),
                    backgroundColor: '#2980b980',
                    borderColor: '#2980b9',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Water Usage Patterns by Country',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Water Factor Relationships'
                    }
                },
                x: { stacked: true }
            }
        }
    });

    // Water Intensity by Sectors
    const ctx2 = document.getElementById('water-intensity-sectors');
    if (!ctx2) {
        console.warn('water-intensity-sectors canvas not found');
        return;
    }
    
    if (charts.waterSectors) {
        charts.waterSectors.destroy();
    }
    
    charts.waterSectors = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Textiles', 'Agriculture', 'Food Processing', 'Chemicals', 'Electronics'],
            datasets: [{
                label: 'Water Intensity',
                data: [85, 92, 45, 38, 15],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Water Intensity by Export Sectors',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Water Intensity Index'
                    }
                }
            }
        }
    });

    // Water Stress Indicator
    const ctx3 = document.getElementById('water-stress-indicator');
    if (!ctx3) {
        console.warn('water-stress-indicator canvas not found');
        return;
    }
    
    if (charts.waterStress) {
        charts.waterStress.destroy();
    }
    
    const stressData = Array.from(selectedCountries).map(code => {
        const stress = code === 'IN' ? 75 : code === 'US' ? 45 : Math.random() * 80 + 20;
        return {
            country: COUNTRIES[code].name,
            stress: stress,
            color: stress > 60 ? '#e74c3c' : stress > 40 ? '#f39c12' : '#27ae60'
        };
    });

    charts.waterStress = new Chart(ctx3, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Water Stress Level',
                data: stressData.map((d, i) => ({ x: i, y: d.stress })),
                backgroundColor: stressData.map(d => d.color),
                borderColor: stressData.map(d => d.color),
                pointRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Water Stress Risk Assessment',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Water Stress Index (%)'
                    }
                },
                x: {
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        callback: function(value, index) {
                            return stressData[index]?.country || '';
                        }
                    }
                }
            }
        }
    });

    // Water Efficiency Trends
    const ctx4 = document.getElementById('water-efficiency-trends');
    if (!ctx4) {
        console.warn('water-efficiency-trends canvas not found');
        return;
    }
    
    if (charts.waterEfficiency) {
        charts.waterEfficiency.destroy();
    }
    
    const efficiencyData = Array.from(selectedCountries).map(code => ({
        label: `${COUNTRIES[code].flag} ${COUNTRIES[code].name}`,
        data: [
            Math.random() * 20 + 60,
            Math.random() * 20 + 65,
            Math.random() * 20 + 70,
            Math.random() * 20 + 75,
            Math.random() * 20 + 80
        ],
        borderColor: COUNTRIES[code].color,
        backgroundColor: COUNTRIES[code].color + '20',
        tension: 0.4
    }));

    charts.waterEfficiency = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: ['2015', '2016', '2017', '2018', '2019'],
            datasets: efficiencyData
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Water Use Efficiency Trends',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Efficiency Index (%)'
                    }
                }
            }
        }
    });
}

// Similar functions for other categories (land, energy, material, employment)
// ... (implementation would be similar to above patterns)

// Create placeholder charts for other categories
function createEnergyCharts() {
    // Energy Consumption Comparison
    const ctx1 = document.getElementById('energy-consumption-comparison');
    if (!ctx1) {
        console.warn('energy-consumption-comparison canvas not found');
        return;
    }
    
    if (charts.energyComparison) {
        charts.energyComparison.destroy();
    }
    
    const selectedData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        renewable: countryData[code].energy * 0.35,
        fossil: countryData[code].energy * 0.65,
        color: COUNTRIES[code].color,
        flag: COUNTRIES[code].flag
    }));

    charts.energyComparison = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: selectedData.map(d => `${d.flag} ${d.country}`),
            datasets: [
                {
                    label: 'Renewable Energy',
                    data: selectedData.map(d => d.renewable),
                    backgroundColor: '#27ae6080',
                    borderColor: '#27ae60',
                    borderWidth: 2
                },
                {
                    label: 'Fossil Fuel Energy',
                    data: selectedData.map(d => d.fossil),
                    backgroundColor: '#e74c3c80',
                    borderColor: '#e74c3c',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Energy Consumption Patterns by Country',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Energy (TWh)'
                    }
                },
                x: { stacked: true }
            }
        }
    });

    // Energy Intensity by Sectors
    const ctx2 = document.getElementById('energy-intensity-sectors');
    if (!ctx2) {
        console.warn('energy-intensity-sectors canvas not found');
        return;
    }
    
    if (charts.energySectors) {
        charts.energySectors.destroy();
    }
    
    charts.energySectors = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Steel Production', 'Cement', 'Chemicals', 'Electronics', 'Textiles'],
            datasets: [{
                label: 'Energy Intensity',
                data: [88, 82, 65, 48, 35],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Energy Intensity by Export Sectors',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Energy Intensity Index'
                    }
                }
            }
        }
    });

// Renewable Share
    const ctx3 = document.getElementById('renewable-share');
    if (!ctx3) {
        console.warn('renewable-share canvas not found');
        return;
    }
    
    if (charts.renewableShare) {
        charts.renewableShare.destroy();
    }
    
    const renewableShareData = Array.from(selectedCountries).map(code => {
        const share = code === 'DE' ? 45 : code === 'US' ? 18 : Math.random() * 40 + 10;
        return {
            country: COUNTRIES[code].name,
            share: share,
            color: COUNTRIES[code].color  // Use each country's unique color
        };
    });

    charts.renewableShare = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: renewableShareData.map(d => d.country),
            datasets: [{
                label: 'Renewable Energy Share',
                data: renewableShareData.map(d => d.share),
                backgroundColor: renewableShareData.map(d => d.color),  // Each country gets its own color
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Renewable Energy Share (%)',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });

    // Energy Efficiency
    const ctx4 = document.getElementById('energy-efficiency');
    if (!ctx4) {
        console.warn('energy-efficiency canvas not found');
        return;
    }
    
    if (charts.energyEfficiency) {
        charts.energyEfficiency.destroy();
    }
    
    const efficiencyTrendData = Array.from(selectedCountries).map(code => ({
        label: `${COUNTRIES[code].flag} ${COUNTRIES[code].name}`,
        data: [
            Math.random() * 10 + 70,
            Math.random() * 10 + 72,
            Math.random() * 10 + 74,
            Math.random() * 10 + 76,
            Math.random() * 10 + 78
        ],
        borderColor: COUNTRIES[code].color,
        backgroundColor: COUNTRIES[code].color + '20',
        tension: 0.4
    }));

    charts.energyEfficiency = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: ['2015', '2016', '2017', '2018', '2019'],
            datasets: efficiencyTrendData
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Energy Efficiency Trends',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 60,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Efficiency Index (%)'
                    }
                }
            }
        }
    });
}function createLandUseCharts() {
    // Land Use Comparison
    const ctx1 = document.getElementById('land-use-comparison');
    if (!ctx1) {
        console.warn('land-use-comparison canvas not found');
        return;
    }
    
    if (charts.landComparison) {
        charts.landComparison.destroy();
    }
    
    const selectedData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        agricultural: countryData[code].land * 0.7,
        industrial: countryData[code].land * 0.3,
        color: COUNTRIES[code].color,
        flag: COUNTRIES[code].flag
    }));

    charts.landComparison = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: selectedData.map(d => `${d.flag} ${d.country}`),
            datasets: [
                {
                    label: 'Agricultural Land',
                    data: selectedData.map(d => d.agricultural),
                    backgroundColor: '#27ae6080',
                    borderColor: '#27ae60',
                    borderWidth: 2
                },
                {
                    label: 'Industrial Land',
                    data: selectedData.map(d => d.industrial),
                    backgroundColor: '#95a5a680',
                    borderColor: '#95a5a6',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Land Use Patterns by Country',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Land Use Factor (hectares)'
                    }
                },
                x: { stacked: true }
            }
        }
    });

    // Land Intensity by Sectors
    const ctx2 = document.getElementById('land-intensity-sectors');
    if (!ctx2) {
        console.warn('land-intensity-sectors canvas not found');
        return;
    }
    
    if (charts.landSectors) {
        charts.landSectors.destroy();
    }
    
    charts.landSectors = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Beef Production', 'Dairy', 'Textiles', 'Forestry', 'Manufacturing'],
            datasets: [{
                label: 'Land Intensity',
                data: [95, 68, 52, 78, 12],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Land Intensity by Export Sectors',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Land Intensity Index'
                    }
                }
            }
        }
    });

    // Land Degradation Risk
    const ctx3 = document.getElementById('land-degradation-risk');
    if (!ctx3) {
        console.warn('land-degradation-risk canvas not found');
        return;
    }
    
    if (charts.landDegradation) {
        charts.landDegradation.destroy();
    }
    
    const degradationData = Array.from(selectedCountries).map(code => {
        const risk = code === 'IN' ? 65 : code === 'CN' ? 55 : Math.random() * 70 + 15;
        return {
            country: COUNTRIES[code].name,
            risk: risk,
            color: risk > 60 ? '#e74c3c' : risk > 40 ? '#f39c12' : '#27ae60'
        };
    });

    charts.landDegradation = new Chart(ctx3, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Degradation Risk Level',
                data: degradationData.map((d, i) => ({ x: i, y: d.risk })),
                backgroundColor: degradationData.map(d => d.color),
                borderColor: degradationData.map(d => d.color),
                pointRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Land Degradation Risk Assessment',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Degradation Risk Index (%)'
                    }
                },
                x: {
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        callback: function(value, index) {
                            return degradationData[index]?.country || '';
                        }
                    }
                }
            }
        }
    });

    // Land Productivity Trends
    const ctx4 = document.getElementById('land-productivity-trends');
    if (!ctx4) {
        console.warn('land-productivity-trends canvas not found');
        return;
    }
    
    if (charts.landProductivity) {
        charts.landProductivity.destroy();
    }
    
    const productivityData = Array.from(selectedCountries).map(code => ({
        label: `${COUNTRIES[code].flag} ${COUNTRIES[code].name}`,
        data: [
            Math.random() * 15 + 70,
            Math.random() * 15 + 72,
            Math.random() * 15 + 74,
            Math.random() * 15 + 76,
            Math.random() * 15 + 78
        ],
        borderColor: COUNTRIES[code].color,
        backgroundColor: COUNTRIES[code].color + '20',
        tension: 0.4
    }));

    charts.landProductivity = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: ['2015', '2016', '2017', '2018', '2019'],
            datasets: productivityData
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Land Productivity Trends',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 60,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Productivity Index'
                    }
                }
            }
        }
    });
}

function createMaterialsCharts() {
    // Material Flow Comparison
    const ctx1 = document.getElementById('material-flow-comparison');
    if (!ctx1) {
        console.warn('material-flow-comparison canvas not found');
        return;
    }
    
    if (charts.materialFlow) {
        charts.materialFlow.destroy();
    }
    
    const selectedData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        raw: countryData[code].materials * 0.55,
        processed: countryData[code].materials * 0.45,
        color: COUNTRIES[code].color,
        flag: COUNTRIES[code].flag
    }));

    charts.materialFlow = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: selectedData.map(d => `${d.flag} ${d.country}`),
            datasets: [
                {
                    label: 'Raw Materials',
                    data: selectedData.map(d => d.raw),
                    backgroundColor: '#95a5a680',
                    borderColor: '#95a5a6',
                    borderWidth: 2
                },
                {
                    label: 'Processed Materials',
                    data: selectedData.map(d => d.processed),
                    backgroundColor: '#34495e80',
                    borderColor: '#34495e',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Material Flow Patterns by Country',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Material Volume (million tonnes)'
                    }
                },
                x: { stacked: true }
            }
        }
    });

    // Material Intensity by Sectors
    const ctx2 = document.getElementById('material-intensity-sectors');
    if (!ctx2) {
        console.warn('material-intensity-sectors canvas not found');
        return;
    }
    
    if (charts.materialSectors) {
        charts.materialSectors.destroy();
    }
    
    charts.materialSectors = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Construction', 'Automotive', 'Electronics', 'Packaging', 'Textiles'],
            datasets: [{
                label: 'Material Intensity',
                data: [92, 78, 55, 42, 38],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Material Intensity by Export Sectors',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Material Intensity Index'
                    }
                }
            }
        }
    });

    // Recycling Rates
    const ctx3 = document.getElementById('recycling-rates');
    if (!ctx3) {
        console.warn('recycling-rates canvas not found');
        return;
    }
    
    if (charts.recyclingRates) {
        charts.recyclingRates.destroy();
    }
    
    const recyclingData = Array.from(selectedCountries).map(code => {
        const rate = code === 'DE' ? 68 : code === 'JP' ? 62 : Math.random() * 50 + 20;
        return {
            country: COUNTRIES[code].name,
            rate: rate,
            color: rate > 60 ? '#27ae60' : rate > 40 ? '#f39c12' : '#e74c3c'
        };
    });

    charts.recyclingRates = new Chart(ctx3, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Recycling Rate',
                data: recyclingData.map((d, i) => ({ x: i, y: d.rate })),
                backgroundColor: recyclingData.map(d => d.color),
                borderColor: recyclingData.map(d => d.color),
                pointRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Material Recycling Rates',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Recycling Rate (%)'
                    }
                },
                x: {
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        callback: function(value, index) {
                            return recyclingData[index]?.country || '';
                        }
                    }
                }
            }
        }
    });

    // Circular Economy Trends
    const ctx4 = document.getElementById('circular-economy-trends');
    if (!ctx4) {
        console.warn('circular-economy-trends canvas not found');
        return;
    }
    
    if (charts.circularEconomy) {
        charts.circularEconomy.destroy();
    }
    
    const circularData = Array.from(selectedCountries).map(code => ({
        label: `${COUNTRIES[code].flag} ${COUNTRIES[code].name}`,
        data: [
            Math.random() * 10 + 25,
            Math.random() * 10 + 30,
            Math.random() * 10 + 35,
            Math.random() * 10 + 40,
            Math.random() * 10 + 45
        ],
        borderColor: COUNTRIES[code].color,
        backgroundColor: COUNTRIES[code].color + '20',
        tension: 0.4
    }));

    charts.circularEconomy = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: ['2015', '2016', '2017', '2018', '2019'],
            datasets: circularData
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Circular Economy Progress',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 70,
                    title: {
                        display: true,
                        text: 'Circularity Index (%)'
                    }
                }
            }
        }
    });
}

function createEmploymentCharts() {
    // Jobs Created Comparison
    const ctx1 = document.getElementById('jobs-created-comparison');
    if (!ctx1) return;
    
    if (charts.jobsComparison) charts.jobsComparison.destroy();
    
    const selectedData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        jobs: countryData[code].employment,
        color: COUNTRIES[code].color,
        flag: COUNTRIES[code].flag
    }));

    charts.jobsComparison = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: selectedData.map(d => `${d.flag} ${d.country}`),
            datasets: [{
                label: 'Jobs Created',
                data: selectedData.map(d => d.jobs),
                backgroundColor: selectedData.map(d => d.color + '80'),
                borderColor: selectedData.map(d => d.color),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Employment Impact by Country',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });

    // Employment by Sectors
    const ctx2 = document.getElementById('employment-by-sectors');
    if (!ctx2) return;
    
    if (charts.employmentSectors) charts.employmentSectors.destroy();
    
    charts.employmentSectors = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Manufacturing', 'Services', 'Agriculture', 'Construction', 'Transport'],
            datasets: [{
                label: 'Employment',
                data: [45, 35, 28, 18, 15],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Employment by Sector',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });

    // Wage Levels
    const ctx3 = document.getElementById('wage-levels');
    if (!ctx3) return;
    
    if (charts.wageLevels) charts.wageLevels.destroy();
    
    const wageData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        wage: code === 'US' ? 65 : code === 'IN' ? 25 : Math.random() * 50 + 30,
        color: COUNTRIES[code].color
    }));

    charts.wageLevels = new Chart(ctx3, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Average Wage Index',
                data: wageData.map((d, i) => ({ x: i, y: d.wage })),
                backgroundColor: wageData.map(d => d.color),
                pointRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Wage Levels by Country',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });

    // Employment Growth Trends
    const ctx4 = document.getElementById('employment-growth-trends');
    if (!ctx4) return;
    
    if (charts.employmentGrowth) charts.employmentGrowth.destroy();
    
    const growthData = Array.from(selectedCountries).map(code => ({
        label: `${COUNTRIES[code].flag} ${COUNTRIES[code].name}`,
        data: [100, 105, 112, 118, 125],
        borderColor: COUNTRIES[code].color,
        backgroundColor: COUNTRIES[code].color + '20',
        tension: 0.4
    }));

    charts.employmentGrowth = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: ['2015', '2016', '2017', '2018', '2019'],
            datasets: growthData
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Employment Growth Trends',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });
}

// Update all charts when countries change
function updateCharts() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.category;
    
    if (activeTab === 'air' && echartsInstances.chart1) {
        // Reload data for new countries and update dynamic charts
        loadSelectedCountriesData().then(() => {
            updateAllCharts();
        }).catch(error => {
            console.error('Error reloading country data:', error);
            updateAllCharts(); // Try to update with existing data
        });
    } else {
        updateChartsForCategory(activeTab);
    }
}

// Update selection count
function updateSelectionCount() {
    document.getElementById('selected-count').textContent = selectedCountries.size;
}

// Apply Motion.dev animations
function applyAnimations() {
    // Animate hero section
    Motion.animate('.hero-title', 
        { opacity: [0, 1], y: [50, 0] },
        { duration: 1, delay: 0 }
    );
    
    Motion.animate('.hero-subtitle', 
        { opacity: [0, 1], y: [30, 0] },
        { duration: 0.8, delay: 0.2 }
    );
    
    Motion.animate('.sdg-badge', 
        { opacity: [0, 1], scale: [0.5, 1] },
        { duration: 0.6, delay: Motion.stagger(0.1, { start: 0.4 }) }
    );

    // Animate country panels
    Motion.animate('.country-panel', 
        { opacity: [0, 1], y: [30, 0] },
        { duration: 0.8, delay: Motion.stagger(0.1) }
    );

    // Animate summary cards
    Motion.animate('.summary-card', 
        { opacity: [0, 1], x: [-50, 0] },
        { duration: 0.8, delay: Motion.stagger(0.1, { start: 0.3 }) }
    );

    // Animate insight cards
    Motion.animate('.insight-card', 
        { opacity: [0, 1], scale: [0.8, 1] },
        { duration: 0.8, delay: Motion.stagger(0.2, { start: 0.5 }) }
    );
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 1000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add scroll message overlay to map
function addScrollMessage() {
    const mapContainer = document.getElementById('map');
    const scrollMessage = document.createElement('div');
    scrollMessage.id = 'map-scroll-message';
    scrollMessage.innerHTML = `
        <div class="scroll-message-content">
            <i class="scroll-icon">🖱️</i>
            <span>Click map to enable mouse wheel zoom</span>
        </div>
    `;
    scrollMessage.style.cssText = `
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(52, 152, 219, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    
    // Add hover effect
    scrollMessage.addEventListener('mouseenter', () => {
        scrollMessage.style.background = 'rgba(41, 128, 185, 0.95)';
        scrollMessage.style.transform = 'translateX(-50%) translateY(-2px)';
    });
    
    scrollMessage.addEventListener('mouseleave', () => {
        scrollMessage.style.background = 'rgba(52, 152, 219, 0.9)';
        scrollMessage.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Toggle scroll when message is clicked
    scrollMessage.addEventListener('click', toggleMapScroll);
    
    mapContainer.style.position = 'relative';
    mapContainer.appendChild(scrollMessage);
}

// Toggle map scroll wheel zoom
function toggleMapScroll() {
    if (!map.scrollWheelZoom.enabled()) {
        // Enable scroll
        map.scrollWheelZoom.enable();
        
        // Update the scroll message to show toggle option
        updateScrollMessage(true);
        
        // Auto-fade message after 4 seconds when enabled
        setTimeout(() => {
            autoFadeScrollMessage();
        }, 4000);
    } else {
        // Disable scroll
        map.scrollWheelZoom.disable();
        
        // Update the scroll message to show enable option
        updateScrollMessage(false);
        
        // No notification needed for disable
    }
}

// Update scroll message based on current state
function updateScrollMessage(isEnabled) {
    let scrollMessage = document.getElementById('map-scroll-message');
    
    if (!scrollMessage) {
        // Create message if it doesn't exist
        addScrollMessage();
        scrollMessage = document.getElementById('map-scroll-message');
    }
    
    const messageContent = scrollMessage.querySelector('.scroll-message-content');
    if (isEnabled) {
        messageContent.innerHTML = `
            <i class="scroll-icon">🖱️</i>
            <span>Scroll enabled - Click to disable</span>
        `;
        scrollMessage.style.background = 'rgba(46, 204, 113, 0.9)';
    } else {
        messageContent.innerHTML = `
            <i class="scroll-icon">🖱️</i>
            <span>Click map to enable mouse wheel zoom</span>
        `;
        scrollMessage.style.background = 'rgba(52, 152, 219, 0.9)';
    }
    
    // Show the message with fade-in animation
    scrollMessage.style.opacity = '1';
    scrollMessage.style.transform = 'translateX(-50%) translateY(0)';
}

// Auto-fade scroll message after 4 seconds
function autoFadeScrollMessage() {
    const scrollMessage = document.getElementById('map-scroll-message');
    if (scrollMessage && map.scrollWheelZoom.enabled()) {
        scrollMessage.style.transition = 'opacity 1s ease, transform 1s ease';
        scrollMessage.style.opacity = '0';
        scrollMessage.style.transform = 'translateX(-50%) translateY(-20px)';
        
        setTimeout(() => {
            if (scrollMessage.parentNode) {
                scrollMessage.remove();
            }
        }, 1000);
    }
}

// Comprehensive Trade Data Loading System
async function loadTradeDataSystem() {
    try {
        showNotification('Loading trade data system... 📊');
        
        // Load reference data first
        await Promise.all([
            loadIndustryData(),
            loadFactorData()
        ]);
        
        // Load trade data for selected countries
        await loadSelectedCountriesData();
        
        // Initialize ECharts visualizations
        initializeEChartsSystem();
        
        showNotification('Trade data system loaded successfully! ✅');
    } catch (error) {
        console.error('Error loading trade data system:', error);
        showNotification('Error loading trade data. Using fallback visualizations.');
        initializeFallbackCharts();
    }
}

// Load industry reference data
async function loadIndustryData() {
    try {
        const response = await fetch(getDataUrl('industry.csv'));
        const csvText = await response.text();
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        industryData = {};
        parsed.data.forEach(row => {
            industryData[row.industry_id] = {
                name: row.name,
                category: row.category
            };
        });
        
        console.log('Loaded industry data:', Object.keys(industryData).length, 'industries');
    } catch (error) {
        console.error('Error loading industry data:', error);
        industryData = {};
    }
}

// Load factor reference data
async function loadFactorData() {
    try {
        const response = await fetch(getDataUrl('factor.csv'));
        const csvText = await response.text();
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        factorData = {};
        parsed.data.forEach(row => {
            factorData[row.factor_id] = {
                unit: row.unit,
                stressor: row.stressor,
                extension: row.extension
            };
        });
        
        console.log('Loaded factor data:', Object.keys(factorData).length, 'factors');
    } catch (error) {
        console.error('Error loading factor data:', error);
        factorData = {};
    }
}

// Load trade data for selected countries
async function loadSelectedCountriesData() {
    const promises = [];
    
    for (const countryCode of selectedCountries) {
        // Load domestic, exports, and imports data for each country
        const tradeFlows = ['domestic', 'exports', 'imports'];
        
        for (const flow of tradeFlows) {
            promises.push(loadCountryTradeFlow(countryCode, flow));
        }
    }
    
    await Promise.all(promises);
    console.log('Loaded trade data for countries:', Array.from(selectedCountries));
}

// Load specific country trade flow data
async function loadCountryTradeFlow(countryCode, tradeFlow) {
    try {
        const baseUrl = getDataUrl(`${countryCode}/${tradeFlow}`);
        
        const filePromises = [
            fetch(`${baseUrl}/trade.csv`).then(r => r.ok ? r.text() : null),
            fetch(`${baseUrl}/trade_factor.csv`).then(r => r.ok ? r.text() : null),
            fetch(`${baseUrl}/trade_impact.csv`).then(r => r.ok ? r.text() : null),
            fetch(`${baseUrl}/trade_employment.csv`).then(r => r.ok ? r.text() : null),
            fetch(`${baseUrl}/trade_resource.csv`).then(r => r.ok ? r.text() : null)
        ];
        
        const [tradeCSV, factorCSV, impactCSV, employmentCSV, resourceCSV] = await Promise.all(filePromises);
        
        if (!tradeData[countryCode]) {
            tradeData[countryCode] = {};
        }
        
        tradeData[countryCode][tradeFlow] = {
            trade: tradeCSV ? Papa.parse(tradeCSV, { header: true, skipEmptyLines: true }).data : [],
            factors: factorCSV ? Papa.parse(factorCSV, { header: true, skipEmptyLines: true }).data : [],
            impacts: impactCSV ? Papa.parse(impactCSV, { header: true, skipEmptyLines: true }).data : [],
            employment: employmentCSV ? Papa.parse(employmentCSV, { header: true, skipEmptyLines: true }).data : [],
            resources: resourceCSV ? Papa.parse(resourceCSV, { header: true, skipEmptyLines: true }).data : []
        };
        
    } catch (error) {
        console.warn(`Could not load ${tradeFlow} data for ${countryCode}:`, error);
    }
}

// Initialize ECharts system with event handlers
function initializeEChartsSystem() {
    // Setup event listeners for controls
    document.getElementById('factor-grouping').addEventListener('change', (e) => {
        currentAnalysisMode = e.target.value;
        updateAnalysisDisplay();
        updateAllCharts();
    });
    
    document.getElementById('industry-filter').addEventListener('change', (e) => {
        currentIndustryFilter = e.target.value;
        updateAllCharts();
    });
    
    // Initialize all four chart containers
    echartsInstances.chart1 = echarts.init(document.getElementById('chart1'));
    echartsInstances.chart2 = echarts.init(document.getElementById('chart2'));
    echartsInstances.chart3 = echarts.init(document.getElementById('chart3'));
    echartsInstances.chart4 = echarts.init(document.getElementById('chart4'));
    
    // Create initial visualizations
    updateAllCharts();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        Object.values(echartsInstances).forEach(instance => {
            if (instance) instance.resize();
        });
    });
}

// Update analysis display based on current mode
function updateAnalysisDisplay() {
    const grouping = FACTOR_GROUPINGS[currentAnalysisMode];
    if (grouping) {
        document.getElementById('analysis-title').textContent = grouping.title;
        document.getElementById('analysis-description').textContent = grouping.description;
    }
}

// Update all charts based on current selections
function updateAllCharts() {
    if (!echartsInstances.chart1) return;
    
    const selectedCountriesArray = Array.from(selectedCountries);
    if (selectedCountriesArray.length === 0) return;
    
    try {
        // Chart 1: Trade Flow Impact Comparison (Bar Chart)
        createTradeFlowComparisonChart();
        
        // Chart 2: Industry Sector Analysis (Treemap)
        createIndustrySectorChart();
        
        // Chart 3: Country Performance Matrix (Scatter Plot)
        createCountryPerformanceChart();
        
        // Chart 4: Trade Network Analysis (Sankey Diagram)
        createTradeNetworkChart();
        
        
    } catch (error) {
        console.error('Error updating charts:', error);
        showNotification('Error updating visualizations');
    }
}

// Chart 1: Trade Flow Impact Comparison
function createTradeFlowComparisonChart() {
    const data = analyzeTradeFlowImpacts();
    
    const option = {
        title: {
            text: 'Trade Flow Environmental Impact by Country',
            textStyle: { fontSize: 14, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    result += `${param.seriesName}: ${param.value.toLocaleString()}<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['Domestic', 'Exports', 'Imports']
        },
        xAxis: {
            type: 'category',
            data: data.countries,
        },
        yAxis: {
            type: 'value',
            name: 'Impact Value'
        },
        series: [
            {
                name: 'Domestic',
                type: 'bar',
                data: data.domestic,
                itemStyle: { color: '#3498db' }
            },
            {
                name: 'Exports', 
                type: 'bar',
                data: data.exports,
                itemStyle: { color: '#e74c3c' }
            },
            {
                name: 'Imports',
                type: 'bar', 
                data: data.imports,
                itemStyle: { color: '#2ecc71' }
            }
        ]
    };
    
    echartsInstances.chart1.setOption(option, true);
    document.getElementById('chart1-title').textContent = 'Trade Flow Environmental Impact Comparison';
}

// Chart 2: Industry Sector Analysis
function createIndustrySectorChart() {
    const data = analyzeIndustrySectors();
    
    const option = {
        title: {
            text: 'Industry Sector Impact Distribution',
            textStyle: { fontSize: 14, fontWeight: 'bold' }
        },
        tooltip: {
            formatter: function(params) {
                return `${params.name}<br/>Impact: ${params.value.toLocaleString()}<br/>Share: ${((params.value / data.total) * 100).toFixed(1)}%`;
            }
        },
        series: [{
            type: 'treemap',
            data: data.sectors,
            roam: false,
            nodeClick: false,
            breadcrumb: {
                show: false
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2
            },
            levels: [{
                itemStyle: {
                    borderColor: '#777',
                    borderWidth: 0,
                    gapWidth: 1
                }
            }]
        }]
    };
    
    echartsInstances.chart2.setOption(option, true);
    document.getElementById('chart2-title').textContent = 'Industry Sector Impact Analysis';
}

// Chart 3: Country Performance Matrix
// Chart 3: Country Performance Matrix
function createCountryPerformanceChart() {
    const data = analyzeCountryPerformance();
    
    console.log('Performance chart data:', data);
    
    // Check if we have valid data
    if (!data.points || data.points.length === 0) {
        console.warn('No performance data available');
        createFallbackChart(echartsInstances.chart3, 'No performance data available');
        return;
    }
    
    const option = {
        title: {
            text: 'Country Performance vs Trade Volume',
            textStyle: { fontSize: 14, fontWeight: 'bold' }
        },
        tooltip: {
            formatter: function(params) {
                const point = params.data;
                return `${point.name}<br/>Trade Volume: ${point.value[0].toLocaleString()}<br/>Environmental Impact: ${point.value[1].toLocaleString()}`;
            }
        },
        xAxis: {
            type: 'value',
            name: 'Trade Volume',
            nameLocation: 'middle',
            nameGap: 40,
            scale: true
        },
        yAxis: {
            type: 'value',
            name: 'Environmental Impact',
            nameLocation: 'middle',
            nameGap: 50,
            scale: true
        },
        series: [{
            type: 'scatter',
            symbolSize: function(data) {
                return 20; // Fixed size for now
            },
            data: data.points,
            itemStyle: {
                opacity: 0.8
            },
            label: {
                show: true,
                formatter: '{b}',
                position: 'top'
            }
        }]
    };
    
    echartsInstances.chart3.clear();
    echartsInstances.chart3.setOption(option, true);
    document.getElementById('chart3-title').textContent = 'Country Environmental Performance Matrix';
}


// Chart 4: Trade Network Analysis
function createTradeNetworkChart() {
    if (!echartsInstances.chart4) return;
    
    const networkData = analyzeTradeNetwork();
    
    console.log('Network chart data:', networkData);
    
    // Base option configuration
    const baseOption = {
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove'
        },
        animation: true
    };
    
    try {
        // Try Sankey first
        echartsInstances.chart4.setOption({
            ...baseOption,
            series: [{
                type: 'sankey',
                data: networkData.nodes,
                links: networkData.links,
                emphasis: {
                    focus: 'adjacency'
                },
                lineStyle: {
                    color: 'gradient',
                    curveness: 0.5
                },
                label: {
                    color: 'rgba(0,0,0,0.7)',
                    fontFamily: 'Arial',
                    fontSize: 11
                }
            }]
        });
        console.log('Sankey chart rendered successfully');
    } catch (sankeyError) {
        if (sankeyError.message.includes('cycle') || sankeyError.message.includes('DAG')) {
            console.warn('Sankey has cycle, switching to graph visualization');
            
            // Switch to graph chart
            echartsInstances.chart4.setOption({
                ...baseOption,
                // Inside the graph chart option (the fallback)
series: [{
    type: 'graph',
    layout: 'circular',
    data: networkData.nodes,
    links: networkData.links,
    roam: true,
    label: { 
        show: true,
        position: 'right',
        distance: 10, // Add distance from node
        color: 'rgba(0,0,0,0.8)',
        fontFamily: 'Arial',
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.8)', // Add background
        padding: [4, 8],
        borderRadius: 4
    },
    symbolSize: 60, // Increase node size to prevent overlap
    edgeSymbol: ['none', 'arrow'],
    edgeSymbolSize: 8,
    edgeLabel: {
        show: true,
        formatter: '{c}',
        fontSize: 10,
        color: '#666'
    },
    lineStyle: {
        curveness: 0.3,
        color: 'source',
        opacity: 0.6
    },
    emphasis: {
        focus: 'adjacency',
        lineStyle: {
            width: 4
        }
    },
    circular: {
        rotateLabel: true // Rotate labels to follow circle
    }
}]
            });
            console.log('Graph chart rendered as fallback');
        } else {
            throw sankeyError;
        }
    }
}
// Data analysis functions
function analyzeTradeFlowImpacts() {
    const result = {
        countries: [],
        domestic: [],
        exports: [],
        imports: []
    };
    
    for (const countryCode of selectedCountries) {
        const countryName = COUNTRIES[countryCode]?.name || countryCode;
        result.countries.push(countryName);
        
        const countryTradeData = tradeData[countryCode] || {};
        
        // Calculate impacts for each trade flow type
        result.domestic.push(calculateFlowImpact(countryTradeData.domestic) || 0);
        result.exports.push(calculateFlowImpact(countryTradeData.exports) || 0);
        result.imports.push(calculateFlowImpact(countryTradeData.imports) || 0);
    }
    
    return result;
}

function analyzeIndustrySectors() {
    const sectorImpacts = {};
    let total = 0;
    
    // Aggregate impacts by industry category
    for (const countryCode of selectedCountries) {
        const countryTradeData = tradeData[countryCode] || {};
        
        Object.values(countryTradeData).forEach(flowData => {
            if (flowData && flowData.trade) {
                flowData.trade.forEach(trade => {
                    const industry = trade.industry1;
                    const amount = parseFloat(trade.amount) || 0;
                    
                    const category = getIndustryCategory(industry);
                    if (!sectorImpacts[category]) {
                        sectorImpacts[category] = 0;
                    }
                    sectorImpacts[category] += amount;
                    total += amount;
                });
            }
        });
    }
    
    const sectors = Object.entries(sectorImpacts).map(([name, value]) => ({
        name,
        value: Math.round(value)
    }));
    
    return { sectors, total };
}

function analyzeCountryPerformance() {
    const points = [];
    
    for (const countryCode of selectedCountries) {
        const countryName = COUNTRIES[countryCode]?.name || countryCode;
        const countryTradeData = tradeData[countryCode] || {};
        
        let totalVolume = 0;
        let totalImpact = 0;
        
        Object.values(countryTradeData).forEach(flowData => {
            if (flowData && flowData.trade) {
                flowData.trade.forEach(trade => {
                    totalVolume += parseFloat(trade.amount) || 0;
                });
            }
            
            if (flowData && flowData.factors) {
                flowData.factors.forEach(factor => {
                    totalImpact += parseFloat(factor.impact_value) || 0;
                });
            }
        });
        
        points.push({
            name: countryName,
            value: [Math.round(totalVolume), Math.round(totalImpact)],
            itemStyle: { color: COUNTRIES[countryCode]?.color || '#666' }
        });
    }
    
    return { points };
}

function analyzeTradeNetwork() {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    
    console.log('Analyzing network with tradeData:', tradeData);
    
    // Create nodes for countries
    for (const countryCode of selectedCountries) {
        const countryName = COUNTRIES[countryCode]?.name || countryCode;
        nodeMap.set(countryCode, countryName);
        nodes.push({
            name: countryName
        });
    }
    
    // Create links from trade flows
    for (const countryCode of selectedCountries) {
        const countryTradeData = tradeData[countryCode] || {};
        
        // Process exports (outgoing flows)
        if (countryTradeData.exports && countryTradeData.exports.trade) {
            const exportsByRegion = {};
            
            countryTradeData.exports.trade.forEach(trade => {
                const targetRegion = trade.region2;
                const amount = parseFloat(trade.amount) || 0;
                
                if (!exportsByRegion[targetRegion]) {
                    exportsByRegion[targetRegion] = 0;
                }
                exportsByRegion[targetRegion] += amount;
            });
            
            // Create links for regions that are in selected countries
            Object.entries(exportsByRegion).forEach(([targetRegion, amount]) => {
                if (nodeMap.has(targetRegion) && amount > 0) {
                    links.push({
                        source: nodeMap.get(countryCode),
                        target: nodeMap.get(targetRegion),
                        value: Math.round(amount)
                    });
                }
            });
        }
        // Also process imports to create bidirectional flows
        if (countryTradeData.imports && countryTradeData.imports.trade) {
            const importsByRegion = {};
            
            countryTradeData.imports.trade.forEach(trade => {
                const sourceRegion = trade.region1;
                const amount = parseFloat(trade.amount) || 0;
                
                if (!importsByRegion[sourceRegion]) {
                    importsByRegion[sourceRegion] = 0;
                }
                importsByRegion[sourceRegion] += amount;
            });
            
            Object.entries(importsByRegion).forEach(([sourceRegion, amount]) => {
                if (nodeMap.has(sourceRegion) && amount > 0) {
                    // Check if reverse link doesn't already exist
                    const existingLink = links.find(l => 
                        l.source === nodeMap.get(sourceRegion) && 
                        l.target === nodeMap.get(countryCode)
                    );
                    
                    if (!existingLink) {
                        links.push({
                            source: nodeMap.get(sourceRegion),
                            target: nodeMap.get(countryCode),
                            value: Math.round(amount)
                        });
                    }
                }
            });
        }
    }
    
    console.log('Network analysis complete:', { 
        nodeCount: nodes.length, 
        linkCount: links.length,
        links: links 
    });
    
    return { nodes, links };
}

// Helper functions
function calculateFlowImpact(flowData) {
    if (!flowData || !flowData.factors) return 0;
    
    let totalImpact = 0;
    const relevantFactors = FACTOR_GROUPINGS[currentAnalysisMode]?.factors || [];
    
    flowData.factors.forEach(factor => {
        const factorInfo = factorData[factor.factor_id];
        if (factorInfo && relevantFactors.some(rf => factorInfo.stressor.includes(rf))) {
            totalImpact += parseFloat(factor.impact_value) || 0;
        }
    });
    
    return Math.round(totalImpact);
}

function getIndustryCategory(industryCode) {
    for (const [category, industries] of Object.entries(INDUSTRY_CATEGORIES)) {
        if (industries.includes(industryCode)) {
            return category;
        }
    }
    return 'OTHER';
}

// Fallback charts for when real data loading fails
function initializeFallbackCharts() {
    // Initialize with mock visualizations
    echartsInstances.chart1 = echarts.init(document.getElementById('chart1'));
    echartsInstances.chart2 = echarts.init(document.getElementById('chart2'));
    echartsInstances.chart3 = echarts.init(document.getElementById('chart3'));
    echartsInstances.chart4 = echarts.init(document.getElementById('chart4'));
    
    // Create simple fallback charts
    createFallbackChart(echartsInstances.chart1, 'Trade Flow Analysis - Loading...');
    createFallbackChart(echartsInstances.chart2, 'Industry Sectors - Loading...');
    createFallbackChart(echartsInstances.chart3, 'Performance Matrix - Loading...');
    createFallbackChart(echartsInstances.chart4, 'Trade Network - Loading...');
}

function createFallbackChart(chartInstance, title) {
    const option = {
        title: {
            text: title,
            left: 'center',
            top: 'middle',
            textStyle: {
                fontSize: 16,
                color: '#999'
            }
        }
    };
    
    chartInstance.setOption(option);
}

// Utility function to format numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}