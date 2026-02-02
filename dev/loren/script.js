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

// Base URL for trade-data CSV files (GitHub raw content)
const DATA_BASE_URL = 'https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019';

// Country information with coordinates and flags
// Only the 14 countries that have data in the trade-data repo
const COUNTRIES = {
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
    'US': { name: 'United States', coords: [39.8283, -98.5795], flag: '🇺🇸', color: '#3498db' },
    'WM': { name: 'Middle East', coords: [29.3117, 47.4818], flag: '🌍', color: '#7f8c8d' }
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

// Maps analysis modes to the exact 'extension' values in factor.csv
// Actual values: "air_emissions", "employment", "energy", "land", "material", "water"
const FACTOR_GROUP_KEYWORDS = {
    air_emissions: ['air_emissions'],
    employment: ['employment'],
    energy: ['energy'],
    water: ['water'],
    materials: ['material'],
    health: ['air_emissions']
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
        if (selectedCountries.size < 14) {
            selectedCountries.add(countryCode);
        } else {
            // Show message about maximum countries
            showNotification('Maximum 14 countries can be selected');
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
                createLandCharts();
                break;
            case 'energy':
                createEnergyCharts();
                break;
            case 'material':
                createMaterialCharts();
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
    if (charts.waterComparison) charts.waterComparison.destroy();
    
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
    if (charts.waterSectors) charts.waterSectors.destroy();
    
    charts.waterSectors = new Chart(ctx2, {
        type: 'horizontalBar',
        data: {
            labels: ['Textiles', 'Agriculture', 'Food Processing', 'Chemicals', 'Electronics'],
            datasets: [{
                label: 'Water Intensity',
                data: [85, 92, 45, 38, 15],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6']
            }]
        },
        options: {
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
    if (charts.waterStress) charts.waterStress.destroy();
    
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
    if (charts.waterEfficiency) charts.waterEfficiency.destroy();
    
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
function createLandCharts() {
    // TODO: Populate with real trade-data CSV (same pattern as air emissions ECharts)
    // Use FACTOR_GROUP_KEYWORDS.materials with extension-based matching against factor.csv
    console.log('Creating land use charts...');
}

function createEnergyCharts() {
    // TODO: Populate with real trade-data CSV (same pattern as air emissions ECharts)
    // Use FACTOR_GROUP_KEYWORDS.energy with extension-based matching against factor.csv
    console.log('Creating energy charts...');
}

function createMaterialCharts() {
    // TODO: Populate with real trade-data CSV (same pattern as air emissions ECharts)
    // Use FACTOR_GROUP_KEYWORDS.materials with extension-based matching against factor.csv
    console.log('Creating material charts...');
}

function createEmploymentCharts() {
    // Employment Comparison
    const ctx1 = document.getElementById('employment-comparison');
    if (charts.employmentComparison) charts.employmentComparison.destroy();
    
    const selectedData = Array.from(selectedCountries).map(code => ({
        country: COUNTRIES[code].name,
        people: countryData[code].employment * 0.7,
        hours: countryData[code].employment * 0.3,
        color: COUNTRIES[code].color,
        flag: COUNTRIES[code].flag
    }));

    charts.employmentComparison = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: selectedData.map(d => `${d.flag} ${d.country}`),
            datasets: [
                {
                    label: 'Employment People',
                    data: selectedData.map(d => d.people),
                    backgroundColor: '#27ae6080',
                    borderColor: '#27ae60',
                    borderWidth: 2
                },
                {
                    label: 'Employment Hours',
                    data: selectedData.map(d => d.hours),
                    backgroundColor: '#2ecc7180',
                    borderColor: '#2ecc71',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Employment Impact by Country',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Employment Factor Relationships'
                    }
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
        const response = await fetch(`${DATA_BASE_URL}/industry.csv`);
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
        const response = await fetch(`${DATA_BASE_URL}/factor.csv`);
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
// Only trade.csv and trade_factor.csv exist per country/flow in the trade-data repo
async function loadCountryTradeFlow(countryCode, tradeFlow) {
    try {
        const baseUrl = `${DATA_BASE_URL}/${countryCode}/${tradeFlow}`;

        const [tradeCSV, factorCSV] = await Promise.all([
            fetch(`${baseUrl}/trade.csv`).then(r => r.ok ? r.text() : null),
            fetch(`${baseUrl}/trade_factor.csv`).then(r => r.ok ? r.text() : null)
        ]);

        if (!tradeData[countryCode]) {
            tradeData[countryCode] = {};
        }

        tradeData[countryCode][tradeFlow] = {
            trade: tradeCSV ? Papa.parse(tradeCSV, { header: true, skipEmptyLines: true }).data : [],
            factors: factorCSV ? Papa.parse(factorCSV, { header: true, skipEmptyLines: true }).data : []
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
            show: false
        },
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    result += `${param.seriesName}: ${formatNumber(param.value)}<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['Domestic', 'Exports', 'Imports'],
            top: 0
        },
        grid: {
            left: 60,
            right: 15,
            bottom: 30,
            top: 35
        },
        xAxis: {
            type: 'category',
            data: data.countries,
            axisLabel: { fontSize: 11 }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function(val) { return formatNumber(val); },
                fontSize: 10
            }
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
        title: { show: false },
        tooltip: {
            formatter: function(params) {
                return `${params.name}<br/>Impact: ${formatNumber(params.value)}<br/>Share: ${((params.value / data.total) * 100).toFixed(1)}%`;
            }
        },
        series: [{
            type: 'treemap',
            data: data.sectors,
            roam: false,
            nodeClick: false,
            top: 5,
            left: 5,
            right: 5,
            bottom: 5,
            breadcrumb: { show: false },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2
            },
            label: {
                show: true,
                formatter: '{b}',
                fontSize: 11
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
function createCountryPerformanceChart() {
    const data = analyzeCountryPerformance();

    const option = {
        title: { show: false },
        tooltip: {
            formatter: function(params) {
                const point = params.data;
                return `${point.name}<br/>Trade Volume: ${formatNumber(point.value[0])}<br/>Impact: ${formatNumber(point.value[1])}`;
            }
        },
        grid: {
            left: 70,
            right: 20,
            bottom: 45,
            top: 15
        },
        xAxis: {
            type: 'value',
            name: 'Trade Volume',
            nameLocation: 'middle',
            nameGap: 28,
            nameTextStyle: { fontSize: 11 },
            axisLabel: {
                formatter: function(val) { return formatNumber(val); },
                fontSize: 10
            }
        },
        yAxis: {
            type: 'value',
            name: 'Impact',
            nameLocation: 'middle',
            nameGap: 55,
            nameTextStyle: { fontSize: 11 },
            axisLabel: {
                formatter: function(val) { return formatNumber(val); },
                fontSize: 10
            }
        },
        series: [{
            type: 'scatter',
            symbolSize: 20,
            data: data.points,
            label: {
                show: true,
                formatter: function(params) { return params.data.name; },
                position: 'right',
                fontSize: 11
            },
            itemStyle: {
                opacity: 0.8
            }
        }]
    };

    echartsInstances.chart3.setOption(option, true);
    document.getElementById('chart3-title').textContent = 'Country Environmental Performance Matrix';
}

// Chart 4: Top Export Destinations
function createTradeNetworkChart() {
    const data = analyzeTopExportDestinations();

    const option = {
        title: { show: false },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function(params) {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    result += `${param.seriesName}: ${formatNumber(param.value)}<br/>`;
                });
                return result;
            }
        },
        legend: {
            top: 0,
            itemWidth: 12,
            itemHeight: 12,
            textStyle: { fontSize: 11 }
        },
        grid: {
            left: 35,
            right: 15,
            bottom: 30,
            top: 30
        },
        yAxis: {
            type: 'category',
            data: data.destinations,
            axisLabel: { fontSize: 11 }
        },
        xAxis: {
            type: 'value',
            axisLabel: {
                formatter: function(val) { return formatNumber(val); },
                fontSize: 10
            }
        },
        series: data.series
    };

    echartsInstances.chart4.setOption(option, true);
    document.getElementById('chart4-title').textContent = 'Top Export Destinations';
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
    const extensions = FACTOR_GROUP_KEYWORDS[currentAnalysisMode] || [];

    for (const countryCode of selectedCountries) {
        const countryTradeData = tradeData[countryCode] || {};

        Object.values(countryTradeData).forEach(flowData => {
            if (!flowData || !flowData.trade || !flowData.factors) return;

            // Map trade_id to industry code and name
            const tradeIndustry = {};
            flowData.trade.forEach(trade => {
                const code = trade.industry1;
                if (currentIndustryFilter !== 'all' && !matchesIndustryFilter(code)) return;
                const info = industryData[code];
                tradeIndustry[trade.trade_id] = info ? info.name : code;
            });

            // Sum impact_value by industry, filtered by current analysis mode
            flowData.factors.forEach(factor => {
                const factorInfo = factorData[factor.factor_id];
                if (!factorInfo || !extensions.includes(factorInfo.extension)) return;

                const industryName = tradeIndustry[factor.trade_id];
                if (!industryName) return;
                const val = parseFloat(factor.impact_value) || 0;
                if (!sectorImpacts[industryName]) sectorImpacts[industryName] = 0;
                sectorImpacts[industryName] += val;
                total += val;
            });
        });
    }

    const sectors = Object.entries(sectorImpacts)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);

    return { sectors, total };
}

// Check if an industry code belongs to the currently selected industry filter
function matchesIndustryFilter(industryCode) {
    const filterIndustries = INDUSTRY_CATEGORIES[currentIndustryFilter];
    if (!filterIndustries) return true;
    return filterIndustries.includes(industryCode);
}

function analyzeCountryPerformance() {
    const points = [];
    const extensions = FACTOR_GROUP_KEYWORDS[currentAnalysisMode] || [];

    for (const countryCode of selectedCountries) {
        const countryName = COUNTRIES[countryCode]?.name || countryCode;
        const countryTradeData = tradeData[countryCode] || {};

        let totalVolume = 0;
        let totalImpact = 0;

        Object.values(countryTradeData).forEach(flowData => {
            // Build valid trade_ids for industry filter
            let validTradeIds = null;
            if (currentIndustryFilter !== 'all' && flowData && flowData.trade) {
                validTradeIds = new Set();
                flowData.trade.forEach(trade => {
                    if (matchesIndustryFilter(trade.industry1)) {
                        validTradeIds.add(trade.trade_id);
                        totalVolume += parseFloat(trade.amount) || 0;
                    }
                });
            } else if (flowData && flowData.trade) {
                flowData.trade.forEach(trade => {
                    totalVolume += parseFloat(trade.amount) || 0;
                });
            }

            if (flowData && flowData.factors) {
                flowData.factors.forEach(factor => {
                    if (validTradeIds && !validTradeIds.has(factor.trade_id)) return;
                    const factorInfo = factorData[factor.factor_id];
                    if (factorInfo && extensions.includes(factorInfo.extension)) {
                        totalImpact += parseFloat(factor.impact_value) || 0;
                    }
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
    
    // Create nodes for countries
    for (const countryCode of selectedCountries) {
        const countryName = COUNTRIES[countryCode]?.name || countryCode;
        nodes.push({
            name: countryName,
            value: 0
        });
        nodeMap.set(countryCode, countryName);
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
    }
    
    return { nodes, links };
}

// Aggregate top 10 export destinations across selected countries
function analyzeTopExportDestinations() {
    const destTotals = {};

    for (const countryCode of selectedCountries) {
        const countryTradeData = tradeData[countryCode] || {};
        if (countryTradeData.exports && countryTradeData.exports.trade) {
            countryTradeData.exports.trade.forEach(trade => {
                const dest = trade.region2;
                if (!dest || dest === countryCode) return;
                if (!destTotals[dest]) destTotals[dest] = {};
                if (!destTotals[dest][countryCode]) destTotals[dest][countryCode] = 0;
                destTotals[dest][countryCode] += parseFloat(trade.amount) || 0;
            });
        }
    }

    // Sort by total volume, take top 10
    const sorted = Object.entries(destTotals)
        .map(([dest, byCountry]) => ({
            dest,
            total: Object.values(byCountry).reduce((a, b) => a + b, 0),
            byCountry
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .reverse();

    const destinations = sorted.map(d => d.dest);
    const countries = Array.from(selectedCountries);
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];
    const series = countries.map((code, i) => ({
        name: COUNTRIES[code]?.name || code,
        type: 'bar',
        stack: 'total',
        data: sorted.map(d => Math.round(d.byCountry[code] || 0)),
        itemStyle: { color: colors[i % colors.length] }
    }));

    return { destinations, series };
}

// Helper functions
// Matches trade_factor rows to the current analysis mode using the factor.csv extension column
// Optionally filters by industry when currentIndustryFilter is set
function calculateFlowImpact(flowData) {
    if (!flowData || !flowData.factors) return 0;

    let totalImpact = 0;
    const extensions = FACTOR_GROUP_KEYWORDS[currentAnalysisMode] || [];

    // Build set of valid trade_ids if industry filter is active
    let validTradeIds = null;
    if (currentIndustryFilter !== 'all' && flowData.trade) {
        validTradeIds = new Set();
        flowData.trade.forEach(trade => {
            if (matchesIndustryFilter(trade.industry1)) {
                validTradeIds.add(trade.trade_id);
            }
        });
    }

    flowData.factors.forEach(factor => {
        if (validTradeIds && !validTradeIds.has(factor.trade_id)) return;
        const factorInfo = factorData[factor.factor_id];
        if (factorInfo && extensions.includes(factorInfo.extension)) {
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