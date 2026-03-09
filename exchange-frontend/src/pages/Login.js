import { useState } from "react";
import {Box, Button, TextField, Typography, Alert, CircularProgress} from "@mui/material";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../config";

const BASE = "/amr-el-masri";

export default function Login({onLogin}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);//cooldown disables the button after rate limiting
  const navigate = useNavigate();

  async function login() {
    //client side validation
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BASE_URL}/authentication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: username, password: password }),
      });

      const data = await response.json();

      if (response.status === 429) {
        // rate limited
        setError("Too many requests. Please wait and try again.");
        setCooldown(true);
        setTimeout(() => setCooldown(false), 30000); // 30 second cooldown
      } else if (response.status === 403) {
        setError(data.error || "Invalid credentials or account suspended.");
      } else if (response.status === 400) {
        setError("Username and password are required.");
      } else if (response.ok) {
        // fetch user info to get role
        const userResponse = await fetch(`${BASE_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${data.token}` },
        });

        let role = "USER";
        if (userResponse.ok) {
          role = "ADMIN";
        }

        onLogin(data.token, role);
        navigate(`${BASE}/dashboard`);
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError("Login failed. Please make sure you already have an account."); //change this err??????
    } finally {
      setLoading(false);
    }
  }
  return (
    <Box sx={{ maxWidth: 400, margin: "80px auto", padding: "30px",
      boxShadow: 3, borderRadius: 2, backgroundColor: "white" }}>

      <Typography variant="h5" fontWeight="bold" marginBottom={3}>
        Login
      </Typography>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        sx={{ marginBottom: 2 }}
      />

      <TextField
        fullWidth
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ marginBottom: 3 }}
      />

      <Button
        fullWidth
        variant="contained"
        onClick={login}
        disabled={loading || cooldown}
        sx={{ marginBottom: 2 }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 
         cooldown ? "Too many requests, please wait before trying again..." : "Login"}
      </Button>

      <Typography variant="body2" textAlign="center">
        Don't have an account?{" "}
        <span
          onClick={() => navigate(`${BASE}/register`)}
          style={{ color: "#1976d2", cursor: "pointer" }}
        >
          Register here
        </span>
      </Typography>

    </Box>
  );
}    