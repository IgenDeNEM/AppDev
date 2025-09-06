import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Chip,
    Autocomplete,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Checkbox,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    ExpandMore as ExpandMoreIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    Computer as ComputerIcon,
    Schedule as ScheduleIcon,
    Security as SecurityIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const AdvancedUserSearch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchResults, setSearchResults] = useState(null);
    const [filterOptions, setFilterOptions] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [userDetailDialog, setUserDetailDialog] = useState({ open: false, user: null });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Search filters state
    const [filters, setFilters] = useState({
        searchTerm: '',
        role: '',
        status: '',
        registrationDateFrom: null,
        registrationDateTo: null,
        lastLoginFrom: null,
        lastLoginTo: null,
        hasTags: '',
        tags: [],
        country: '',
        deviceType: '',
        isActive: null,
        hasVerifiedEmail: null,
        failedLoginAttempts: '',
        accountLocked: null,
        sortBy: 'created_at',
        sortOrder: 'DESC'
    });

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    const fetchFilterOptions = async () => {
        try {
            const response = await axios.get('/api/advanced-search/filter-options');
            setFilterOptions(response.data.options);
        } catch (err) {
            console.error('Error fetching filter options:', err);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const searchFilters = { ...filters };
            
            // Convert dates to ISO strings
            if (searchFilters.registrationDateFrom) {
                searchFilters.registrationDateFrom = searchFilters.registrationDateFrom.toISOString();
            }
            if (searchFilters.registrationDateTo) {
                searchFilters.registrationDateTo = searchFilters.registrationDateTo.toISOString();
            }
            if (searchFilters.lastLoginFrom) {
                searchFilters.lastLoginFrom = searchFilters.lastLoginFrom.toISOString();
            }
            if (searchFilters.lastLoginTo) {
                searchFilters.lastLoginTo = searchFilters.lastLoginTo.toISOString();
            }

            // Remove empty values
            Object.keys(searchFilters).forEach(key => {
                if (searchFilters[key] === '' || searchFilters[key] === null || searchFilters[key] === undefined) {
                    delete searchFilters[key];
                }
            });

            const response = await axios.post('/api/advanced-search/users', {
                ...searchFilters,
                limit: rowsPerPage,
                offset: page * rowsPerPage
            });
            
            setSearchResults(response.data);
        } catch (err) {
            setError('Failed to search users');
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickSearch = async (query) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await axios.get(`/api/advanced-search/suggestions?q=${encodeURIComponent(query)}`);
            setSuggestions(response.data.suggestions);
        } catch (err) {
            console.error('Quick search error:', err);
        }
    };

    const handleExport = async (format = 'csv') => {
        try {
            const searchFilters = { ...filters };
            
            // Convert dates to ISO strings
            if (searchFilters.registrationDateFrom) {
                searchFilters.registrationDateFrom = searchFilters.registrationDateFrom.toISOString();
            }
            if (searchFilters.registrationDateTo) {
                searchFilters.registrationDateTo = searchFilters.registrationDateTo.toISOString();
            }
            if (searchFilters.lastLoginFrom) {
                searchFilters.lastLoginFrom = searchFilters.lastLoginFrom.toISOString();
            }
            if (searchFilters.lastLoginTo) {
                searchFilters.lastLoginTo = searchFilters.lastLoginTo.toISOString();
            }

            // Remove empty values
            Object.keys(searchFilters).forEach(key => {
                if (searchFilters[key] === '' || searchFilters[key] === null || searchFilters[key] === undefined) {
                    delete searchFilters[key];
                }
            });

            const response = await axios.post('/api/advanced-search/export', {
                filters: searchFilters,
                format
            }, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `user-search-results.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const handleUserSelect = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === searchResults.users.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(searchResults.users.map(user => user.id));
        }
    };

    const handleViewUser = async (user) => {
        try {
            const response = await axios.get(`/api/advanced-search/user/${user.id}/summary`);
            setUserDetailDialog({ open: true, user: response.data.summary });
        } catch (err) {
            console.error('Error fetching user details:', err);
        }
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            role: '',
            status: '',
            registrationDateFrom: null,
            registrationDateTo: null,
            lastLoginFrom: null,
            lastLoginTo: null,
            hasTags: '',
            tags: [],
            country: '',
            deviceType: '',
            isActive: null,
            hasVerifiedEmail: null,
            failedLoginAttempts: '',
            accountLocked: null,
            sortBy: 'created_at',
            sortOrder: 'DESC'
        });
    };

    const FilterSection = () => (
        <Accordion expanded={showFilters} onChange={() => setShowFilters(!showFilters)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1}>
                    <FilterIcon />
                    <Typography variant="h6">Advanced Filters</Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container spacing={3}>
                    {/* Basic Filters */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={filters.role}
                                label="Role"
                                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                            >
                                <MenuItem value="">All Roles</MenuItem>
                                {filterOptions?.roles?.map(role => (
                                    <MenuItem key={role.role} value={role.role}>
                                        {role.role} ({role.count})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.status}
                                label="Status"
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <MenuItem value="">All Status</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="locked">Locked</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Date Filters */}
                    <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Registration Date From"
                                value={filters.registrationDateFrom}
                                onChange={(date) => setFilters(prev => ({ ...prev, registrationDateFrom: date }))}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Registration Date To"
                                value={filters.registrationDateTo}
                                onChange={(date) => setFilters(prev => ({ ...prev, registrationDateTo: date }))}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Last Login From"
                                value={filters.lastLoginFrom}
                                onChange={(date) => setFilters(prev => ({ ...prev, lastLoginFrom: date }))}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Last Login To"
                                value={filters.lastLoginTo}
                                onChange={(date) => setFilters(prev => ({ ...prev, lastLoginTo: date }))}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Grid>

                    {/* Location and Device Filters */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Country</InputLabel>
                            <Select
                                value={filters.country}
                                label="Country"
                                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                            >
                                <MenuItem value="">All Countries</MenuItem>
                                {filterOptions?.countries?.map(country => (
                                    <MenuItem key={country.country} value={country.country}>
                                        {country.country} ({country.user_count})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Device Type</InputLabel>
                            <Select
                                value={filters.deviceType}
                                label="Device Type"
                                onChange={(e) => setFilters(prev => ({ ...prev, deviceType: e.target.value }))}
                            >
                                <MenuItem value="">All Devices</MenuItem>
                                {filterOptions?.deviceTypes?.map(device => (
                                    <MenuItem key={device.device_type} value={device.device_type}>
                                        {device.device_type} ({device.user_count})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Tags Filter */}
                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            multiple
                            options={filterOptions?.tags || []}
                            getOptionLabel={(option) => option.name}
                            value={filters.tags}
                            onChange={(event, newValue) => setFilters(prev => ({ ...prev, tags: newValue }))}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        variant="outlined"
                                        label={option.name}
                                        color="primary"
                                        {...getTagProps({ index })}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Tags"
                                    placeholder="Select tags"
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Has Tags</InputLabel>
                            <Select
                                value={filters.hasTags}
                                label="Has Tags"
                                onChange={(e) => setFilters(prev => ({ ...prev, hasTags: e.target.value }))}
                            >
                                <MenuItem value="">All Users</MenuItem>
                                <MenuItem value="true">Has Tags</MenuItem>
                                <MenuItem value="false">No Tags</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Boolean Filters */}
                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.isActive === true}
                                    onChange={(e) => setFilters(prev => ({ 
                                        ...prev, 
                                        isActive: e.target.checked ? true : null 
                                    }))}
                                />
                            }
                            label="Active Users Only"
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.hasVerifiedEmail === true}
                                    onChange={(e) => setFilters(prev => ({ 
                                        ...prev, 
                                        hasVerifiedEmail: e.target.checked ? true : null 
                                    }))}
                                />
                            }
                            label="Verified Email Only"
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.accountLocked === true}
                                    onChange={(e) => setFilters(prev => ({ 
                                        ...prev, 
                                        accountLocked: e.target.checked ? true : null 
                                    }))}
                                />
                            }
                            label="Locked Accounts Only"
                        />
                    </Grid>

                    {/* Sort Options */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={filters.sortBy}
                                label="Sort By"
                                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                            >
                                <MenuItem value="created_at">Registration Date</MenuItem>
                                <MenuItem value="last_login">Last Login</MenuItem>
                                <MenuItem value="username">Username</MenuItem>
                                <MenuItem value="email">Email</MenuItem>
                                <MenuItem value="role">Role</MenuItem>
                                <MenuItem value="login_count">Login Count</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Sort Order</InputLabel>
                            <Select
                                value={filters.sortOrder}
                                label="Sort Order"
                                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                            >
                                <MenuItem value="DESC">Descending</MenuItem>
                                <MenuItem value="ASC">Ascending</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Action Buttons */}
                    <Grid item xs={12}>
                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                startIcon={<SearchIcon />}
                                onClick={handleSearch}
                                disabled={loading}
                            >
                                Search
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleExport('csv')}
                                disabled={!searchResults}
                            >
                                Export CSV
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>
    );

    const ResultsTable = () => {
        if (!searchResults) return null;

        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Search Results ({searchResults.total} users found)
                        </Typography>
                        <Box display="flex" gap={1}>
                            <Button
                                size="small"
                                onClick={handleSelectAll}
                            >
                                {selectedUsers.length === searchResults.users.length ? 'Deselect All' : 'Select All'}
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleExport('csv')}
                            >
                                Export
                            </Button>
                        </Box>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedUsers.length === searchResults.users.length && searchResults.users.length > 0}
                                            indeterminate={selectedUsers.length > 0 && selectedUsers.length < searchResults.users.length}
                                            onChange={handleSelectAll}
                                        />
                                    </TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Last Login</TableCell>
                                    <TableCell>Tags</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {searchResults.users.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleUserSelect(user.id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="subtitle2">{user.username}</Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={user.role} 
                                                color={user.role === 'admin' ? 'primary' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" flexDirection="column" gap={0.5}>
                                                <Chip 
                                                    label={user.is_active ? 'Active' : 'Inactive'} 
                                                    color={user.is_active ? 'success' : 'default'}
                                                    size="small"
                                                />
                                                {user.account_locked_until && (
                                                    <Chip 
                                                        label="Locked" 
                                                        color="error"
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" gap={0.5} flexWrap="wrap">
                                                {user.tags.map((tag, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={tag}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewUser(user)}
                                                >
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={searchResults.total}
                        page={page}
                        onPageChange={handlePageChange}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        rowsPerPageOptions={[25, 50, 100]}
                    />
                </CardContent>
            </Card>
        );
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Advanced User Search
                </Typography>
            </Box>

            {/* Search Bar */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Autocomplete
                                freeSolo
                                options={suggestions}
                                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.username} (${option.email})`}
                                onInputChange={(event, newInputValue) => {
                                    setFilters(prev => ({ ...prev, searchTerm: newInputValue }));
                                    handleQuickSearch(newInputValue);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Search users by username or email"
                                        placeholder="Type to search..."
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {loading && <CircularProgress size={20} />}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            )
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box display="flex" gap={1}>
                                <Button
                                    variant="contained"
                                    startIcon={<SearchIcon />}
                                    onClick={handleSearch}
                                    disabled={loading}
                                    fullWidth
                                >
                                    Search
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<FilterIcon />}
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    Filters
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
                <FilterSection />
            </Box>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Results */}
            <ResultsTable />

            {/* User Detail Dialog */}
            <Dialog
                open={userDetailDialog.open}
                onClose={() => setUserDetailDialog({ open: false, user: null })}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    User Details: {userDetailDialog.user?.username}
                </DialogTitle>
                <DialogContent>
                    {userDetailDialog.user && (
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2">Basic Information</Typography>
                                <Typography>Username: {userDetailDialog.user.username}</Typography>
                                <Typography>Email: {userDetailDialog.user.email}</Typography>
                                <Typography>Role: {userDetailDialog.user.role}</Typography>
                                <Typography>Created: {new Date(userDetailDialog.user.created_at).toLocaleString()}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2">Activity</Typography>
                                <Typography>Last Login: {userDetailDialog.user.last_login ? new Date(userDetailDialog.user.last_login).toLocaleString() : 'Never'}</Typography>
                                <Typography>Login Count: {userDetailDialog.user.login_count}</Typography>
                                <Typography>Active Sessions: {userDetailDialog.user.active_sessions}</Typography>
                                <Typography>Countries Visited: {userDetailDialog.user.countries_visited}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Tags</Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                    {userDetailDialog.user.tags.map((tag, index) => (
                                        <Chip
                                            key={index}
                                            label={tag}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUserDetailDialog({ open: false, user: null })}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdvancedUserSearch;