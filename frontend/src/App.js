
import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  Box,
  Drawer,
  Button,
  Autocomplete,
  TextField,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography
} from '@mui/material';

const drawerWidth = 320;
const MAX_COUNTRIES = 5;
const MAX_METRICS = 2;

export default function App() {
  const [metadata, setMetadata] = useState(null);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [yearRange, setYearRange] = useState([2000, 2020]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetch('/metadata')
      .then((r) => r.json())
      .then((data) => {
        setMetadata(data);
        setYearRange([data.years.min, data.years.max]);
      });
  }, []);

  const handleRandom = () => {
    if (!metadata) return;
    const shuffled = [...metadata.countries].sort(() => 0.5 - Math.random());
    setSelectedCountries(shuffled.slice(0, MAX_COUNTRIES));
  };

  const handleGenerate = () => {
    if (selectedCountries.length === 0 || selectedMetrics.length === 0) return;
    const params = new URLSearchParams({
      countries: selectedCountries.map((c) => c['Country Code']).join(','),
      metrics: selectedMetrics.join(','),
      start_year: yearRange[0],
      end_year: yearRange[1]
    }).toString();
    fetch('/data?' + params)
      .then((r) => r.json())
      .then((data) => setChartData(data));
  };

  const renderChart = () => {
    if (!chartData) return null;
    const plotData = [];
    Object.entries(chartData).forEach(([metricKey, metricObj]) => {
      Object.entries(metricObj.series).forEach(([code, series]) => {
        plotData.push({
          x: series.years,
          y: series.values,
          type: 'scatter',
          mode: 'lines+markers',
          name: `${series.countryName} – ${metricObj.label}`
        });
      });
    });
    return (
      <Plot
        data={plotData}
        layout={{
          title: 'Country Metrics',
          xaxis: { title: 'Year' },
          yaxis: { title: 'Value' },
          legend: { orientation: 'h' },
          autosize: true
        }}
        style={{ width: '100%', height: '600px' }}
        useResizeHandler
      />
    );
  };

  const renderDownloadLinks = () => {
    if (!chartData) return null;
    return Object.keys(chartData).map((metricKey) => {
      const params = new URLSearchParams({
        countries: selectedCountries.map((c) => c['Country Code']).join(','),
        metric: metricKey,
        start_year: yearRange[0],
        end_year: yearRange[1]
      }).toString();
      return (
        <Button
          key={metricKey}
          variant="outlined"
          sx={{ mr: 2, mb: 2 }}
          href={'/download?' + params}
        >
          Download {chartData[metricKey].label} CSV
        </Button>
      );
    });
  };

  if (!metadata) return <p>Loading…</p>;

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Main content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {renderChart()}
        <Box sx={{ mt: 2 }}>{renderDownloadLinks()}</Box>
      </Box>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          width: drawerWidth,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            p: 2
          }
        }}
      >
        <Typography variant="h6" gutterBottom>
          Controls
        </Typography>

        <Autocomplete
          multiple
          options={metadata.countries}
          getOptionLabel={(o) => o['Country Name']}
          value={selectedCountries}
          onChange={(e, v) => {
            if (v.length <= MAX_COUNTRIES) setSelectedCountries(v);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Countries"
              placeholder="Select countries"
            />
          )}
        />

        <Button
          variant="text"
          sx={{ mt: 1, mb: 2 }}
          onClick={handleRandom}
          disabled={!metadata}
        >
          Random 5
        </Button>

        <Typography gutterBottom>
          Years: {yearRange[0]} – {yearRange[1]}
        </Typography>
        <Slider
          value={yearRange}
          min={metadata.years.min}
          max={metadata.years.max}
          onChange={(e, v) => setYearRange(v)}
          valueLabelDisplay="auto"
        />

        <Typography sx={{ mt: 2 }}>Metrics (max 2)</Typography>
        <FormGroup>
          {Object.entries(metadata.metrics).map(([key, label]) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={selectedMetrics.includes(key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (selectedMetrics.length < MAX_METRICS) {
                        setSelectedMetrics([...selectedMetrics, key]);
                      }
                    } else {
                      setSelectedMetrics(
                        selectedMetrics.filter((m) => m !== key)
                      );
                    }
                  }}
                />
              }
              label={label}
            />
          ))}
        </FormGroup>

        <Button
          variant="contained"
          sx={{ mt: 'auto' }}
          onClick={handleGenerate}
          fullWidth
        >
          Generate Chart
        </Button>
      </Drawer>
    </Box>
  );
}
