import { useState, useEffect, useCallback } from "react";
import {Box, Typography, Card, CardContent, Button, TextField, Alert, CircularProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper} from "@mui/material";
import BASE_URL from "../config";

export default function Alerts({ userToken }) {
  const [alerts, setAlerts] = useState([]);
  const [checkedAlerts, setCheckedAlerts] = useState(null);
  const [direction, setDirection] = useState("usd_to_lbp");
  const [threshold, setThreshold] = useState("");
  const [alertDirection, setAlertDirection] = useState("above");
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAlerts = useCallback(() => {
    if (!userToken) return;
    setTableLoading(true);
    fetch(`${BASE_URL}/alerts`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch(() => setError("Failed to fetch alerts."))
      .finally(() => setTableLoading(false));
  }, [userToken]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleCreateAlert() {
    if (!userToken) {
      setError("You must be logged in to create an alert.");
      return;
    }
    if (!threshold) {
      setError("Threshold is required.");
      return;
    }
    if (Number(threshold) <= 0) {
      setError("Threshold must be a positive number.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          usd_to_lbp: direction === "usd_to_lbp",
          threshold: parseFloat(threshold),
          direction: alertDirection,
        }),
      });

      const data = await response.json();

      if (response.status === 400) {
        setError(data.error || "Invalid input.");
      } else if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else if (response.ok) {
        setSuccess("Alert created successfully!");
        setThreshold("");
        fetchAlerts();
      } else {
        setError("Failed to create alert.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAlert(alertId) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/alerts/${alertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const data = await response.json();

      if (response.status === 403) {
        setError("You can only delete your own alerts.");
      } else if (response.status === 404) {
        setError("Alert not found.");
      } else if (response.ok) {
        setSuccess(`Alert #${alertId} deleted successfully.`);
        fetchAlerts();
      } else {
        setError(data.error || "Failed to delete alert.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  async function handleCheckAlerts() {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/alerts/check`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const data = await response.json();

      if (response.ok) {
        setCheckedAlerts(data);
      } else {
        setError("Failed to check alerts.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        Exchange Rate Alerts
      </Typography>

      {!userToken ? (
        <Alert severity="info">Please log in to manage your alerts.</Alert>
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

          {/*create alert form */}
          <Card sx={{ marginBottom: 3 }}>
            <CardContent>
              <Typography variant="h6" marginBottom={2}>Create New Alert</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>

                <TextField
                  label="Threshold Rate"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  size="small"
                  inputProps={{ min: 0 }}
                />

                {/*direction: USD->LBP or LBP->USD */}
                <Box>
                  <Typography variant="body2" color="gray" marginBottom={1}>
                    Exchange Direction:
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

                {/*alert direction: above or below */}
                <Box>
                  <Typography variant="body2" color="gray" marginBottom={1}>
                    Trigger When Rate Is:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                      variant={alertDirection === "above" ? "contained" : "outlined"}
                      onClick={() => setAlertDirection("above")}
                      size="small"
                    >
                      Above Threshold
                    </Button>
                    <Button
                      variant={alertDirection === "below" ? "contained" : "outlined"}
                      onClick={() => setAlertDirection("below")}
                      size="small"
                    >
                      Below Threshold
                    </Button>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  onClick={handleCreateAlert}
                  disabled={loading}
                  sx={{ maxWidth: 200 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Create Alert"
                  )}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/*check alerts button */}
          <Box sx={{ marginBottom: 3 }}>
            <Button variant="outlined" onClick={handleCheckAlerts}>
              Check Which Alerts Are Triggered
            </Button>
          </Box>

          {/*triggered/untriggered alerts results */}
          {checkedAlerts && (
            <Card sx={{ marginBottom: 3 }}>
              <CardContent>
                <Typography variant="h6" marginBottom={1}>Alert Check Results</Typography>
                <Typography variant="body2" color="gray" marginBottom={2}>
                  Current Rates: USD→LBP: <strong>{checkedAlerts.current_usd_to_lbp_rate ?? "N/A"}</strong> |
                  LBP→USD: <strong>{checkedAlerts.current_lbp_to_usd_rate ?? "N/A"}</strong>
                </Typography>

                {checkedAlerts.triggered_alerts.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="error" marginBottom={1}>
                      Triggered Alerts:
                    </Typography>
                    {checkedAlerts.triggered_alerts.map((a) => (
                      <Chip
                        key={a.id}
                        label={`#${a.id} — ${a.usd_to_lbp ? "USD→LBP" : "LBP→USD"} ${a.direction} ${a.threshold} (now: ${a.current_rate})`}
                        color="error"
                        sx={{ margin: "4px" }}
                      />
                    ))}
                  </>
                )}

                {checkedAlerts.untriggered_alerts.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="gray" marginBottom={1} marginTop={1}>
                      Not Yet Triggered:
                    </Typography>
                    {checkedAlerts.untriggered_alerts.map((a) => (
                      <Chip
                        key={a.id}
                        label={`#${a.id} — ${a.usd_to_lbp ? "USD→LBP" : "LBP→USD"} ${a.direction} ${a.threshold} (now: ${a.current_rate})`}
                        color="default"
                        sx={{ margin: "4px" }}
                      />
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/*alerts table */}
          <Typography variant="h6" marginBottom={2}>My Active Alerts</Typography>
          {tableLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : alerts.length === 0 ? (
            <Alert severity="info">No alerts set up yet.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
                  <TableRow>
                    <TableCell sx={{ color: "white" }}>ID</TableCell>
                    <TableCell sx={{ color: "white" }}>Direction</TableCell>
                    <TableCell sx={{ color: "white" }}>Threshold</TableCell>
                    <TableCell sx={{ color: "white" }}>Trigger</TableCell>
                    <TableCell sx={{ color: "white" }}>Created</TableCell>
                    <TableCell sx={{ color: "white" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} hover>
                      <TableCell>{alert.id}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.usd_to_lbp ? "USD → LBP" : "LBP → USD"}
                          size="small"
                          color={alert.usd_to_lbp ? "primary" : "secondary"}
                        />
                      </TableCell>
                      <TableCell>{alert.threshold?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.direction}
                          size="small"
                          color={alert.direction === "above" ? "warning" : "info"}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(alert.creation_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}