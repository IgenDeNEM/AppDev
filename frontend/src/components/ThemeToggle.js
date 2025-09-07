import React from 'react';
import {
    IconButton,
    Tooltip,
    Switch,
    FormControlLabel,
    Box,
    Typography,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    LightMode as LightModeIcon,
    DarkMode as DarkModeIcon,
    Settings as SettingsIcon,
    Palette as PaletteIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ variant = 'icon', showLabel = false }) => {
    const { darkMode, toggleTheme, setThemeMode } = useTheme();

    const handleThemeChange = (event) => {
        toggleTheme();
    };

    const handleSystemTheme = () => {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setThemeMode(systemPrefersDark);
    };

    if (variant === 'switch') {
        return (
            <FormControlLabel
                control={
                    <Switch
                        checked={darkMode}
                        onChange={handleThemeChange}
                        color="primary"
                    />
                }
                label={showLabel ? (darkMode ? 'Dark Mode' : 'Light Mode') : ''}
            />
        );
    }

    if (variant === 'button') {
        return (
            <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                    onClick={toggleTheme}
                    color="inherit"
                    size="small"
                >
                    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
                {showLabel && (
                    <Typography variant="body2">
                        {darkMode ? 'Dark Mode' : 'Light Mode'}
                    </Typography>
                )}
            </Box>
        );
    }

    // Default icon variant
    return (
        <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
                onClick={toggleTheme}
                color="inherit"
                size="small"
            >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
        </Tooltip>
    );
};

export const ThemeMenu = () => {
    const { darkMode, setThemeMode } = useTheme();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLightMode = () => {
        setThemeMode(false);
        handleClose();
    };

    const handleDarkMode = () => {
        setThemeMode(true);
        handleClose();
    };

    const handleSystemMode = () => {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setThemeMode(systemPrefersDark);
        handleClose();
    };

    return (
        <>
            <Tooltip title="Theme Settings">
                <IconButton
                    onClick={handleClick}
                    color="inherit"
                    size="small"
                >
                    <PaletteIcon />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={handleLightMode} selected={!darkMode}>
                    <ListItemIcon>
                        <LightModeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Light Mode</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDarkMode} selected={darkMode}>
                    <ListItemIcon>
                        <DarkModeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Dark Mode</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleSystemMode}>
                    <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>System Default</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};

export default ThemeToggle;