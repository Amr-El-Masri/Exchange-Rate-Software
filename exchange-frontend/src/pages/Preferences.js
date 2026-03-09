import { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress} from "@mui/material";
import BASE_URL from "../config";

export default function Preferences({ userToken }) {
  const [preferences, setPreferences] = useState(null);
  const [interval, setInterval] = useState("daily");
  const [timeRange, setTimeRange] = useState(72);
  const [direction, setDirection] = useState("usd_to_lbp");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isNew, setIsNew] = useState(false); //the isnew flag tracks wether to use post or put (since the backend needs this distinction)

  useEffect(() => {
    fetchPreferences();
  }, []);

  async function fetchPreferences() {
    if (!userToken) return;
    setPageLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/preferences`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.default_interval) {
        //preferences exist
        setPreferences(data);
        setInterval(data.default_interval);
        setTimeRange(data.default_time_range);
        setDirection(data.default_usd_to_lbp ? "usd_to_lbp" : "lbp_to_usd");
        setIsNew(false);
      } else {
        //no preferences set yet,so use defaults
        setPreferences(null);
        setInterval("daily");
        setTimeRange(72);
        setDirection("usd_to_lbp");
        setIsNew(true);
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setPageLoading(false);
    }
  }

  async function handleSave() {
    if (!userToken) {
      setError("You must be logged in to save preferences.");
      return;
    }
    if (timeRange <= 0 || !Number.isInteger(Number(timeRange))) {
      setError("Time range must be a positive integer (hours).");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const method = isNew ? "POST" : "PUT";
      const response = await fetch(`${BASE_URL}/preferences`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          default_interval: interval,
          default_time_range: Number(timeRange),
          default_usd_to_lbp: direction === "usd_to_lbp",
        }),
      });

      const data = await response.json();

      if (response.status === 400) {
        setError(data.error || "Invalid input.");
      } else if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else if (response.ok) {
        setSuccess(isNew ? "Preferences saved!" : "Preferences updated!");
        setIsNew(false);
        setPreferences(data);
      } else {
        setError("Failed to save preferences.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!userToken) return;
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/preferences`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        setSuccess("Preferences reset to defaults.");
        setInterval("daily");
        setTimeRange(72);
        setDirection("usd_to_lbp");
        setPreferences(null);
        setIsNew(true);
      } else if (response.status === 404) {
        setError("No preferences found to reset.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        Preferences
      </Typography>

      {!userToken ? (
        <Alert severity="info">Please log in to manage your preferences.</Alert>
      ) : pageLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess("")}>
              {success}
            </Alert>
          )}

          {!preferences && (
            <Alert severity="info" sx={{ marginBottom: 2 }}>
              No preferences set yet. Showing defaults — customize and save below.
            </Alert>
          )}

          <Card>
            <CardContent>
              <Typography variant="h6" marginBottom={3}>
                {preferences ? "Update Preferences" : "Set Preferences"}
              </Typography>

              {/*interval */}
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body2" color="gray" marginBottom={1}>
                  Default Chart Interval:
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
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
              </Box>

              {/*time range */}
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body2" color="gray" marginBottom={1}>
                  Default Time Range:
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {[24, 48, 72, 168].map((h) => (
                    <Button
                      key={h}
                      variant={timeRange === h ? "contained" : "outlined"}
                      onClick={() => setTimeRange(h)}
                      size="small"
                    >
                      {h === 24 ? "24h" : h === 48 ? "48h" : h === 72 ? "72h" : "1 week"}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/*direction */}
              <Box sx={{ marginBottom: 3 }}>
                <Typography variant="body2" color="gray" marginBottom={1}>
                  Default Exchange Direction:
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
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
              </Box>

              {/*action buttons */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : preferences ? (
                    "Update Preferences"
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
                {preferences && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleReset}
                  >
                    Reset to Defaults
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/*current preferences summary */}
          {preferences && (
            <Card sx={{ marginTop: 3, backgroundColor: "#f5f5f5" }}>
              <CardContent>
                <Typography variant="h6" marginBottom={1}>
                  Current Saved Preferences
                </Typography>
                <Typography variant="body2">
                  Interval: <strong>{preferences.default_interval}</strong>
                </Typography>
                <Typography variant="body2">
                  Time Range: <strong>{preferences.default_time_range} hours</strong>
                </Typography>
                <Typography variant="body2">
                  Direction: <strong>{preferences.default_usd_to_lbp ? "USD → LBP" : "LBP → USD"}</strong>
                </Typography>
                <Typography variant="caption" color="gray">
                  Last updated: {new Date(preferences.updated_at).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}