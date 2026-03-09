import { useState, useEffect } from "react";
import {Box, Typography, Card, CardContent, Grid, Alert, CircularProgress, TextField, Button, Divider, Chip} from "@mui/material";
import {LineChart, Line, XAxis, YAxis, CartesianGrid,Tooltip, ResponsiveContainer} from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import BASE_URL from "../config";

export default function Dashboard({ userToken, userPreferences }) {

  function getDefaultStartDate(hours) {
    const date = new Date();
    date.setHours(date.getHours() - (hours || 72));
    return date.toISOString().split("T")[0];
  }

  const [rates, setRates] = useState({ usd_to_lbp_rate: null, lbp_to_usd_rate: null });
  const [analytics, setAnalytics] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [startDate, setStartDate] = useState(getDefaultStartDate(userPreferences?.default_time_range));
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [direction, setDirection] = useState(userPreferences?.default_usd_to_lbp === false ? "lbp_to_usd" : "usd_to_lbp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

//note for the useeffects below: when the page loads, the empty-dependency useEffect executes and fetches with the hardcoded defaults (72h, usd_to_lbp)
//on login: userPreferences loads then the preferences useEffect executes then updates state. 

  //fetch current rates when the page loads
  useEffect(() => {
    if (userPreferences) {
      setDirection(userPreferences.default_usd_to_lbp === false ? "lbp_to_usd" : "usd_to_lbp");
      setStartDate(getDefaultStartDate(userPreferences.default_time_range));
      setEndDate(new Date().toISOString().split("T")[0]);
    }
  }, [userPreferences]);

  useEffect(() => {
    fetchRates();
    fetchAnalytics();
    fetchHistory();
  }, []);

  async function fetchRates() {
    try {
      const response = await fetch(`${BASE_URL}/exchangeRate`);
      const data = await response.json();
      setRates(data);
    } catch (err) {
      setError("Failed to fetch exchange rates.");
    }
  }

  async function fetchAnalytics() {
    setLoading(true);
    setError("");
    try {
      let url = `${BASE_URL}/analytics?usd_to_lbp=${direction === "usd_to_lbp"}`;
      if (startDate && endDate) {
        //convert from YYYY-MM-DD (html date input format) to MM/DD/YYYY (backend format)
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        url += `&start_date=${start}&end_date=${end}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.average_rate) {
        setAnalytics(data);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      setError("Failed to fetch analytics.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory() {
    try {
      let url = `${BASE_URL}/exchangeRateHistory?usd_to_lbp=${direction === "usd_to_lbp"}&interval=daily`;
      if (startDate && endDate) {
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        url += `&start_date=${start}&end_date=${end}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.data) {
        //format for recharts
        const formatted = data.data.map((item) => ({
          time: item.timestamp.split("T")[0],
          rate: item.average_rate,
        }));
        setHistoryData(formatted);
      } else {
        setHistoryData([]);
      }
    } catch (err) {
      setHistoryData([]);
    }
  }

  //convert YYYY-MM-DD to MM/DD/YYYY for backend
  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  }

  function handleRefresh() {
    if (startDate && endDate && startDate >= endDate) {
      setError("Start date must be before end date.");
      return;
    }
    setError("");
    fetchRates();
    fetchAnalytics();
    fetchHistory();
  }

  //determine trend from analytics
  function getTrend() {
    if (!analytics) return null;
    const change = analytics.percentage_change;
    if (change > 1) return { label: "Upward", icon: <TrendingUpIcon />, color: "success" };
    if (change < -1) return { label: "Downward", icon: <TrendingDownIcon />, color: "error" };
    return { label: "Stable", icon: <TrendingFlatIcon />, color: "default" };
  }

  //describe the volatility
  function getVolatilityDescription() {
    if (!analytics) return null;
    const v = analytics.volatility_percent;
    if (v < 1) return "Very stable — minimal fluctuations.";
    if (v < 5) return "Moderately stable — some fluctuations.";
    if (v < 15) return "Volatile — notable fluctuations.";
    return "Highly volatile — large fluctuations detected.";
  }

  const trend = getTrend();

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        Exchange Rate Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Current Rates */}
      <Grid container spacing={2} marginBottom={3}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ backgroundColor: "#1a1a2e", color: "white" }}>
            <CardContent>
              <Typography variant="subtitle2" color="gray">USD → LBP Rate</Typography>
              <Typography variant="h4" fontWeight="bold">
                {rates.usd_to_lbp_rate
                  ? rates.usd_to_lbp_rate.toLocaleString()
                  : "Not available"}
              </Typography>
              <Typography variant="caption" color="gray">Based on last 72 hours</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ backgroundColor: "#1a1a2e", color: "white" }}>
            <CardContent>
              <Typography variant="subtitle2" color="gray">LBP → USD Rate</Typography>
              <Typography variant="h4" fontWeight="bold">
                {rates.lbp_to_usd_rate
                  ? rates.lbp_to_usd_rate.toLocaleString()
                  : "Not available"}
              </Typography>
              <Typography variant="caption" color="gray">Based on last 72 hours</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/*date rrange + direction selector */}
      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          <Typography variant="h6" marginBottom={2}>Analytics Filter</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant={direction === "usd_to_lbp" ? "contained" : "outlined"}
              onClick={() => setDirection("usd_to_lbp")}
              size="small"
            >
              USD → LBP
            </Button>
            <Button
              variant={direction === "lbp_to_usd" ? "contained" : "outlined"}
              onClick={() => setDirection("lbp_to_usd")}
              size="small"
            >
              LBP → USD
            </Button>
            <Button variant="contained" color="primary" onClick={handleRefresh}>
              Refresh
            </Button>
            <Button variant="outlined" onClick={() => {
              setStartDate("");
              setEndDate("");
              setError("");
            }}>
              Clear
            </Button>
          </Box>
        </Box>
        </CardContent>
      </Card>

      {/*analytics and insights */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : analytics ? (
        <Grid container spacing={2} marginBottom={3}>
          {/*stats cards */}
          {[
            { label: "Average Rate", value: analytics.average_rate?.toLocaleString() },
            { label: "Min Rate", value: analytics.min_rate?.toLocaleString() },
            { label: "Max Rate", value: analytics.max_rate?.toLocaleString() },
            { label: "% Change", value: `${analytics.percentage_change}%` },
            { label: "Volatility", value: `${analytics.volatility_percent}%` },
            { label: "Transactions", value: analytics.transaction_count },
          ].map((stat) => (
            <Grid item xs={6} sm={4} md={2} key={stat.label}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: "center", padding: "12px !important" }}>
                  <Typography variant="caption" color="gray">{stat.label}</Typography>
                  <Typography variant="h6" fontWeight="bold">{stat.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/*insights */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" marginBottom={1}>Insights</Typography>
                <Divider sx={{ marginBottom: 2 }} />
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                  {trend && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" color="gray">Trend:</Typography>
                      <Chip
                        icon={trend.icon}
                        label={trend.label}
                        color={trend.color}
                        size="small"
                      />
                    </Box>
                  )}
                  <Box>
                    <Typography variant="body2" color="gray">
                      Volatility: <strong>{getVolatilityDescription()}</strong>
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="gray">
                      Period: <strong>{analytics.start_date?.split("T")[0]}</strong> to <strong>{analytics.end_date?.split("T")[0]}</strong>
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info" sx={{ marginBottom: 3 }}>
          No analytics data available for the selected range.
        </Alert>
      )}

      {/* Rate History Chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" marginBottom={2}>
            Exchange Rate Over Time
          </Typography>
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#1a1a2e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="gray" textAlign="center" padding={4}>
              No chart data available for the selected range.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}