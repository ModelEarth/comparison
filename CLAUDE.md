# International Comparison Dashboard - Development Guide

## Overview

This guide documents reusable chart components and patterns for building comparison visualizations with EXIOBASE tradeflow data. Each component links to working implementations in the `/dev/antariksh/` folder.

---

## Data Structure

### Files Required
- **Reference files**: `factor.csv`, `industry.csv` (year level)
- **Per-country files**: 6 files per country across `domestic/`, `exports/`, `imports/` folders
  - `trade.csv` - Trade records with industry mappings
  - `trade_factor.csv` - Environmental impact values

See: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 23-34 for data paths)

### Available Countries (14 Total)
`US, CA, BR, GB, DE, FR, IT, RU, CN, JP, IN, KR, AU, WM`

**⚠️ Critical**: Only request these 14 countries to prevent 404 loops that crash the browser.

See: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 2-21 for COUNTRIES config)

---

## Factor Groups

Six environmental categories map to factor extensions:
- **Air**: CO2, emissions, GHG
- **Water**: Water use, consumption
- **Energy**: Energy carriers, electricity
- **Land**: Land use, arable, forest
- **Materials**: Biomass, metals, minerals  
- **Employment**: Labour, jobs

See: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 39-62 for factor mapping)

---

## Reusable Chart Components

### 1. Country Comparison Bar Chart
**Purpose**: Compare total environmental impact across selected countries  
**Features**: Gradient colors, country flags in tooltips, auto-rotating labels  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 624-736)

### 2. Trade Flow Breakdown (Stacked Bar)
**Purpose**: Show domestic vs exports vs imports for each country  
**Color scheme**: Blue (domestic), Green (exports), Orange (imports)  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 737-785)

### 3. Industry Breakdown
**Purpose**: Display top 15 industries by environmental impact  
**Features**: Horizontal bars, aggregates across all trade flows  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 786-877)

### 4. Dual Pie Charts
**Purpose**: Compare domestic+exports vs domestic+imports side-by-side  
**Features**: Country selector outside chart area, donut style  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 1019-1260)

### 5. Impact Intensity Gauges
**Purpose**: Show relative impact levels as speedometer-style meters  
**Color zones**: Green (0-25%), Blue (25-50%), Orange (50-75%), Red (75-100%)  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 1604-1760)  
**Known fix**: Includes setTimeout resize fix for initial overflow issue

### 6. Environmental Impact Timeline (Zig-Zag)
**Purpose**: Narrative journey showing country impacts with contextual insights  
**Features**: Alternating left/right cards, numbered timeline nodes, glassmorphism design  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 400-521)  
**Insights database**: Lines 406-475 contain country-specific insights

### 7. Flow-Rings Visualization (D3.js)
**Purpose**: Concentric rings showing trade volumes with environmental impact overlay  
**Features**: Interactive tooltips, SVG/PNG export, syncs with factor selection  
**Dependencies**: D3.js v7  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 2368-2845)

### 8. Chord-Sankey Hybrid
**Purpose**: Bilateral trade flows with animated particles showing direction  
**Features**: Chord diagram layout, color-coded by impact, flow animation  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 3100-3617)

---

## UI/UX Patterns

### Sticky Factor Selector
Frozen section that stays visible on scroll with horizontal button layout.  
**CSS**: [/comparison/dev/antariksh/styles.css](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/styles.css) (search "factor-selector-sticky")  
**JS**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (function `selectFactor`)

### Collapsible Sidebar
Sidebar collapses with toggle button, map expands to fill space.  
**CSS**: [/comparison/dev/antariksh/styles.css](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/styles.css) (search "sidebar")  
**JS**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (search "initSidebarToggle")

### Country Card Carousel
Displays side-by-side for ≤2 countries, switches to horizontal carousel for 3+ countries.  
**CSS**: [/comparison/dev/antariksh/styles.css](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/styles.css) (search "country-cards-container")  
**JS**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (function `updateCountryCards`)

### Country Flags
Uses CSS flag-icons library for consistent flag display across all components.  
**CDN**: `https://cdn.jsdelivr.net/gh/lipis/flag-icons@6.6.6/css/flag-icons.min.css`  
**Usage**: `<span class="fi fi-us"></span>` for USA flag

---

## Data Processing

### CSV Loading
Uses PapaParse for CSV files with error handling that prevents crashes.  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 100-250)  
**Key function**: `loadAllData()` orchestrates loading sequence

