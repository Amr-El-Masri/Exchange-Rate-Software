import { useState, useEffect, useCallback } from "react";
import {Box, Typography, Card, CardContent, Button, TextField, Alert, CircularProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper} from "@mui/material";
import BASE_URL from "../config";

export default function Watchlist({ userToken }) {
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [label, setLabel] = useState("");
  const [targetRate, setTargetRate] = useState("");
  const [direction, setDirection] = useState("usd_to_lbp");
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchWatchlist = useCallback(async () => {
    if (!userToken) return;
    setTableLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/watchlist`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setWatchlistItems(data);
      }
    } catch (err) {
      setError("Failed to fetch watchlist.");
    } finally {
      setTableLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  async function handleAddItem() {
    if (!userToken) {
      setError("You must be logged in to add items to your watchlist.");
      return;
    }
    if (!label) {
      setError("Label is required.");
      return;
    }
    if (targetRate && Number(targetRate) <= 0) {
      setError("Target rate must be a positive number.");
      return;
    }

    //check for duplicate labels
    const duplicate = watchlistItems.find(
      (item) => item.label.toLowerCase() === label.toLowerCase()
    );
    if (duplicate) {
      setError("An item with this label already exists in your watchlist.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          label: label,
          usd_to_lbp: direction === "usd_to_lbp",
          target_rate: targetRate ? parseFloat(targetRate) : null,
        }),
      });

      const data = await response.json();

      if (response.status === 400) {
        setError(data.error || "Invalid input.");
      } else if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else if (response.ok) {
        setSuccess("Item added to watchlist successfully!");
        setLabel("");
        setTargetRate("");
        fetchWatchlist();
      } else {
        setError("Failed to add item.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveItem(itemId) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${BASE_URL}/watchlist/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const data = await response.json();

      if (response.status === 403) {
        setError("You can only remove your own watchlist items.");
      } else if (response.status === 404) {
        setError("Item not found.");
      } else if (response.ok) {
        setSuccess("Item removed from watchlist.");
        fetchWatchlist();
      } else {
        setError(data.error || "Failed to remove item.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        Watchlist
      </Typography>

      {!userToken ? (
        <Alert severity="info">Please log in to manage your watchlist.</Alert>
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

          {/*add item form */}
          <Card sx={{ marginBottom: 3 }}>
            <CardContent>
              <Typography variant="h6" marginBottom={2}>Add to Watchlist</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
                <TextField
                  label="Label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  size="small"
                  placeholder="e.g. My USD→LBP Watch"
                />
                <TextField
                  label="Target Rate (optional)"
                  type="number"
                  value={targetRate}
                  onChange={(e) => setTargetRate(e.target.value)}
                  size="small"
                  inputProps={{ min: 0 }}
                  helperText="Leave empty if you don't have a specific target rate"
                />

                {/*direction selector */}
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

                <Button
                  variant="contained"
                  onClick={handleAddItem}
                  disabled={loading}
                  sx={{ maxWidth: 200 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Add to Watchlist"
                  )}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/*watchlist table */}
          <Typography variant="h6" marginBottom={2}>My Watchlist</Typography>
          {tableLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : watchlistItems.length === 0 ? (
            <Alert severity="info">Your watchlist is empty.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
                  <TableRow>
                    <TableCell sx={{ color: "white" }}>ID</TableCell>
                    <TableCell sx={{ color: "white" }}>Label</TableCell>
                    <TableCell sx={{ color: "white" }}>Direction</TableCell>
                    <TableCell sx={{ color: "white" }}>Target Rate</TableCell>
                    <TableCell sx={{ color: "white" }}>Created At</TableCell>
                    <TableCell sx={{ color: "white" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {watchlistItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.usd_to_lbp ? "USD → LBP" : "LBP → USD"}
                          size="small"
                          color={item.usd_to_lbp ? "primary" : "secondary"}
                        />
                      </TableCell>
                      <TableCell>
                        {item.target_rate
                          ? item.target_rate.toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          Remove
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