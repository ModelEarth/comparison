# Cindy - International Comparison Prompt Experiments

## Prompt Experiment 1

### Goal

Explore how different prompts affect the generation of international trade comparison dashboards.

### Prompt Used

Create a responsive comparison widget using HTML, CSS, and JavaScript.

Requirements:

- Compare trade statistics between two countries
- Show imports, exports, and trade balance
- Modern card-based UI
- Mobile responsive
- No build tools
- Single page implementation

### Observations

- Generated dashboard structure successfully
- UI layout and styling rendered correctly
- CSV data loading encountered HTTP 403 errors
- Fallback data mechanism partially worked

### Lessons Learned

- GitHub raw URLs may be blocked by browser CORS policies
- Prompt quality alone cannot solve data access issues
- Additional debugging is needed for remote CSV loading

### Next Steps

- Investigate alternative data loading methods
- Test local CSV files
- Compare results with different prompt strategies
- Added a single-page mock-data implementation in `index.html`, `styles.css`, and `script.js`

### Status

Complete
