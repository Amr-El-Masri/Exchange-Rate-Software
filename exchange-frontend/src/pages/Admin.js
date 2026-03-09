import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Card, CardContent, Button,
  Alert, CircularProgress, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Paper, Divider, Tab, Tabs
} from "@mui/material";
import BASE_URL from "../config";

export default function Admin({ userToken, userRole }) {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dataQuality, setDataQuality] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${userToken}`,
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/users`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (response.ok) setUsers(data);
    } catch (err) {
      setError("Failed to fetch users.");
    }
  }, [userToken]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/stats`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (response.ok) setStats(data);
    } catch (err) {
      setError("Failed to fetch stats.");
    }
  }, [userToken]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/audit/logs`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (response.ok) setAuditLogs(data);
    } catch (err) {
      setError("Failed to fetch audit logs.");
    }
  }, [userToken]);

  const fetchDataQuality = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/data_quality`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (response.ok) setDataQuality(data);
    } catch (err) {
      setError("Failed to fetch data quality.");
    }
  }, [userToken]);

  const fetchBackupStatus = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/backup/status`, {
        headers: authHeaders,
      });
      const data = await response.json();
      if (response.ok) setBackupStatus(data);
    } catch (err) {
      setError("Failed to fetch backup status.");
    }
  }, [userToken]);

  useEffect(() => {
    if (userRole !== "ADMIN") return;
    fetchUsers();
    fetchStats();
    fetchAuditLogs();
    fetchDataQuality();
    fetchBackupStatus();
  }, [fetchUsers, fetchStats, fetchAuditLogs, fetchDataQuality, fetchBackupStatus, userRole]);

  async function handleUpdateStatus(userId, newStatus) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${BASE_URL}/admin/users/${userId}/status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setSuccess(`User ${userId} status updated to ${newStatus}.`);
        fetchUsers();
      } else {
        setError("Failed to update user status.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  async function handleUpdateRole(userId, newRole) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${BASE_URL}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        setSuccess(`User ${userId} role updated to ${newRole}.`);
        fetchUsers();
      } else {
        setError("Failed to update user role.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  async function handleBackup() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${BASE_URL}/admin/backup`, {
        method: "POST",
        headers: authHeaders,
      });
      if (response.ok) {
        // download the backup file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        setSuccess("Backup created and downloaded successfully!");
        fetchBackupStatus();
      } else {
        setError("Backup failed.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      const response = await fetch(`${BASE_URL}/admin/restore`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(backupData),
      });
      if (response.ok) {
        setSuccess("Backup restored successfully!");
        fetchUsers();
        fetchStats();
      } else {
        setError("Restore failed.");
      }
    } catch (err) {
      setError("Invalid backup file or cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status) {
    if (status === "active") return "success";
    if (status === "suspended") return "warning";
    if (status === "banned") return "error";
    return "default";
  }

  //user not admin
  if (userRole !== "ADMIN") {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" marginBottom={3}>
          Admin Panel
        </Typography>
        <Alert severity="error">
          Access denied. You must be an administrator to view this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" marginBottom={3}>
        Admin Panel
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

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(e, newVal) => setTab(newVal)}
        sx={{ marginBottom: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Users" />
        <Tab label="System Stats" />
        <Tab label="Audit Logs" />
        <Tab label="Data Quality" />
        <Tab label="Backup & Restore" />
      </Tabs>

      {/*TAB 0 : Users */}
      {tab === 0 && (
        <Box>
          <Typography variant="h6" marginBottom={2}>All Users</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
                <TableRow>
                  <TableCell sx={{ color: "white" }}>ID</TableCell>
                  <TableCell sx={{ color: "white" }}>Username</TableCell>
                  <TableCell sx={{ color: "white" }}>Role</TableCell>
                  <TableCell sx={{ color: "white" }}>Status</TableCell>
                  <TableCell sx={{ color: "white" }}>Update Status</TableCell>
                  <TableCell sx={{ color: "white" }}>Update Role</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.user_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={user.role === "ADMIN" ? "primary" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        size="small"
                        color={getStatusColor(user.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {["active", "suspended", "banned"].map((s) => (
                          <Button
                            key={s}
                            size="small"
                            variant={user.status === s ? "contained" : "outlined"}
                            color={
                              s === "active" ? "success" :
                              s === "suspended" ? "warning" : "error"
                            }
                            onClick={() => handleUpdateStatus(user.id, s)}
                            disabled={user.status === s}
                          >
                            {s}
                          </Button>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {["USER", "ADMIN"].map((r) => (
                          <Button
                            key={r}
                            size="small"
                            variant={user.role === r ? "contained" : "outlined"}
                            onClick={() => handleUpdateRole(user.id, r)}
                            disabled={user.role === r}
                          >
                            {r}
                          </Button>
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/*TAB 1 : System Stats */}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" marginBottom={2}>System Statistics</Typography>
          {stats ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {[
                { label: "Total Users", value: stats.total_users },
                { label: "Total Transactions", value: stats.total_transactions },
                { label: "Transactions (Last 72h)", value: stats.transactions_last_72h },
                { label: "Avg USD→LBP Rate", value: stats.overall_avg_usd_to_lbp_rate?.toLocaleString() || "N/A" },
                { label: "Avg LBP→USD Rate", value: stats.overall_avg_lbp_to_usd_rate?.toLocaleString() || "N/A" },
              ].map((stat) => (
                <Card key={stat.label} variant="outlined" sx={{ minWidth: 200 }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="caption" color="gray">{stat.label}</Typography>
                    <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <CircularProgress />
          )}
        </Box>
      )}

      {/*TAB 2 : Audit Logs */}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" marginBottom={2}>Audit Logs</Typography>
          {auditLogs.length === 0 ? (
            <Alert severity="info">No audit logs found.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
                  <TableRow>
                    <TableCell sx={{ color: "white" }}>ID</TableCell>
                    <TableCell sx={{ color: "white" }}>Event</TableCell>
                    <TableCell sx={{ color: "white" }}>Description</TableCell>
                    <TableCell sx={{ color: "white" }}>User ID</TableCell>
                    <TableCell sx={{ color: "white" }}>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{log.id}</TableCell>
                      <TableCell>
                        <Chip label={log.event_type} size="small" />
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>{log.user_id || "—"}</TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/*TAB 3 : Data Quality */}
      {tab === 3 && (
        <Box>
          <Typography variant="h6" marginBottom={2}>Data Quality Report</Typography>
          {dataQuality ? (
            <>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 3 }}>
                {[
                  { label: "Total Transactions", value: dataQuality.total_transactions },
                  { label: "Internal", value: dataQuality.internal_transactions },
                  { label: "External", value: dataQuality.external_transactions },
                  { label: "Outliers", value: dataQuality.outlier_count },
                ].map((stat) => (
                  <Card key={stat.label} variant="outlined" sx={{ minWidth: 150 }}>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="caption" color="gray">{stat.label}</Typography>
                      <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Divider sx={{ marginBottom: 2 }} />
              <Typography variant="h6" marginBottom={2}>Outlier Transactions</Typography>
              {dataQuality.outliers?.length === 0 ? (
                <Alert severity="success">No outliers detected.</Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: "#1a1a2e" }}>
                      <TableRow>
                        <TableCell sx={{ color: "white" }}>ID</TableCell>
                        <TableCell sx={{ color: "white" }}>USD</TableCell>
                        <TableCell sx={{ color: "white" }}>LBP</TableCell>
                        <TableCell sx={{ color: "white" }}>Direction</TableCell>
                        <TableCell sx={{ color: "white" }}>Source</TableCell>
                        <TableCell sx={{ color: "white" }}>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dataQuality.outliers.map((txn) => (
                        <TableRow key={txn.id} hover>
                          <TableCell>{txn.id}</TableCell>
                          <TableCell>{txn.usd_amount?.toLocaleString()}</TableCell>
                          <TableCell>{txn.lbp_amount?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Chip
                              label={txn.usd_to_lbp ? "USD→LBP" : "LBP→USD"}
                              size="small"
                              color={txn.usd_to_lbp ? "primary" : "secondary"}
                            />
                          </TableCell>
                          <TableCell>{txn.source}</TableCell>
                          <TableCell>
                            {new Date(txn.added_date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            <CircularProgress />
          )}
        </Box>
      )}

      {/*TAB 4 : Backup & Restore */}
      {tab === 4 && (
        <Box>
          <Typography variant="h6" marginBottom={2}>Backup & Restore</Typography>

          {/*bBackup status */}
          {backupStatus && backupStatus.last_backup && (
            <Card variant="outlined" sx={{ marginBottom: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" marginBottom={1}>
                  Last Backup
                </Typography>
                <Typography variant="body2">
                  Time: <strong>{new Date(backupStatus.last_backup.timestamp).toLocaleString()}</strong>
                </Typography>
                <Typography variant="body2">
                  Status: <Chip
                    label={backupStatus.last_backup.status}
                    size="small"
                    color={backupStatus.last_backup.status === "success" ? "success" : "error"}
                  />
                </Typography>
                <Typography variant="body2">
                  Total Backups: <strong>{backupStatus.total_backups}</strong>
                </Typography>
              </CardContent>
            </Card>
          )}

          {/*backup button */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={handleBackup}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Create Backup"}
            </Button>

            {/*restore from file */}
            <Button
              variant="outlined"
              component="label"
              disabled={loading}
            >
              Restore from Backup
              <input
                type="file"
                accept=".json"
                hidden
                onChange={handleRestore}
              />
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}