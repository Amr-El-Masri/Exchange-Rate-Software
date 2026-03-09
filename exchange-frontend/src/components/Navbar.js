import { useState } from "react";
import {Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Box, Divider, Button} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import StorefrontIcon from "@mui/icons-material/Storefront";
import NotificationsIcon from "@mui/icons-material/Notifications";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationImportantIcon from "@mui/icons-material/NotificationImportant";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useNavigate, useLocation } from "react-router-dom";
import ShowChartIcon from "@mui/icons-material/ShowChart";

const BASE="/amr-el-masri";
const DRAWER_WIDTH=200;
const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, path: `${BASE}/dashboard` },
  { label: "Graph", icon: <ShowChartIcon />, path: `${BASE}/graph` },
  { label: "Transactions", icon: <SwapHorizIcon />, path: `${BASE}/transactions` },
  { label: "Marketplace", icon: <StorefrontIcon />, path: `${BASE}/marketplace` },
  { label: "Alerts", icon: <NotificationImportantIcon />, path: `${BASE}/alerts` },
  { label: "Watchlist", icon: <BookmarkIcon />, path: `${BASE}/watchlist` },
  { label: "Notifications", icon: <NotificationsIcon />, path: `${BASE}/notifications` },
  { label: "Preferences", icon: <SettingsIcon />, path: `${BASE}/preferences` },
];

export default function Navbar({userToken, userRole, onLogout}){
    const navigate=useNavigate();
    const location = useLocation();
    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: DRAWER_WIDTH,
                    boxSizing: "border-box",
                    backgroundColor: "#1a1a2e",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                },
            }}
        >
        {/* Top: logo and nav Items */}
        <Box>
            {/*app title */}
            <Box sx={{ padding: "20px 16px 10px" }}>
                <Typography variant="subtitle1" fontWeight="bold" color="white">
                    USD to LBP Exchange Tracker
                </Typography>
                
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

            {/*nav links */}
            <List>
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                <ListItem key={item.label} disablePadding>
                    <ListItemButton
                        onClick={() => navigate(item.path)}
                        sx={{
                            backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                            "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                            borderRadius: "8px",
                            margin: "2px 8px",
                            width: "auto",
                        }}
                    >
                        <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{ fontSize: "13px" }}
                        />
                    </ListItemButton>
                </ListItem>
                );
            })}

            {/* Admin link — only show if user is admin */}
            {userRole === "ADMIN" && (
                <ListItem disablePadding>
                <ListItemButton
                    onClick={() => navigate(`${BASE}/admin`)}
                    sx={{
                    backgroundColor: location.pathname === `${BASE}/admin`
                        ? "rgba(255,255,255,0.15)" : "transparent",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                    borderRadius: "8px",
                    margin: "2px 8px",
                    width: "auto",
                    }}
                >
                    <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                    <AdminPanelSettingsIcon />
                    </ListItemIcon>
                    <ListItemText
                    primary="Admin"
                    primaryTypographyProps={{ fontSize: "13px" }}
                    />
                </ListItemButton>
                </ListItem>
            )}
            </List>
        </Box>

        {/* Bottom: Login/Register or Logout */}
        <Box sx={{ padding: "10px 8px 20px" }}>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", marginBottom: "10px" }} />
            {userToken ? (
            <ListItemButton
                onClick={onLogout}
                sx={{
                borderRadius: "8px",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
            >
                <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                <LogoutIcon />
                </ListItemIcon>
                <ListItemText
                primary="Logout"
                primaryTypographyProps={{ fontSize: "13px", color: "white" }}
                />
            </ListItemButton>
            ) : (
            <>
                <ListItemButton
                onClick={() => navigate(`${BASE}/login`)}
                sx={{
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
                >
                <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                    <LoginIcon />
                </ListItemIcon>
                <ListItemText
                    primary="Login"
                    primaryTypographyProps={{ fontSize: "13px", color: "white" }}
                />
                </ListItemButton>
                <ListItemButton
                onClick={() => navigate(`${BASE}/register`)}
                sx={{
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
                >
                <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                    <PersonAddIcon />
                </ListItemIcon>
                <ListItemText
                    primary="Register"
                    primaryTypographyProps={{ fontSize: "13px", color: "white" }}
                />
                </ListItemButton>
            </>
            )}
        </Box>
    </Drawer>
  );
}