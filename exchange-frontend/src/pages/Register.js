import { useState } from "react";
import {Box, Button, TextField, Typography, Alert, CircularProgress} from "@mui/material";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../config";

const BASE = "/amr-el-masri";

export default function Register({onLogin}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRegister() {
    //client side validation
    if (!username || !password || !confirmPassword) {
      setError("All three fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      //step1: register
      const registerResponse = await fetch(`${BASE_URL}/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: username, password: password }),
      });

      const registerData = await registerResponse.json();

      if (registerResponse.status === 400) {
        setError(registerData.error || "Username already taken.");
        return;
      }

      if (!registerResponse.ok) {
        setError(registerData.error || "Registration failed.");
        return;
      }

      //step 2: auto login after register (same as lab 5)
      const loginResponse = await fetch(`${BASE_URL}/authentication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: username, password: password }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        onLogin(loginData.token, "USER");
        navigate(`${BASE}/dashboard`);
      } else {
        //registration worked but login failed, send to login page
        navigate(`${BASE}/login`);
      }
    } catch (err) {
      setError("Cannot connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 400, margin: "80px auto", padding: "30px",
      boxShadow: 3, borderRadius: 2, backgroundColor: "white" }}>

      <Typography variant="h5" fontWeight="bold" marginBottom={3}>
        Register
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
        sx={{ marginBottom: 2 }}
      />

      <TextField
        fullWidth
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        sx={{ marginBottom: 3 }}
        
      />

      <Button
        fullWidth
        variant="contained"
        onClick={handleRegister}
        disabled={loading}
        sx={{ marginBottom: 2 }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Register"}
      </Button>

      <Typography variant="body2" textAlign="center">
        Already have an account?{" "}
        <span
          onClick={() => navigate(`${BASE}/login`)}
          style={{ color: "#1976d2", cursor: "pointer" }}
        >
          Login here
        </span>
      </Typography>

    </Box>
  );
}