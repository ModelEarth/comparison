# Comparison Sample Widgets - Prompt Experiments

A collection of prompt experiments and widget implementations for the ModelEarth comparison project. These reusable widgets display international trade and environmental impact data on interactive dashboards.

**Maintained by:** Yiwen  
**Model:** Claude Sonnet 4.5 in VSCode  
**Status:** Active Development

---

## Prompt Records

### Prompt 1: Multi-Chart Trade & Environmental Impact Dashboard

**Objective:** Create an interactive data visualization dashboard with responsive charts and data filtering.

**Deliverables:** 3 files (index.html, script.js, styles.css)

#### Data Source
- **Repository:** https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019/
- **Documentation:** https://github.com/ModelEarth/exiobase/blob/main/tradeflow/CLAUDE.md
- **Key Files:** 
  - Reference: `industry.csv`, `factor.csv`
  - Per country (US, IN, RU): `trade.csv`, `trade_factor.csv` in `domestic/`, `exports/`, `imports/` folders

#### Dashboard Components

**Interactive Elements:**
- Leaflet map for country selection (US, India, Russia)
- Interactive country selector widget floating on map
- Dropdown to filter by environmental factor groups (air, water, energy, land, materials, employment)
- Summary cards displaying environmental impact totals per country

**Visualizations (using ECharts):**
1. Country comparison bar chart
2. Trade flow breakdown (domestic vs exports vs imports) stacked bar chart
3. Industry breakdown bar chart

**Bonus Features:**
- Dynamic insights section with AI-generated bullet points
- Debug panel showing data loading progress
- Collapsible country selector widget with toggle button
- Interactive map markers with hover tooltips

#### Data Processing Requirements
- Load reference files (`industry.csv`, `factor.csv`) first
- Map `factor.csv` extension column to environmental groups
- Load `trade_factor.csv` for each country/flow combination
- Use `trade.csv` to map `trade_id` to industry information
- Aggregate `impact_value` by factor group

#### Design Specifications
- Modern, clean design with gradient hero header
- Card-based country layout
- Responsive charts that update dynamically
- Floating country selector widget on map
- Graceful error handling for missing files (console warnings)

#### Technical Stack
- PapaParse for CSV loading
- ECharts for chart rendering
- Leaflet for map functionality
- All libraries from CDN (no build step)
- No hardcoded/fake data

---

### Prompt 2: Multi-Widget Dashboard Design

**Objective:** Design and implement 2-3 specialized widgets showcasing different aspects of trade data comparison.

**Status:** In Planning



---

## Implementation Files

| File | Purpose |
|------|---------|
| `index.html` | Main HTML structure and CDN library imports |
| `script.js` | Data loading, processing, and chart initialization |
| `styles.css` | Layout, responsive design, and visual styling |

---

## Progress Tracking

### ✅ Completed
- [x] Prompt 1 specification finalized
- [x] README structure created
- [x] Initial dashboard implementation (index.html, script.js, styles.css)
- [x] Interactive country selector widget floating on map
- [x] Map markers with hover tooltips and click interactions
- [x] Toggle button for collapsing/expanding country list
- [x] Responsive design with mobile optimization

### 🔄 In Progress
- [ ] Debug data loading and display issues
- [ ] Enhance UI/UX with advanced visualizations
- [ ] Create Prompt 2 widget designs

### ❌ Current Issues

#### Issue 1: Data Not Displaying on Page
**Problem:** CSV data from GitHub repository is not loading/displaying on the dashboard
**Root Causes (to investigate):**
- CORS (Cross-Origin Resource Sharing) restrictions when fetching from GitHub raw URLs
- Incorrect CSV file paths or repository structure changes
- PapaParse not properly parsing CSV format
- JavaScript errors preventing data processing
- Network/connectivity issues fetching remote data

**Debug Steps Needed:**
1. Open browser DevTools (F12) → Console tab to check for JavaScript errors
2. Check Network tab to see if CSV requests are succeeding or being blocked by CORS
3. Verify GitHub repository paths are correct and files exist
4. Test with local CSV files as fallback to isolate the issue
5. Add more detailed logging to data loading functions

**Solution Implemented:**
- Added multiple CORS proxy fallback options (allorigins.win, corsproxy.io, cors-anywhere)
- Implemented `fetchWithCORSFallback()` function for robust data loading
- Added comprehensive error handling and logging

#### Issue 2: UI/UX Enhancement
**Improvements Made:**
- Interactive country selector widget floating on map (top-right corner)
- Beautiful gradient header and styling
- Hover effects and animations
- Toggle button to collapse/expand country list
- Clear all selections button
- Map markers with tooltips showing country names
- Responsive design for mobile devices

---

### 📋 Next Goals (Enhanced Implementation)

#### Phase 1: Fix Data Loading (Priority: Critical)
1. **Debug CSV Loading:**
   - ✅ Add console logging at each data load step
   - ✅ Implement CORS workaround (multiple proxy fallback)
   - ✅ Add error boundaries and user-friendly error messages
   - [ ] Test with sample local CSV files
   - [ ] Verify all data endpoints are working

