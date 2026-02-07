# Shachi – International Comparison Prompt Experiments

This folder contains my experiments for improving comparison pages
using EXIOBASE tradeflow data in the Model Earth **comparison** project.

Focus areas:
- clearer factor selection UX
- better loading and error handling
- responsive and readable charts

I will document prompts, fixes, and improvements here as I iterate.

## Prompt Experiment 1 — GitHub RAW CSV Trade Dashboard (US / IN / RU)

### Goal
Create a dashboard that pulls **real EXIOBASE tradeflow CSV data** from GitHub for 3 countries (US, IN, RU) and visualizes international trade and environmental impacts using Leaflet + ECharts.

### Prompt Used

## Prompt 1
I need you to create a data visualization dashboard with 3 files (index.html, script.js, styles.css) that displays international trade and environmental impact data.
1.Requirements:

Data Source: Load CSV files from this GitHub repository: https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019/

The data structure is documented here: https://github.com/ModelEarth/exiobase/blob/main/tradeflow/CLAUDE.md
Key files: industry.csv, factor.csv, and for each country (US, IN, RU) there are trade.csv and trade_factor.csv files in domestic/, exports/, and imports/ folders


2.Dashboard Features:

Interactive Leaflet map to select countries (US, India, Russia)
Summary cards showing environmental impact totals for each selected country
Dropdown to switch between environmental factor groups (air, water, energy, land, materials, employment)
Three ECharts visualizations:

Country comparison bar chart
Trade flow breakdown (domestic vs exports vs imports) stacked bar chart
Industry breakdown bar chart


Dynamic insights section with bullet points


3.Data Processing:

Load industry.csv and factor.csv first for reference lookups
Map factor.csv's "extension" column to environmental groups (air, water, energy, etc.)
Load trade_factor.csv for each country/flow combination
Use trade.csv to map trade_id to industry information
Aggregate impact_value from trade_factor.csv by factor group


4.Design:

Modern, clean design with gradient hero header
Card-based layout for countries
Responsive charts that update when countries or factor groups change
Include a debug panel showing data loading progress


5.Technical:

Use PapaParse to load CSV files
Use ECharts for visualizations
Use Leaflet for the map
All libraries loaded from CDN
No fake data - handle missing files gracefully with console warnings



Output the complete code for all 3 files in one response.





## Prompt 2:

till now we were including only 3 countries, i want you to now include all the countries from the dataset. I also want you to understand and make the page look aesthetically pleasing, right now if we load the page it shows empty placeholders untill we select any country, instead of that keep USA selected by default so that the placeholders will not look empty and the page will look better.

# Follow up:
This is impressive, however if we select more than one country the impact gauge meter still goes out of the placeholder. also in the left section where we can choose the country instead of initials, i want you to add country flags next to country name.




## Prompt 3:

I want you to thoroughly analyze the trade-data data set and only keep those countries who's data we have in the data set. In the current version you have added countries which do not exist in our dataset. refer this link 

https://github.com/ModelEarth/trade-data/tree/main/year/2019

also, be cautious because the current version has a runaway loop that overwhelms by browser's use of the CPU. i want a clean code

# Follow up: 
Claude gave me only 3 countries again so added a screendump of the dataset repo explaining we have data for 14 countries available. 


## Prompt 4:
I cant see the country flags on the webpage, (uploaded screenshot).

# Follow up: 
Add Hover animations to the flags.

## Prompt 5:
Add country flags to storyline comparison section also


## Prompt 6:
so currently to select the countries u can either select from map or from sidebar. I want you to make the sidebar collapsible and once the sidebar is colapsed the map area should expand in the remaining space. also, just beneath the map we have a small section where we show selected countries and some basic information from the dataset,  I want you to resize those cards and use creative animations so once the number of selected countires goes more than 2 it would appear like a round table carousal.

# Follow up: 
the carousal animation is going all over the place, what i want you to do is make it a sliding carousal and make sure it stays in the placeholder that is already there

