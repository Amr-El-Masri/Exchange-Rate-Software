import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Chip, Divider, Badge} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DeleteIcon from "@mui/icons-material/Delete";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import BASE_URL from "../config";

export default function Notifications({ userToken }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchNotifications = useCallback(async () => {
    if (!userToken) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      } else if (response.status === 401) {
        setError("Unauthorized. Please log in again.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  //fetch on page load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  //poll every 30 seconds 
  //since backend has no websocket, we poll periodically
  useEffect(() => {
    if (!userToken) return;
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval); //stop polling when teh user leaves the page, to prevent memory leaks
  }, [fetchNotifications, userToken]);

  async function handleMarkAsRead(notificationId) {
    setError("");
    try {
      const response = await fetch(
        `${BASE_URL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      if (response.ok) {
        fetchNotifications();
      } else if (response.status === 403) {
        setError("You can only mark your own notifications as read.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  async function handleDelete(notificationId) {
    setError("");
    try {
      const response = await fetch(
        `${BASE_URL}/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      if (response.ok) {
        setSuccess("Notification deleted.");
        fetchNotifications();
      } else if (response.status === 403) {
        setError("You can only delete your own notifications.");
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  async function handleDeleteAll() {
    setError("");
    try {
      const response = await fetch(`${BASE_URL}/notifications`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.ok) {
        setSuccess("All notifications cleared.");
        fetchNotifications();
      }
    } catch (err) {
      setError("Cannot connect to server.");
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        )}
      </Box>

      {!userToken ? (
        <Alert severity="info">Please log in to view your notifications.</Alert>
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

          {/*header with unread count and clear all button */}
          <Box sx={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 2 }}>
            <Typography variant="body1" color="gray">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification(s)`
                : "All notifications read"}
            </Typography>
            {notifications.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteAll}
              >
                Clear All
              </Button>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Alert severity="info">No notifications yet.</Alert>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  variant="outlined"
                  sx={{
                    backgroundColor: notification.is_read
                      ? "white"
                      : "#f0f7ff", // light blue for unread
                    borderLeft: notification.is_read
                      ? "4px solid #e0e0e0"
                      : "4px solid #1976d2", // blue left border for unread
                  }}
                >
                  <CardContent sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginBottom: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {notification.title}
                        </Typography>
                        {!notification.is_read && (
                          <Chip label="New" size="small" color="primary" />
                        )}
                      </Box>
                      <Typography variant="body2" color="gray" marginBottom={1}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="gray">
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: "flex", gap: 1, marginLeft: 2 }}>
                      {!notification.is_read && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<MarkEmailReadIcon />}
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(notification.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </CardContent>
                  <Divider />
                </Card>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}