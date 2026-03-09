import { useState, useEffect, useCallback } from "react";
import {Box, Typography, Card, CardContent, Button,TextField, Alert, CircularProgress, Chip,Table, TableBody, TableCell, TableContainer,TableHead, TableRow, Paper, Divider} from "@mui/material";
import BASE_URL from "../config";

export default function Transactions({ userToken }) {
  const [usdAmount, setUsdAmount] = useState("");
  const [lbpAmount, setLbpAmount] = useState("");
  const [direction, setDirection] = useState("usd_to_lbp");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(false);

  //note: transaction submission works both for logged in and non-logged in users 
  // if logged in the token is attached, if not it's sent without token

  //fetch this user's transactions when logged in
  const fetchTransactions = useCallback(() => {
    if (!userToken) return;
    setTableLoading(true);
    fetch(`${BASE_URL}/transaction`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then((res) => res.json())
      .then((data) => setTransactions(data))
      .catch(() => setError("Failed to fetch transactions."))
      .finally(() => setTableLoading(false));
  }, [userToken]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function submitTransac() {
    //client side validation
    if (!usdAmount || !lbpAmount || Number(usdAmount) <= 0 || Number(lbpAmount) <= 0) {
      setError("Please enter valid positive amounts for both USD and LBP.");
      return;
    }
    if (parseFloat(usdAmount) <= 0 || parseFloat(lbpAmount) <= 0) {
      setError("Amounts must be positive.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const headers = { "Content-Type": "application/json" };
      if (userToken) {
        headers["Authorization"] = `Bearer ${userToken}`;
      }

      const response = await fetch(`${BASE_URL}/transaction`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          usd_amount: parseFloat(usdAmount),
          lbp_amount: parseFloat(lbpAmount),
          usd_to_lbp: direction === "usd_to_lbp",
        }),
      });

      const data = await response.json();

      //if rate limiting, disable the button for 30 secs

      if (response.status === 429) {
        setError("Too many requests. Please wait and try again.");
        setCooldown(true);
        setTimeout(() => setCooldown(false), 30000);
      } else if (response.status === 400) {
        setError(data.error || "Invalid input.");
      } else if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
      } else if (response.status === 403) {
        setError("Forbidden. You do not have permission.");
      } else if (response.ok) {
        //check if the backend flagged this transac as outlier (if so display a success message with a warning)
        if (data.warning) {
          setSuccess(`Transaction saved! Warning: ${data.warning}`);
        } else {
          setSuccess("Transaction added successfully!");
        }
        setUsdAmount("");
        setLbpAmount("");
        fetchTransactions();
      } else {
        setError("Failed to add transaction. Please try again.");
      }
    } catch (err) {
      setError("Cannot connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }
 //added the export transactions in the transactions page since it made most sense ratehr than having a seperate menu item 
  async function handleExport() {
    if (!userToken) {
      setError("You must be logged in to export transactions.");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/export`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
        return;
      }

      // create a download link and click it programmatically
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transactions.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        Transactions
      </Typography>

      {/*create transaction form */}
      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          <Typography variant="h6" marginBottom={2}>
            Add New Transaction
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

            {/*direction selector */}
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
              onClick={submitTransac}
              disabled={loading || cooldown}
              sx={{ maxWidth: 200 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : cooldown ? (
                "Wait..."
              ) : (
                "Add Transaction"
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
        <Button
          variant="outlined"
          onClick={handleExport}
          disabled={!userToken}
        >
          Export Transactions (CSV)
        </Button>
      </Box>

      <Divider sx={{ marginBottom: 3 }} />

      {/*transactions table of this user*/}
      <Typography variant="h6" marginBottom={2}>
        My Transactions
      </Typography>

      {!userToken ? (
        <Alert severity="info">
          Please log in to view your transactions.
        </Alert>
      ) : tableLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Alert severity="info">No transactions found.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
              <TableRow>
                <TableCell sx={{ color: "white" }}>ID</TableCell>
                <TableCell sx={{ color: "white" }}>USD Amount</TableCell>
                <TableCell sx={{ color: "white" }}>LBP Amount</TableCell>
                <TableCell sx={{ color: "white" }}>Direction</TableCell>
                <TableCell sx={{ color: "white" }}>Date</TableCell>
                <TableCell sx={{ color: "white" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id} hover>
                  <TableCell>{txn.id}</TableCell>
                  <TableCell>{txn.usd_amount?.toLocaleString()}</TableCell>
                  <TableCell>{txn.lbp_amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={txn.usd_to_lbp ? "USD → LBP" : "LBP → USD"}
                      size="small"
                      color={txn.usd_to_lbp ? "primary" : "secondary"}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(txn.added_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {txn.is_outlier ? (
                      <Chip label="Outlier" size="small" color="warning" />
                    ) : (
                      <Chip label="Normal" size="small" color="success" />
                    )}
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