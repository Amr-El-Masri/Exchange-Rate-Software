import { useState, useEffect, useCallback } from "react";
import {Box, Typography, Card, CardContent, Button, TextField, Alert, CircularProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider} from "@mui/material";
import BASE_URL from "../config";

export default function Marketplace({ userToken }) {
  const [offers, setOffers] = useState([]);
  const [trades, setTrades] = useState([]);
  const [usdAmount, setUsdAmount] = useState("");
  const [lbpAmount, setLbpAmount] = useState("");
  const [direction, setDirection] = useState("usd_to_lbp");
  const [loading, setLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(false);

  const fetchOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      //offers list is public (no auth needed)
      const response = await fetch(`${BASE_URL}/market/offers`);
      const data = await response.json();
      setOffers(data);
    } catch (err) {
      setError("Failed to fetch offers.");
    } finally {
      setOffersLoading(false);
    }
  }, []);

  const fetchTrades = useCallback(async () => {
    if (!userToken) return;
    try {
      const response = await fetch(`${BASE_URL}/market/trades`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      setTrades(data);
    } catch (err) {
      setError("Failed to fetch trade history.");
    }
  }, [userToken]);

  useEffect(() => {
    fetchOffers();
    fetchTrades();
  }, [fetchOffers, fetchTrades]);

  async function handleCreateOffer() {
    if (!userToken) {
      setError("You must be logged in to create an offer.");
      return;
    }
    if (!usdAmount || !lbpAmount) {
      setError("Both USD and LBP amounts are required.");
      return;
    }
    if (Number(usdAmount) <= 0 || Number(lbpAmount) <= 0) {
      setError("Please enter valid positive amounts.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/market/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          usd_amount: parseFloat(usdAmount),
          lbp_amount: parseFloat(lbpAmount),
          usd_to_lbp: direction === "usd_to_lbp",
        }),
      });

      const data = await response.json();

      if (response.status === 400) {
        setError(data.error || "Invalid input.");
      } else if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else if (response.ok) {
        setSuccess("Offer created successfully!");
        setUsdAmount("");
        setLbpAmount("");
        fetchOffers();
      } else {
        setError("Failed to create offer.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptOffer(offerId) {
    if (!userToken) {
      setError("You must be logged in to accept an offer.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/market/offers/${offerId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const data = await response.json();

      if (response.status === 429) {
        setError("Too many requests. Please wait and try again.");
        setCooldown(true);
        setTimeout(() => setCooldown(false), 30000);
      } else if (response.status === 400) {
        setError(data.error || "Offer is no longer available.");
        fetchOffers(); // refresh to show updated status
      } else if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else if (response.ok) {
        setSuccess(`Offer #${offerId} accepted successfully!`);
        fetchOffers();
        fetchTrades();
      } else {
        setError("Failed to accept offer.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  async function handleCancelOffer(offerId) {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${BASE_URL}/market/offers/${offerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const data = await response.json();

      if (response.status === 403) {
        setError("You can only cancel your own offers.");
      } else if (response.status === 400) {
        setError(data.error || "Only available offers can be canceled.");
      } else if (response.ok) {
        setSuccess(`Offer #${offerId} canceled successfully.`);
        fetchOffers();
      } else {
        setError("Failed to cancel offer.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  //get user id from token to check this user's offers
  function getUserIdFromToken(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return parseInt(payload.sub);
    } catch {
      return null;
    }
  }

  const currentUserId = userToken ? getUserIdFromToken(userToken) : null;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        P2P Marketplace
      </Typography>

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

      {/*create offer form */}
      {userToken && (
        <Card sx={{ marginBottom: 3 }}>
          <CardContent>
            <Typography variant="h6" marginBottom={2}>Create New Offer</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
              <TextField
                label="USD Amount"
                type="number"
                value={usdAmount}
                onChange={(e) => setUsdAmount(e.target.value)}
                size="small"
                inputProps={{ min: 0 }}
              />
              <TextField
                label="LBP Amount"
                type="number"
                value={lbpAmount}
                onChange={(e) => setLbpAmount(e.target.value)}
                size="small"
                inputProps={{ min: 0 }}
              />
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
              <Button
                variant="contained"
                onClick={handleCreateOffer}
                disabled={loading}
                sx={{ maxWidth: 200 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Create Offer"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/*available offers */}
      <Typography variant="h6" marginBottom={2}>Available Offers</Typography>
      {offersLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : offers.length === 0 ? (
        <Alert severity="info" sx={{ marginBottom: 3 }}>
          No available offers at the moment.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ marginBottom: 3 }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
              <TableRow>
                <TableCell sx={{ color: "white" }}>ID</TableCell>
                <TableCell sx={{ color: "white" }}>USD Amount</TableCell>
                <TableCell sx={{ color: "white" }}>LBP Amount</TableCell>
                <TableCell sx={{ color: "white" }}>Direction</TableCell>
                <TableCell sx={{ color: "white" }}>Date</TableCell>
                <TableCell sx={{ color: "white" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offers.map((offer) => {
                const isOwnOffer = currentUserId === offer.user_id;
                return (
                  <TableRow key={offer.id} hover>
                    <TableCell>{offer.id}</TableCell>
                    <TableCell>{offer.usd_amount?.toLocaleString()}</TableCell>
                    <TableCell>{offer.lbp_amount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={offer.usd_to_lbp ? "USD → LBP" : "LBP → USD"}
                        size="small"
                        color={offer.usd_to_lbp ? "primary" : "secondary"}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(offer.creation_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isOwnOffer ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleCancelOffer(offer.id)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleAcceptOffer(offer.id)}
                          disabled={cooldown || !userToken}
                        >
                          Accept
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider sx={{ marginBottom: 3 }} />

      {/*trade history */}
      <Typography variant="h6" marginBottom={2}>My Trade History</Typography>
      {!userToken ? (
        <Alert severity="info">Please log in to view your trade history.</Alert>
      ) : trades.length === 0 ? (
        <Alert severity="info">No completed trades yet.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
              <TableRow>
                <TableCell sx={{ color: "white" }}>ID</TableCell>
                <TableCell sx={{ color: "white" }}>USD Amount</TableCell>
                <TableCell sx={{ color: "white" }}>LBP Amount</TableCell>
                <TableCell sx={{ color: "white" }}>Direction</TableCell>
                <TableCell sx={{ color: "white" }}>Status</TableCell>
                <TableCell sx={{ color: "white" }}>Accepted At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id} hover>
                  <TableCell>{trade.id}</TableCell>
                  <TableCell>{trade.usd_amount?.toLocaleString()}</TableCell>
                  <TableCell>{trade.lbp_amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={trade.usd_to_lbp ? "USD → LBP" : "LBP → USD"}
                      size="small"
                      color={trade.usd_to_lbp ? "primary" : "secondary"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label="Completed" size="small" color="success" />
                  </TableCell>
                  <TableCell>
                    {trade.accepted_at
                      ? new Date(trade.accepted_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}