### Number Formatting
Converts large numbers to K/M/B notation for readability.  
**Function**: `formatNumber(num)` in [script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 89-96)

### Data Aggregation
Three main aggregation patterns:
- **By country**: `calculateTotalForCountry(code, factorGroup)`
- **By flow**: `calculateTotalByFlow(code, factorGroup, flow)`  
- **By industry**: `aggregateByIndustry(countries, factorGroup)`

See: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 253-330)

---

## Performance & Debugging

### Prevent 404 Loops (Critical)
**Problem**: Requesting non-existent countries causes infinite retry loops  
**Solution**: Always validate against `AVAILABLE_COUNTRIES` whitelist before loading  
**Implementation**: Never retry failed requests, return null instead  
See: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (lines 200-250)

### Debug Panel
Console panel showing data load progress (hidden in production).  
**Toggle**: Press `Ctrl+D` to show/hide  
**CSS**: [/comparison/dev/antariksh/styles.css](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/styles.css) (search "debug-panel")

### Chart Resize Handling
Debounced window resize handler that updates all chart instances.  
**Implementation**: [/comparison/dev/antariksh/script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js) (search "resizeAllCharts")

---

## Integration Guide

### Adding a New Chart
1. Create HTML container with unique ID
2. Write `updateYourChart()` function following existing patterns
3. Add to `updateAdvancedCharts()` call chain
4. Add resize handler
5. Add disposal in cleanup function

**Template**: See any existing chart function in [script.js](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/script.js)

### Adding a New Factor Group
1. Add keywords to `FACTOR_GROUP_MAPPING` object
2. Add button to HTML factor selector
3. No code changes needed - `getFactorGroup()` handles mapping automatically

### Adding a New Country
1. Verify data exists in dataset: `/year/2019/[COUNTRY_CODE]/`
2. Add to `COUNTRIES` object with coords, flag, color, region
3. Add code to `AVAILABLE_COUNTRIES` whitelist
4. Country auto-appears in sidebar, map, charts, dropdowns

---

## Style Standards

### Color Palette
See: [/comparison/dev/antariksh/styles.css](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/styles.css) (`:root` CSS variables)

**Key colors**:
- Accent gradient: `#667eea` → `#764ba2` (purple)
- Chart colors: Blue (#3b82f6), Green (#10b981), Orange (#f59e0b)
- Text: Primary (#1e293b), Secondary (#64748b), Muted (#94a3b8)

### Typography
Uses system font stack for native platform appearance.  
See: [/comparison/dev/antariksh/styles.css](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/styles.css) (body and heading styles)

---

## Key Links

- **Main comparison page**: https://model.earth/comparison
- **Antariksh's implementation**: https://model.earth/comparison/dev/antariksh/
- **Trade data repo**: https://github.com/ModelEarth/trade-data
- **Factor definitions**: [factor.csv](https://github.com/ModelEarth/trade-data/blob/main/year/2019/factor.csv)
- **Industry definitions**: [industry.csv](https://github.com/ModelEarth/trade-data/blob/main/year/2019/industry.csv)
- **Prompt log**: [/comparison/dev/antariksh/README.md](https://github.com/ModelEarth/comparison/blob/main/dev/antariksh/README.md)

---

## Best Practices

✅ Validate country codes against whitelist  
✅ Handle errors gracefully without crashes  
✅ Position legends outside charts  
✅ Use consistent color schemes  
✅ Sync updates with global state  
✅ Provide export options (PNG/SVG)  
✅ Implement responsive design  
✅ Test with 0, 1, 2, and 3+ countries  
✅ Dispose charts to avoid memory leaks  
✅ Reference actual code in `/dev/antariksh/` rather than duplicating

---

## Quick Reference

### Essential CDN Links
```html
<!-- ECharts -->
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>

<!-- D3.js -->
<script src="https://d3js.org/d3.v7.min.js"></script>

<!-- PapaParse -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>

<!-- Flag Icons -->
<link href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@6.6.6/css/flag-icons.min.css" rel="stylesheet">
```

### State Variables
```javascript
selectedCountries = new Set(['US']);  // Default: USA
currentFactorGroup = 'air';           // Default: air quality
dataLoadingComplete = false;          // Loading status flag
```

---

*For detailed code implementations, see: [/comparison/dev/antariksh/](https://github.com/ModelEarth/comparison/tree/main/dev/antariksh)*