2. **Implement Fallback Data:**
   - [ ] Create mock dataset structure for testing
   - [ ] Allow toggling between real and sample data
   - [ ] Enable local CSV file upload for testing

#### Phase 2: Enhanced Visual Design
1. **Advanced Chart Features:**
   - [ ] Add animations on chart load
   - [ ] Interactive legends with visibility toggling
   - [ ] Hover tooltips with detailed information
   - [ ] Export charts as images or data
   - [ ] Comparison mode (side-by-side country analysis)

2. **UI/UX Improvements:**
   - [ ] Animated loading skeletons while data loads
   - [ ] Smooth transitions between factor selections
   - [ ] Glassmorphism or neumorphism design elements
   - [ ] Interactive timeline slider for year selection
   - [ ] Advanced filtering: by industry, factor group, value range
   - [ ] Dark mode toggle option

3. **Data Visualization Enhancements:**
   - [ ] Sankey diagram for trade flows
   - [ ] Heatmap for country-factor matrix
   - [ ] Sunburst chart for hierarchical industry data
   - [ ] Animated world map with trade connections
   - [ ] Comparison matrix table view

#### Phase 3: Advanced Interactivity
1. **Real-time Features:**
   - [ ] Search/filter by country, industry, or factor
   - [ ] Drill-down capabilities (click industry to see details)
   - [ ] Benchmarking tools (compare countries side-by-side)
   - [ ] Data export (CSV, JSON, charts as PNG)

2. **Performance Optimization:**
   - [ ] Lazy load visualizations (render on-demand)
   - [ ] Virtual scrolling for large datasets
   - [ ] Data caching and compression
   - [ ] Progressive rendering

3. **Responsive & Accessibility:**
   - [ ] Keyboard navigation for all controls
   - [ ] ARIA labels for screen readers
   - [x] Full mobile responsiveness with touch gestures
   - [ ] Print-friendly layouts

#### Phase 4: Prompt 2 - Multi-Widget Collection
Design 2-3 specialized comparison widgets:
1. **Widget A:** Environmental Impact Heatmap (countries vs factors in matrix view)
2. **Widget B:** Trade Flow Sankey (interactive flow visualization)
3. **Widget C:** Industry Deep-Dive (drillable industry hierarchy)

---

## Related Projects

### Data Source Display Implementation
- **Developer:** Harsh
- **Features:** Expandable views with Tabulator tables, optimized lazy loading
- **Link:** https://model.earth/comparison/dev/harsh

### Other Developer Experiments
- **Antariksh:** https://github.com/ModelEarth/comparison/tree/main/dev/antariksh
- **Loren:** `/comparison/dev/loren/`

---

## Troubleshooting Guide

### Data Not Loading?

**Step 1: Check Browser Console**
```javascript
// Open DevTools (F12) → Console and look for errors like:
// - "CORS policy" errors
// - "Failed to fetch" messages
// - Undefined variable errors
```

**Step 2: Verify Data Source**
- Test CSV URLs directly in browser:
  - https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019/industry.csv
  - https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019/factor.csv

**Step 3: Common Fixes**
| Issue | Solution |
|-------|----------|
| CORS Errors | Multiple CORS proxies implemented (allorigins.win, corsproxy.io) |
| 404 Errors | Verify GitHub paths and file names |
| Parsing Errors | Check CSV format (check for BOM, line endings) |
| Blank Charts | Check if data arrays are populated in console |
| Slow Loading | Implement data caching or use local files |

**Step 4: Debug Mode**
The debug panel at top of page shows loading progress. Check messages for specific errors. You can also run `window.debugDashboard()` in the console for comprehensive diagnostics.

---

## Testing Checklist

- [ ] Data loads without console errors
- [ ] All three charts render with data
- [x] Country selection map works (click countries)
- [x] Country selector widget works (floating on map)
- [ ] Factor dropdown filters data correctly
- [ ] Summary cards update with selected data
- [ ] Insights generate dynamically
- [x] Responsive design works on mobile
- [x] Charts resize on window resize
- [ ] No network request timeouts
- [x] Widget toggle button works
- [x] Clear all selections button works

---

## Future Enhancement Ideas

- **Real-time data updates** from live sources
- **Data comparison tools** for multi-year analysis
- **Custom date range selection**
- **Export to PDF/Excel** functionality
- **Shareable dashboard links** with selected filters
- **Team collaboration features** with comments/annotations
- **Advanced statistical analysis** (correlation, trends)
- **Machine learning insights** (anomaly detection, predictions)

## Resources

- **ModelEarth Comparison:** https://model.earth/comparison
- **Comparison Repo:** https://github.com/ModelEarth/comparison
- **Trade Data Source:** https://github.com/ModelEarth/trade-data
- **ExioBase Documentation:** https://github.com/ModelEarth/exiobase/blob/main/tradeflow/CLAUDE.md
- **PapaParse Docs:** https://www.papaparse.com/
- **ECharts Documentation:** https://echarts.apache.org/
- **Leaflet Documentation:** https://leafletjs.com/

---

**Last Updated:** January 2026  
**Framework:** Claude Sonnet 4.5 + VSCode  
**Status:** 🚧 In Active Development - Interactive Widget Implementation Phase
