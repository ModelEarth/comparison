# Data Source Display Template

## Overview
This template provides instructions for displaying trade data sources with expandable views using **Tabulator tables** (not ECharts), optimized for lazy-loading to improve page performance.

## Context
The comparison repo uses:
- **ECharts** for main visualizations (already in `script.js`)
- **CSV data** loaded from `../../../trade-data/year/2019/[country]/[flow]/`
- **Papa Parse** for CSV parsing (already included)

This template adds a **new feature**: displaying the raw source data tables below the visualizations.

## Display Requirements

### Layout Structure
1. Add a "Show Sources" button below the existing chart sections
2. When clicked, reveal collapsible panels for each data source
3. Each panel contains a **Tabulator table** showing the CSV data
4. Support for different data types:
   - `trade.csv` - Trade flow data
   - `trade_factor.csv` - Environmental factors
   - `trade_impact.csv` - Impact calculations
   - `trade_employment.csv` - Employment data
   - `trade_resource.csv` - Resource usage

### Performance Optimization - CRITICAL
- **Do NOT load Tabulator or data tables on initial page load**
- Only load Tabulator library when user clicks "Show Sources"
- Only initialize tables when a specific panel is expanded
- This prevents slowing down the main dashboard

### Implementation Pattern
```javascript
// Add to script.js
let tabulatorLoaded = false;

async function loadTabulatorLibrary() {
    if (tabulatorLoaded) return;
    
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/tabulator-tables@5.5.0/dist/css/tabulator.min.css';
    document.head.appendChild(link);
    
    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/tabulator-tables@5.5.0/dist/js/tabulator.min.js';
    await new Promise(resolve => {
        script.onload = resolve;
        document.body.appendChild(script);
    });
    
    tabulatorLoaded = true;
}

function createSourcesSection() {
    // Add button below existing .insights-section
    const button = document.createElement('button');
    button.id = 'show-sources-btn';
    button.textContent = '📊 Show Data Sources';
    button.onclick = async () => {
        await loadTabulatorLibrary();
        showSourcePanels();
    };
    
    // Insert before footer
    const footer = document.querySelector('.footer');
    footer.insertAdjacentElement('beforebegin', button);
}
```

### Styling (add to styles.css)
```css
#show-sources-btn {
    display: block;
    margin: 2rem auto;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

#show-sources-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3);
}

.sources-container {
    margin: 2rem;
    display: none;
}

.sources-container.visible {
    display: block;
}

.source-panel {
    background: white;
    margin-bottom: 1.5rem;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.source-panel-header {
    padding: 1.5rem;
    background: #f8f9fa;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.source-panel-header:hover {
    background: #e9ecef;
}

.source-panel-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.source-panel-content.expanded {
    max-height: 600px;
    overflow: auto;
}

.tabulator {
    font-size: 14px;
}
```

### Data Integration

Reuse the existing `tradeData` object from `script.js`:
```javascript
// Access loaded CSV data
const countryCode = 'US';
const flowType = 'exports';
const data = tradeData[countryCode][flowType].trade; // Already parsed CSV
```

## Usage Example

After implementing this template:
1. User views dashboard with ECharts visualizations
2. User clicks "Show Sources" button
3. Tabulator library loads dynamically
4. Panels appear for each CSV file
5. User clicks a panel to expand and see the table
6. Only that specific table initializes (lazy loading)

## Files to Modify
- `dev/[your-handle]/index.html` - Add button and container elements
- `dev/[your-handle]/script.js` - Add source loading functions
- `dev/[your-handle]/styles.css` - Add source panel styling

## Reference
See Loren's implementation: `/comparison/dev/loren/`