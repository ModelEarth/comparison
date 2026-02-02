# Comparison

### Prompt 1

Issue: Didn't use the .csv data. Only used placeholders.

Noteworthy: Uses motion.js based on prompt. Created nice tabs for both UN Goals and Trade Flow Factors.

Prompt: I love the Country Comparison Summary. Create a page at readeflow/comparison that provides that and many other cool ways to parse and compare our csv files for country comparisons. Use dynamic charts and data visualixation. Use Motion.dev  for animated UX. Put some though into it and really knock my socks off high level data visualization with a lot of that opens awareness and focuses on the UN 30 year goals. Default to the US and India and assume that all the csv files are there, rather than creating fake placeholder data. Provide a process for slectioning up to 12 countries and include a Leaflet map as the page header (500px tall) that expands for making selections, with the selected countries highlighted. Include additional data in the map popups and integrated in the map legend that has selected countries at  the top of the legend iwith checks on colored boxes. The boxes reside beside all the countries, but only turn a color  when checked, which matches their color on the map, in their 1 of 12 panels where a snapshot of each country selected  appears below the map. When there are country 2 panels, each would be 50% of the area below the map. After the panels  show the numerous charts full screen that convey the tremendouse detail of this data. Include charts for each of the priority_factors you've highlighted, and provide tabs for moving between the charts: air, water, land, energy, material, jobs. priority_factors = {'air_emissions': ['CO2', 'CH4', 'N2O', 'NOX', 'CO', 'SO2', 'NH3', 'PM10', 'PM2.5'], 'employment': ['Employment people', 'Employment hours'], 'energy': ['Energy use', 'Electricity', 'Natural gas', 'Oil'], 'water': ['Water consumption', 'Water withdrawal'], 'land': ['Cropland', 'Forest', 'Pastures', 'Artificial'], 'material': ['Metal Ores', 'Non-Metallic Minerals', 'Fossil Fuels', 'Primary Crops']} 


### Data Pipeline Fix (by Thousif)

The four ECharts panels in the Air Emissions section were fully coded but rendered empty because the data loading pipeline was broken. This fix connects all four charts to real EXIOBASE 2019 CSV data.

**Data pipeline fixes:**
- Switched data URLs from broken local paths (`../../../trade-data/`) to GitHub raw URLs (`https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019`)
- Removed 3 non-existent CSV fetches (`trade_impact.csv`, `trade_employment.csv`, `trade_resource.csv`); kept only `trade.csv` and `trade_factor.csv` which are the actual files in the repo
- Fixed country whitelist: removed AE, SA, ZA (no data exists); added WM (Middle East) -- now 14 valid countries

**Factor matching fix:**
- Switched from stressor-based substring matching to exact extension-based matching using `factor.csv` extension column values (`air_emissions`, `employment`, `energy`, `land`, `material`, `water`)
- Removed `coefficient` fallback in impact calculation (coefficient values are 10-100x larger than `impact_value` and inflated results to quadrillions)

**Chart improvements:**
- Treemap (Chart 2): now aggregates `impact_value` by industry name (from `industry.csv`) filtered by analysis mode, showing top 15 industries instead of broken category codes
- Scatter (Chart 3): filters environmental impact by the selected analysis mode instead of summing all factors
- Replaced empty Sankey (Chart 4) with Top 10 Export Destinations stacked bar chart, which always has data regardless of country selection
- All charts respond to both the Analysis Focus and Industry Focus dropdowns
- Fixed overlapping titles, legends, and axis labels across all four charts

**Both dropdowns now functional:**
- Analysis Focus: filters all charts by factor group (air emissions, employment, energy, water, materials, health)
- Industry Focus: filters by industry category (agriculture, manufacturing, energy, construction, transport, services)

**What still needs work:**
- Land, Energy, and Material tabs are stubs (`createLandCharts()`, `createEnergyCharts()`, `createMaterialCharts()`)
- Country panels and executive summary still use mock data
- Water and Employment tabs use Chart.js with mock data (not real CSV)

**Data source:** `https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019/`
**Available countries:** US, CA, BR, GB, DE, FR, IT, RU, CN, JP, IN, KR, AU, WM

---

Prompt 2: Building on the existing country trade flow comparisons in the comparison/dev/loren/index.html page, populate the 4 blank panels in the "Air Emissions Impact Analysis" titled section with dynamic data visualizations (that are broader than Air Emissions when different factor grouping are selected in a dropdown above the panels - change the title when the dropdown is changed) which use data pulled from the trade-data/year/2019/[2-char-country]/[tradeflow] folders (where tradefow is domestic, imports and exports) based on what you learn about the data descripbed in exiobase/tradeflow/claude.md, the python if needed as a reference, and the actual files for 2019 (which we've populated for 13 countries including Russia (RU). The charts could use Apache eChart  https://echarts.apache.org/examples/en/ and you should be very creative in your approach by combining data across tradeflow types and countries to reveal a deep and unique analysis of specific industries, impacts, empoyment, demographic factors, energy, water, health, valeu added prosperity, and UN goals using a selection menu above the panels populate by industry clusters from the industry.csv file in the year folder, and factor.csv for set of related factors (also in the year folder). Default to interesting analysis that is very different for each of the four panels.