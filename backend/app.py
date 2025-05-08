
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import os
import io

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

METRICS = {
    "gdp_per_capita": {
        "file": "API_NY.GDP.PCAP.CD_DS2_en_csv_v2_19346.csv",
        "title": "GDP per Capita (current US$)"
    },
    "net_migration": {
        "file": "API_SM.POP.NETM_DS2_en_csv_v2_19300.csv",
        "title": "Net Migration"
    },
    "unemployment_rate": {
        "file": "API_SL.UEM.TOTL.ZS_DS2_en_csv_v2_19329.csv",
        "title": "Unemployment Rate (% of labour force)"
    },
    "total_population": {
        "file": "API_SP.POP.TOTL_DS2_en_csv_v2_19373.csv",
        "title": "Total Population"
    }
}

import csv

def load_metric_df(csv_file: str) -> pd.DataFrame:

    path = os.path.join(DATA_DIR, csv_file)

    df_wide = pd.read_csv(
        path,
        skiprows=4,       
        engine='python',   
        dtype=str
    )

    year_cols = [c for c in df_wide.columns if c.isdigit()]
    id_cols = ['Country Name', 'Country Code']

    df_long = df_wide.melt(
        id_vars=id_cols,
        value_vars=year_cols,
        var_name='Year',
        value_name='Value'
    )
    df_long['Year'] = df_long['Year'].astype(int)
    df_long['Value'] = pd.to_numeric(df_long['Value'], errors='coerce')

    return df_long




print("Loading data …")
metric_frames = {}
for key, meta in METRICS.items():
    metric_frames[key] = load_metric_df(meta['file'])

pop_df = metric_frames['total_population']
pop_df = pop_df.sort_values(['Country Code', 'Year'])
pop_df['Value'] = pop_df.groupby('Country Code')['Value'].pct_change() * 100
METRICS['population_growth'] = {
    'file': None,
    'title': 'Population Growth (% annual)'
}
metric_frames['population_growth'] = pop_df.copy()

COUNTRIES = (metric_frames['gdp_per_capita'][['Country Name', 'Country Code']]
             .drop_duplicates()
             .sort_values('Country Name')
             .to_dict(orient='records'))
YEARS = {
    "min": int(pop_df['Year'].min()),
    "max": int(pop_df['Year'].max())
}

@app.route('/metadata')
def metadata():
    return jsonify({
        "countries": COUNTRIES,
        "years": YEARS,
        "metrics": {k: v['title'] for k, v in METRICS.items()}
    })

def filter_df(df, countries, start_year, end_year):
    mask = df['Country Code'].isin(countries) & df['Year'].between(start_year, end_year)
    return df[mask]

@app.route('/data')
def data():
    countries = request.args.get('countries', '').split(',')
    metrics   = request.args.get('metrics', '').split(',')
    start_year = int(request.args.get('start_year'))
    end_year   = int(request.args.get('end_year'))

    output = {}
    for metric in metrics:
        if metric not in metric_frames:
            continue

        df = metric_frames[metric]
        mask = (
            df['Country Code'].isin(countries) &
            df['Year'].between(start_year, end_year)
        )

        df_filtered = df[mask & df['Value'].notna()]

        if df_filtered.empty:
            continue

        records = (
            df_filtered.groupby('Country Code')
            .apply(lambda g: {
                'countryName': g['Country Name'].iloc[0],
                'years' : g['Year'].tolist(),
                'values': g['Value'].tolist()   
            })
            .to_dict()
        )
        if records:                      
            output[metric] = {
                'label' : METRICS.get(metric, {}).get('title', metric),
                'series': records
            }

    return jsonify(output)


@app.route('/download')
def download_csv():
    countries = request.args.get('countries', '').split(',')
    metric = request.args.get('metric')
    start_year = int(request.args.get('start_year'))
    end_year = int(request.args.get('end_year'))

    if metric not in metric_frames:
        return "Unknown metric", 400

    df = filter_df(metric_frames[metric], countries, start_year, end_year)
    csv_bytes = io.BytesIO()
    df.to_csv(csv_bytes, index=False)
    csv_bytes.seek(0)
    return send_file(csv_bytes,
                     mimetype='text/csv',
                     as_attachment=True,
                     download_name=f"{metric}_{start_year}_{end_year}.csv")

if __name__ == '__main__':
    app.run(debug=True)
