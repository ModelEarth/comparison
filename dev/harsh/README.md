# Harsh - International Comparison Prompt Experiments

This folder contains prompt experiments and implementations for the ModelEarth comparison project.

## Overview

Working on data visualization and comparison tools using Claude AI to generate interactive dashboards and data displays.

## Current Work

### Data Source Display with Tabulator

Implementing expandable data source views using Tabulator tables with optimized page load performance.

## Prompts

### data-source-display.md

Similar to the following report, provide expandable views of the data sources using panels with Tabulator tables in them. To optimize the page load time, avoid loading the source views into the DOM until the user clicks a "Show Sources" button below the dashboard report. Share javascript and css with the following page - adjust the javascript here to make it shareable if needed.

https://model.earth/profile/footprint/#country=all&year=2022

Place it in a new folder in comparison called "harsh"

https://model.earth/comparison

## Prompt Used

### Prompt 1

I need you to create a data visualization dashboard with 3 files (index.html, script.js, styles.css) that displays international trade and environmental impact data.

Requirements:

Data Source: Load CSV files from this GitHub repository: https://raw.githubusercontent.com/ModelEarth/trade-data/main/year/2019/

The data structure is documented here: https://github.com/ModelEarth/exiobase/blob/main/tradeflow/CLAUDE.md Key files: industry.csv, factor.csv, and for each country (US, IN, RU) there are trade.csv and trade_factor.csv files in domestic/, exports/, and imports/ folders

Dashboard Features:

Interactive Leaflet map to select countries (US, India, Russia) Summary cards showing environmental impact totals for each selected country Dropdown to switch between environmental factor groups (air, water, energy, land, materials, employment) Three ECharts visualizations:

Country comparison bar chart Trade flow breakdown (domestic vs exports vs imports) stacked bar chart Industry breakdown bar chart

Dynamic insights section with bullet points

Data Processing:

Load industry.csv and factor.csv first for reference lookups Map factor.csv's "extension" column to environmental groups (air, water, energy, etc.) Load trade_factor.csv for each country/flow combination Use trade.csv to map trade_id to industry information Aggregate impact_value from trade_factor.csv by factor group

Design:

Modern, clean design with gradient hero header Card-based layout for countries Responsive charts that update when countries or factor groups change Include a debug panel showing data loading progress

Technical:

Use PapaParse to load CSV files Use ECharts for visualizations Use Leaflet for the map All libraries loaded from CDN No fake data - handle missing files gracefully with console warnings

Output the complete code for all 3 files in one response.

### Prompt 2

Till now we were including only 3 countries, i want you to now include all the countries from the dataset. I also want you to understand and make the page look aesthetically pleasing, right now if we load the page it shows empty placeholders untill we select any country, instead of that keep USA selected by default so that the placeholders will not look empty and the page will look better.

Follow up: This is impressive, however if we select more than one country the impact gauge meter still goes out of the placeholder. Also in the left section where we can choose the country instead of initials, i want you to add country flags next to country name.

### Prompt 3

I want you to thoroughly analyze the trade-data data set and only keep those countries who's data we have in the data set. In the current version you have added countries which do not exist in our dataset. Refer this link:

https://github.com/ModelEarth/trade-data/tree/main/year/2019

Also, be cautious because the current version has a runaway loop that overwhelms by browser's use of the CPU. I want a clean code.

Follow up: Claude gave me only 3 countries again so added a screendump of the dataset repo explaining we have data for 14 countries available.

### Prompt 4

I cant see the country flags on the webpage (uploaded screenshot).

Follow up: Add Hover animations to the flags.

### Prompt 5

Add country flags to storyline comparison section also

### Prompt 6

Fixed Sankey diagram cycle error by implementing automatic fallback to graph visualization when bidirectional trade flows are detected. The system now catches DAG cycle errors and switches to a circular graph layout that properly handles US→India and India→US flows simultaneously.

### Prompt 7

Working on fixing overlapping text in visualizations:
- Trade Network Analysis (TNA) graph node labels overlapping
- Trade Flow Environmental Impact Comparison axis labels
- Country Environmental Performance Matrix scatter plot annotations

Goal: Implement dynamic label positioning that prevents overlap while maintaining readability, similar to force-directed label placement.

## What this experiment achieved

Claude generated index.html, script.js, and styles.css in one response as requested.
Dashboard UI renders with map, cards, dropdown, charts, and insights panel.
Real CSV loading logic was implemented (no static placeholder arrays).
Debug console panel currently prints which CSVs load successfully vs missing.
Currently it generates creative visualizations and has more comparison charts.
Claude added expected countries and reduced load times.
Improved UI with country flags and hover animations.
Implemented automatic chart type fallback for handling bidirectional trade flows.
Successfully resolved Sankey cycle errors by switching to graph visualization.

## Current Issues

Text overlapping in multiple charts needs dynamic positioning solution
Need to implement smart label collision detection
Labels should adjust position automatically to avoid overlap

## Next Goal

Fix text overlap with intelligent positioning (force-directed or collision detection)
Enhance the data representation
Add better visualizations
Add a storyline feature

## Notes for collaborators

GitHub RAW CSV links were used intentionally so the app can run directly from the browser without needing local dataset folders.
Debug logging is currently visible on purpose — it will be hidden later once data reliability is stable.
Using similar approach to Ananth's spreadsheet row method from a couple months ago.
Focus on reusable prompts and modular components.

## Projects

### Data Source Display Implementation
- Expandable views with Tabulator tables
- Optimized lazy loading for performance
- Link: - Link: https://model.earth/comparison/dev/harsh

## Resources

- ModelEarth Comparison: https://model.earth/comparison
- Comparison Repo: https://github.com/ModelEarth/comparison
- Reference Implementation: https://model.earth/profile/footprint/#country=all&year=2022
- Antariksh's Experiments: https://github.com/ModelEarth/comparison/tree/main/dev/antariksh

---

*Last Updated: November 2025*