## Prompt 7: 
this works perfectly fine. now i want you to represent the 'Environmental Impact Story' section in a better way because we are redisplaying the data that we are already showing the selected countries carousel section. for the environmental impact story section try to come up with cool animations or a storyline or a unique graphical representation

# Follow Up: 

-this is great but try to adjust the size of this section it should look professional. Also, in the side by side section the charts go out of the placeholder.
-refer this image, this is how the data is going out of the box(Added Image to explain)
-this section is not representing the data as intented. bring the pie chart in center and make it look aesthetic(added image to explain)

## Prompt 8:
-Currently in the 'Environmental Factor Group' section has a dropdown menu to choose from different catoegories, I want you to replace that with individual buttons horizontally to select those categories. 

Also, in the Environmental Impact Journey section, we have a nice timeline flow but if we see closely we have empty sections on the opposite side of each card. I want you to fill that section with one or two major points explaining a little about the adjecent country card. 

In the pie chart section I want you to keep the country selection option out of the card to improve visibility of the pie chart better. 

also, currently we are using apache charts, why dnt you go and use echarts to make the charts look even better and interactive. also, I want you to use the space and sections we have used to present the comparisons in a very creative way so that it should not look like wasted white space. 

also I want you to use the following colour code for the entire UI 

https://model.earth/localsite/css/styles/#style=notion

# Follow up:
-refer the screenshots 

in the timeline section in the empty space some 1-2 pointers descriptive content should be there. 

the industry chart is empty

the pie chart legend is covering the chart. take that legen out of that box so pie  chart and legend both are visible and user can select accordingly

# Follow Up:
-i liked this way. but now, the right side looks too empty, so instead of clubbing everything in same pie chart make sure to make two different pie charts one for just domestic, exports and one for domestic, imports. use the same way to keep the legend and make both of them fit in the same section sideways

-add a scroll bar in the country selection section next to the map

-in the storyline section, make the country and information follow a zig zag pattern

-Impact Intensity Meters this section has impact gauge meters. when the page loads, the impact gauge meters for all countries go out of the placeholder, but if I resize the page zoom level say from 100% to 90 and then again back to 100% then these impact gauge meters magically appear inside the placeholder properly.

-🌍 Environmental Factor Group
Select a category to analyze environmental impacts

this section should freeze once we scroll down so that to select a different factor user should not be required to scroll all the way to the top. also resize the buttons inside to make it look professional


## Prompt 9: 
- Now, Generate a "Flow-Rings" section

Requirements:
1. Libraries: D3 v7 only (CDN). No API keys.
2. The code must handle exactly 14 countries but support dynamic selection of any subset (1..14).
3. Visual spec:
   - Concentric rings = one ring per trade category (derive category list from data).
   - On each ring, render country arcs. Arc length = country's share of that category's global volume.
   - Draw smooth Bézier connectors from origin arc → destination arc when pairwise destination info is present in the data; if not present, show connectors to a ring-level hotspot (top 3 destinations).
   - Color arcs by country×category average impact using a perceptual sequential scale (use d3.interpolateViridis or similar).
4. Interactivity & dynamic behavior:
   - Provide a multi-select country selector UI (searchable dropdown) and a map-lasso alternative (if lon/lat available). When the user changes selection, call filterByCountries() and then updateVisualization() so the rings re-render showing only selected countries (if none selected, show all).
   - Hover: highlight connectors and arcs; tooltip shows country, category, volume, impact, percent share.
   - Click: pin selection and open right-side panel with numeric breakdown and a mini-sparkline (if time series in data).
   - Provide ring toggles to hide/show specific categories and a reset button to restore defaults.
5. Implementation details:
   - Export support: 'Export SVG' and 'Export PNG' buttons that produce high-resolution assets.
   - Code must include modular functions: computeArcAngles(categories, data), buildConnectors(routes), renderRings(svg,...), and public functions loadData(), filterByCountries(), updateVisualization().
   - Annotate code with comments and a README snippet explaining how to map your repo's tradeflow files to the aggregate.json feed.
