
# Country Metrics Web App

I initially set out to analyse and visually compare the social and economic changes my country (Turkey) has undergone, but the fact that my sources were datasets covering most countries around the world distracted me. While working on the main project, I ended up using plenty of charts for other countries as well, causing the project to evolve into a broader endeavour than I had originally planned.
Now its a web application that visualises GDP per capita, net migration, unemployment rate, total population and population growth for up to five countries over a selectable year range.

* **Frontend:** React + MUI + react‑plotly.js  
* **Backend:** Flask + pandas  
* **Data:** World Bank CSVs (already included in *backend/data/*).

## Quick start

```bash
# 1. Backend
cd backend
python -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                      

# 2. Frontend
cd ../frontend
npm install
npm start                          
```

The React dev server proxies API calls to the Flask backend.

## Project structure

```
country_metrics_app/
├── backend/
│   ├── data/ … World Bank CSVs
│   ├── app.py … Flask API
│   └── requirements.txt
└── frontend/
    ├── public/
    └── src/
        ├── App.js
        └── index.js
```

