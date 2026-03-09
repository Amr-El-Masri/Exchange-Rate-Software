import { useState, useEffect } from "react";
import {Box, Typography, Card, CardContent, Button, TextField, Alert, CircularProgress} from "@mui/material";
import {LineChart, Line, XAxis, YAxis, CartesianGrid,Tooltip, ResponsiveContainer} from "recharts";
import BASE_URL from "../config";

export default function Graph({userPreferences}) {

  function getDefaultStartDate(hours) {
    const date = new Date();
    date.setHours(date.getHours() - (hours || 72));
    return date.toISOString().split("T")[0];
  }

  const [historyData, setHistoryData] = useState([]);
  const [startDate, setStartDate] = useState(getDefaultStartDate(userPreferences?.default_time_range));
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [interval, setInterval] = useState(userPreferences?.default_interval || "daily");
  const [direction, setDirection] = useState(userPreferences?.default_usd_to_lbp === false ? "lbp_to_usd" : "usd_to_lbp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

//note for the useeffects below: when the page loads, the empty-dependency useEffect executes and fetches with the hardcoded defaults (72h, usd_to_lbp)
//on login: userPreferences loads then the preferences useEffect executes then updates state. 
  //fetch history when the page load with defaults
  useEffect(() => {
    if (userPreferences) {
      setInterval(userPreferences.default_interval || "daily");
      setDirection(userPreferences.default_usd_to_lbp === false ? "lbp_to_usd" : "usd_to_lbp");
      setStartDate(getDefaultStartDate(userPreferences.default_time_range));
      setEndDate(new Date().toISOString().split("T")[0]);
    }
  }, [userPreferences]);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    if (startDate && endDate && startDate >= endDate) {
      setError("Start date must be before end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url = `${BASE_URL}/exchangeRateHistory?usd_to_lbp=${direction === "usd_to_lbp"}&interval=${interval}`;
      if (startDate && endDate) {
        const start = formatDate(startDate);
        const end = formatDate(endDate);
        url += `&start_date=${start}&end_date=${end}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.status === 400) {
        setError(data.error || "Invalid date range.");
        setHistoryData([]);
      } else if (response.ok && data.data) {
        const formatted = data.data.map((item) => ({
          time: interval === "hourly"
            ? item.timestamp.split("T")[1].substring(0, 5) // show HH:MM for hourly
            : item.timestamp.split("T")[0],                // show YYYY-MM-DD for daily
          rate: item.average_rate,
          count: item.transaction_count,
        }));
        setHistoryData(formatted);
      } else {
        setHistoryData([]);
      }
    } catch (err) {
      setError("Cannot connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        Exchange Rate Graph
      </Typography>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/*controls */}
      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          <Typography variant="h6" marginBottom={2}>Graph Controls</Typography>

          {/*date inputs */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 2 }}>
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

          {/*interval selector */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 2 }}>
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              Interval:
            </Typography>
            <Button
              variant={interval === "daily" ? "contained" : "outlined"}
              onClick={() => setInterval("daily")}
              size="small"
            >
              Daily
            </Button>
            <Button
              variant={interval === "hourly" ? "contained" : "outlined"}
              onClick={() => setInterval("hourly")}
              size="small"
            >
              Hourly
            </Button>
          </Box>

          {/*direction toggle */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 2 }}>
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              Direction:
            </Typography>
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
          </Box>

          {/*action buttons */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={fetchHistory}>
              Apply
            </Button>
            <Button variant="outlined" onClick={() => {
              setStartDate("");
              setEndDate("");
              setError("");
            }}>
              Clear Dates
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/*the actual chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" marginBottom={1}>
            {direction === "usd_to_lbp" ? "USD → LBP" : "LBP → USD"} Rate —{" "}
            {interval.charAt(0).toUpperCase() + interval.slice(1)} Intervals
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [value.toLocaleString(), "Rate"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#1a1a2e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography
              color="gray"
              textAlign="center"
              padding={6}
            >
              No data for selected range.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}