6. Performance:
   - Use precomputed aggregates if data is heavy. Provide a note and code path fallback for client-side pre-aggregation limited to 14 countries.
7. Deliverables: full contents of index.html, styles.css, script.js. Keep everything inlineable and ready to paste

## Follow-up: 
why does the user have to select the countries again in the flowrings section if the user is alreayd selecting countries in the begining.
increase the placeholder so that full rings are visible, also on hover a small square containing information should be there
except tooltip rest all is working. the tooltip still doesnot show up. and if we click on any country section in the flowring chart, it is generating a pop up dialogue, it should not generate that as well.

## Prompt 10: 

perfect! 

Now I want you to work on generating this type of charts (refer screenshots). We will call them Chord-Sankey Hybrid for Trade Flows. I want these to be a new section. where 
What it shows
* Between which countries goods are flowing
* Volume of imports and exports
* Environmental impact (color-coded by CO₂ or emissions)
* Thickness = magnitude, color = impact intensity
Why it’s unique
It combines:
* Chord diagram → relational direction (A → B)
* Sankey diagram → volume clarity
* Add impact scores as glow/gradient around each chord.

be creative with the animations and on-click/on-hover animations as well. 

screenshots are below :

## Follow-up: 
- this is really impressive but when i meant a seperate section means a seperate section inside the existing page. it should follow the current Ui and be consistent with current page. the charts should also change with the environmental factor chose by user from the frozen section of the page. also the text "Flow Visualization
Dynamic pathways of environmental impact" is going out of the container
- works perfect, can you add one more button for the user to download the sankey flow network as png and svg?

## Prompt 11: 
beneath the sakey chart, i want to add a Topographic Impact Cartogram comparison section. 

A Topographic Impact Cartogram turns each country into a 3D terrain-like tile whose height and shape distort according to environmental impact, trade volume, or both.
How it works
* Base map: Normal geographic boundaries, kept recognizable.
* Extrusion height:
   * Higher = more environmental impact (CO₂, water, land stress).
   * You can toggle modes (Impact Mode, Volume Mode, Composite Mode).
* Topographic rings/contours:
   * Like elevation rings on a real topographic map, but each ring reflects a threshold of impact or trade.
* Heat tinting:
   * Cool colors = low impact
   * Warm colors (amber → red) = high impact
   * Soft glows can be added for aesthetic.
* Dynamic flow lines:
   * Thin curved lines between countries (export/import flows).
   * Lines bend more around high “mountains,” showing geopolitical friction visually.
Interaction
* Hover a country → highlight ridge lines + show a mini tooltip:

Country: Germany  
Impact Elevation: High (78)  
CO₂: 1120  
Water Use: 540  
Trade Volume: 920
Toggle View:
Topography = Impact
Topography = Trade
Topography = Combined Score
it should be in sync with the countries that the user has selected and with the criteria user wants to select as the environmental factor. 

refer the image for UI, I want these charts to be 3d. use ur best creativity and make sure it looks ultra realistic and new age modern sleek styled. Also, feel free to use any additional external components.



## What this experiment achieved
- Claude generated `index.html`, `script.js`, and `styles.css` in one response as requested.
- Dashboard UI renders with map, cards, dropdown, charts, and insights panel.
- Real CSV loading logic was implemented (no static placeholder arrays).
- Debug console panel currently prints which CSVs load successfully vs missing.
- Currently it generates creative visualizations and has more comparision charts.
- It seems that claude misunderstood and has added countries which are not present in the Dataset.
- Claude added expected countries and reduced load times
- Improved UI
- Added Country Flags
- Made the country selection section collapsible
- Improved Storyline section with better flow.
- Improved Pie chart representation. 
- Improved the story line section and loaded more data
- Improved the charts
- Improved the current factor selection method

## Next Goal 
- Enhance the data representaion
- Add better visualizations.
- Improve current visualizations.

## Notes for collaborators
- GitHub RAW CSV links were used intentionally so the app can run directly from the browser without needing local dataset folders.
- Debug logging is currently visible on purpose — it will be hidden later once data reliability is stable.
